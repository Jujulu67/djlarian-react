import { formatTrackData } from '@/lib/api/musicService';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { Track } from '@/lib/utils/types';

/**
 * Récupère les dernières releases (singles, EPs, albums, remix) pour la page d'accueil
 * Filtre et trie par date de sortie (plus récent en premier)
 */
export async function getLatestReleases(count: number = 3): Promise<Track[]> {
  try {
    const tracks = await prisma.track.findMany({
      include: {
        TrackPlatform: true,
        GenresOnTracks: {
          include: {
            Genre: true,
          },
        },
        MusicCollection: true,
        User: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ featured: 'desc' }, { releaseDate: 'desc' }],
    });

    // Logique d'auto-publication
    for (const track of tracks) {
      if (track.publishAt && !track.isPublished && new Date(track.publishAt) <= new Date()) {
        try {
          await prisma.track.update({
            where: { id: track.id },
            data: { isPublished: true },
          });
          track.isPublished = true;
        } catch (updateError) {
          logger.warn(
            `[DATA MUSIC] Erreur lors de la mise à jour de la track ${track.id}:`,
            updateError
          );
        }
      }
    }

    const formattedTracks = tracks
      .map((track) => formatTrackData(track))
      .filter((track): track is Track => track !== null);

    // Filtrer et trier: uniquement les singles, EPs et albums (pas les DJ sets ou videos)
    // Et trier par date (du plus récent au plus ancien)
    const filteredReleases = formattedTracks
      .filter((track: Track) => ['single', 'ep', 'album', 'remix'].includes(track.type))
      .sort((a: Track, b: Track) => {
        const dateA = new Date(a.releaseDate);
        const dateB = new Date(b.releaseDate);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, count); // Limiter au nombre demandé

    return filteredReleases;
  } catch (error) {
    logger.error('[DATA MUSIC] Erreur dans getLatestReleases:', error);
    return [];
  }
}
