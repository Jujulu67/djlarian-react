import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { logger } from '@/lib/logger';

const MAX_FILE_SIZE = 128 * 1024 * 1024; // 128 Mo, comme validateAudioFile
const ALLOWED_CONTENT_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave'];
const SAFE_NAME = /^[A-Za-z0-9._-]+$/;

/**
 * POST /api/live/submissions/upload-token
 * Délivre un jeton d'upload client Vercel Blob limité à UN fichier : chemin
 * `live-audio/live-audio-<userId>-…`, format audio, 128 Mo max. Le jeton complet
 * du store (BLOB_READ_WRITE_TOKEN) ne quitte jamais le serveur.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Blob Storage non configuré' }, { status: 503 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) throw new Error('Non authentifié');

        const prefix = `live-audio/live-audio-${userId}-`;
        const name = pathname.slice('live-audio/'.length);
        if (!pathname.startsWith(prefix) || !SAFE_NAME.test(name) || !/\.(mp3|wav)$/i.test(name)) {
          throw new Error('Chemin de fichier non autorisé');
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_FILE_SIZE,
          addRandomSuffix: false,
          allowOverwrite: false,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur';
    const status = message === 'Non authentifié' ? 401 : 400;
    logger.warn('[Live Upload] Jeton refusé:', message);
    return NextResponse.json({ error: message }, { status });
  }
}
