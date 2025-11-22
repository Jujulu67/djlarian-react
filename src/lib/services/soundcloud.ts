/**
 * Service SoundCloud pour rechercher les tracks d'un artiste via scraping direct avec Puppeteer
 */

import * as cheerio from 'cheerio';
import { logger } from '@/lib/logger';

// Import conditionnel de Puppeteer (ne fonctionne pas sur Vercel)
// On utilise un import dynamique pour éviter les erreurs au build
let puppeteer: typeof import('puppeteer').default | null = null;
type Browser = import('puppeteer').Browser;

// Fonction pour charger Puppeteer de manière conditionnelle
async function loadPuppeteer(): Promise<typeof import('puppeteer').default | null> {
  // Vérifier si on est sur Vercel
  if (process.env.VERCEL === '1' || process.env.NEXT_PUBLIC_VERCEL_ENV) {
    return null;
  }

  // Charger Puppeteer seulement si pas déjà chargé
  if (!puppeteer) {
    try {
      const puppeteerModule = await import('puppeteer');
      puppeteer = puppeteerModule.default;
    } catch (error) {
      logger.warn('[SOUNDCLOUD] Puppeteer non disponible:', error);
      return null;
    }
  }
  return puppeteer;
}

export interface SoundCloudTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  embedId?: string;
  releaseDate?: string;
  imageUrl?: string;
  type?: 'single' | 'ep' | 'album' | 'remix' | 'live' | 'djset' | 'video';
}

/**
 * Extrait le nom d'artiste depuis une URL de profil SoundCloud
 * Ex: "https://soundcloud.com/larian" -> "larian"
 * Ex: "soundcloud.com/larian" -> "larian"
 */
function extractProfileName(profileUrl: string): string | null {
  const match = profileUrl.match(/soundcloud\.com\/([^\/\?]+)/);
  return match ? match[1] : null;
}

/**
 * Détecte le type de track depuis le titre
 */
function detectTrackType(
  title: string
): 'single' | 'ep' | 'album' | 'remix' | 'live' | 'djset' | 'video' {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes('remix') || lowerTitle.includes('remix by')) {
    return 'remix';
  }
  if (lowerTitle.includes('dj set') || lowerTitle.includes('djset') || lowerTitle.includes('mix')) {
    return 'djset';
  }
  if (lowerTitle.includes('live')) {
    return 'live';
  }
  if (lowerTitle.includes('ep')) {
    return 'ep';
  }
  if (lowerTitle.includes('album')) {
    return 'album';
  }
  if (lowerTitle.includes('video') || lowerTitle.includes('clip')) {
    return 'video';
  }

  // Par défaut, single pour SoundCloud
  return 'single';
}

/**
 * Récupère l'image de couverture depuis une URL SoundCloud (réutilise la logique existante)
 */
async function fetchSoundCloudThumbnail(soundcloudUrl: string): Promise<string | null> {
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
      return ogImage.replace('-large', '-t500x500').split('?')[0];
    }

    // Chercher dans les scripts JSON embarqués
    const scripts = $('script').toArray();
    for (const script of scripts) {
      const content = $(script).html() || '';
      if (content.includes('artwork_url') || content.includes('artwork')) {
        const artworkMatch = content.match(/"artwork_url"\s*:\s*"([^"]+)"/);
        if (artworkMatch && artworkMatch[1]) {
          return artworkMatch[1].replace('-large', '-t500x500').split('?')[0];
        }
      }
    }

    return null;
  } catch (error) {
    logger.debug(`[SOUNDCLOUD] Erreur récupération thumbnail pour ${soundcloudUrl}:`, error);
    return null;
  }
}

/**
 * Scrape la page /tracks d'un profil SoundCloud avec Puppeteer
 * Optimisé pour charger toutes les tracks via lazy loading
 *
 * Note: Puppeteer ne fonctionne pas sur Vercel (serverless).
 * Cette fonction retourne un tableau vide sur Vercel.
 */
async function scrapeSoundCloudTracksPage(profileName: string): Promise<SoundCloudTrack[]> {
  // Charger Puppeteer de manière conditionnelle
  const puppeteerInstance = await loadPuppeteer();

  if (!puppeteerInstance) {
    logger.warn(
      "[SOUNDCLOUD] Puppeteer n'est pas disponible (Vercel serverless). Retour d'un tableau vide."
    );
    return [];
  }

  let browser: Browser | undefined;
  try {
    const tracksUrl = `https://soundcloud.com/${profileName}/tracks`;
    logger.debug(`[SOUNDCLOUD] Scraping avec Puppeteer depuis ${tracksUrl}`);

    browser = await puppeteerInstance.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });
    const page = await browser.newPage();

    // Bloquer les ressources inutiles pour accélérer le chargement
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      // Bloquer les images, fonts, media, et autres ressources non essentielles
      if (['image', 'font', 'media', 'websocket'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Configurer le User-Agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );

    // Charger la page avec domcontentloaded (plus rapide que networkidle2)
    logger.debug(`[SOUNDCLOUD] Chargement de la page avec Puppeteer...`);
    await page.goto(tracksUrl, {
      waitUntil: 'domcontentloaded', // Plus rapide que networkidle2
      timeout: 10000, // Réduit à 10 secondes
    });

    // Attendre que les éléments de tracks soient présents (timeout réduit)
    logger.debug(`[SOUNDCLOUD] Attente du chargement des tracks...`);
    try {
      await page.waitForSelector('.soundList_item, .sound__coverArt, .sound_coverArt', {
        timeout: 3000, // Réduit à 3 secondes
        visible: false, // Plus rapide, on n'a pas besoin que ce soit visible
      });
      logger.debug(`[SOUNDCLOUD] Éléments de tracks détectés dans le DOM`);
    } catch (error) {
      logger.debug(
        `[SOUNDCLOUD] Timeout en attendant les éléments, mais on continue quand même...`
      );
    }

    // Scroller la page pour charger toutes les tracks (lazy loading) - version optimisée
    logger.debug(`[SOUNDCLOUD] Défilement de la page pour charger toutes les tracks...`);
    let previousTrackCount = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 15; // Augmenté pour être sûr de tout charger

    while (scrollAttempts < maxScrollAttempts) {
      // Compter les tracks actuellement visibles
      const currentTrackCount = await page.evaluate(() => {
        return document.querySelectorAll('.sound_coverArt, .sound__coverArt').length;
      });

      logger.debug(
        `[SOUNDCLOUD] Scroll ${scrollAttempts + 1}/${maxScrollAttempts}: ${currentTrackCount} tracks trouvées`
      );

      // Si le nombre de tracks n'a pas changé après 1 scroll, arrêter (plus agressif)
      if (currentTrackCount === previousTrackCount && scrollAttempts > 1) {
        logger.debug(
          `[SOUNDCLOUD] Nombre de tracks stable (${currentTrackCount}), arrêt du scroll`
        );
        break;
      }

      previousTrackCount = currentTrackCount;

      // Scroller vers le bas de la page de manière plus agressive
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Attendre très peu (200ms) et vérifier immédiatement si de nouveaux éléments sont chargés
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Attendre que de nouveaux éléments soient chargés avec timeout très court
      try {
        await page.waitForFunction(
          (prevCount) => {
            const currentCount = document.querySelectorAll(
              '.sound_coverArt, .sound__coverArt'
            ).length;
            return currentCount > prevCount;
          },
          { timeout: 500, polling: 50 }, // Timeout très court (500ms) et polling plus fréquent
          previousTrackCount
        );
      } catch {
        // Si aucun nouvel élément n'est chargé, continuer quand même
      }

      scrollAttempts++;
    }

    logger.debug(
      `[SOUNDCLOUD] Scroll terminé. ${previousTrackCount} tracks trouvées après défilement`
    );

    // Pas besoin d'attendre, on extrait directement

    // Extraire directement depuis le DOM avec page.evaluate (plus rapide que cheerio)
    logger.debug(`[SOUNDCLOUD] Extraction des tracks depuis le DOM...`);
    const tracksData = await page.evaluate((profileName) => {
      const tracks: Array<{
        url: string;
        title: string;
        imageUrl?: string;
      }> = [];
      const seenUrls = new Set<string>();

      // Chercher tous les éléments .sound_coverArt et .sound__coverArt
      const coverArts = document.querySelectorAll('.sound_coverArt, .sound__coverArt');

      coverArts.forEach((el) => {
        const link = el as HTMLElement;
        const href = link.getAttribute('href');

        if (!href) return;

        // Convertir en URL complète si nécessaire
        let trackUrl = href.startsWith('/') ? `https://soundcloud.com${href}` : href;

        // Vérifier que c'est bien une track de ce profil
        const trackMatch = trackUrl.match(/soundcloud\.com\/([^\/]+)\/([^\/\?]+)/);
        if (!trackMatch || trackMatch[1] !== profileName) return;

        // Éviter les doublons
        if (seenUrls.has(trackUrl)) return;
        seenUrls.add(trackUrl);

        // Extraire le titre depuis aria-label du parent
        let title = '';
        const parentGroup = link.closest('[role="group"]');
        if (parentGroup) {
          const ariaLabel = parentGroup.getAttribute('aria-label') || '';
          const titleMatch = ariaLabel.match(/Titre\s*[:\u00A0]\s*(.+?)(?:\s+par\s+|$)/i);
          if (titleMatch) {
            title = titleMatch[1].trim();
          }
        }

        // Si pas de titre depuis aria-label, chercher dans les autres éléments
        if (!title) {
          const soundBody = link.closest('.sound_body');
          if (soundBody) {
            const titleEl =
              soundBody.querySelector('.soundTitle__title, .soundTitle__titleHero') ||
              soundBody.querySelector('[class*="title"]');
            title =
              titleEl?.textContent?.trim() ||
              link.getAttribute('title') ||
              link.getAttribute('aria-label') ||
              '';
          }
        }

        // Si toujours pas de titre, utiliser le slug
        if (!title) {
          title = trackMatch[2].replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
        }

        // Extraire l'image de couverture depuis le style background-image
        let imageUrl: string | undefined;
        const imageSpan = link.querySelector('span[style*="background-image"]');
        if (imageSpan) {
          const style = imageSpan.getAttribute('style') || '';
          const imageMatch = style.match(/url\(["']?([^"')]+)["']?\)/i);
          if (imageMatch && imageMatch[1]) {
            imageUrl = imageMatch[1]
              .replace(/\\/g, '')
              .replace('-t200x200', '-t500x500')
              .replace('-large', '-t500x500')
              .split('?')[0];
          }
        }

        tracks.push({
          url: trackUrl,
          title,
          imageUrl,
        });
      });

      return tracks;
    }, profileName);

    // Convertir les données extraites en SoundCloudTrack
    const tracks: SoundCloudTrack[] = tracksData.map((trackData) => {
      const trackMatch = trackData.url.match(/soundcloud\.com\/([^\/]+)\/([^\/\?]+)/);
      if (!trackMatch) {
        throw new Error(`URL invalide: ${trackData.url}`);
      }

      const embedId = `${trackMatch[1]}/${trackMatch[2]}`;
      const trackId = `sc_${trackMatch[1]}_${trackMatch[2]}`.replace(/[^a-z0-9_]/gi, '_');
      const now = new Date();
      const releaseDate = now.toISOString().split('T')[0];
      const type = detectTrackType(trackData.title);

      return {
        id: trackId,
        title: trackData.title,
        artist: profileName,
        url: trackData.url,
        embedId,
        releaseDate,
        imageUrl: trackData.imageUrl,
        type,
      };
    });

    if (tracks.length > 0) {
      logger.debug(`[SOUNDCLOUD] ${tracks.length} tracks trouvées via scraping Puppeteer`);

      // Enrichir avec les cover arts si manquantes
      await enrichTracksWithCoverArts(tracks);
      return tracks;
    }

    logger.debug(`[SOUNDCLOUD] Aucune track trouvée via scraping direct`);
    return [];
  } catch (error) {
    logger.error('[SOUNDCLOUD] Erreur lors du scraping direct avec Puppeteer:', error);
    return [];
  } finally {
    // Fermer le navigateur dans tous les cas
    if (browser) {
      await browser.close();
      logger.debug(`[SOUNDCLOUD] Navigateur Puppeteer fermé`);
    }
  }
}

/**
 * Enrichit les tracks avec les cover arts en utilisant fetchSoundCloudThumbnail
 * Parallélise les requêtes par batch pour optimiser la vitesse
 */
async function enrichTracksWithCoverArts(tracks: SoundCloudTrack[]): Promise<void> {
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
      logger.error("Recherche SoundCloud: nom d'artiste ou URL de profil requis");
      return [];
    }

    // Utiliser le scraping direct avec Puppeteer (si disponible)
    // Sur Vercel, Puppeteer n'est pas disponible, donc on retourne un tableau vide
    const scrapedTracks = await scrapeSoundCloudTracksPage(finalArtistName);

    // Si on n'a pas de tracks (probablement sur Vercel), retourner un tableau vide
    // plutôt que de planter l'API
    if (scrapedTracks.length === 0) {
      logger.warn(
        '[SOUNDCLOUD] Aucune track trouvée (Puppeteer peut ne pas être disponible sur Vercel)'
      );
      return [];
    }

    return scrapedTracks.slice(0, maxResults);
  } catch (error) {
    logger.error('Erreur lors de la recherche SoundCloud:', error);
    // Ne pas faire planter l'API, retourner un tableau vide
    return [];
  }
}
