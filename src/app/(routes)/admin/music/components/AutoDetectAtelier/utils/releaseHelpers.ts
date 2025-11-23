import { emptyTrackForm } from '@/lib/utils/music-helpers';
import { extractPlatformId } from '@/lib/utils/music-service';
import type { Track, MusicPlatform } from '@/lib/utils/types';
import type { DetectedRelease, PlatformSearchResult } from '@/lib/services/types';

/**
 * Crée les données de formulaire de base depuis une release détectée
 */
export function createBaseFormData(release: DetectedRelease): Omit<Track, 'id'> & { id?: string } {
  return {
    ...emptyTrackForm,
    title: release.title,
    artist: release.artist,
    releaseDate: release.releaseDate,
    type: release.type,
    platforms: {
      ...(release.spotifyUrl && {
        spotify: {
          url: release.spotifyUrl,
          embedId: release.spotifyId,
        },
      }),
      ...(release.soundcloudUrl && {
        soundcloud: {
          url: release.soundcloudUrl,
          embedId: release.soundcloudId,
        },
      }),
      ...(release.youtubeUrl && {
        youtube: {
          url: release.youtubeUrl,
          embedId: release.youtubeId,
        },
      }),
    },
    imageId: undefined,
  };
}

/**
 * Met à jour les plateformes avec les résultats de recherche
 */
export function updatePlatformsFromSearch(
  basePlatforms: Track['platforms'],
  searchResults: PlatformSearchResult
): Track['platforms'] {
  const updatedPlatforms: Track['platforms'] = { ...basePlatforms };

  if (searchResults.youtube) {
    updatedPlatforms.youtube = {
      url: searchResults.youtube.url,
      embedId: searchResults.youtube.embedId,
    };
  }
  if (searchResults.soundcloud) {
    updatedPlatforms.soundcloud = {
      url: searchResults.soundcloud.url,
      embedId: searchResults.soundcloud.embedId,
    };
  }
  if (searchResults.apple) {
    updatedPlatforms.apple = {
      url: searchResults.apple.url,
    };
  }
  if (searchResults.deezer) {
    updatedPlatforms.deezer = {
      url: searchResults.deezer.url,
      embedId: searchResults.deezer.embedId,
    };
  }

  return updatedPlatforms;
}

/**
 * Convertit les plateformes du formulaire en format API
 */
export function convertPlatformsToApiFormat(
  platforms: Track['platforms']
): Array<{ platform: MusicPlatform; url: string; embedId?: string }> {
  return Object.entries(platforms || {})
    .filter(([, v]) => v?.url)
    .map(([p, v]) => ({
      platform: p as MusicPlatform,
      url: v!.url,
      embedId: extractPlatformId(v!.url, p as MusicPlatform) || v!.embedId,
    }));
}

/**
 * Valide et prépare l'imageId pour l'API
 */
export function prepareImageIdForApi(
  imageId: string | undefined,
  imageUrl: string | undefined
): { imageId?: string; thumbnailUrl?: string } {
  const imageIdToSend =
    imageId &&
    /^[a-z0-9]+-[a-z0-9]+$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      imageId
    )
      ? imageId
      : undefined;

  const thumbnailUrl = !imageIdToSend && imageUrl ? imageUrl : undefined;

  return { imageId: imageIdToSend, thumbnailUrl };
}
