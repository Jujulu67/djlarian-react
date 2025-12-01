import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { uploadAudioFile, deleteAudioFile } from '@/lib/live/upload';
import { validateAudioFile, generateAudioFileId } from '@/lib/live/upload-client';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import { LiveSubmissionStatus } from '@/types/live';

const submissionSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(320).optional(),
});

/**
 * GET /api/live/submissions
 * Récupère les soumissions de l'utilisateur connecté
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non authentifié');
    }

    const submissions = await prisma.liveSubmission.findMany({
      where: {
        userId: session.user.id,
        isDraft: false, // Ne pas inclure les drafts, seulement les soumissions finales
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return createSuccessResponse(submissions, 200, 'Soumissions récupérées');
  } catch (error) {
    return handleApiError(error, 'GET /api/live/submissions');
  }
}

/**
 * POST /api/live/submissions
 * Soumet un fichier audio
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const { rateLimit } = await import('@/lib/api/rateLimiter');
  const rateLimitResponse = await rateLimit(request, 5); // 5 soumissions par minute
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non authentifié');
    }

    // Vérifier si les soumissions sont activées
    const trackSubmissionsSetting = await prisma.adminSettings.findUnique({
      where: { key: 'trackSubmissions' },
    });

    const trackSubmissions = trackSubmissionsSetting
      ? JSON.parse(trackSubmissionsSetting.value)
      : true; // Par défaut activé

    if (!trackSubmissions) {
      return NextResponse.json(
        { error: 'Les soumissions sont indisponibles pour le moment' },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const draftId = formData.get('draftId') as string | null; // ID du draft à convertir

    // Si un draftId est fourni, convertir le draft en soumission
    if (draftId) {
      // Valider les données
      if (!title) {
        return NextResponse.json({ error: 'Titre requis' }, { status: 400 });
      }

      // Valider les données du formulaire
      const validationResult = submissionSchema.safeParse({
        title,
        description: description || undefined,
      });

      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Données invalides', details: validationResult.error.flatten() },
          { status: 400 }
        );
      }

      const { title: validatedTitle, description: validatedDescription } = validationResult.data;

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

      // Convertir le draft en soumission
      const submission = await prisma.liveSubmission.update({
        where: { id: draftId },
        data: {
          title: validatedTitle,
          description: validatedDescription || null,
          status: LiveSubmissionStatus.PENDING,
          isDraft: false,
        },
      });

      logger.debug(`[Live] Draft converti en soumission: ${submission.id}`);

      return createSuccessResponse(submission, 201, 'Soumission créée avec succès');
    }

    // Sinon, comportement classique (upload nouveau fichier)
    // Valider les données
    if (!file) {
      return NextResponse.json({ error: 'Fichier audio requis' }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: 'Titre requis' }, { status: 400 });
    }

    // Valider le fichier
    const validation = validateAudioFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Valider les données du formulaire
    const validationResult = submissionSchema.safeParse({
      title,
      description: description || undefined,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { title: validatedTitle, description: validatedDescription } = validationResult.data;

    // Générer un ID unique pour le fichier
    const fileId = generateAudioFileId(session.user.id, file.name);

    // Upload le fichier
    const { url: fileUrl, size } = await uploadAudioFile(file, fileId, session.user.id);

    // Créer la soumission dans la base de données
    const submission = await prisma.liveSubmission.create({
      data: {
        userId: session.user.id,
        fileName: file.name,
        fileUrl,
        title: validatedTitle,
        description: validatedDescription || null,
        status: LiveSubmissionStatus.PENDING,
        isDraft: false,
      },
    });

    logger.debug(`[Live] Soumission créée: ${submission.id}`);

    return createSuccessResponse(submission, 201, 'Soumission créée avec succès');
  } catch (error) {
    return handleApiError(error, 'POST /api/live/submissions');
  }
}

/**
 * DELETE /api/live/submissions?id=submissionId
 * Supprime une soumission de l'utilisateur connecté
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non authentifié');
    }

    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('id');

    if (!submissionId) {
      return NextResponse.json({ error: 'ID de soumission requis' }, { status: 400 });
    }

    // Vérifier que la soumission existe et appartient à l'utilisateur
    const submission = await prisma.liveSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      return NextResponse.json({ error: 'Soumission non trouvée' }, { status: 404 });
    }

    if (submission.userId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Supprimer le fichier audio
    try {
      await deleteAudioFile(submission.fileUrl);
    } catch (error) {
      logger.warn(`[Live] Erreur lors de la suppression du fichier: ${submission.fileUrl}`, error);
      // Continuer même si la suppression du fichier échoue
    }

    // Supprimer la soumission de la base de données
    await prisma.liveSubmission.delete({
      where: { id: submissionId },
    });

    logger.debug(`[Live] Soumission supprimée: ${submissionId}`);

    return createSuccessResponse({ success: true }, 200, 'Soumission supprimée avec succès');
  } catch (error) {
    return handleApiError(error, 'DELETE /api/live/submissions');
  }
}
