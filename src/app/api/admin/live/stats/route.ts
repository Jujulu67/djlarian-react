import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import { calculateTicketWeight } from '@/lib/live/calculations';
import type { UserTicket, UserLiveItem } from '@/types/live';
import { TicketSource, LiveItemType } from '@/types/live';

/**
 * GET /api/admin/live/stats
 * Récupère les statistiques du pool (total tickets, nombre de soumissions)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return createUnauthorizedResponse('Non autorisé');
    }

    const now = new Date();

    // Récupérer toutes les soumissions non rollées avec leurs UserTicket et UserLiveItem
    const nonRolledSubmissions = await prisma.liveSubmission.findMany({
      where: {
        isDraft: false,
        isRolled: false,
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

    // Calculer le poids total du pool
    let totalTickets = 0;
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

      const weight = calculateTicketWeight(userTickets, userItems);
      totalTickets += weight;
    }

    const stats = {
      totalTickets,
      submissionsCount: nonRolledSubmissions.length,
    };

    return createSuccessResponse(stats, 200, 'Statistiques récupérées');
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/live/stats');
  }
}
