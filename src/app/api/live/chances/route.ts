import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import {
  calculateChances,
  calculateMultiplier,
  calculateActiveTickets,
} from '@/lib/live/calculations';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import type { LiveChances, UserTicket, UserLiveItem } from '@/types/live';

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
        isActivated: true,
      },
      include: {
        LiveItem: true,
      },
    });

    // Récupérer toutes les soumissions non rollées
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

    // Calculer le pourcentage basé sur le nombre de soumissions non rollées
    let chancePercentage = 0;
    const isRolled = !!rolledSubmission;

    if (isRolled) {
      // Si l'utilisateur a été rolled, les chances sont à 0%
      chancePercentage = 0;
    } else if (userNonRolledSubmission && nonRolledSubmissions.length > 0) {
      // Pourcentage = 1 / nombre_total * 100
      chancePercentage = (1 / nonRolledSubmissions.length) * 100;
    }

    const hasSubmission = !!userNonRolledSubmission;

    // Calculer le multiplier et les tickets actifs (garder la logique existante)
    const multiplier = calculateMultiplier(activatedItems as UserLiveItem[]);
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
