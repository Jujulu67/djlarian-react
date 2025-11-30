/**
 * Fonction utilitaire centralisée pour générer les URLs d'images
 *
 * Détecte automatiquement si l'imageId est déjà une URL complète (http/https)
 * Sinon, utilise la route API /api/images/[imageId] qui gère automatiquement
 * le blob en production et le dossier local en développement
 *
 * @param imageId - L'ID de l'image (UUID) ou une URL complète
 * @param options - Options pour la génération de l'URL
 * @returns L'URL de l'image à utiliser
 */
export function getImageUrl(
  imageId: string | null | undefined,
  options?: {
    original?: boolean;
    extension?: string;
    cacheBust?: string | number;
  }
): string | null {
  if (!imageId) {
    return null;
  }

  // Si c'est déjà une URL complète (http/https), utiliser le proxy pour éviter les problèmes CORS
  if (imageId.startsWith('http://') || imageId.startsWith('https://')) {
    // Pour les URLs Google OAuth, utiliser le proxy
    if (imageId.includes('googleusercontent.com')) {
      return `/api/images/proxy?url=${encodeURIComponent(imageId)}`;
    }
    // Pour les autres URLs externes, retourner directement (si pas de problème CORS)
    return imageId;
  }

  // Si c'est un chemin local (/uploads/, /images/), le retourner tel quel
  // Next.js sert automatiquement ces fichiers depuis le dossier public/
  if (imageId.startsWith('/uploads/') || imageId.startsWith('/images/')) {
    // Ajouter le cache busting si fourni
    if (options?.cacheBust) {
      const separator = imageId.includes('?') ? '&' : '?';
      return `${imageId}${separator}t=${options.cacheBust}`;
    }
    return imageId;
  }

  // Construire l'URL de la route API pour les imageId (UUID)
  let url = `/api/images/${imageId}`;

  // Ajouter le paramètre original si demandé
  if (options?.original) {
    url += '?original=true';
  }

  // Ajouter le cache busting si fourni
  if (options?.cacheBust) {
    const separator = options.original ? '&' : '?';
    url += `${separator}t=${options.cacheBust}`;
  }

  return url;
}

/**
 * Helper pour obtenir l'URL d'une image originale
 */
export function getOriginalImageUrl(
  imageId: string | null | undefined,
  cacheBust?: string | number
): string | null {
  return getImageUrl(imageId, { original: true, cacheBust });
}
