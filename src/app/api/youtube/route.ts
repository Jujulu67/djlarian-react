import { NextResponse } from 'next/server';
import { auth } from '@/auth';

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

// Fonction pour décoder les entités HTML
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
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

// Fonction de cache simple en mémoire
const cache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 3600000; // 1 heure en millisecondes

function getCachedData(key: string) {
  const cachedItem = cache[key];
  if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_TTL) {
    return cachedItem.data;
  }
  return null;
}

function setCachedData(key: string, data: any) {
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

    // Récupérer les vidéos existantes de la base de données
    const videoIds = data.items.map((item: any) => item.id.videoId);

    // Vérifier quelles vidéos existent déjà dans notre base de données
    const existingVideos = await prisma.$queryRaw<{ embedId: string }[]>(
      Prisma.sql`
        SELECT "embedId" FROM "TrackPlatform" 
        WHERE platform = 'youtube' 
        AND "embedId" IN (${Prisma.join(videoIds)})
      `
    );

    // Créer un ensemble d'IDs pour une recherche rapide
    const existingVideoIds = new Set(existingVideos.map((v) => v.embedId));

    const videos = data.items.map((item: any) => ({
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
