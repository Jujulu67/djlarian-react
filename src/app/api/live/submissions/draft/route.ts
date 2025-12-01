import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { uploadAudioFile, deleteAudioFile } from '@/lib/live/upload';
import { validateAudioFile, generateAudioFileId } from '@/lib/live/upload-client';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import { LiveSubmissionStatus } from '@/types/live';

/**
 * POST /api/live/submissions/draft
 * Crée ou met à jour un draft de soumission
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const { rateLimit } = await import('@/lib/api/rateLimiter');
  const rateLimitResponse = await rateLimit(request, 10); // 10 drafts par minute
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non authentifié');
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const draftId = formData.get('draftId') as string | null; // ID du draft existant à mettre à jour

    // Valider le fichier
    if (!file) {
      return NextResponse.json({ error: 'Fichier audio requis' }, { status: 400 });
    }

    const validation = validateAudioFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Générer un ID unique pour le fichier
    const fileId = generateAudioFileId(session.user.id, file.name);

    // Vérifier que le modèle liveSubmission est disponible
    if (!prisma.liveSubmission) {
      logger.error('[Live Draft] Modèle liveSubmission non disponible dans Prisma Client');
      return NextResponse.json(
        { error: 'Erreur de configuration serveur. Veuillez redémarrer le serveur.' },
        { status: 500 }
      );
    }

    // Si pas de draftId fourni, chercher un draft existant pour cet utilisateur
    let existingDraftId = draftId;
    if (!existingDraftId) {
      try {
        const existingDraft = await prisma.liveSubmission.findFirst({
          where: {
            userId: session.user.id,
            isDraft: true,
          },
          orderBy: {
            updatedAt: 'desc',
          },
        });
        if (existingDraft) {
          existingDraftId = existingDraft.id;
        }
      } catch (error) {
        logger.error('[Live Draft] Erreur lors de la recherche du draft existant:', error);
        // Continuer sans draft existant
      }
    }

    // Si un draft existe, supprimer l'ancien fichier
    if (existingDraftId) {
      const existingDraft = await prisma.liveSubmission.findUnique({
        where: { id: existingDraftId },
      });

      if (existingDraft && existingDraft.userId === session.user.id && existingDraft.isDraft) {
        try {
          await deleteAudioFile(existingDraft.fileUrl);
        } catch (error) {
          logger.warn(
            `[Live Draft] Erreur lors de la suppression de l'ancien fichier: ${existingDraft.fileUrl}`,
            error
          );
        }
      }
    }

    // Upload le fichier
    const { url: fileUrl, size } = await uploadAudioFile(file, fileId, session.user.id);

    // Créer ou mettre à jour le draft
    const draft = existingDraftId
      ? await prisma.liveSubmission.update({
          where: { id: existingDraftId },
          data: {
            fileName: file.name,
            fileUrl,
            updatedAt: new Date(),
          },
        })
      : await prisma.liveSubmission.create({
          data: {
            userId: session.user.id,
            fileName: file.name,
            fileUrl,
            title: '', // Titre vide pour les drafts
            status: LiveSubmissionStatus.PENDING, // Status PENDING même pour les drafts
            isDraft: true,
          },
        });

    logger.debug(`[Live Draft] Draft créé/mis à jour: ${draft.id}`);

    return createSuccessResponse(draft, 201, 'Draft créé avec succès');
  } catch (error) {
    return handleApiError(error, 'POST /api/live/submissions/draft');
  }
}

/**
 * GET /api/live/submissions/draft
 * Récupère le draft de l'utilisateur connecté
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non authentifié');
    }

    const draft = await prisma.liveSubmission.findFirst({
      where: {
        userId: session.user.id,
        isDraft: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (!draft) {
      return NextResponse.json({ data: null }, { status: 200 });
    }

    return createSuccessResponse(draft, 200, 'Draft récupéré');
  } catch (error) {
    return handleApiError(error, 'GET /api/live/submissions/draft');
  }
}

/**
 * DELETE /api/live/submissions/draft?id=draftId
 * Supprime un draft
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non authentifié');
    }

    const { searchParams } = new URL(request.url);
    const draftId = searchParams.get('id');

    if (!draftId) {
      return NextResponse.json({ error: 'ID de draft requis' }, { status: 400 });
    }

    // Vérifier que le draft existe et appartient à l'utilisateur
    const draft = await prisma.liveSubmission.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      return NextResponse.json({ error: 'Draft non trouvé' }, { status: 404 });
    }

    if (draft.userId !== session.user.id || !draft.isDraft) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Supprimer le fichier audio
    try {
      await deleteAudioFile(draft.fileUrl);
    } catch (error) {
      logger.warn(`[Live Draft] Erreur lors de la suppression du fichier: ${draft.fileUrl}`, error);
    }

    // Supprimer le draft de la base de données
    await prisma.liveSubmission.delete({
      where: { id: draftId },
    });

    logger.debug(`[Live Draft] Draft supprimé: ${draftId}`);

    return createSuccessResponse({ success: true }, 200, 'Draft supprimé avec succès');
  } catch (error) {
    return handleApiError(error, 'DELETE /api/live/submissions/draft');
  }
}
