import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';

async function getUser() {
  const session = await auth();
  return session?.user;
}

/**
 * Route pour récupérer les releases planifiées sur Spotify
 * Note: Spotify for Artists API nécessite OAuth et un accès vérifié.
 * Pour l'instant, on retourne un message indiquant que cette fonctionnalité
 * nécessite une configuration supplémentaire.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(req.url);
    const artistId = url.searchParams.get('artistId') || process.env.SPOTIFY_ARTIST_ID;

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

    if (!artistId) {
      return NextResponse.json({ error: 'artistId requis' }, { status: 400 });
    }

    // TODO: Implémenter l'accès à Spotify for Artists API
    // Cela nécessite:
    // 1. OAuth flow avec Spotify
    // 2. Accès vérifié au compte artiste
    // 3. Utilisation de l'API Spotify for Artists (endpoint spécifique)

    logger.warn('Spotify for Artists API non implémentée (nécessite OAuth et accès vérifié)');

    return NextResponse.json({
      releases: [],
      message: 'Spotify for Artists API nécessite une configuration OAuth et un accès vérifié',
    });
  } catch (error) {
    logger.error('Erreur dans la route Spotify scheduled:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
