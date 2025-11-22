/**
 * Fonction utilitaire pour récupérer une image de couverture depuis les plateformes
 * Priorité : Spotify > SoundCloud > YouTube
 */

import * as cheerio from 'cheerio';

import { logger } from '@/lib/logger';
import { getSpotifyToken } from '@/lib/services/spotify';
import { extractPlatformId } from '@/lib/utils/music-service';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

export interface ThumbnailResult {
  url: string;
  source: 'spotify' | 'soundcloud' | 'youtube';
}

/**
 * Récupère l'image de couverture depuis Spotify (via API)
 */
async function fetchSpotifyThumbnail(spotifyUrl: string): Promise<string | null> {
  try {
    // Extraire l'album ID depuis l'URL Spotify
    // Format: https://open.spotify.com/album/ALBUM_ID ou https://open.spotify.com/track/TRACK_ID
    const albumMatch = spotifyUrl.match(/album\/([a-zA-Z0-9]+)/);
    const trackMatch = spotifyUrl.match(/track\/([a-zA-Z0-9]+)/);

    if (!albumMatch && !trackMatch) {
      logger.debug(
        "[FETCH THUMBNAIL] Impossible d'extraire l'ID depuis l'URL Spotify:",
        spotifyUrl
      );
      return null;
    }

    const token = await getSpotifyToken();
    let imageUrl: string | null = null;

    // Si c'est un album, récupérer directement
    if (albumMatch) {
      const albumId = albumMatch[1];
      const url = `${SPOTIFY_API_BASE}/albums/${albumId}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = (await response.json()) as {
          images?: Array<{ url: string; height: number; width: number }>;
        };
        // Prendre la plus grande image disponible
        imageUrl = data.images?.[0]?.url || null;
      }
    } else if (trackMatch) {
      // Si c'est une track, récupérer l'album associé
      const trackId = trackMatch[1];
      const url = `${SPOTIFY_API_BASE}/tracks/${trackId}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = (await response.json()) as {
          album?: {
            images?: Array<{ url: string; height: number; width: number }>;
          };
        };
        imageUrl = data.album?.images?.[0]?.url || null;
      }
    }

    if (imageUrl) {
      logger.debug('[FETCH THUMBNAIL] Image Spotify trouvée:', imageUrl);
      return imageUrl;
    }

    return null;
  } catch (error) {
    logger.error('[FETCH THUMBNAIL] Erreur récupération Spotify:', error);
    return null;
  }
}

/**
 * Récupère l'image de couverture depuis SoundCloud (via scraping)
 */
async function fetchSoundCloudThumbnail(soundcloudUrl: string): Promise<string | null> {
  try {
    const res = await fetch(soundcloudUrl);
    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    // Essayer meta og:image (meilleure qualité)
    let coverUrl = $('meta[property="og:image"]').attr('content') || null;
    if (!coverUrl) {
      // Fallback sur balise img avatar
      coverUrl = $('img.sc-artwork').attr('src') || null;
    }

    if (coverUrl) {
      logger.debug('[FETCH THUMBNAIL] Image SoundCloud trouvée:', coverUrl);
      return coverUrl;
    }

    return null;
  } catch (error) {
    logger.error('[FETCH THUMBNAIL] Erreur scraping SoundCloud:', error);
    return null;
  }
}

/**
 * Récupère l'image de couverture depuis YouTube
 */
async function fetchYouTubeThumbnail(youtubeUrl: string): Promise<string | null> {
  try {
    const videoId = extractPlatformId(youtubeUrl, 'youtube');
    if (!videoId) {
      logger.debug("[FETCH THUMBNAIL] Impossible d'extraire l'ID YouTube depuis:", youtubeUrl);
      return null;
    }

    // Essayer d'abord maxresdefault.jpg (meilleure qualité)
    let testCoverUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    let testRes = await fetch(testCoverUrl, { method: 'HEAD' });

    if (testRes.ok) {
      logger.debug('[FETCH THUMBNAIL] Image YouTube maxresdefault trouvée:', testCoverUrl);
      return testCoverUrl;
    }

    // Fallback sur hqdefault.jpg
    testCoverUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    testRes = await fetch(testCoverUrl, { method: 'HEAD' });

    if (testRes.ok) {
      logger.debug('[FETCH THUMBNAIL] Image YouTube hqdefault trouvée:', testCoverUrl);
      return testCoverUrl;
    }

    logger.debug('[FETCH THUMBNAIL] Aucune miniature YouTube trouvée pour videoId:', videoId);
    return null;
  } catch (error) {
    logger.error('[FETCH THUMBNAIL] Erreur récupération YouTube:', error);
    return null;
  }
}

/**
 * Récupère une image de couverture depuis les plateformes disponibles
 * Priorité : Spotify > SoundCloud > YouTube
 *
 * @param platforms - Objet avec les URLs des plateformes disponibles
 * @returns L'URL de l'image et sa source, ou null si aucune trouvée
 */
export async function fetchThumbnailFromPlatforms(platforms: {
  spotify?: string;
  soundcloud?: string;
  youtube?: string;
}): Promise<ThumbnailResult | null> {
  // 1. Essayer Spotify en premier (meilleure qualité)
  if (platforms.spotify) {
    const spotifyImage = await fetchSpotifyThumbnail(platforms.spotify);
    if (spotifyImage) {
      return { url: spotifyImage, source: 'spotify' };
    }
  }

  // 2. Essayer SoundCloud
  if (platforms.soundcloud) {
    const soundcloudImage = await fetchSoundCloudThumbnail(platforms.soundcloud);
    if (soundcloudImage) {
      return { url: soundcloudImage, source: 'soundcloud' };
    }
  }

  // 3. Essayer YouTube en dernier
  if (platforms.youtube) {
    const youtubeImage = await fetchYouTubeThumbnail(platforms.youtube);
    if (youtubeImage) {
      return { url: youtubeImage, source: 'youtube' };
    }
  }

  return null;
}
