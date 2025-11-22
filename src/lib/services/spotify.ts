/**
 * Service Spotify pour récupérer les releases d'un artiste
 */

import { logger } from '@/lib/logger';

import type {
  SpotifyTokenResponse,
  SpotifyArtist,
  SpotifyReleasesResponse,
  SpotifyArtistSearchResponse,
  SpotifyAlbum,
} from './types';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

// Cache du token en mémoire
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Obtient un token d'accès Spotify via Client Credentials flow
 */
export async function getSpotifyToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('SPOTIFY_CLIENT_ID et SPOTIFY_CLIENT_SECRET doivent être configurés');
  }

  // Vérifier le cache
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  try {
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Erreur lors de la récupération du token Spotify:', errorText);
      throw new Error(`Erreur Spotify token: ${response.status}`);
    }

    const data = (await response.json()) as SpotifyTokenResponse;

    // Mettre en cache avec une marge de sécurité (expire 5 min avant)
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 300) * 1000,
    };

    return data.access_token;
  } catch (error) {
    logger.error('Erreur lors de la récupération du token Spotify:', error);
    throw error;
  }
}

/**
 * Recherche un artiste par nom
 */
export async function searchArtist(name: string): Promise<SpotifyArtist | null> {
  try {
    const token = await getSpotifyToken();
    const encodedName = encodeURIComponent(name);
    const url = `${SPOTIFY_API_BASE}/search?q=${encodedName}&type=artist&limit=1`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      logger.error("Erreur lors de la recherche d'artiste Spotify:", response.status);
      return null;
    }

    const data = (await response.json()) as SpotifyArtistSearchResponse;
    return data.artists.items[0] || null;
  } catch (error) {
    logger.error("Erreur lors de la recherche d'artiste Spotify:", error);
    return null;
  }
}

/**
 * Récupère les albums et singles d'un artiste
 */
export async function getArtistReleases(
  artistId: string,
  includeGroups: ('album' | 'single' | 'compilation')[] = ['album', 'single'],
  limit = 50
): Promise<SpotifyAlbum[]> {
  try {
    const token = await getSpotifyToken();
    const groupsParam = includeGroups.join(',');
    const url = `${SPOTIFY_API_BASE}/artists/${artistId}/albums?include_groups=${groupsParam}&limit=${limit}&market=FR`;

    const allAlbums: SpotifyAlbum[] = [];
    let nextUrl: string | null = url;

    while (nextUrl && allAlbums.length < limit) {
      const response = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        logger.error('Erreur lors de la récupération des releases Spotify:', response.status);
        break;
      }

      const data = (await response.json()) as SpotifyReleasesResponse;
      allAlbums.push(...data.items);
      nextUrl = data.items.length > 0 ? (data as unknown as { next: string | null }).next : null;
    }

    // Trier par date de sortie (plus récent en premier)
    return allAlbums.sort((a, b) => {
      const dateA = new Date(a.release_date).getTime();
      const dateB = new Date(b.release_date).getTime();
      return dateB - dateA;
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des releases Spotify:', error);
    throw error;
  }
}

/**
 * Récupère les tracks d'un album
 */
export async function getAlbumTracks(
  albumId: string
): Promise<Array<{ id: string; name: string; duration_ms: number }>> {
  try {
    const token = await getSpotifyToken();
    const url = `${SPOTIFY_API_BASE}/albums/${albumId}/tracks?limit=50`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      logger.error('Erreur lors de la récupération des tracks:', response.status);
      return [];
    }

    const data = (await response.json()) as {
      items: Array<{ id: string; name: string; duration_ms: number }>;
    };

    return data.items;
  } catch (error) {
    logger.error('Erreur lors de la récupération des tracks:', error);
    return [];
  }
}

/**
 * Récupère les audio features d'une track (BPM, key, mode, etc.)
 */
export async function getTrackAudioFeatures(trackId: string): Promise<{
  tempo?: number; // BPM
  key?: number; // 0-11 (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
  mode?: number; // 0 = minor, 1 = major
  time_signature?: number;
} | null> {
  try {
    const token = await getSpotifyToken();
    const url = `${SPOTIFY_API_BASE}/audio-features/${trackId}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // L'API audio-features peut retourner 403 avec Client Credentials flow
      // si le track n'est pas disponible ou nécessite un scope différent
      if (response.status === 403) {
        logger.warn(
          'Audio features non disponibles (403) - peut nécessiter OAuth ou track non disponible'
        );
      } else {
        logger.warn('Erreur lors de la récupération des audio features:', response.status);
      }
      return null;
    }

    const data = (await response.json()) as {
      tempo?: number;
      key?: number;
      mode?: number;
      time_signature?: number;
    };

    return {
      tempo: data.tempo ? Math.round(data.tempo) : undefined,
      key: data.key,
      mode: data.mode,
      time_signature: data.time_signature,
    };
  } catch (error) {
    logger.error('Erreur lors de la récupération des audio features:', error);
    return null;
  }
}

/**
 * Récupère les genres d'un album depuis Spotify
 */
export async function getAlbumGenres(albumId: string): Promise<string[]> {
  try {
    const token = await getSpotifyToken();
    const url = `${SPOTIFY_API_BASE}/albums/${albumId}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      logger.warn("Erreur lors de la récupération des genres de l'album:", response.status);
      return [];
    }

    const data = (await response.json()) as { genres?: string[] };
    return data.genres || [];
  } catch (error) {
    logger.error("Erreur lors de la récupération des genres de l'album:", error);
    return [];
  }
}

/**
 * Convertit une clé musicale (0-11) en notation Camelot/standard
 */
export function formatMusicalKey(
  key: number | undefined,
  mode: number | undefined
): string | undefined {
  if (key === undefined || mode === undefined) return undefined;

  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const keyName = keys[key];
  const modeName = mode === 1 ? 'maj' : 'min';

  return `${keyName} ${modeName}`;
}

/**
 * Convertit un type d'album Spotify en type de track interne
 */
export function mapSpotifyAlbumTypeToTrackType(
  albumType: string,
  isSingle: boolean
): 'single' | 'ep' | 'album' | 'remix' | 'live' | 'djset' | 'video' {
  if (albumType === 'single' || isSingle) {
    return 'single';
  }
  if (albumType === 'compilation') {
    return 'ep';
  }
  return 'album';
}
