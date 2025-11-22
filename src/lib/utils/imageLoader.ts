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
  if (src.startsWith('/api/')) {
    return src;
  }

  // Pour les images locales (/uploads/, /images/), utiliser l'optimisation Next.js
  // Si width est fourni, utiliser l'optimisation Next.js
  if (src.startsWith('/uploads/') || src.startsWith('/images/')) {
    const params = new URLSearchParams();
    params.set('url', src);
    if (width) {
      params.set('w', width.toString());
    }
    if (quality) {
      params.set('q', quality.toString());
    }
    return `/_next/image?${params.toString()}`;
  }

  // Par défaut, retourner l'URL telle quelle
  return src;
}
