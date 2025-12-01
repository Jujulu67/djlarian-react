// Vercel Blob Storage - Remplacement de R2
// Plan gratuit : 5 GB de stockage, 100 GB de bande passante/mois
// OPTIMISATION: Suppression des imports list() et head() pour éviter les Advanced Operations
import { put, del } from '@vercel/blob';
import crypto from 'crypto';

import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';

// Vérifier si Vercel Blob est configuré
// Sur Vercel, BLOB_READ_WRITE_TOKEN est automatiquement disponible
// En local avec switch production, le switch met BLOB_READ_WRITE_TOKEN dans .env.local
// à partir de BLOB_READ_WRITE_TOKEN_PRODUCTION (après redémarrage du serveur)
// Utiliser un getter pour vérifier à chaque appel (au cas où les variables d'environnement changent)
export const isBlobConfigured = !!process.env.BLOB_READ_WRITE_TOKEN;

// Fonction helper pour vérifier à la volée (utile si les variables d'environnement changent)
export function getIsBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * Calcule le hash SHA-256 d'un buffer (pour détecter les doublons)
 */
function calculateBufferHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Upload un fichier vers Vercel Blob avec vérification pour éviter les uploads redondants
 * OPTIMISATION: Vérifie si l'image existe déjà dans la DB avec le même hash avant d'uploader
 * @param key - La clé du fichier dans Blob
 * @param buffer - Le buffer du fichier
 * @param contentType - Le type MIME
 * @param imageId - L'ID de l'image (optionnel, pour vérification dans la DB)
 * @param isOriginal - Si c'est l'image originale (pour vérifier blobUrlOriginal)
 * @returns L'URL du fichier (existante ou nouvellement uploadée) et le hash calculé
 */
export const uploadToBlobWithCheck = async (
  key: string,
  buffer: Buffer,
  contentType: string = 'image/jpeg',
  imageId?: string,
  isOriginal: boolean = false
): Promise<{ url: string; hash: string }> => {
  if (!isBlobConfigured) {
    throw new Error('Vercel Blob not configured. BLOB_READ_WRITE_TOKEN is required.');
  }

  // Calculer le hash une seule fois (utilisé pour la vérification et le retour)
  const bufferHash = calculateBufferHash(buffer);

  // OPTIMISATION: Vérifier si l'image existe déjà dans la DB avant d'uploader
  if (imageId) {
    try {
      const existingImage = await prisma.image.findUnique({
        where: { imageId },
        select: {
          blobUrl: true,
          blobUrlOriginal: true,
          size: true,
          hash: true,
          hashOriginal: true,
        },
      });

      if (existingImage) {
        const existingUrl = isOriginal ? existingImage.blobUrlOriginal : existingImage.blobUrl;
        const existingHash = isOriginal ? existingImage.hashOriginal : existingImage.hash;
        const existingSize = existingImage.size;

        // Vérifier si le hash correspond (vérification précise)
        // Si le hash correspond, c'est exactement la même image, on peut réutiliser l'URL
        if (existingUrl && existingHash === bufferHash) {
          logger.debug(
            `[BLOB] Image ${imageId} existe déjà dans la DB avec le même hash (${bufferHash.substring(0, 8)}...), réutilisation de l'URL existante (0 put() appelé)`
          );
          return { url: existingUrl, hash: bufferHash };
        }

        // Vérification de fallback: si la taille correspond mais pas le hash, c'est probablement une image différente
        // On continue avec l'upload
        if (existingUrl && existingSize === buffer.length && existingHash !== bufferHash) {
          logger.debug(
            `[BLOB] Image ${imageId} a la même taille mais un hash différent, upload nécessaire`
          );
        }
      }
    } catch (dbError) {
      // Ne pas bloquer si la vérification DB échoue, continuer avec l'upload
      logger.warn('[BLOB] Erreur lors de la vérification DB, continuation avec upload:', dbError);
    }
  }

  // Upload si l'image n'existe pas ou si la vérification a échoué
  try {
    const blob = await put(key, buffer, {
      access: 'public',
      contentType,
    });

    logger.debug(
      `[BLOB] Image uploadée vers Blob: ${key} (${buffer.length} bytes, hash: ${bufferHash.substring(0, 8)}...)`
    );
    return { url: blob.url, hash: bufferHash };
  } catch (error) {
    logger.error("[BLOB] Erreur lors de l'upload:", error);
    throw error;
  }
};

/**
 * Upload un fichier vers Vercel Blob (sans vérification)
 * Utilisez uploadToBlobWithCheck() pour éviter les uploads redondants
 */
export const uploadToBlob = async (
  key: string,
  buffer: Buffer,
  contentType: string = 'image/jpeg'
): Promise<string> => {
  if (!isBlobConfigured) {
    throw new Error('Vercel Blob not configured. BLOB_READ_WRITE_TOKEN is required.');
  }

  try {
    const blob = await put(key, buffer, {
      access: 'public',
      contentType,
    });

    return blob.url;
  } catch (error) {
    logger.error("[BLOB] Erreur lors de l'upload:", error);
    throw error;
  }
};

/**
 * Supprimer un fichier de Vercel Blob
 */
export const deleteFromBlob = async (url: string): Promise<void> => {
  if (!isBlobConfigured) {
    throw new Error('Vercel Blob not configured. BLOB_READ_WRITE_TOKEN is required.');
  }

  try {
    await del(url);
  } catch (error) {
    logger.error('[BLOB] Erreur lors de la suppression:', error);
    throw error;
  }
};

/**
 * Obtenir l'URL publique d'un fichier Blob
 * Note: Avec Vercel Blob, l'URL est retournée directement par put()
 * Cette fonction est gardée pour compatibilité avec l'ancien code
 */
export const getBlobPublicUrl = (url: string): string => {
  // Si c'est déjà une URL complète, la retourner telle quelle
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Sinon, c'est probablement une clé, on retourne une URL relative
  // (normalement ça ne devrait pas arriver avec Vercel Blob)
  return url;
};

// OPTIMISATION: Suppression de listBlobFiles() et getBlobMetadata()
// Ces fonctions utilisaient list() et head() (Advanced Operations coûteuses)
// Elles ont été remplacées par des requêtes DB pour éviter les Advanced Operations
