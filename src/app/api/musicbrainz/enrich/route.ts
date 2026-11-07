import { NextResponse, NextRequest } from 'next/server';

import { requireDbAdmin } from '@/lib/api/requireDbAdmin';
import { logger } from '@/lib/logger';
import { enrichTrackData } from '@/lib/services/musicbrainz';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Authentification (rôle admin relu en base)
    const { error: authError } = await requireDbAdmin();
    if (authError) return authError;

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
