// Helper DRY pour trouver l'URL de l'image originale avec fallback multi-extension
// Utilisable pour events, music, etc.

export const findOriginalImageUrl = async (
  imageId: string,
  extensions: string[] = ['jpg', 'jpeg', 'png', 'webp'],
  withOriSuffix: boolean = true
): Promise<string | null> => {
  for (const ext of extensions) {
    const url = withOriSuffix ? `/uploads/${imageId}-ori.${ext}` : `/uploads/${imageId}.${ext}`;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok) return url;
    } catch (e) {
      // Ignorer les erreurs réseau pour continuer le fallback
    }
  }
  return null;
};
