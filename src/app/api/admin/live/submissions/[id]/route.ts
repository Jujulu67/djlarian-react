import { NextRequest } from 'next/server';
import { z } from 'zod';

import { requireAdmin } from '@/lib/api/requireAuth';
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
import { Prisma } from '@prisma/client';

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

type SubmissionUpdateFields = z.infer<typeof updateSubmissionSchema>;

/** Dépingle toutes les autres soumissions (une seule épinglée à la fois). */
async function unpinOtherSubmissions(id: string): Promise<void> {
  await prisma.liveSubmission.updateMany({
    where: {
      id: { not: id }, // Toutes sauf celle qu'on est en train de pinner
      isPinned: true,
    },
    data: {
      isPinned: false,
    },
  });
}

/** Construit les données de mise à jour à partir des champs demandés. */
async function buildUpdateData(
  id: string,
  existingSubmission: { isRolled: boolean },
  fields: SubmissionUpdateFields
): Promise<Prisma.LiveSubmissionUpdateInput> {
  const { status, isRolled, isPinned } = fields;
  const updateData: Prisma.LiveSubmissionUpdateInput = {
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
      await unpinOtherSubmissions(id);

      if (isRolled === undefined && !existingSubmission.isRolled) {
        updateData.isRolled = true;
      }
    }
  }

  return updateData;
}

/** Message de succès selon le champ modifié (priorité : statut, rolled, épinglage). */
function getUpdateMessage(
  status: string | undefined,
  isRolled: boolean | undefined,
  isPinned: boolean | undefined
): string {
  if (status) {
    return `Soumission ${status === LiveSubmissionStatus.APPROVED ? 'approuvée' : 'rejetée'} avec succès`;
  }
  if (isRolled !== undefined) return 'Statut rolled mis à jour';
  if (isPinned !== undefined) return `Soumission ${isPinned ? 'épinglée' : 'désépinglée'}`;
  return 'Soumission mise à jour';
}

/**
 * PATCH /api/admin/live/submissions/[id]
 * Met à jour le statut d'une soumission (approuver/rejeter)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error: authError } = await requireAdmin({
      onAnonymous: () => createUnauthorizedResponse('Non autorisé'),
      onNonAdmin: () => createUnauthorizedResponse('Non autorisé'),
    });
    if (authError) return authError;

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

    const updateData = await buildUpdateData(id, existingSubmission, {
      status,
      isRolled,
      isPinned,
    });

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

    const updateMessage = getUpdateMessage(status, isRolled, isPinned);

    logger.debug(`[Admin Live] Soumission ${id} mise à jour:`, updateData);

    return createSuccessResponse(updatedSubmission, 200, updateMessage);
  } catch (error) {
    return handleApiError(error, 'PATCH /api/admin/live/submissions/[id]');
  }
}
