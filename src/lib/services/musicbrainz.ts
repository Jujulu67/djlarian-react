/**
 * Service MusicBrainz pour enrichir les métadonnées des tracks
 */

import { logger } from '@/lib/logger';

import type { MusicBrainzSearchResponse, MusicBrainzRelease } from './types';

const MUSICBRAINZ_API_BASE = 'https://musicbrainz.org/ws/2';
const USER_AGENT = process.env.MUSICBRAINZ_USER_AGENT || 'DJLarianApp/1.0.0 (https://djlarian.com)';

/**
 * Recherche une release sur MusicBrainz
 */
export async function searchRelease(
  artist: string,
  title: string
): Promise<MusicBrainzRelease | null> {
  try {
    const query = `artist:"${artist}" AND release:"${title}"`;
    const encodedQuery = encodeURIComponent(query);
    const url = `${MUSICBRAINZ_API_BASE}/release?query=${encodedQuery}&limit=1&fmt=json`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      logger.error('Erreur lors de la recherche MusicBrainz:', response.status);
      return null;
    }

    const data = (await response.json()) as MusicBrainzSearchResponse;

    if (data.releases && data.releases.length > 0) {
      return data.releases[0];
    }

    return null;
  } catch (error) {
    logger.error('Erreur lors de la recherche MusicBrainz:', error);
    return null;
  }
}

/**
 * Enrichit les données d'une track avec les informations MusicBrainz
 */
export async function enrichTrackData(
  artist: string,
  title: string
): Promise<{
  genres?: string[];
  tags?: string[];
  releaseDate?: string;
  type?: string;
}> {
  try {
    const release = await searchRelease(artist, title);

    if (!release) {
      return {};
    }

    const result: {
      genres?: string[];
      tags?: string[];
      releaseDate?: string;
      type?: string;
    } = {};

    // Extraire les tags
    if (release['tag-list'] && release['tag-list'].length > 0) {
      result.tags = release['tag-list']
        .map((tag) => tag.name)
        .filter((name) => name.length > 0)
        .slice(0, 10); // Limiter à 10 tags
    }

    // Utiliser les tags comme genres si disponibles
    if (result.tags) {
      result.genres = result.tags;
    }

    // Extraire la date de sortie
    if (release['release-group']?.['first-release-date']) {
      result.releaseDate = release['release-group']['first-release-date'];
    } else if (release.date) {
      result.releaseDate = release.date;
    }

    // Extraire le type
    if (release['release-group']?.['primary-type']) {
      result.type = release['release-group']['primary-type'];
    }

    return result;
  } catch (error) {
    logger.error("Erreur lors de l'enrichissement MusicBrainz:", error);
    return {};
  }
}
