import { getActiveDatabaseTarget } from '@/lib/database-target';
import { logger } from '@/lib/logger';

/**
 * Vérifie si Vercel Blob est configuré en vérifiant directement la variable d'environnement
 * ⚠️ IMPORTANT: Avec le hot swap, process.env.BLOB_READ_WRITE_TOKEN est mis à jour lors du switch
 */
function checkBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * Détermine si on doit utiliser le blob storage selon l'environnement et le switch
 * @returns true si on doit utiliser le blob storage, false sinon
 */
export async function shouldUseBlobStorage(): Promise<boolean> {
  const isProduction = process.env.NODE_ENV === 'production';

  // En production réelle, toujours utiliser Blob si configuré
  // Sur Vercel, BLOB_READ_WRITE_TOKEN est automatiquement disponible via les variables d'environnement
  if (isProduction) {
    const blobConfigured = checkBlobConfigured();
    if (!blobConfigured) {
      logger.warn(
        '[STORAGE CONFIG] Production détectée mais BLOB_READ_WRITE_TOKEN non configuré. Les images ne pourront pas être uploadées.'
      );
    }
    return blobConfigured;
  }

  // En développement, vérifier la cible DB active (hot swap)
  try {
    const target = await getActiveDatabaseTarget();
    // Si on utilise la base de production, on utilise aussi Blob pour les images
    if (target === 'production') {
      const blobConfigured = checkBlobConfigured();
      if (!blobConfigured) {
        logger.warn(
          '[STORAGE CONFIG] Switch production activé mais BLOB_READ_WRITE_TOKEN non configuré. Les images seront servies localement.'
        );
      }
      return blobConfigured;
    }
  } catch (error) {
    logger.warn('[STORAGE CONFIG] Erreur lecture cible DB, utilisation locale par défaut', error);
  }

  // Par défaut en développement (cible local), utiliser le stockage local
  return false;
}
