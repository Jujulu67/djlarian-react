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

  // Si c'est déjà une URL complète (http/https), la retourner telle quelle
  if (imageId.startsWith('http://') || imageId.startsWith('https://')) {
    return imageId;
  }

  // Construire l'URL de la route API
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
