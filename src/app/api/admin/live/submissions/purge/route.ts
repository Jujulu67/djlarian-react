import { requireAdmin } from '@/lib/api/requireAuth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import {
  createSuccessResponse,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';

export const maxDuration = 300; // 5 minutes max pour le nettoyage

type PurgeCounts = { deleted: number; errors: number };

/** Supprime les fichiers Blob à partir des URLs stockées en base */
async function purgeBlobFiles(
  submissions: Array<{ fileUrl: string | null }>
): Promise<PurgeCounts> {
  const counts: PurgeCounts = { deleted: 0, errors: 0 };
  try {
    const { del } = await import('@vercel/blob');

    // Utiliser les URLs stockées dans la DB au lieu de lister tous les blobs
    const fileUrls = submissions
      .map((sub) => sub.fileUrl)
      .filter((url): url is string => !!url && url.startsWith('http')); // Filtrer les URLs blob valides

    logger.debug(
      `[Admin Purge] Suppression de ${fileUrls.length} fichiers depuis la DB (0 list() appelé)`
    );

    if (fileUrls.length > 0) {
      // Supprimer les blobs en utilisant les URLs de la DB
      await Promise.all(
        fileUrls.map(async (url) => {
          try {
            await del(url);
            counts.deleted++;
          } catch (error) {
            logger.warn(`[Admin Purge] Erreur suppression blob ${url}:`, error);
            counts.errors++;
          }
        })
      );
    }

    // Note: Il peut y avoir des fichiers orphelins dans Blob qui ne sont plus dans la DB
    // Pour les supprimer, on pourrait faire un list() optionnel, mais on évite pour réduire les Advanced Operations
    // Les fichiers orphelins peuvent être nettoyés manuellement si nécessaire
  } catch (error) {
    logger.error('[Admin Purge] Erreur lors de la suppression Blob:', error);
    counts.errors++;
  }
  return counts;
}

/** Supprime les fichiers du dossier local public/uploads/live-audio */
async function purgeLocalFiles(): Promise<PurgeCounts> {
  const counts: PurgeCounts = { deleted: 0, errors: 0 };
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'live-audio');

    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);

      for (const file of files) {
        // Ignorer les fichiers cachés (comme .gitkeep)
        if (file.startsWith('.')) continue;

        try {
          fs.unlinkSync(path.join(uploadsDir, file));
          counts.deleted++;
        } catch (error) {
          logger.warn(`[Admin Purge] Erreur suppression fichier local ${file}:`, error);
          counts.errors++;
        }
      }
    }
  } catch (error) {
    logger.error('[Admin Purge] Erreur lors du nettoyage local:', error);
    counts.errors++;
  }
  return counts;
}

/**
 * DELETE /api/admin/live/submissions/purge
 * Supprime TOUTES les soumissions (drafts inclus) et nettoie le stockage Blob
 */
export async function DELETE() {
  try {
    const { error: authError } = await requireAdmin({
      onAnonymous: () => createUnauthorizedResponse('Non authentifié'),
      onNonAdmin: () => createForbiddenResponse('Non autorisé'),
    });
    if (authError) return authError;

    // 1. Récupérer toutes les soumissions pour avoir les URLs des fichiers
    const allSubmissions = await prisma.liveSubmission.findMany({
      select: {
        id: true,
        fileUrl: true,
      },
    });

    logger.info(`[Admin Purge] Début du nettoyage de ${allSubmissions.length} soumissions`);

    // 2. Supprimer TOUS les fichiers du dossier live-audio (Blob ou Local)
    const { getIsBlobConfigured } = await import('@/lib/blob');
    const useBlobStorage = getIsBlobConfigured();
    const files = useBlobStorage ? await purgeBlobFiles(allSubmissions) : await purgeLocalFiles();
    const deletedFilesCount = files.deleted;
    const errorsCount = files.errors;

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
