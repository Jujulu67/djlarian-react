import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import {
  calculateMultiplier,
  calculateActiveTickets,
  calculateTicketWeight,
} from '@/lib/live/calculations';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import type { LiveChances, UserTicket, UserLiveItem } from '@/types/live';
import { TicketSource, LiveItemType } from '@/types/live';

/**
 * GET /api/live/chances
 * Calcule les chances de soumission de l'utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non authentifié');
    }

    // Récupérer les tickets actifs
    const tickets = await prisma.userTicket.findMany({
      where: {
        userId: session.user.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    // Récupérer les items activés
    const activatedItems = await prisma.userLiveItem.findMany({
      where: {
        userId: session.user.id,
        activatedQuantity: { gt: 0 },
      },
      include: {
        LiveItem: true,
      },
    });

    const now = new Date();

    // Récupérer toutes les soumissions non rollées avec leurs UserTicket et UserLiveItem
    const nonRolledSubmissions = await prisma.liveSubmission.findMany({
      where: {
        isDraft: false,
        isRolled: false,
      },
      orderBy: {
        createdAt: 'asc', // Ordre chronologique pour déterminer la position
      },
      include: {
        User: {
          select: {
            id: true,
            UserTicket: {
              where: {
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
              },
            },
            UserLiveItem: {
              where: { activatedQuantity: { gt: 0 } },
              include: {
                LiveItem: true,
              },
            },
          },
        },
      },
    });

    // Vérifier si l'utilisateur a une soumission rollée
    const rolledSubmission = await prisma.liveSubmission.findFirst({
      where: {
        userId: session.user.id,
        isDraft: false,
        isRolled: true,
      },
    });

    // Vérifier si l'utilisateur a une soumission non rollée
    const userNonRolledSubmission = nonRolledSubmissions.find((s) => s.userId === session.user.id);

    // Déterminer le début de la séance (première soumission non rollée)
    const sessionStartTime =
      nonRolledSubmissions.length > 0 ? nonRolledSubmissions[0].createdAt : now;

    // Récupérer l'offset de temps simulé (pour les tests admin)
    const timeOffsetSetting = await prisma.adminSettings.findUnique({
      where: { key: 'timeOffsetMinutes' },
    });
    const timeOffsetMinutes = timeOffsetSetting
      ? parseInt(JSON.parse(timeOffsetSetting.value) || '0', 10)
      : 0;

    // Calculer le pourcentage basé sur le système de poids avec multiplier temporel
    let chancePercentage = 0;
    const isRolled = !!rolledSubmission;

    if (isRolled) {
      // Si l'utilisateur a été rolled, les chances sont à 0%
      chancePercentage = 0;
    } else if (userNonRolledSubmission && nonRolledSubmissions.length > 0) {
      // Calculer le multiplier pour la soumission de l'utilisateur
      const userMultiplier = calculateMultiplier(
        userNonRolledSubmission.createdAt,
        sessionStartTime,
        timeOffsetMinutes
      );

      // Calculer le poids de base de l'utilisateur
      const baseUserWeight = calculateTicketWeight(
        tickets as UserTicket[],
        activatedItems as UserLiveItem[]
      );

      // Appliquer le multiplier au poids de l'utilisateur
      const userWeight = baseUserWeight * userMultiplier;

      // Calculer le poids total de tous les utilisateurs avec soumissions non rollées
      let totalWeight = 0;
      for (const submission of nonRolledSubmissions) {
        const userTickets: UserTicket[] = (submission.User?.UserTicket || []).map((t) => ({
          id: t.id,
          userId: submission.User.id,
          quantity: t.quantity,
          source: t.source as TicketSource,
          expiresAt: t.expiresAt,
          createdAt: t.createdAt,
        }));

        const userItems: UserLiveItem[] = (submission.User?.UserLiveItem || []).map((item) => ({
          id: item.id,
          userId: submission.User.id,
          itemId: item.LiveItem?.id || '',
          quantity: item.quantity,
          activatedQuantity: item.activatedQuantity || 0,
          isActivated: (item.activatedQuantity || 0) > 0,
          activatedAt: item.activatedAt,
          metadata: item.metadata,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          LiveItem: item.LiveItem
            ? {
                id: item.LiveItem.id,
                type: item.LiveItem.type as LiveItemType,
                name: item.LiveItem.name,
                description: null,
                icon: null,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              }
            : undefined,
        }));

        // Calculer le multiplier pour cette soumission
        const submissionMultiplier = calculateMultiplier(
          submission.createdAt,
          sessionStartTime,
          timeOffsetMinutes
        );

        // Calculer le poids de base
        const baseWeight = calculateTicketWeight(userTickets, userItems);

        // Appliquer le multiplier au poids
        const weight = baseWeight * submissionMultiplier;
        totalWeight += weight;
      }

      // Calculer le pourcentage basé sur le poids
      if (totalWeight > 0) {
        chancePercentage = (userWeight / totalWeight) * 100;
      }
    }

    const hasSubmission = !!userNonRolledSubmission;

    // Calculer le multiplier pour l'affichage (basé sur la soumission de l'utilisateur)
    const multiplier = userNonRolledSubmission
      ? calculateMultiplier(userNonRolledSubmission.createdAt, sessionStartTime, timeOffsetMinutes)
      : 1.0;
    const activeTickets = calculateActiveTickets(tickets as UserTicket[]);

    const chances: LiveChances = {
      multiplier,
      chancePercentage,
      activeTickets,
      hasSubmission,
      isRolled,
    };

    return createSuccessResponse(chances, 200, 'Chances calculées');
  } catch (error) {
    return handleApiError(error, 'GET /api/live/chances');
  }
}
