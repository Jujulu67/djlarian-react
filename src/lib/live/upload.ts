import fs from 'fs';
import path from 'path';

import { uploadToBlob, getIsBlobConfigured } from '@/lib/blob';
import { logger } from '@/lib/logger';

/**
 * Upload un fichier audio vers Blob Storage ou local
 * SERVER-ONLY: Utilise fs et path (modules Node.js)
 */
export async function uploadAudioFile(
  file: File,
  fileId: string,
  userId: string
): Promise<{ url: string; size: number }> {
  const useBlobStorage = getIsBlobConfigured();

  // Convertir le fichier en buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (useBlobStorage) {
    // Upload vers Vercel Blob
    try {
      const contentType = file.type || 'audio/mpeg';
      const url = await uploadToBlob(`live-audio/${fileId}`, buffer, contentType);
      return {
        url,
        size: buffer.length,
      };
    } catch (error) {
      logger.error('[Live Upload] Erreur upload Blob:', error);
      throw new Error("Erreur lors de l'upload vers Blob Storage");
    }
  } else {
    // Upload local
    try {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'live-audio');

      // Créer le dossier s'il n'existe pas
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, fileId);
      fs.writeFileSync(filePath, buffer);

      // Retourner l'URL relative
      const url = `/uploads/live-audio/${fileId}`;
      return {
        url,
        size: buffer.length,
      };
    } catch (error) {
      logger.error('[Live Upload] Erreur upload local:', error);
      throw new Error("Erreur lors de l'upload local");
    }
  }
}

/**
 * Supprime un fichier audio
 * SERVER-ONLY: Utilise fs et path (modules Node.js)
 */
export async function deleteAudioFile(fileUrl: string): Promise<void> {
  const useBlobStorage = getIsBlobConfigured();

  if (useBlobStorage) {
    // Supprimer de Blob Storage
    try {
      const { deleteFromBlob } = await import('@/lib/blob');
      await deleteFromBlob(fileUrl);
    } catch (error) {
      logger.error('[Live Upload] Erreur suppression Blob:', error);
      // Ne pas throw, on continue même si la suppression échoue
    }
  } else {
    // Supprimer du stockage local
    try {
      const fileName = path.basename(fileUrl);
      const filePath = path.join(process.cwd(), 'public', 'uploads', 'live-audio', fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      logger.error('[Live Upload] Erreur suppression local:', error);
      // Ne pas throw, on continue même si la suppression échoue
    }
  }
}
