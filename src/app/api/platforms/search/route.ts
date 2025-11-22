import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { searchTrackOnAllPlatforms } from '@/lib/services/platform-search';

// Cache simple en mémoire
const cache: Record<string, { data: unknown; timestamp: number }> = {};
const CACHE_TTL = 1800000; // 30 minutes

function getCachedData(key: string) {
  const cachedItem = cache[key];
  if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_TTL) {
    return cachedItem.data;
  }
  return null;
}

function setCachedData(key: string, data: unknown): void {
  cache[key] = {
    data,
    timestamp: Date.now(),
  };
}

async function getUser() {
  const session = await auth();
  return session?.user;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
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

    const body = await req.json();
    const { artist, title } = body;

    if (!artist || !title) {
      return NextResponse.json({ error: 'artist et title requis' }, { status: 400 });
    }

    // Vérifier le cache
    const cacheKey = `platform_search_${artist}_${title}`;
    const cachedData = getCachedData(cacheKey);

    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // Rechercher sur toutes les plateformes
    const results = await searchTrackOnAllPlatforms(artist, title);

    setCachedData(cacheKey, results);

    return NextResponse.json(results);
  } catch (error) {
    logger.error('Erreur dans la route platforms/search:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
