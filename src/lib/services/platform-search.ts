/**
 * Service de recherche multi-plateformes pour trouver les liens d'une track
 */

import { logger } from '@/lib/logger';
import { extractPlatformId } from '@/lib/utils/music-service';

import type { PlatformSearchResult } from './types';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const DEEZER_API_BASE = 'https://api.deezer.com';
const ITUNES_API_BASE = 'https://itunes.apple.com/search';

/**
 * Recherche une track sur YouTube
 */
export async function searchYouTube(
  artist: string,
  title: string
): Promise<PlatformSearchResult['youtube'] | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    logger.warn('YOUTUBE_API_KEY non configurée, skip YouTube');
    return null;
  }

  try {
    const query = `${artist} ${title}`;
    const encodedQuery = encodeURIComponent(query);
    const url = `${YOUTUBE_API_BASE}/search?part=snippet&q=${encodedQuery}&type=video&maxResults=1&key=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      logger.error('Erreur lors de la recherche YouTube:', response.status);
      return null;
    }

    const data = (await response.json()) as {
      items?: Array<{
        id: { videoId: string };
        snippet: {
          title: string;
          thumbnails?: {
            high?: { url: string };
            default?: { url: string };
          };
        };
      }>;
    };

    if (data.items && data.items.length > 0) {
      const video = data.items[0];
      const videoId = video.id.videoId;
      return {
        url: `https://www.youtube.com/watch?v=${videoId}`,
        embedId: videoId,
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url,
      };
    }

    return null;
  } catch (error) {
    logger.error('Erreur lors de la recherche YouTube:', error);
    return null;
  }
}

/**
 * Extrait les noms d'artistes individuels depuis une string d'artistes
 * Gère les formats: "Artist1, Artist2 & Artist3" ou "Artist1 & Artist2"
 */
function extractArtists(artistString: string): string[] {
  // Séparer par ", " et " & " pour obtenir tous les artistes
  return artistString
    .split(/,\s*|\s+&\s+/)
    .map((a) => a.trim())
    .filter((a) => a.length > 0);
}

/**
 * Recherche une track sur SoundCloud
 *
 * Note: L'API SoundCloud nécessite une authentification OAuth 2.1 et a des problèmes connus.
 * On utilise Google Custom Search API si disponible, sinon on retourne null pour éviter les faux liens 404.
 *
 * Pour activer la recherche SoundCloud:
 * - Configurer GOOGLE_SEARCH_API_KEY et GOOGLE_SEARCH_CX dans .env.local
 * - Ou utiliser l'API SoundCloud directement (nécessite OAuth 2.1 et approbation)
 *
 * La recherche essaie avec tous les artistes de la track (collaborateurs) pour maximiser les chances de trouver un lien valide.
 * Par exemple, si la track est "I Lied" par "STK, Larian & Autre", on cherchera avec "STK", "Larian" et "Autre" individuellement.
 */
export async function searchSoundCloud(
  artist: string,
  title: string
): Promise<PlatformSearchResult['soundcloud'] | null> {
  try {
    // Utiliser Google Custom Search API si disponible
    const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const googleCx = process.env.GOOGLE_SEARCH_CX;

    if (!googleApiKey || !googleCx) {
      // Pas de fallback pour éviter les faux liens 404
      // L'utilisateur devra ajouter manuellement le lien SoundCloud si nécessaire
      logger.debug(
        'Recherche SoundCloud: Google Custom Search API non configurée (GOOGLE_SEARCH_API_KEY et GOOGLE_SEARCH_CX requis)'
      );
      return null;
    }

    // Extraire tous les artistes (collaborateurs)
    const artists = extractArtists(artist);

    // Essayer de rechercher avec chaque artiste individuellement
    // Cela augmente les chances de trouver un lien valide, surtout si la track est uploadée par un collaborateur
    for (const individualArtist of artists) {
      try {
        // Recherche via Google avec site:soundcloud.com
        const query = `site:soundcloud.com "${individualArtist}" "${title}"`;
        const encodedQuery = encodeURIComponent(query);
        const url = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleCx}&q=${encodedQuery}&num=1`;

        const response = await fetch(url);

        if (!response.ok) {
          logger.debug(
            `Recherche SoundCloud: erreur pour ${individualArtist} (${response.status})`
          );
          continue; // Essayer le prochain artiste
        }

        const data = (await response.json()) as {
          items?: Array<{
            link: string;
            title: string;
          }>;
        };

        if (data.items && data.items.length > 0) {
          const result = data.items[0];

          // Vérifier que c'est bien une URL SoundCloud valide
          if (!result.link.includes('soundcloud.com')) {
            logger.debug(
              `Recherche SoundCloud: résultat ne correspond pas à SoundCloud pour ${individualArtist}`
            );
            continue; // Essayer le prochain artiste
          }

          // Extraire l'embed ID depuis l'URL SoundCloud
          // Format: https://soundcloud.com/artist/track-title
          const embedIdMatch = result.link.match(/soundcloud\.com\/([^\/]+)\/([^\/\?]+)/);
          const embedId = embedIdMatch ? `${embedIdMatch[1]}/${embedIdMatch[2]}` : undefined;

          logger.debug(`Recherche SoundCloud: lien trouvé avec l'artiste ${individualArtist}`);
          return {
            url: result.link,
            embedId,
            title: result.title,
          };
        }
      } catch (error) {
        // Si une recherche échoue, continuer avec le prochain artiste
        logger.debug(`Erreur lors de la recherche SoundCloud pour ${individualArtist}:`, error);
        continue;
      }
    }

    // Si aucune recherche individuelle n'a fonctionné, essayer avec tous les artistes ensemble
    const allArtistsQuery = `site:soundcloud.com "${artist}" "${title}"`;
    const encodedQuery = encodeURIComponent(allArtistsQuery);
    const url = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleCx}&q=${encodedQuery}&num=1`;

    const response = await fetch(url);

    if (response.ok) {
      const data = (await response.json()) as {
        items?: Array<{
          link: string;
          title: string;
        }>;
      };

      if (data.items && data.items.length > 0) {
        const result = data.items[0];

        if (result.link.includes('soundcloud.com')) {
          const embedIdMatch = result.link.match(/soundcloud\.com\/([^\/]+)\/([^\/\?]+)/);
          const embedId = embedIdMatch ? `${embedIdMatch[1]}/${embedIdMatch[2]}` : undefined;

          return {
            url: result.link,
            embedId,
            title: result.title,
          };
        }
      }
    }

    logger.debug('Recherche SoundCloud: aucune correspondance trouvée avec aucun artiste');
    return null;
  } catch (error) {
    logger.error('Erreur lors de la recherche SoundCloud:', error);
    return null;
  }
}

/**
 * Recherche une track sur Apple Music via iTunes Search API
 */
export async function searchAppleMusic(
  artist: string,
  title: string
): Promise<PlatformSearchResult['apple'] | null> {
  try {
    const query = `${artist} ${title}`;
    const encodedQuery = encodeURIComponent(query);
    const url = `${ITUNES_API_BASE}?term=${encodedQuery}&media=music&limit=1`;

    const response = await fetch(url);

    if (!response.ok) {
      logger.error('Erreur lors de la recherche Apple Music:', response.status);
      return null;
    }

    const data = (await response.json()) as {
      results?: Array<{
        trackName: string;
        artistName: string;
        trackViewUrl: string;
      }>;
    };

    if (data.results && data.results.length > 0) {
      const track = data.results[0];
      return {
        url: track.trackViewUrl,
        title: track.trackName,
      };
    }

    return null;
  } catch (error) {
    logger.error('Erreur lors de la recherche Apple Music:', error);
    return null;
  }
}

/**
 * Recherche une track sur Deezer
 */
export async function searchDeezer(
  artist: string,
  title: string
): Promise<PlatformSearchResult['deezer'] | null> {
  try {
    const query = `artist:"${artist}" track:"${title}"`;
    const encodedQuery = encodeURIComponent(query);
    const url = `${DEEZER_API_BASE}/search?q=${encodedQuery}&limit=1`;

    const response = await fetch(url);

    if (!response.ok) {
      logger.error('Erreur lors de la recherche Deezer:', response.status);
      return null;
    }

    const data = (await response.json()) as {
      data?: Array<{
        id: number;
        title: string;
        link: string;
      }>;
    };

    if (data.data && data.data.length > 0) {
      const track = data.data[0];
      return {
        url: track.link,
        embedId: track.id.toString(),
        title: track.title,
      };
    }

    return null;
  } catch (error) {
    logger.error('Erreur lors de la recherche Deezer:', error);
    return null;
  }
}

/**
 * Recherche une track sur toutes les plateformes disponibles
 */
export async function searchTrackOnAllPlatforms(
  artist: string,
  title: string
): Promise<PlatformSearchResult> {
  const results: PlatformSearchResult = {};

  // Recherche en parallèle sur toutes les plateformes
  const [youtube, soundcloud, apple, deezer] = await Promise.allSettled([
    searchYouTube(artist, title),
    searchSoundCloud(artist, title),
    searchAppleMusic(artist, title),
    searchDeezer(artist, title),
  ]);

  if (youtube.status === 'fulfilled' && youtube.value) {
    results.youtube = youtube.value;
  }

  if (soundcloud.status === 'fulfilled' && soundcloud.value) {
    results.soundcloud = soundcloud.value;
  }

  if (apple.status === 'fulfilled' && apple.value) {
    results.apple = apple.value;
  }

  if (deezer.status === 'fulfilled' && deezer.value) {
    results.deezer = deezer.value;
  }

  return results;
}
