import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { searchSoundCloudArtistTracks } from '@/lib/services/soundcloud';
import type { DetectedRelease } from '@/lib/services/types';

// Configuration pour Vercel: timeout maximum de 5 minutes (300 secondes)
// Nécessaire car Puppeteer peut prendre du temps pour scraper SoundCloud
export const maxDuration = 300;

// Cache simple en mémoire
const cache: Record<string, { data: DetectedRelease[]; timestamp: number }> = {};
const CACHE_TTL = 3600000; // 1 heure

function getCachedData(key: string): DetectedRelease[] | null {
  const cachedItem = cache[key];
  if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_TTL) {
    return cachedItem.data;
  }
  return null;
}

function setCachedData(key: string, data: DetectedRelease[]): void {
  cache[key] = {
    data,
    timestamp: Date.now(),
  };
}

function clearCache(key?: string): void {
  if (key) {
    delete cache[key];
    logger.debug('[SOUNDCLOUD RELEASES] Cache invalidé pour:', key);
  } else {
    Object.keys(cache).forEach((k) => delete cache[k]);
    logger.debug('[SOUNDCLOUD RELEASES] Cache complètement vidé');
  }
}

async function getUser() {
  const session = await auth();
  return session?.user;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(req.url);
    const artistName = url.searchParams.get('artistName');
    const profileUrl = url.searchParams.get('profileUrl');
    const maxResults = parseInt(url.searchParams.get('maxResults') || '100', 10);

    // Authentification
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email as string },
      select: { role: true },
    });

    if (dbUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!artistName && !profileUrl) {
      return NextResponse.json({ error: 'artistName ou profileUrl requis' }, { status: 400 });
    }

    // Vérifier le cache
    const cacheKey = `soundcloud_releases_${artistName || profileUrl}`;
    const cachedData = getCachedData(cacheKey);

    // Pour le debug : vérifier si on force le refresh
    const forceRefresh = url.searchParams.get('refresh') === 'true';
    if (cachedData && !forceRefresh) {
      logger.debug('[SOUNDCLOUD RELEASES] Utilisation du cache, releases:', cachedData.length);
      logger.debug(
        '[SOUNDCLOUD RELEASES] Releases scheduled dans le cache:',
        cachedData.filter((r) => r.isScheduled).length
      );
      return NextResponse.json({ releases: cachedData });
    }

    if (forceRefresh) {
      logger.debug('[SOUNDCLOUD RELEASES] Refresh forcé, invalidation du cache');
      clearCache(cacheKey);
    }

    // Logger l'environnement pour le debug
    logger.debug('[SOUNDCLOUD RELEASES] Environnement:', {
      VERCEL: process.env.VERCEL,
      NODE_ENV: process.env.NODE_ENV,
      artistName: artistName || 'non fourni',
      profileUrl: profileUrl || 'non fourni',
    });

    // Récupérer les tracks SoundCloud
    let tracks: Awaited<ReturnType<typeof searchSoundCloudArtistTracks>>;
    let puppeteerError: string | null = null;

    try {
      tracks = await searchSoundCloudArtistTracks(
        artistName || '',
        profileUrl || undefined,
        maxResults
      );
    } catch (error) {
      logger.error('[SOUNDCLOUD RELEASES] Erreur lors de la recherche de tracks:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue lors de la recherche';
      puppeteerError = errorMessage;

      // Si l'erreur indique que Puppeteer n'est pas disponible, retourner une erreur explicite
      if (
        errorMessage.includes('Puppeteer') ||
        errorMessage.includes('Chromium') ||
        errorMessage.includes('non disponible')
      ) {
        return NextResponse.json(
          {
            error: 'Puppeteer/Chromium non disponible',
            message:
              "Le service de scraping SoundCloud n'est pas disponible. Vérifiez la configuration de Puppeteer sur Vercel.",
            details: errorMessage,
          },
          { status: 503 }
        );
      }

      // Pour les autres erreurs, retourner une erreur générique
      return NextResponse.json(
        {
          error: 'Erreur lors de la récupération des tracks',
          message: errorMessage,
        },
        { status: 500 }
      );
    }

    // Vérifier si le tableau vide est dû à une erreur Puppeteer ou vraiment aucune track
    if (tracks.length === 0) {
      logger.warn('[SOUNDCLOUD RELEASES] Aucune track trouvée', {
        artistName: artistName || 'non fourni',
        profileUrl: profileUrl || 'non fourni',
        puppeteerError,
      });

      // Si on a une erreur Puppeteer, retourner une erreur explicite
      if (puppeteerError) {
        return NextResponse.json(
          {
            error: 'Puppeteer/Chromium non disponible',
            message:
              "Le service de scraping SoundCloud n'est pas disponible. Vérifiez la configuration de Puppeteer sur Vercel.",
            details: puppeteerError,
          },
          { status: 503 }
        );
      }

      // Sinon, retourner un tableau vide (aucune track trouvée)
      return NextResponse.json({ releases: [] });
    }

    // Récupérer les URLs SoundCloud existantes dans la DB
    const soundcloudUrls = tracks.map((track) => track.url);

    // Vérifier quelles URLs existent déjà dans notre base de données
    const existingPlatforms =
      soundcloudUrls.length > 0
        ? await prisma.trackPlatform.findMany({
            where: {
              platform: 'soundcloud',
              url: {
                in: soundcloudUrls,
              },
            },
            select: {
              url: true,
            },
          })
        : [];

    const existingUrls = new Set(existingPlatforms.map((p) => p.url));

    // Date actuelle pour déterminer si une release est passée ou future
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normaliser à minuit pour la comparaison

    // Convertir en format DetectedRelease
    const releases: DetectedRelease[] = tracks.map((track) => {
      // Déterminer si la release est dans le futur
      let releaseDateObj: Date;
      let isScheduled = false;
      try {
        // Parser la date (format peut varier: YYYY-MM-DD, DD/MM/YYYY, etc.)
        if (track.releaseDate) {
          // Essayer de parser différentes formats
          const dateStr = track.releaseDate;
          // Format YYYY-MM-DD
          if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            releaseDateObj = new Date(dateStr);
          } else {
            // Essayer de parser d'autres formats
            releaseDateObj = new Date(dateStr);
          }
          releaseDateObj.setHours(0, 0, 0, 0);
          isScheduled = releaseDateObj > now;
        } else {
          // Si pas de date, considérer comme non planifié
          releaseDateObj = now;
          isScheduled = false;
        }
      } catch (error) {
        logger.warn(
          `[SOUNDCLOUD RELEASES] Erreur parsing date pour ${track.title}: ${track.releaseDate}`,
          error
        );
        // En cas d'erreur, considérer comme non planifié
        releaseDateObj = now;
        isScheduled = false;
      }

      // Utiliser le type détecté ou 'single' par défaut
      const trackType = track.type || 'single';

      return {
        id: track.id,
        title: track.title,
        artist: track.artist,
        releaseDate: track.releaseDate || new Date().toISOString().split('T')[0],
        type: trackType,
        soundcloudUrl: track.url,
        soundcloudId: track.embedId,
        imageUrl: track.imageUrl,
        exists: existingUrls.has(track.url),
        isScheduled: isScheduled,
      };
    });

    logger.debug('[SOUNDCLOUD RELEASES] Releases finales:', releases.length);
    logger.debug(
      '[SOUNDCLOUD RELEASES] Releases scheduled:',
      releases.filter((r) => r.isScheduled).length
    );
    logger.debug(
      '[SOUNDCLOUD RELEASES] Détails scheduled:',
      releases
        .filter((r) => r.isScheduled)
        .map((r) => ({ title: r.title, date: r.releaseDate, isScheduled: r.isScheduled }))
    );

    setCachedData(cacheKey, releases);

    return NextResponse.json({ releases });
  } catch (error) {
    logger.error('Erreur dans la route SoundCloud releases:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST /api/soundcloud/releases - Invalider le cache
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email as string },
      select: { role: true },
    });

    if (dbUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { artistName, profileUrl } = body;

    // Invalider le cache pour un artiste spécifique ou tout le cache
    if (artistName || profileUrl) {
      const cacheKey = `soundcloud_releases_${artistName || profileUrl}`;
      clearCache(cacheKey);
      return NextResponse.json({ success: true, message: `Cache invalidé pour ${cacheKey}` });
    } else {
      clearCache();
      return NextResponse.json({ success: true, message: 'Cache complètement vidé' });
    }
  } catch (error) {
    logger.error("Erreur lors de l'invalidation du cache:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
