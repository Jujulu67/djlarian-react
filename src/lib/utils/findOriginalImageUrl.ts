// Helper DRY pour trouver l'URL de l'image originale avec fallback multi-extension
// Utilisable pour events, music, etc.
// Utilise maintenant la route API /api/images/[imageId] qui gère automatiquement blob/local

import { getImageUrl } from './getImageUrl';

export const findOriginalImageUrl = async (
  imageId: string,
  extensions: string[] = ['jpg', 'jpeg', 'png', 'webp'],
  withOriSuffix: boolean = true
): Promise<string | null> => {
  // Utiliser la route API avec le paramètre original si demandé
  if (withOriSuffix) {
    const url = getImageUrl(imageId, { original: true });
    if (url) {
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (res.ok) return url;
      } catch (e) {
        // Ignorer les erreurs réseau pour continuer le fallback
      }
    }
  }

  // Fallback : essayer sans le suffixe -ori
  const url = getImageUrl(imageId);
  if (url) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok) return url;
    } catch (e) {
      // Ignorer les erreurs réseau
    }
  }

  return null;
};
