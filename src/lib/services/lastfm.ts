/**
 * Service Last.fm pour récupérer les tags et genres
 */

import { logger } from '@/lib/logger';

import type { LastFmTrackInfoResponse, LastFmTrack } from './types';

const LASTFM_API_BASE = 'https://ws.audioscrobbler.com/2.0/';

// Fonction helper pour obtenir la clé API dynamiquement
// Permet aux tests de modifier process.env.LASTFM_API_KEY après l'import du module
const getApiKey = () => process.env.LASTFM_API_KEY;

/**
 * Récupère les tags d'une track depuis Last.fm
 */
export async function getTrackTags(artist: string, title: string): Promise<string[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    logger.warn('LASTFM_API_KEY non configurée, skip Last.fm');
    return [];
  }

  try {
    const params = new URLSearchParams({
      method: 'track.getInfo',
      api_key: apiKey,
      artist,
      track: title,
      format: 'json',
    });

    const url = `${LASTFM_API_BASE}?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      logger.error('Erreur lors de la récupération Last.fm:', response.status);
      return [];
    }

    const data = (await response.json()) as LastFmTrackInfoResponse;

    if (data.track?.tags?.tag) {
      // Last.fm peut retourner tag comme un objet unique ou un tableau
      const tagArray = Array.isArray(data.track.tags.tag)
        ? data.track.tags.tag
        : [data.track.tags.tag];
      return tagArray.map((tag) => tag.name).slice(0, 10);
    }

    return [];
  } catch (error) {
    logger.error('Erreur lors de la récupération Last.fm:', error);
    return [];
  }
}

/**
 * Récupère les informations complètes d'une track depuis Last.fm
 */
export async function getTrackInfo(
  artist: string,
  title: string
): Promise<{
  tags?: string[];
  description?: string;
  duration?: number;
} | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }

  try {
    const params = new URLSearchParams({
      method: 'track.getInfo',
      api_key: apiKey,
      artist,
      track: title,
      format: 'json',
    });

    const url = `${LASTFM_API_BASE}?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      logger.error('Erreur lors de la récupération Last.fm:', response.status);
      return null;
    }

    const data = (await response.json()) as LastFmTrackInfoResponse;

    if (!data.track) {
      return null;
    }

    const result: {
      tags?: string[];
      description?: string;
      duration?: number;
    } = {};

    if (data.track.tags?.tag) {
      // Last.fm peut retourner tag comme un objet unique ou un tableau
      const tagArray = Array.isArray(data.track.tags.tag)
        ? data.track.tags.tag
        : [data.track.tags.tag];
      result.tags = tagArray.map((tag) => tag.name).slice(0, 10);
    }

    if (data.track.wiki?.summary) {
      // Nettoyer le HTML et les balises [url] de Last.fm
      result.description = data.track.wiki.summary
        .replace(/\[url[^\]]*\]/g, '')
        .replace(/\[\/url\]/g, '')
        .replace(/<[^>]*>/g, '')
        .trim();
    }

    if (data.track.duration) {
      result.duration = parseInt(data.track.duration, 10);
    }

    return result;
  } catch (error) {
    logger.error('Erreur lors de la récupération Last.fm:', error);
    return null;
  }
}
