import fs from 'fs';
import path from 'path';

import { logger } from '@/lib/logger';

/**
 * Vérifie si Vercel Blob est configuré en vérifiant directement la variable d'environnement
 * Cela garantit que la valeur est toujours à jour, même après un redémarrage
 */
function checkBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * Détermine si on doit utiliser le blob storage selon l'environnement et le switch
 * @returns true si on doit utiliser le blob storage, false sinon
 */
export function shouldUseBlobStorage(): boolean {
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

  // En développement, vérifier le switch de base de données
  try {
    const switchPath = path.join(process.cwd(), '.db-switch.json');
    if (fs.existsSync(switchPath)) {
      const switchConfig = JSON.parse(fs.readFileSync(switchPath, 'utf-8'));
      // Si on utilise la base de production, on utilise aussi Blob pour les images
      if (switchConfig.useProduction === true) {
        // Vérifier directement la variable d'environnement pour être sûr qu'elle est à jour
        const blobConfigured = checkBlobConfigured();
        if (!blobConfigured) {
          logger.warn(
            '[STORAGE CONFIG] Switch production activé mais BLOB_READ_WRITE_TOKEN non configuré. Les images seront servies localement.'
          );
        }
        return blobConfigured;
      }
    }
  } catch (error) {
    logger.warn('[STORAGE CONFIG] Erreur lecture switch, utilisation locale par défaut', error);
  }

  // Par défaut en développement, utiliser le stockage local
  return false;
}
