import fs from 'fs';
import path from 'path';

import { uploadToBlob, isBlobConfigured } from '@/lib/blob';
import { logger } from '@/lib/logger';
import { shouldUseBlobStorage } from '@/lib/utils/getStorageConfig';

/**
 * Sauvegarde une image (locale ou Blob) et retourne l'imageId
 * @param imageId - L'ID de l'image à sauvegarder
 * @param imageBuffer - Le buffer de l'image (déjà converti en WebP si nécessaire)
 * @param originalBuffer - Le buffer de l'image originale (optionnel, pour sauvegarder -ori.webp)
 * @returns L'imageId si la sauvegarde réussit, null sinon
 */
export async function saveImage(
  imageId: string,
  imageBuffer: Buffer,
  originalBuffer?: Buffer
): Promise<string | null> {
  const useBlobStorage = shouldUseBlobStorage();

  if (useBlobStorage) {
    // Sauvegarder dans Vercel Blob
    try {
      const key = `uploads/${imageId}.webp`;
      const originalKey = `uploads/${imageId}-ori.webp`;
      await uploadToBlob(key, imageBuffer, 'image/webp');
      if (originalBuffer) {
        await uploadToBlob(originalKey, originalBuffer, 'image/webp');
      } else {
        // Si pas d'originale fournie, sauvegarder la même image comme originale
        await uploadToBlob(originalKey, imageBuffer, 'image/webp');
      }
      logger.debug(`[SAVE IMAGE] Image sauvegardée dans Vercel Blob: ${imageId}`);
      return imageId;
    } catch (error) {
      logger.error('[SAVE IMAGE] Erreur sauvegarde Blob:', error);
      return null;
    }
  } else {
    // Sauvegarder localement dans public/uploads/
    try {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

      // Créer le dossier s'il n'existe pas
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Sauvegarder l'image principale
      const imagePath = path.join(uploadsDir, `${imageId}.webp`);
      fs.writeFileSync(imagePath, imageBuffer);
      logger.debug(`[SAVE IMAGE] Image sauvegardée localement: ${imagePath}`);

      // Sauvegarder l'image originale si fournie
      const originalPath = path.join(uploadsDir, `${imageId}-ori.webp`);
      const bufferToSave = originalBuffer || imageBuffer;
      fs.writeFileSync(originalPath, bufferToSave);
      logger.debug(`[SAVE IMAGE] Image originale sauvegardée localement: ${originalPath}`);

      return imageId;
    } catch (error) {
      logger.error('[SAVE IMAGE] Erreur sauvegarde locale:', error);
      return null;
    }
  }
}
