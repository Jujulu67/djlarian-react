import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import {
  getTrackAudioFeatures,
  getAlbumGenres,
  getAlbumTracks,
  formatMusicalKey,
} from '@/lib/services/spotify';

async function getUser() {
  const session = await auth();
  return session?.user;
}

/**
 * POST /api/spotify/enrich
 * Récupère les détails enrichis d'une release Spotify (BPM, key, genres, description)
 *
 * Note importante: Depuis novembre 2024, Spotify requiert une approbation explicite
 * pour accéder aux endpoints audio-features et audio-analysis, même avec Client Credentials.
 *
 * Pour un petit site vitrine sans contrepartie commerciale, l'approbation peut être difficile à obtenir.
 * Spotify privilégie généralement les applications avec un usage significatif ou commercial.
 *
 * Si vous obtenez une erreur 403, vous pouvez tenter de soumettre une demande d'accès à Spotify:
 * https://community.spotify.com/t5/Spotify-for-Developers/Request-to-Enable-Access-to-Audio-Features-and-Audio-Analysis/td-p/6966479
 *
 * Alternatives:
 * - L'OAuth (Authorization Code Flow) est gratuit mais nécessite une interaction utilisateur (pas adapté pour l'auto-détection)
 * - Les données BPM et clé musicale peuvent être ajoutées manuellement si nécessaire
 * - D'autres APIs tierces (Songstats, etc.) peuvent fournir ces données mais sont généralement payantes
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Authentification
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { albumId, spotifyId } = body;

    if (!albumId && !spotifyId) {
      return NextResponse.json({ error: 'albumId ou spotifyId requis' }, { status: 400 });
    }

    // Utiliser albumId si fourni, sinon spotifyId (qui est l'ID de l'album)
    const finalAlbumId = albumId || spotifyId;

    // Récupérer les genres de l'album
    const albumGenres = await getAlbumGenres(finalAlbumId);

    // Récupérer les tracks de l'album pour obtenir le premier track et ses audio features
    const tracks = await getAlbumTracks(finalAlbumId);
    let audioFeatures = null;
    let musicalKey: string | undefined = undefined;
    let audioFeaturesError: string | undefined = undefined;

    if (tracks.length > 0) {
      // Prendre le premier track pour les audio features
      const firstTrackId = tracks[0].id;

      // Vérifier que le track ID est valide avant d'appeler l'API
      if (firstTrackId && firstTrackId.length > 0) {
        try {
          audioFeatures = await getTrackAudioFeatures(firstTrackId);

          if (audioFeatures) {
            musicalKey = formatMusicalKey(audioFeatures.key, audioFeatures.mode);
          }
        } catch (error) {
          // Si erreur 403, c'est que l'application n'a pas été approuvée pour audio-features
          // Depuis novembre 2024, Spotify requiert une approbation explicite
          if (error instanceof Error && error.message.includes('403')) {
            audioFeaturesError = 'APPROVAL_REQUIRED';
            logger.warn(
              "Audio features non disponibles (403): L'application nécessite une approbation Spotify. " +
                'Voir: https://community.spotify.com/t5/Spotify-for-Developers/Request-to-Enable-Access-to-Audio-Features-and-Audio-Analysis/td-p/6966479'
            );
          } else {
            logger.warn('Impossible de récupérer les audio features:', error);
          }
        }
      }
    }

    return NextResponse.json({
      genres: albumGenres,
      bpm: audioFeatures?.tempo,
      key: musicalKey,
      timeSignature: audioFeatures?.time_signature,
      audioFeaturesError, // Informer le frontend si une approbation est nécessaire
    });
  } catch (error) {
    logger.error('Erreur dans la route Spotify enrich:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
