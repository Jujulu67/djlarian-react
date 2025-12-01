import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import {
  createSuccessResponse,
  createUnauthorizedResponse,
  createBadRequestResponse,
  createNotFoundResponse,
} from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import { LiveSubmissionStatus } from '@/types/live';

const updateSubmissionSchema = z
  .object({
    status: z.enum([LiveSubmissionStatus.APPROVED, LiveSubmissionStatus.REJECTED]).optional(),
    isRolled: z.boolean().optional(),
    isPinned: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.status !== undefined || data.isRolled !== undefined || data.isPinned !== undefined,
    {
      message: 'Au moins un champ (status, isRolled ou isPinned) doit être fourni',
    }
  );

/**
 * PATCH /api/admin/live/submissions/[id]
 * Met à jour le statut d'une soumission (approuver/rejeter)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return createUnauthorizedResponse('Non autorisé');
    }

    const { id } = await params;

    if (!id) {
      return createBadRequestResponse('ID de soumission requis');
    }

    // Parser et valider le body
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return createBadRequestResponse('Body JSON invalide');
    }

    const validationResult = updateSubmissionSchema.safeParse(body);

    if (!validationResult.success) {
      return createBadRequestResponse('Données invalides', {
        details: validationResult.error.flatten(),
      });
    }

    const { status, isRolled, isPinned } = validationResult.data;

    // Vérifier que la soumission existe
    const existingSubmission = await prisma.liveSubmission.findUnique({
      where: { id },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!existingSubmission) {
      return createNotFoundResponse('Soumission non trouvée');
    }

    // Vérifier que ce n'est pas un draft (seulement pour les changements de status)
    if (status && existingSubmission.isDraft) {
      return createBadRequestResponse("Impossible de modifier le statut d'un draft");
    }

    // Construire les données de mise à jour
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (status !== undefined) {
      updateData.status = status;
    }

    if (isRolled !== undefined) {
      updateData.isRolled = isRolled;
    }

    if (isPinned !== undefined) {
      updateData.isPinned = isPinned;

      // Si on pinne une soumission, dépinner toutes les autres automatiquement
      // ET marquer comme rolled si ce n'est pas déjà fait
      if (isPinned) {
        // Dépinner toutes les autres
        await prisma.liveSubmission.updateMany({
          where: {
            id: { not: id }, // Toutes sauf celle qu'on est en train de pinner
            isPinned: true,
          },
          data: {
            isPinned: false,
          },
        });

        // Marquer comme rolled si ce n'est pas déjà fait
        if (isRolled === undefined && !existingSubmission.isRolled) {
          updateData.isRolled = true;
        }
      }
    }

    // Mettre à jour la soumission
    const updatedSubmission = await prisma.liveSubmission.update({
      where: { id },
      data: updateData,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    const updateMessage = status
      ? `Soumission ${status === LiveSubmissionStatus.APPROVED ? 'approuvée' : 'rejetée'} avec succès`
      : isRolled !== undefined
        ? `Statut rolled mis à jour`
        : isPinned !== undefined
          ? `Soumission ${isPinned ? 'épinglée' : 'désépinglée'}`
          : 'Soumission mise à jour';

    logger.debug(`[Admin Live] Soumission ${id} mise à jour:`, updateData);

    return createSuccessResponse(updatedSubmission, 200, updateMessage);
  } catch (error) {
    return handleApiError(error, 'PATCH /api/admin/live/submissions/[id]');
  }
}
