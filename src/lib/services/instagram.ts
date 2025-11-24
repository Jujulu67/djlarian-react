/**
 * Service Instagram pour récupérer les posts d'un compte Instagram Business
 */

import { logger } from '@/lib/logger';

import type { InstagramPost } from '@/lib/utils/types';

const INSTAGRAM_GRAPH_API_BASE = 'https://graph.instagram.com';

interface InstagramMediaResponse {
  data: Array<{
    id: string;
    media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
    media_url: string;
    thumbnail_url?: string;
    caption?: string;
    timestamp: string;
    permalink: string;
  }>;
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
  };
}

/**
 * Récupère les posts Instagram d'un compte Business
 */
export async function getInstagramPosts(limit = 6): Promise<InstagramPost[]> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;

  if (!accessToken || !userId) {
    logger.warn('Instagram credentials not configured, skipping Instagram posts');
    return [];
  }

  try {
    const fields = [
      'id',
      'media_type',
      'media_url',
      'thumbnail_url',
      'caption',
      'timestamp',
      'permalink',
    ].join(',');

    const url = `${INSTAGRAM_GRAPH_API_BASE}/${userId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`;

    const response = await fetch(url, {
      next: { revalidate: 3600 }, // Cache pour 1 heure
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Erreur lors de la récupération des posts Instagram:', {
        status: response.status,
        error: errorText,
      });
      return [];
    }

    const data = (await response.json()) as InstagramMediaResponse;

    if (!data.data || data.data.length === 0) {
      logger.info('Aucun post Instagram trouvé');
      return [];
    }

    // Transformer les données Instagram en format interne
    return data.data.map((item) => ({
      id: item.id,
      mediaUrl: item.media_url,
      caption: item.caption || undefined,
      timestamp: item.timestamp,
      permalink: item.permalink,
      mediaType: item.media_type,
      thumbnailUrl: item.thumbnail_url || undefined,
    }));
  } catch (error) {
    logger.error('Erreur lors de la récupération des posts Instagram:', error);
    return [];
  }
}

/**
 * Récupère les enfants d'un carousel (pour afficher la première image)
 */
export async function getCarouselChildren(mediaId: string): Promise<string | null> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!accessToken) {
    return null;
  }

  try {
    const url = `${INSTAGRAM_GRAPH_API_BASE}/${mediaId}/children?fields=media_url,media_type&limit=1&access_token=${accessToken}`;

    const response = await fetch(url, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      data?: Array<{ media_url: string; media_type: string }>;
    };

    if (data.data && data.data.length > 0) {
      return data.data[0].media_url;
    }

    return null;
  } catch (error) {
    logger.error('Erreur lors de la récupération des enfants du carousel:', error);
    return null;
  }
}
