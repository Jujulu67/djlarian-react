import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { enrichTrackData } from '@/lib/services/musicbrainz';

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

    const enrichedData = await enrichTrackData(artist, title);

    return NextResponse.json(enrichedData);
  } catch (error) {
    logger.error('Erreur dans la route MusicBrainz enrich:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
