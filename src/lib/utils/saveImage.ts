import fs from 'fs';
import path from 'path';

import { uploadToBlobWithCheck } from '@/lib/blob';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
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
      // OPTIMISATION: Vérifier si l'image existe déjà avant d'uploader (évite put() redondant)
      const { url: blobUrl, hash } = await uploadToBlobWithCheck(
        key,
        imageBuffer,
        'image/webp',
        imageId,
        false
      );

      // OPTIMISATION: Ne pas uploader l'originale si elle n'est pas fournie (évite un put() inutile)
      // Si originalBuffer n'est pas fourni, on ne crée pas de fichier -ori.webp
      let originalBlobUrl: string | null = null;
      let originalHash: string | null = null;
      if (originalBuffer) {
        const originalKey = `uploads/${imageId}-ori.webp`;
        // OPTIMISATION: Vérifier si l'originale existe déjà avant d'uploader
        const originalResult = await uploadToBlobWithCheck(
          originalKey,
          originalBuffer,
          'image/webp',
          imageId,
          true
        );
        originalBlobUrl = originalResult.url;
        originalHash = originalResult.hash;
      }

      // Stocker les URLs blob et les hashs dans la base de données pour éviter les appels list() coûteux
      try {
        await prisma.image.upsert({
          where: { imageId },
          create: {
            imageId,
            blobUrl,
            blobUrlOriginal: originalBlobUrl,
            size: imageBuffer.length,
            contentType: 'image/webp',
            hash,
            hashOriginal: originalHash,
          },
          update: {
            blobUrl,
            blobUrlOriginal: originalBlobUrl,
            size: imageBuffer.length,
            contentType: 'image/webp',
            hash,
            hashOriginal: originalHash,
          },
        });
        logger.debug(`[SAVE IMAGE] URLs blob stockées dans la DB pour: ${imageId}`);
      } catch (dbError) {
        // Ne pas faire échouer l'upload si la DB échoue, juste logger
        logger.warn('[SAVE IMAGE] Erreur lors du stockage des URLs blob dans la DB:', dbError);
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
