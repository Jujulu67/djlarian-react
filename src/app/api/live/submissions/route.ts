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

// Configuration pour les routes API App Router
export const maxDuration = 60; // 60 secondes max pour l'upload
export const runtime = 'nodejs'; // Utiliser Node.js runtime (nécessaire pour les gros fichiers)

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

    // Détecter si c'est du JSON ou FormData
    const contentType = request.headers.get('content-type') || '';
    let file: File | null = null;
    let title: string | null = null;
    let description: string | null = null;
    let draftId: string | null = null;
    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileSize: number | null = null;

    if (contentType.includes('application/json')) {
      // Cas JSON : fichier déjà uploadé vers Blob
      const body = await request.json();
      title = body.title;
      description = body.description;
      draftId = body.draftId;
      fileUrl = body.fileUrl;
      fileName = body.fileName;
      fileSize = body.fileSize;
    } else {
      // Cas FormData : compatibilité avec l'ancien code
      const formData = await request.formData();
      file = formData.get('file') as File | null;
      title = formData.get('title') as string | null;
      description = formData.get('description') as string | null;
      draftId = formData.get('draftId') as string | null;
    }

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

    // Sinon, créer une nouvelle soumission
    // Valider les données
    if (!title) {
      return NextResponse.json({ error: 'Titre requis' }, { status: 400 });
    }

    // Si fileUrl est fourni, le fichier est déjà uploadé vers Blob
    if (fileUrl && fileName) {
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

      // Créer la soumission avec l'URL du fichier déjà uploadé
      const submission = await prisma.liveSubmission.create({
        data: {
          userId: session.user.id,
          fileName,
          fileUrl,
          title: validatedTitle,
          description: validatedDescription || null,
          status: LiveSubmissionStatus.PENDING,
          isDraft: false,
        },
      });

      logger.debug(`[Live] Soumission créée avec fichier uploadé: ${submission.id}`);

      return createSuccessResponse(submission, 201, 'Soumission créée avec succès');
    }

    // Sinon, comportement classique (upload nouveau fichier via FormData)
    if (!file) {
      return NextResponse.json({ error: 'Fichier audio requis' }, { status: 400 });
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
    const { url: uploadedFileUrl, size } = await uploadAudioFile(file, fileId, session.user.id);

    // Créer la soumission dans la base de données
    const submission = await prisma.liveSubmission.create({
      data: {
        userId: session.user.id,
        fileName: file.name,
        fileUrl: uploadedFileUrl,
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
