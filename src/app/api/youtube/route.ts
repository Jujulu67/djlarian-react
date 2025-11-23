import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import type { DetectedRelease } from '@/lib/services/types';

// Fonction pour décoder les entités HTML
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/'/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\+/g, ' ')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ndash;/g, '-')
    .replace(/&mdash;/g, '—')
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&ecirc;/g, 'ê')
    .replace(/&agrave;/g, 'à')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&nbsp;/g, ' ');
}

// Fonction pour obtenir l'utilisateur connecté
async function getUser() {
  const session = await auth();
  return session?.user;
}

// Type pour les données de cache YouTube (format legacy pour compatibilité)
type YouTubeCacheData = {
  videos: Array<{
    id: string;
    title: string;
    description: string;
    thumbnail: string | undefined;
    publishedAt: string;
    channelTitle: string;
    exists: boolean;
  }>;
};

// Type pour les releases détectées (nouveau format)
type YouTubeReleasesData = {
  releases: DetectedRelease[];
};

// Fonction de cache simple en mémoire
const cache: Record<string, { data: YouTubeCacheData; timestamp: number }> = {};
const CACHE_TTL = 3600000; // 1 heure en millisecondes

function getCachedData(key: string) {
  const cachedItem = cache[key];
  if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_TTL) {
    return cachedItem.data;
  }
  return null;
}

function setCachedData(key: string, data: YouTubeCacheData) {
  cache[key] = {
    data,
    timestamp: Date.now(),
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(req.url);
    const searchQuery = url.searchParams.get('q') || '';
    const maxResults = parseInt(url.searchParams.get('maxResults') || '100');

    // Authentification
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Vérifier si l'utilisateur a le rôle admin
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email as string },
      select: { role: true },
    });

    if (dbUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Récupérer la clé API YouTube
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      logger.error('YouTube API key not available');
      return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 });
    }

    logger.debug('Using YouTube API key:', apiKey ? 'Available' : 'Not available');

    // Vérifier le cache
    const cacheKey = `youtube_videos_${searchQuery}`;
    const cachedData = getCachedData(cacheKey);

    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // Utiliser l'API YouTube pour rechercher les vidéos
    const youtubeUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
      searchQuery
    )}&type=video&maxResults=${maxResults}&key=${apiKey}`;

    logger.debug('Fetching YouTube data with URL:', youtubeUrl.replace(apiKey || '', '[REDACTED]'));

    const response = await fetch(youtubeUrl);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('YouTube API error:', response.status, errorText);

      if (response.status === 403) {
        return NextResponse.json(
          {
            error: 'YouTube API quota exceeded. Please try again later.',
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          error: `Error fetching YouTube data: ${response.status} ${response.statusText}`,
        },
        { status: 500 }
      );
    }

    const data = await response.json();

    // Type pour les items YouTube API
    type YouTubeSearchItem = {
      id: { videoId: string };
      snippet: {
        title: string;
        description: string;
        thumbnails: {
          high?: { url: string };
          default?: { url: string };
        };
        publishedAt: string;
        channelTitle: string;
      };
    };

    // Récupérer les vidéos existantes de la base de données
    const videoIds = (data.items as YouTubeSearchItem[]).map((item) => item.id.videoId);

    // Vérifier quelles vidéos existent déjà dans notre base de données
    // Utiliser une requête Prisma normale au lieu de raw SQL pour éviter les problèmes avec Prisma.join
    let existingVideoIds = new Set<string>();
    if (videoIds.length > 0) {
      const existingVideos = await prisma.trackPlatform.findMany({
        where: {
          platform: 'youtube',
          embedId: {
            in: videoIds,
          },
        },
        select: {
          embedId: true,
        },
      });
      existingVideoIds = new Set(
        existingVideos.map((v) => v.embedId).filter((id): id is string => id !== null)
      );
    }

    // Vérifier si on veut le format DetectedRelease (nouveau format)
    const format = url.searchParams.get('format') || 'legacy';

    if (format === 'releases') {
      // Nouveau format : DetectedRelease
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const releases: DetectedRelease[] = (data.items as YouTubeSearchItem[]).map((item) => {
        const videoId = item.id.videoId;
        const title = decodeHtmlEntities(item.snippet.title);
        const publishedAt = item.snippet.publishedAt;
        const thumbnail = item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url;

        // Parser la date
        let releaseDateObj: Date;
        let isScheduled = false;
        try {
          releaseDateObj = new Date(publishedAt);
          releaseDateObj.setHours(0, 0, 0, 0);
          isScheduled = releaseDateObj > now;
        } catch (error) {
          releaseDateObj = now;
          isScheduled = false;
        }

        // Détecter le type depuis le titre
        const lowerTitle = title.toLowerCase();
        let type: DetectedRelease['type'] = 'video';
        if (lowerTitle.includes('remix') || lowerTitle.includes('remix by')) {
          type = 'remix';
        } else if (
          lowerTitle.includes('dj set') ||
          lowerTitle.includes('djset') ||
          lowerTitle.includes('mix')
        ) {
          type = 'djset';
        } else if (lowerTitle.includes('live')) {
          type = 'live';
        } else if (lowerTitle.includes('ep')) {
          type = 'ep';
        } else if (lowerTitle.includes('album')) {
          type = 'album';
        } else if (lowerTitle.includes('single')) {
          type = 'single';
        }

        return {
          id: `yt_${videoId}`,
          title,
          artist: decodeHtmlEntities(item.snippet.channelTitle),
          releaseDate: releaseDateObj.toISOString().split('T')[0],
          type,
          youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
          youtubeId: videoId,
          imageUrl: thumbnail,
          exists: existingVideoIds.has(videoId),
          isScheduled,
        };
      });

      return NextResponse.json({ releases });
    }

    // Format legacy (pour compatibilité avec YoutubeAtelier)
    const videos = (data.items as YouTubeSearchItem[]).map((item) => ({
      id: item.id.videoId,
      title: decodeHtmlEntities(item.snippet.title),
      description: decodeHtmlEntities(item.snippet.description),
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
      publishedAt: item.snippet.publishedAt,
      channelTitle: decodeHtmlEntities(item.snippet.channelTitle),
      exists: existingVideoIds.has(item.id.videoId),
    }));

    const result = { videos };
    setCachedData(cacheKey, result);

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error in YouTube API route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
