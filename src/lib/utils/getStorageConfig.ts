import fs from 'fs';
import path from 'path';

import { isBlobConfigured } from '@/lib/blob';
import { logger } from '@/lib/logger';

/**
 * Détermine si on doit utiliser le blob storage selon l'environnement et le switch
 * @returns true si on doit utiliser le blob storage, false sinon
 */
export function shouldUseBlobStorage(): boolean {
  const isProduction = process.env.NODE_ENV === 'production';

  // En production réelle, toujours utiliser Blob si configuré
  // Sur Vercel, BLOB_READ_WRITE_TOKEN est automatiquement disponible via les variables d'environnement
  if (isProduction) {
    const blobConfigured = isBlobConfigured;
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
        return isBlobConfigured;
      }
    }
  } catch (error) {
    logger.warn('[STORAGE CONFIG] Erreur lecture switch, utilisation locale par défaut', error);
  }

  // Par défaut en développement, utiliser le stockage local
  return false;
}
