// Vercel Blob Storage - Remplacement de R2
// Plan gratuit : 5 GB de stockage, 100 GB de bande passante/mois
import { put, del, list, head } from '@vercel/blob';

import { logger } from '@/lib/logger';

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
 * Upload un fichier vers Vercel Blob
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

// Cache pour listBlobFiles (évite trop d'appels list())
let listBlobCache: {
  data: Array<{
    id: string;
    name: string;
    path: string;
    type: string;
    size: number;
    lastModified: string;
  }>;
  timestamp: number;
} | null = null;
const LIST_BLOB_CACHE_TTL = 3600000; // 1 heure en millisecondes

/**
 * Lister tous les fichiers dans Vercel Blob
 * Note: Vercel Blob ne supporte pas directement le listing par préfixe
 * On utilise une approche différente si nécessaire
 *
 * OPTIMISATION: Utilise un cache pour éviter trop d'appels list() coûteux
 */
export const listBlobFiles = async (
  prefix: string = 'uploads/'
): Promise<
  Array<{
    id: string;
    name: string;
    path: string;
    type: string;
    size: number;
    lastModified: string;
  }>
> => {
  if (!isBlobConfigured) {
    return [];
  }

  // Vérifier le cache
  if (listBlobCache && Date.now() - listBlobCache.timestamp < LIST_BLOB_CACHE_TTL) {
    logger.debug('[BLOB] Utilisation du cache pour listBlobFiles');
    return listBlobCache.data;
  }

  try {
    // Vercel Blob list() retourne tous les blobs avec pagination
    const { blobs } = await list({
      prefix,
    });

    // Filtrer pour ne garder que les images
    const imageExtensions = ['.webp', '.jpg', '.jpeg', '.png', '.gif']; // WebP en priorité
    const imageFiles = blobs.filter((blob) => {
      const ext = blob.pathname.toLowerCase().substring(blob.pathname.lastIndexOf('.'));
      return imageExtensions.includes(ext);
    });

    // Créer un objet pour chaque image avec des métadonnées
    const result = imageFiles.map((blob) => {
      const filename = blob.pathname;

      // Déterminer le type d'image basé sur le nom du fichier
      let type = 'Autre';
      if (filename.includes('cover')) type = 'Couverture';
      else if (filename.includes('event')) type = 'Événement';
      else if (filename.includes('staff')) type = 'Staff';

      return {
        id: filename,
        name: filename,
        path: blob.url,
        type,
        size: blob.size || 0,
        lastModified: blob.uploadedAt?.toISOString() || new Date().toISOString(),
      };
    });

    // Mettre en cache le résultat
    // Note: On utilise une variable module pour le cache (simple mais efficace)
    // En production, le cache sera partagé entre les instances de la fonction
    listBlobCache = {
      data: result,
      timestamp: Date.now(),
    };

    return result;
  } catch (error) {
    logger.error('[BLOB] Erreur lors de la liste des fichiers:', error);
    return [];
  }
};

/**
 * Obtenir les métadonnées d'un fichier Blob
 */
export const getBlobMetadata = async (
  url: string
): Promise<{
  size: number;
  uploadedAt: Date;
  contentType: string;
} | null> => {
  if (!isBlobConfigured) {
    return null;
  }

  try {
    const blob = await head(url);
    return {
      size: blob.size,
      uploadedAt: blob.uploadedAt,
      contentType: blob.contentType || 'application/octet-stream',
    };
  } catch (error) {
    logger.error('[BLOB] Erreur lors de la récupération des métadonnées:', error);
    return null;
  }
};
