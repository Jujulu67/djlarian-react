import { extractPlatformId } from '@/lib/utils/music-service';
import type { MusicPlatform, Track } from '@/lib/utils/types';

type TrackPlatforms = Track['platforms'];

/**
 * Nouvelle map des plateformes après changement de l'URL d'une plateforme.
 * Une URL vide retire la plateforme.
 */
export function updatePlatformUrl(
  platforms: TrackPlatforms,
  platform: MusicPlatform,
  url: string
): TrackPlatforms {
  const embedId = extractPlatformId(url, platform);
  return {
    ...platforms,
    [platform]: url ? { url, embedId } : undefined,
  };
}
