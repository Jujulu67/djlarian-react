/**
 * Utilitaires pour les composants médias
 */

/**
 * Formate un temps en secondes au format MM:SS
 */
export const formatTime = (seconds: number): string => {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

/**
 * Extrait l'ID d'une vidéo YouTube à partir de son URL
 */
export const extractYoutubeId = (url: string): string | null => {
  if (!url) return null;

  // Cas où l'URL est déjà un ID
  if (url.match(/^[a-zA-Z0-9_-]{11}$/)) {
    return url;
  }

  // Formats standards: youtube.com/watch?v=ID ou youtu.be/ID
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (match && match[1]) {
    return match[1];
  }

  // Formats alternatifs: youtube.com/embed/ID
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch && embedMatch[1]) {
    return embedMatch[1];
  }

  return null;
};

/**
 * Génère une URL d'intégration SoundCloud avec les paramètres appropriés
 */
export const getSoundcloudEmbedUrl = (url: string): string => {
  if (typeof window === 'undefined') return '';

  // Format standard pour les URL d'embed SoundCloud avec API JS
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true&buying=false&sharing=false&download=false&single_active=false&callback=true&allow_api=true&origin=${encodeURIComponent(window.location.origin)}`;
};

/**
 * Convertit le type de piste en libellé visuel
 */
export const getTrackTypeLabel = (type: string): string => {
  switch (type) {
    case 'single':
      return 'Single';
    case 'ep':
      return 'EP';
    case 'album':
      return 'Album';
    case 'remix':
      return 'Remix';
    case 'live':
      return 'Live';
    case 'djset':
      return 'DJ Set';
    case 'video':
      return 'Video';
    default:
      return type;
  }
};
