/**
 * Récupération des cover arts SoundCloud (meta og:image, puis JSON embarqué dans la page)
 */

import * as cheerio from 'cheerio';
import { logger } from '@/lib/logger';
import { extractArtworkUrlFromScript, normalizeThumbnailUrl } from './artwork';
import type { SoundCloudTrack } from './types';

/**
 * Récupère l'image de couverture depuis une URL SoundCloud (réutilise la logique existante)
 */
export async function fetchSoundCloudThumbnail(soundcloudUrl: string): Promise<string | null> {
  try {
    const res = await fetch(soundcloudUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!res.ok) {
      return null;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Chercher l'image dans les meta tags
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) {
      return normalizeThumbnailUrl(ogImage);
    }

    // Chercher dans les scripts JSON embarqués
    const scripts = $('script').toArray();
    for (const script of scripts) {
      const artwork = extractArtworkUrlFromScript($(script).html() || '');
      if (artwork) {
        return artwork;
      }
    }

    return null;
  } catch (error) {
    logger.debug(`[SOUNDCLOUD] Erreur récupération thumbnail pour ${soundcloudUrl}:`, error);
    return null;
  }
}

/**
 * Enrichit les tracks avec les cover arts en utilisant fetchSoundCloudThumbnail
 * Parallélise les requêtes par batch pour optimiser la vitesse
 */
export async function enrichTracksWithCoverArts(tracks: SoundCloudTrack[]): Promise<void> {
  // Enrichir seulement les tracks qui n'ont pas déjà d'image
  const tracksToEnrich = tracks.filter((track) => !track.imageUrl);

  if (tracksToEnrich.length === 0) {
    return;
  }

  logger.debug(
    `[SOUNDCLOUD] Enrichissement de ${tracksToEnrich.length} tracks avec cover arts (parallélisé)`
  );

  // Paralléliser les requêtes par batch de 10 pour éviter de surcharger
  const BATCH_SIZE = 10;
  for (let i = 0; i < tracksToEnrich.length; i += BATCH_SIZE) {
    const batch = tracksToEnrich.slice(i, i + BATCH_SIZE);

    // Exécuter toutes les requêtes du batch en parallèle
    const results = await Promise.allSettled(
      batch.map((track) => fetchSoundCloudThumbnail(track.url))
    );

    // Assigner les résultats
    results.forEach((result, index) => {
      const track = batch[index];
      if (result.status === 'fulfilled' && result.value) {
        track.imageUrl = result.value;
        logger.debug(`[SOUNDCLOUD] Image trouvée: ${result.value}`);
      } else if (result.status === 'rejected') {
        logger.debug(`[SOUNDCLOUD] Erreur récupération cover pour ${track.url}:`, result.reason);
      }
    });
  }
}
