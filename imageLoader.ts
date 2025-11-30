/**
 * Loader personnalisé pour Next.js Image
 *
 * Gère les images servies via l'API (/api/images/...) et les URLs externes
 * Les images locales (/uploads/, /images/) sont gérées par Next.js par défaut
 */
export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  // Si c'est une URL externe (http/https), la retourner telle quelle
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  // Si c'est une route API (/api/images/...), la retourner telle quelle
  // Next.js ne peut pas optimiser ces images, mais elles fonctionneront
  // On préserve les query strings (cache busting, etc.)
  if (src.startsWith('/api/')) {
    return src;
  }

  // Pour les images locales (/uploads/, /images/), retourner directement l'URL
  // Next.js les sert automatiquement depuis le dossier public/
  // Pas besoin de passer par /_next/image car ces fichiers sont déjà optimisés (WebP)
  if (src.startsWith('/uploads/') || src.startsWith('/images/')) {
    return src;
  }

  // Par défaut, retourner l'URL telle quelle
  return src;
}
