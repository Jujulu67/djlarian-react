/**
 * Service SoundCloud pour rechercher les tracks d'un artiste via scraping direct avec Puppeteer
 *
 * Point d'entrée : la logique est répartie dans ./soundcloud/ (navigateur, scraping, cover arts,
 * conversion des tracks, parsing des titres).
 */

import { logger } from '@/lib/logger';
import { scrapeSoundCloudTracksPage } from './soundcloud/scrapeTracksPage';
import { extractProfileName } from './soundcloud/urls';
import type { SoundCloudTrack } from './soundcloud/types';

export type { SoundCloudTrack };

// Re-export parse functions for backward compatibility
export {
  normalizeArtistName,
  parseSoundCloudTitle,
  detectTrackType,
} from './soundcloud/parseTitle';

/**
 * Recherche les tracks d'un artiste SoundCloud via scraping direct avec Puppeteer
 *
 * @param artistName - Nom d'artiste SoundCloud (ex: "Larian")
 * @param profileUrl - URL de profil SoundCloud optionnelle (ex: "soundcloud.com/larian")
 * @param maxResults - Nombre maximum de résultats à récupérer (défaut: 100, max: 100)
 * @returns Tableau de tracks SoundCloud trouvées
 */
export async function searchSoundCloudArtistTracks(
  artistName: string,
  profileUrl?: string,
  maxResults = 100
): Promise<SoundCloudTrack[]> {
  const isVercel = process.env.VERCEL === '1';
  const nodeEnv = process.env.NODE_ENV;

  logger.debug('[SOUNDCLOUD] searchSoundCloudArtistTracks - Début', {
    artistName,
    profileUrl,
    maxResults,
    VERCEL: process.env.VERCEL,
    NODE_ENV: nodeEnv,
    isVercel,
  });

  try {
    // Déterminer le nom d'artiste à utiliser
    let finalArtistName = artistName.trim();
    if (profileUrl) {
      const extractedName = extractProfileName(profileUrl);
      if (extractedName) {
        finalArtistName = extractedName;
      }
    }

    if (!finalArtistName) {
      const errorMessage = "Recherche SoundCloud: nom d'artiste ou URL de profil requis";
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    // Utiliser le scraping direct avec Puppeteer (si disponible)
    const scrapedTracks = await scrapeSoundCloudTracksPage(finalArtistName);

    // Si on n'a pas de tracks, c'est que vraiment aucune track n'a été trouvée
    // (pas une erreur Puppeteer, car celle-ci aurait été levée)
    if (scrapedTracks.length === 0) {
      logger.debug(
        `[SOUNDCLOUD] Aucune track trouvée pour ${finalArtistName} (profil peut être vide ou privé)`
      );
      return [];
    }

    logger.debug(
      `[SOUNDCLOUD] ${scrapedTracks.length} tracks trouvées, limitation à ${maxResults}`
    );
    return scrapedTracks.slice(0, maxResults);
  } catch (error) {
    const errorDetails = {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      artistName,
      profileUrl,
      VERCEL: process.env.VERCEL,
      NODE_ENV: nodeEnv,
      AWS_LAMBDA_JS_RUNTIME: process.env.AWS_LAMBDA_JS_RUNTIME,
    };
    logger.error('Erreur lors de la recherche SoundCloud:', errorDetails);

    // Propager l'erreur au lieu de retourner un tableau vide
    // Cela permet à l'API de distinguer entre "aucune track" et "erreur Puppeteer"
    throw error;
  }
}
