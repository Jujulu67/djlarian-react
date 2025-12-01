import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import {
  createSuccessResponse,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';

export const maxDuration = 300; // 5 minutes max pour le nettoyage

/**
 * DELETE /api/admin/live/submissions/purge
 * Supprime TOUTES les soumissions (drafts inclus) et nettoie le stockage Blob
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return createUnauthorizedResponse('Non authentifié');
    }

    if (session.user.role !== 'ADMIN') {
      return createForbiddenResponse('Non autorisé');
    }

    // 1. Récupérer toutes les soumissions pour avoir les URLs des fichiers
    const allSubmissions = await prisma.liveSubmission.findMany({
      select: {
        id: true,
        fileUrl: true,
      },
    });

    logger.info(`[Admin Purge] Début du nettoyage de ${allSubmissions.length} soumissions`);

    // 2. Supprimer TOUS les fichiers du dossier live-audio (Blob ou Local)
    let deletedFilesCount = 0;
    let errorsCount = 0;

    const { getIsBlobConfigured } = await import('@/lib/blob');
    const useBlobStorage = getIsBlobConfigured();

    if (useBlobStorage) {
      // Nettoyage Blob Storage
      try {
        const { list, del } = await import('@vercel/blob');

        // Lister tous les blobs avec le préfixe live-audio/
        // Note: On boucle tant qu'il y a des pages si nécessaire, mais list() retourne tout par défaut jusqu'à 1000
        let hasMore = true;
        let cursor: string | undefined;

        while (hasMore) {
          const {
            blobs,
            hasMore: more,
            cursor: nextCursor,
          } = await list({
            prefix: 'live-audio/',
            cursor,
          });

          hasMore = more;
          cursor = nextCursor;

          if (blobs.length > 0) {
            // Supprimer les blobs trouvés
            await Promise.all(
              blobs.map(async (blob) => {
                try {
                  await del(blob.url);
                  deletedFilesCount++;
                } catch (error) {
                  logger.warn(`[Admin Purge] Erreur suppression blob ${blob.url}:`, error);
                  errorsCount++;
                }
              })
            );
          }
        }
      } catch (error) {
        logger.error('[Admin Purge] Erreur lors du listing/suppression Blob:', error);
        errorsCount++;
      }
    } else {
      // Nettoyage Local Storage
      try {
        const fs = await import('fs');
        const path = await import('path');
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'live-audio');

        if (fs.existsSync(uploadsDir)) {
          const files = fs.readdirSync(uploadsDir);

          for (const file of files) {
            // Ignorer les fichiers cachés (comme .gitkeep)
            if (file.startsWith('.')) continue;

            try {
              fs.unlinkSync(path.join(uploadsDir, file));
              deletedFilesCount++;
            } catch (error) {
              logger.warn(`[Admin Purge] Erreur suppression fichier local ${file}:`, error);
              errorsCount++;
            }
          }
        }
      } catch (error) {
        logger.error('[Admin Purge] Erreur lors du nettoyage local:', error);
        errorsCount++;
      }
    }

    // 3. Supprimer toutes les entrées de la base de données
    const deleteResult = await prisma.liveSubmission.deleteMany({});

    logger.info(
      `[Admin Purge] Terminé. DB: ${deleteResult.count} supprimés. Files: ${deletedFilesCount} supprimés, ${errorsCount} erreurs.`
    );

    return createSuccessResponse(
      {
        dbDeleted: deleteResult.count,
        filesDeleted: deletedFilesCount,
        fileErrors: errorsCount,
      },
      200,
      'Purge effectuée avec succès'
    );
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/live/submissions/purge');
  }
}
