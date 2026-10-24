import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { checkTwitchSubscription } from '@/lib/twitch/client';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import { LiveItemType } from '@/types/live';
import type { TwitchSubscriptionStatus } from '@/types/live';
import { requireAuth } from '@/lib/api/requireAuth';

/**
 * GET /api/live/twitch-subscription
 * Vérifie le statut de subscription Twitch et met à jour le Subscriber Bonus
 */
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAuth({
      requireUserId: true,
      onAnonymous: () => createUnauthorizedResponse('Non authentifié'),
    });
    if (error) return error;

    // Vérifier la subscription Twitch
    const subscriptionStatus: TwitchSubscriptionStatus = await checkTwitchSubscription(
      session.user.id
    );

    // Récupérer ou créer l'item Subscriber Bonus
    let subscriberItem = await prisma.liveItem.findUnique({
      where: {
        type: LiveItemType.SUBSCRIBER_BONUS,
      },
    });

    if (!subscriberItem) {
      // Créer l'item s'il n'existe pas
      subscriberItem = await prisma.liveItem.create({
        data: {
          type: LiveItemType.SUBSCRIBER_BONUS,
          name: 'Subscriber Bonus',
          description: 'Bonus pour les abonnés Twitch',
          icon: '👑',
          isActive: true,
        },
      });
    }

    // Mettre à jour ou créer le UserLiveItem
    if (subscriptionStatus.isSubscribed) {
      // L'utilisateur est abonné, s'assurer qu'il a l'item
      const userItem = await prisma.userLiveItem.findUnique({
        where: {
          userId_itemId: {
            userId: session.user.id,
            itemId: subscriberItem.id,
          },
        },
      });

      if (!userItem) {
        // Créer l'item pour l'utilisateur
        await prisma.userLiveItem.create({
          data: {
            userId: session.user.id,
            itemId: subscriberItem.id,
            quantity: 1,
            activatedQuantity: 0, // L'utilisateur doit l'activer manuellement
            isActivated: false, // Pour compatibilité
          },
        });
      }
    } else {
      // L'utilisateur n'est pas abonné, supprimer l'item s'il existe
      await prisma.userLiveItem.deleteMany({
        where: {
          userId: session.user.id,
          itemId: subscriberItem.id,
        },
      });
    }

    logger.debug(
      `[Live] Subscription status vérifié pour ${session.user.id}: ${subscriptionStatus.isSubscribed}`
    );

    return createSuccessResponse(subscriptionStatus, 200, 'Statut de subscription vérifié');
  } catch (error) {
    return handleApiError(error, 'GET /api/live/twitch-subscription');
  }
}
