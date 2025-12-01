import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createUnauthorizedResponse, createErrorResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import archiver from 'archiver';
import { Readable } from 'stream';

/**
 * GET /api/admin/live/submissions/download-all
 * Télécharge toutes les soumissions dans un fichier ZIP
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return createUnauthorizedResponse('Non autorisé');
    }

    // Récupérer toutes les soumissions (sans les drafts)
    const submissions = await prisma.liveSubmission.findMany({
      where: {
        isDraft: false,
      },
      include: {
        User: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (submissions.length === 0) {
      return createErrorResponse('Aucune soumission à télécharger', 404);
    }

    // Créer un stream pour le ZIP
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Compression maximale
    });

    // Créer un Readable stream pour la réponse
    const chunks: Buffer[] = [];

    archive.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    archive.on('error', (err) => {
      logger.error('[DOWNLOAD ALL] Erreur lors de la création du ZIP:', err);
    });

    // Ajouter chaque fichier au ZIP
    for (const submission of submissions) {
      try {
        // Télécharger le fichier depuis l'URL
        const fileResponse = await fetch(submission.fileUrl);
        if (!fileResponse.ok) {
          logger.warn(
            `[DOWNLOAD ALL] Impossible de télécharger le fichier pour ${submission.id}: ${submission.fileUrl}`
          );
          continue;
        }

        const fileBuffer = await fileResponse.arrayBuffer();
        const buffer = Buffer.from(fileBuffer);

        // Créer un nom de fichier unique avec le nom d'utilisateur et le titre
        const sanitizeFileName = (name: string) => {
          return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        };

        const userName = submission.User?.name || 'unknown';
        const title = submission.title || 'untitled';
        const extension = submission.fileName.split('.').pop() || 'mp3';
        const fileName = `${sanitizeFileName(userName)}_${sanitizeFileName(title)}.${extension}`;

        archive.append(buffer, { name: fileName });
      } catch (error) {
        logger.error(`[DOWNLOAD ALL] Erreur lors de l'ajout de ${submission.id} au ZIP:`, error);
        // Continuer avec les autres fichiers même si celui-ci échoue
        continue;
      }
    }

    // Finaliser l'archive et attendre la fin
    archive.finalize();

    // Attendre que tous les chunks soient collectés
    await new Promise<void>((resolve, reject) => {
      archive.on('end', () => {
        resolve();
      });
      archive.on('error', (err) => {
        reject(err);
      });
    });

    // Combiner tous les chunks en un seul buffer
    const zipBuffer = Buffer.concat(chunks);

    // Retourner le ZIP
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="submissions_${new Date().toISOString().split('T')[0]}.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    logger.error('[DOWNLOAD ALL] Erreur:', error);
    return handleApiError(error, 'GET /api/admin/live/submissions/download-all');
  }
}
