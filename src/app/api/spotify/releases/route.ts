import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import {
  getArtistReleases,
  searchArtist,
  mapSpotifyAlbumTypeToTrackType,
} from '@/lib/services/spotify';
import type { DetectedRelease } from '@/lib/services/types';

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
    logger.debug('[SPOTIFY RELEASES] Cache invalidé pour:', key);
  } else {
    Object.keys(cache).forEach((k) => delete cache[k]);
    logger.debug('[SPOTIFY RELEASES] Cache complètement vidé');
  }
}

async function getUser() {
  const session = await auth();
  return session?.user;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(req.url);
    const artistId = url.searchParams.get('artistId') || process.env.SPOTIFY_ARTIST_ID;
    const artistName = url.searchParams.get('artistName');

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

    if (!artistId && !artistName) {
      return NextResponse.json({ error: 'artistId ou artistName requis' }, { status: 400 });
    }

    // Vérifier le cache
    const cacheKey = `spotify_releases_${artistId || artistName}`;
    const cachedData = getCachedData(cacheKey);

    // Pour le debug : vérifier si on force le refresh
    const forceRefresh = url.searchParams.get('refresh') === 'true';
    if (cachedData && !forceRefresh) {
      logger.debug('[SPOTIFY RELEASES] Utilisation du cache, releases:', cachedData.length);
      logger.debug(
        '[SPOTIFY RELEASES] Releases scheduled dans le cache:',
        cachedData.filter((r) => r.isScheduled).length
      );
      return NextResponse.json({ releases: cachedData });
    }

    if (forceRefresh) {
      logger.debug('[SPOTIFY RELEASES] Refresh forcé, invalidation du cache');
      clearCache(cacheKey);
    }

    // Si on a seulement le nom, chercher l'ID
    let finalArtistId = artistId;
    if (!finalArtistId && artistName) {
      const artist = await searchArtist(artistName);
      if (!artist) {
        return NextResponse.json(
          { error: `Artiste "${artistName}" non trouvé sur Spotify` },
          { status: 404 }
        );
      }
      finalArtistId = artist.id;
    }

    if (!finalArtistId) {
      return NextResponse.json({ error: "Impossible de trouver l'artiste" }, { status: 404 });
    }

    // Récupérer les releases
    const albums = await getArtistReleases(finalArtistId, ['album', 'single'], 50);

    // Récupérer les URLs Spotify existantes dans la DB
    const spotifyUrls = albums.map((album) => album.external_urls.spotify);

    // Vérifier quelles URLs existent déjà dans notre base de données
    // Utilisation de findMany avec whereIn pour compatibilité SQLite et PostgreSQL
    const existingPlatforms =
      spotifyUrls.length > 0
        ? await prisma.trackPlatform.findMany({
            where: {
              platform: 'spotify',
              url: {
                in: spotifyUrls,
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
    const releases: DetectedRelease[] = albums.map((album) => {
      const isSingle = album.album_type === 'single' || album.total_tracks === 1;
      const trackType = mapSpotifyAlbumTypeToTrackType(album.album_type, isSingle);

      // Joindre tous les artistes collaborateurs (séparés par ", " ou " & " pour le dernier)
      const allArtists = album.artists.map((a) => a.name).filter(Boolean);
      const artistString =
        allArtists.length > 0
          ? allArtists.length > 1
            ? allArtists.slice(0, -1).join(', ') + ' & ' + allArtists[allArtists.length - 1]
            : allArtists[0]
          : 'Unknown';

      // Déterminer si la release est dans le futur
      // Gérer les différents niveaux de précision (year, month, day)
      let releaseDateObj: Date;
      let isScheduled = false;
      try {
        if (album.release_date_precision === 'day') {
          releaseDateObj = new Date(album.release_date);
        } else if (album.release_date_precision === 'month') {
          // Si seulement mois/année, utiliser le 1er du mois
          releaseDateObj = new Date(album.release_date + '-01');
        } else {
          // Si seulement année, utiliser le 1er janvier
          releaseDateObj = new Date(album.release_date + '-01-01');
        }
        releaseDateObj.setHours(0, 0, 0, 0);
        isScheduled = releaseDateObj > now;

        logger.debug(
          `[SPOTIFY RELEASES] ${album.name}: date=${album.release_date}, precision=${album.release_date_precision}, parsed=${releaseDateObj.toISOString()}, now=${now.toISOString()}, isScheduled=${isScheduled}`
        );
      } catch (error) {
        logger.warn(
          `[SPOTIFY RELEASES] Erreur parsing date pour ${album.name}: ${album.release_date}`,
          error
        );
        // En cas d'erreur, considérer comme non planifié
        releaseDateObj = new Date();
        isScheduled = false;
      }

      return {
        id: album.id,
        title: album.name,
        artist: artistString,
        releaseDate: album.release_date,
        type: trackType,
        spotifyUrl: album.external_urls.spotify,
        spotifyId: album.id,
        imageUrl: album.images[0]?.url,
        exists: existingUrls.has(album.external_urls.spotify),
        isScheduled: isScheduled, // Nouveau champ pour indiquer si c'est une pré-release
      };
    });

    logger.debug('[SPOTIFY RELEASES] Releases finales:', releases.length);
    logger.debug(
      '[SPOTIFY RELEASES] Releases scheduled:',
      releases.filter((r) => r.isScheduled).length
    );
    logger.debug(
      '[SPOTIFY RELEASES] Détails scheduled:',
      releases
        .filter((r) => r.isScheduled)
        .map((r) => ({ title: r.title, date: r.releaseDate, isScheduled: r.isScheduled }))
    );

    setCachedData(cacheKey, releases);

    return NextResponse.json({ releases });
  } catch (error) {
    logger.error('Erreur dans la route Spotify releases:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST /api/spotify/releases - Invalider le cache
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
    const { artistId, artistName } = body;

    // Invalider le cache pour un artiste spécifique ou tout le cache
    if (artistId || artistName) {
      const cacheKey = `spotify_releases_${artistId || artistName}`;
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
