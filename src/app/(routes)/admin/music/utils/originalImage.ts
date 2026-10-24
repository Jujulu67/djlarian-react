import { getImageUrl } from '@/lib/utils/getImageUrl';

/** Extension du fichier original déduite du Content-Type de la réponse. */
export function getOriginalImageExtension(contentType: string): 'png' | 'jpg' | 'webp' {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  return 'webp';
}

/**
 * Charge l'image originale d'un imageId via la route API.
 * Retourne null si l'image n'existe pas (404) ou en cas d'erreur réseau.
 */
export async function fetchOriginalImage(imageId: string): Promise<File | null> {
  // Utiliser la route API qui gère blob/local automatiquement
  const url = getImageUrl(imageId, { original: true });
  if (url) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        const contentType = res.headers.get('content-type') || 'image/webp';
        const ext = getOriginalImageExtension(contentType);
        return new File([blob], `original.${ext}`, { type: blob.type });
      }
    } catch {
      // ignore - l'image n'existe probablement pas avec ce suffixe
    }
  }
  return null;
}
