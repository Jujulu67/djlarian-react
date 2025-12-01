import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';

/**
 * GET /api/admin/live/submissions
 * Récupère toutes les soumissions (sans les drafts) pour l'admin
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return createUnauthorizedResponse('Non autorisé');
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // Filtrer par status si fourni

    const where: any = {
      isDraft: false, // Ne jamais inclure les drafts côté admin
    };

    if (status) {
      where.status = status;
    }

    const now = new Date();
    const submissions = await prisma.liveSubmission.findMany({
      where,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            UserLiveItem: {
              where: { activatedQuantity: { gt: 0 } },
              include: {
                LiveItem: true,
              },
            },
            UserTicket: {
              where: {
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
              },
            },
          },
        },
      },
      orderBy: [
        { isPinned: 'desc' }, // Les épinglés en premier
        { createdAt: 'desc' }, // Puis par date de création
      ],
    });

    // S'assurer que isRolled et isPinned sont inclus dans la réponse
    const submissionsWithRolled = submissions.map((submission) => ({
      ...submission,
      isRolled: submission.isRolled ?? false,
      isPinned: submission.isPinned ?? false,
    }));

    return createSuccessResponse(submissionsWithRolled, 200, 'Soumissions récupérées');
  } catch (error) {
    logger.error('Erreur lors de la récupération des soumissions:', error);
    return handleApiError(error, 'GET /api/admin/live/submissions');
  }
}
