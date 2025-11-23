import { Track, MusicPlatform } from './types';

/**
 * Détermine la plateforme prioritaire pour la lecture d'une track
 * Priorité: YouTube > SoundCloud
 *
 * @param track - La track pour laquelle déterminer la plateforme
 * @returns La plateforme prioritaire ou null si aucune n'est disponible
 */
export function selectPreferredPlatform(track: Track): MusicPlatform | null {
  if (!track.platforms) {
    return null;
  }

  // Ordre de priorité: YouTube > SoundCloud
  const priorityOrder: MusicPlatform[] = ['youtube', 'soundcloud'];

  for (const platform of priorityOrder) {
    if (track.platforms[platform]?.url) {
      return platform;
    }
  }

  return null;
}
