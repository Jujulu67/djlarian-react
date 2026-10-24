import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import type { LiveRewards } from '@/types/live';
import { LiveItemType } from '@/types/live';
import { requireAuth } from '@/lib/api/requireAuth';

const updateRewardsSchema = z.object({
  loyalty: z.number().int().min(0).optional(),
  watchStreak: z.number().int().min(0).optional(),
  cheerProgress: z.number().int().min(0).optional(),
});

/**
 * GET /api/live/rewards
 * Récupère les récompenses de l'utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAuth({
      requireUserId: true,
      onAnonymous: () => createUnauthorizedResponse('Non authentifié'),
    });
    if (error) return error;

    // Récupérer les métadonnées des items de récompense
    const loyaltyItem = await prisma.userLiveItem.findFirst({
      where: {
        userId: session.user.id,
        LiveItem: {
          type: LiveItemType.LOYALTY_BONUS,
        },
      },
      include: {
        LiveItem: true,
      },
    });

    const watchStreakItem = await prisma.userLiveItem.findFirst({
      where: {
        userId: session.user.id,
        LiveItem: {
          type: LiveItemType.WATCH_STREAK,
        },
      },
      include: {
        LiveItem: true,
      },
    });

    const cheerItem = await prisma.userLiveItem.findFirst({
      where: {
        userId: session.user.id,
        LiveItem: {
          type: LiveItemType.CHEER_PROGRESS,
        },
      },
      include: {
        LiveItem: true,
      },
    });

    // Parser les métadonnées JSON
    const parseMetadata = (
      metadata: string | null,
      defaultThreshold: number = 10
    ): { current: number; threshold: number } => {
      if (!metadata) return { current: 0, threshold: defaultThreshold };
      try {
        const parsed = JSON.parse(metadata);
        return {
          current: parsed.current || 0,
          threshold: parsed.threshold || defaultThreshold,
        };
      } catch {
        return { current: 0, threshold: defaultThreshold };
      }
    };

    const loyaltyMeta = parseMetadata(loyaltyItem?.metadata || null, 6);
    const watchStreakMeta = parseMetadata(watchStreakItem?.metadata || null, 10);
    const cheerMeta = parseMetadata(cheerItem?.metadata || null, 1);

    const rewards: LiveRewards = {
      loyalty: {
        current: loyaltyMeta.current,
        threshold: loyaltyMeta.threshold,
        bonusAvailable: loyaltyMeta.current >= loyaltyMeta.threshold,
      },
      watchStreak: {
        current: watchStreakMeta.current,
        threshold: watchStreakMeta.threshold,
        bonusAvailable: watchStreakMeta.current >= watchStreakMeta.threshold,
      },
      cheerProgress: {
        current: cheerMeta.current,
        threshold: cheerMeta.threshold,
        bonusAvailable: cheerMeta.current >= cheerMeta.threshold,
      },
    };

    return createSuccessResponse(rewards, 200, 'Récompenses récupérées');
  } catch (error) {
    return handleApiError(error, 'GET /api/live/rewards');
  }
}

/**
 * POST /api/live/rewards
 * Met à jour les progressions des récompenses
 */
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAuth({
      requireUserId: true,
      onAnonymous: () => createUnauthorizedResponse('Non authentifié'),
    });
    if (error) return error;

    const body = await request.json();
    const validationResult = updateRewardsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { loyalty, watchStreak, cheerProgress } = validationResult.data;

    // Mettre à jour chaque récompense si fournie
    if (loyalty !== undefined) {
      await updateRewardProgress(session.user.id, LiveItemType.LOYALTY_BONUS, loyalty, 6);
    }

    if (watchStreak !== undefined) {
      await updateRewardProgress(session.user.id, LiveItemType.WATCH_STREAK, watchStreak, 10);
    }

    if (cheerProgress !== undefined) {
      await updateRewardProgress(session.user.id, LiveItemType.CHEER_PROGRESS, cheerProgress, 1);
    }

    logger.debug(`[Live] Récompenses mises à jour pour ${session.user.id}`);

    return createSuccessResponse({ success: true }, 200, 'Récompenses mises à jour');
  } catch (error) {
    return handleApiError(error, 'POST /api/live/rewards');
  }
}

/**
 * Helper pour mettre à jour la progression d'une récompense
 */
async function updateRewardProgress(
  userId: string,
  itemType: LiveItemType,
  current: number,
  threshold: number = 10
): Promise<void> {
  // Récupérer ou créer l'item
  let item = await prisma.liveItem.findUnique({
    where: { type: itemType },
  });

  if (!item) {
    // Créer l'item s'il n'existe pas
    const itemNames: Record<LiveItemType, string> = {
      [LiveItemType.LOYALTY_BONUS]: 'Loyalty Bonus',
      [LiveItemType.WATCH_STREAK]: 'Watch Streak Bonus',
      [LiveItemType.CHEER_PROGRESS]: 'Cheer Bonus',
      [LiveItemType.SUBSCRIBER_BONUS]: 'Subscriber Bonus',
      [LiveItemType.ETERNAL_TICKET]: 'Eternal Ticket',
      [LiveItemType.WAVEFORM_COLOR]: 'Waveform Color',
      [LiveItemType.BACKGROUND_IMAGE]: 'Background Image',
      [LiveItemType.QUEUE_SKIP]: 'Queue Skip',
      [LiveItemType.SUB_GIFT_BONUS]: 'Sub Gift Bonus',
      [LiveItemType.MARBLES_WINNER_BONUS]: 'Marbles Winner Bonus',
      [LiveItemType.SHINY_NAME]: 'Shiny Name',
    };

    item = await prisma.liveItem.create({
      data: {
        type: itemType,
        name: itemNames[itemType],
        description: `Bonus ${itemNames[itemType]}`,
        icon: '🎁',
        isActive: true,
      },
    });
  }

  // Récupérer ou créer le UserLiveItem
  let userItem = await prisma.userLiveItem.findUnique({
    where: {
      userId_itemId: {
        userId,
        itemId: item.id,
      },
    },
  });

  const metadata = JSON.stringify({ current, threshold });

  if (!userItem) {
    await prisma.userLiveItem.create({
      data: {
        userId,
        itemId: item.id,
        quantity: 1,
        activatedQuantity: 0,
        isActivated: false, // Pour compatibilité
        metadata,
      },
    });
  } else {
    await prisma.userLiveItem.update({
      where: { id: userItem.id },
      data: { metadata },
    });
  }
}
