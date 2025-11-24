/**
 * Service SoundCloud pour rechercher les tracks d'un artiste via scraping direct avec Puppeteer
 */

import * as cheerio from 'cheerio';
import { logger } from '@/lib/logger';
import {
  parseSoundCloudTitle,
  detectTrackType,
  normalizeArtistName,
} from './soundcloud/parseTitle';

// Types pour Puppeteer
interface PuppeteerLike {
  launch: (options?: LaunchOptions) => Promise<Browser>;
}

interface LaunchOptions {
  headless?: boolean;
  args?: string[];
  defaultViewport?: { width: number; height: number } | null;
  executablePath?: string;
  [key: string]: unknown;
}

interface Browser {
  newPage: () => Promise<Page>;
  close: () => Promise<void>;
}

interface Page {
  goto: (url: string, options?: { waitUntil?: string; timeout?: number }) => Promise<unknown>;
  setRequestInterception: (value: boolean) => Promise<void>;
  on: (event: 'request', handler: (request: HTTPRequest) => void) => void;
  setUserAgent: (userAgent: string) => Promise<void>;
  waitForSelector: (
    selector: string,
    options?: { timeout?: number; visible?: boolean }
  ) => Promise<unknown>;
  waitForFunction: (
    fn: (prevCount: number) => boolean,
    options?: { timeout?: number; polling?: number },
    ...args: unknown[]
  ) => Promise<unknown>;
  evaluate: <T>(fn: (profileName: string) => T, ...args: unknown[]) => Promise<T>;
}

interface HTTPRequest {
  resourceType: () => string;
  abort: () => void;
  continue: () => void;
}

interface DebugData {
  rawHtml?: string;
  allTitleElements?: Array<{ selector: string; text: string; innerHTML: string }>;
  allDateElements?: Array<{
    selector: string;
    text: string;
    datetime?: string;
    title?: string;
  }>;
  soundBodyFound?: boolean;
  parentGroupFound?: boolean;
  finalTitle?: string;
  finalReleaseDate?: string;
}

// Import conditionnel de Puppeteer
// Sur Vercel, on utilise puppeteer-core avec @sparticuz/chromium-min
// En local, on utilise puppeteer standard
let puppeteer: PuppeteerLike | null = null;

// Fonction pour charger Puppeteer de manière conditionnelle
async function loadPuppeteer(): Promise<PuppeteerLike | null> {
  // Charger Puppeteer seulement si pas déjà chargé
  if (!puppeteer) {
    const isVercel = process.env.VERCEL === '1';
    const nodeEnv = process.env.NODE_ENV;

    logger.debug('[SOUNDCLOUD] Chargement Puppeteer - Environnement:', {
      VERCEL: process.env.VERCEL,
      NODE_ENV: nodeEnv,
      AWS_LAMBDA_JS_RUNTIME: process.env.AWS_LAMBDA_JS_RUNTIME,
      isVercel,
    });

    try {
      // Sur Vercel, utiliser puppeteer-core avec chromium-min
      // VERCEL est automatiquement défini par Vercel à '1'
      // NODE_ENV === 'production' peut être défini localement, donc on vérifie VERCEL en priorité
      if (isVercel) {
        try {
          logger.debug('[SOUNDCLOUD] Tentative de chargement de @sparticuz/chromium-min...');
          const chromium = await import('@sparticuz/chromium-min');
          logger.debug('[SOUNDCLOUD] @sparticuz/chromium-min chargé avec succès');

          logger.debug('[SOUNDCLOUD] Tentative de chargement de puppeteer-core...');
          const puppeteerCore = await import('puppeteer-core');
          logger.debug('[SOUNDCLOUD] puppeteer-core chargé avec succès');

          // Types pour les imports dynamiques de chromium et puppeteer-core
          type ChromiumModule = {
            default: {
              args: string[];
              defaultViewport: { width: number; height: number } | null;
              executablePath: () => Promise<string>;
              headless: boolean;
            };
          };

          type PuppeteerCoreModule = {
            default: {
              launch: (options: LaunchOptions) => Promise<Browser>;
            };
          };

          const chromiumTyped = chromium as unknown as ChromiumModule;
          const puppeteerCoreTyped = puppeteerCore as unknown as PuppeteerCoreModule;

          // Logger la configuration Chromium
          logger.debug('[SOUNDCLOUD] Configuration Chromium:', {
            args: chromiumTyped.default.args?.length || 0,
            headless: chromiumTyped.default.headless,
            hasDefaultViewport: !!chromiumTyped.default.defaultViewport,
          });

          puppeteer = {
            launch: async (options: LaunchOptions = {}) => {
              try {
                logger.debug('[SOUNDCLOUD] Lancement de Chromium...');

                // Obtenir le chemin exécutable avec gestion d'erreur améliorée
                let executablePath: string | undefined;
                try {
                  executablePath = await chromiumTyped.default.executablePath();
                  logger.debug('[SOUNDCLOUD] Chemin exécutable Chromium obtenu:', executablePath);
                } catch (execPathError) {
                  logger.error(
                    '[SOUNDCLOUD] Erreur lors de la récupération du chemin exécutable:',
                    {
                      error:
                        execPathError instanceof Error
                          ? execPathError.message
                          : String(execPathError),
                    }
                  );
                  // Si le chemin ne peut pas être obtenu, on essaiera sans executablePath explicite
                  // puppeteer-core pourra peut-être trouver Chromium automatiquement
                  logger.warn('[SOUNDCLOUD] Continuation sans executablePath explicite...');
                  executablePath = undefined;
                }

                // Configuration de lancement avec args Chromium
                const launchConfig: LaunchOptions = {
                  args: [
                    ...chromiumTyped.default.args,
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--single-process',
                  ],
                  defaultViewport: chromiumTyped.default.defaultViewport,
                  headless: chromiumTyped.default.headless,
                  ...options,
                };

                // Ajouter executablePath seulement s'il est valide
                if (executablePath) {
                  launchConfig.executablePath = executablePath;
                }

                const browser = await puppeteerCoreTyped.default.launch(launchConfig);

                logger.debug('[SOUNDCLOUD] Chromium lancé avec succès');
                return browser;
              } catch (launchError) {
                logger.error('[SOUNDCLOUD] Erreur lors du lancement de Chromium:', {
                  error: launchError instanceof Error ? launchError.message : String(launchError),
                  stack: launchError instanceof Error ? launchError.stack : undefined,
                  executablePath: await chromiumTyped.default.executablePath().catch(() => 'N/A'),
                });
                throw launchError;
              }
            },
          };
          logger.debug('[SOUNDCLOUD] Puppeteer-core configuré pour Vercel');
        } catch (error) {
          const errorDetails = {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            VERCEL: process.env.VERCEL,
            NODE_ENV: nodeEnv,
            AWS_LAMBDA_JS_RUNTIME: process.env.AWS_LAMBDA_JS_RUNTIME,
          };
          logger.error('[SOUNDCLOUD] Erreur chargement puppeteer-core (Vercel):', errorDetails);
          return null;
        }
      } else {
        // En local, utiliser puppeteer standard
        logger.debug('[SOUNDCLOUD] Chargement de puppeteer standard (local)...');
        const puppeteerModule = await import('puppeteer');
        // Puppeteer standard a une méthode launch, on l'adapte à notre interface
        puppeteer = {
          launch: async (options: LaunchOptions = {}) => {
            return puppeteerModule.default.launch(options) as Promise<Browser>;
          },
        };
        logger.debug('[SOUNDCLOUD] Puppeteer standard chargé (local)');
      }
    } catch (error) {
      const errorDetails = {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        VERCEL: process.env.VERCEL,
        NODE_ENV: nodeEnv,
      };
      logger.error('[SOUNDCLOUD] Puppeteer non disponible:', errorDetails);
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

// Re-export parse functions for backward compatibility
export { normalizeArtistName, parseSoundCloudTitle, detectTrackType };

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
 * Note: Sur Vercel, utilise puppeteer-core avec @sparticuz/chromium-min
 * En local, utilise puppeteer standard
 */
async function scrapeSoundCloudTracksPage(profileName: string): Promise<SoundCloudTrack[]> {
  const isVercel = process.env.VERCEL === '1';
  const nodeEnv = process.env.NODE_ENV;

  logger.debug('[SOUNDCLOUD] scrapeSoundCloudTracksPage - Début', {
    profileName,
    VERCEL: process.env.VERCEL,
    NODE_ENV: nodeEnv,
    isVercel,
  });

  // Charger Puppeteer de manière conditionnelle
  const puppeteerInstance = await loadPuppeteer();

  if (!puppeteerInstance) {
    const errorMessage = isVercel
      ? "Puppeteer/Chromium non disponible sur Vercel. Vérifiez la configuration de @sparticuz/chromium-min et la variable d'environnement AWS_LAMBDA_JS_RUNTIME."
      : "Puppeteer non disponible. Vérifiez l'installation de puppeteer.";
    logger.error('[SOUNDCLOUD] Puppeteer non disponible:', {
      error: errorMessage,
      VERCEL: process.env.VERCEL,
      NODE_ENV: nodeEnv,
      AWS_LAMBDA_JS_RUNTIME: process.env.AWS_LAMBDA_JS_RUNTIME,
    });
    throw new Error(errorMessage);
  }

  let browser: Browser | undefined;
  try {
    const tracksUrl = `https://soundcloud.com/${profileName}/tracks`;
    logger.debug(`[SOUNDCLOUD] Scraping avec Puppeteer depuis ${tracksUrl}`);

    // Sur Vercel, les options sont déjà configurées par chromium-min
    // En local, on peut passer des options supplémentaires
    const launchOptions: LaunchOptions = {
      headless: true,
    };

    // En local seulement, ajouter les args personnalisés
    if (process.env.VERCEL !== '1') {
      launchOptions.args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ];
    }

    browser = await puppeteerInstance.launch(launchOptions);
    const page = await browser.newPage();

    // Bloquer les ressources inutiles pour accélérer le chargement
    await page.setRequestInterception(true);
    page.on('request', (req: HTTPRequest) => {
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
          (prevCount: number) => {
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
    const tracksData = await page.evaluate((profileName: string) => {
      // Fonction pour décoder les entités HTML (définie une seule fois en dehors du forEach)
      const decodeHtmlEntities = (str: string): string => {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = str;
        return textarea.value;
      };

      const tracks: Array<{
        url: string;
        title: string;
        imageUrl?: string;
        releaseDate?: string;
        // Données de debug pour la première track
        debug?: {
          rawHtml?: string;
          allTitleElements?: Array<{ selector: string; text: string; innerHTML: string }>;
          allDateElements?: Array<{
            selector: string;
            text: string;
            datetime?: string;
            title?: string;
          }>;
        };
      }> = [];
      const seenUrls = new Set<string>();

      // Chercher tous les éléments .sound_coverArt et .sound__coverArt
      const coverArts = document.querySelectorAll('.sound_coverArt, .sound__coverArt');

      coverArts.forEach((el, index) => {
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

        // Trouver le parent group d'abord
        const parentGroup = link.closest('[role="group"]');
        // Trouver le soundBody depuis le link ou depuis le parentGroup
        const soundBody =
          link.closest('.sound__body') ||
          link.closest('.sound_body') ||
          (parentGroup ? parentGroup.querySelector('.sound__body, .sound_body') : null);
        const isFirstTrack = index === 0;
        const debug: DebugData | undefined = isFirstTrack ? {} : undefined;

        // Extraire le titre - chercher dans plusieurs endroits et préserver tous les caractères
        let title = '';
        const allTitleElements: Array<{ selector: string; text: string; innerHTML: string }> = [];

        if (soundBody) {
          // 1. PRIORITÉ : Chercher dans a.soundTitle__title span (le titre complet est là)
          const soundTitleLink = soundBody.querySelector('a.soundTitle__title');
          if (soundTitleLink) {
            const soundTitleSpan = soundTitleLink.querySelector('span') || soundTitleLink;
            const text = soundTitleSpan.textContent?.trim() || '';
            const innerHTML = soundTitleSpan.innerHTML?.trim() || '';
            if (text) {
              allTitleElements.push({
                selector: 'a.soundTitle__title span',
                text: text,
                innerHTML: innerHTML,
              });
              title = text;
            }
          }

          // 1b. Si pas trouvé, chercher dans .soundTitle__title directement
          if (!title) {
            const soundTitleEl = soundBody.querySelector('.soundTitle__title');
            if (soundTitleEl) {
              const text = soundTitleEl.textContent?.trim() || '';
              const innerHTML = soundTitleEl.innerHTML?.trim() || '';
              if (text) {
                allTitleElements.push({
                  selector: '.soundTitle__title',
                  text: text,
                  innerHTML: innerHTML,
                });
                title = text;
              }
            }
          }

          // 2. Chercher dans l'attribut title de .soundTitle
          if (!title) {
            const soundTitle = soundBody.querySelector('.soundTitle');
            if (soundTitle) {
              const titleAttr = soundTitle.getAttribute('title') || '';
              if (titleAttr) {
                const decoded = decodeHtmlEntities(titleAttr);
                allTitleElements.push({
                  selector: '.soundTitle[title]',
                  text: decoded,
                  innerHTML: '',
                });
                title = decoded;
              }
            }
          }

          // 3. Chercher dans aria-label du span de l'image (dans le sound__artwork)
          if (!title) {
            const artworkSpan = soundBody.querySelector('.sound__artwork span[aria-label]');
            if (artworkSpan) {
              const ariaLabel = artworkSpan.getAttribute('aria-label') || '';
              if (ariaLabel) {
                const decoded = decodeHtmlEntities(ariaLabel);
                allTitleElements.push({
                  selector: '.sound__artwork span[aria-label]',
                  text: decoded,
                  innerHTML: '',
                });
                title = decoded;
              }
            }
          }

          // 4. Chercher dans aria-label du parent group (décoder les entités HTML)
          // Faire cette recherche même si soundBody n'est pas trouvé
          if (!title && parentGroup) {
            const ariaLabel = parentGroup.getAttribute('aria-label') || '';
            if (ariaLabel) {
              const decoded = decodeHtmlEntities(ariaLabel);
              allTitleElements.push({
                selector: '[role="group"] aria-label',
                text: decoded,
                innerHTML: '',
              });
              // Pattern pour extraire le titre depuis "Titre : ... par ..."
              // Le pattern doit gérer &nbsp; et les entités HTML
              const titleMatch = decoded.match(/Titre\s*[:\u00A0]\s*(.+?)(?:\s+par\s+|$)/i);
              if (titleMatch && titleMatch[1]) {
                title = titleMatch[1].trim();
              } else {
                // Si pas de pattern, prendre tout après "Titre" ou tout le contenu
                const simpleMatch = decoded.match(/Titre\s*[:\u00A0]\s*(.+)/i);
                if (simpleMatch && simpleMatch[1]) {
                  title = simpleMatch[1].split(/\s+par\s+/i)[0].trim();
                } else {
                  // Si aucun pattern ne fonctionne, utiliser tout le contenu décodé
                  title = decoded;
                }
              }
            }
          }

          // 5. Chercher dans les autres éléments de titre
          if (!title) {
            const titleSelectors = [
              '.soundTitle__titleHero',
              'a.soundTitle__title',
              '[class*="title"]',
            ];

            for (const selector of titleSelectors) {
              const titleEls = soundBody.querySelectorAll(selector);
              titleEls.forEach((titleEl) => {
                const text = titleEl.textContent?.trim() || '';
                const innerHTML = titleEl.innerHTML?.trim() || '';
                if (text && !allTitleElements.some((e) => e.text === text)) {
                  allTitleElements.push({
                    selector: selector,
                    text: text,
                    innerHTML: innerHTML,
                  });
                  if (!title && text.length > 0) {
                    title = text;
                  }
                }
              });
            }
          }
        }

        // Si soundBody n'est pas trouvé, chercher quand même dans parentGroup
        if (!title && !soundBody && parentGroup) {
          const ariaLabel = parentGroup.getAttribute('aria-label') || '';
          if (ariaLabel) {
            const decoded = decodeHtmlEntities(ariaLabel);
            allTitleElements.push({
              selector: '[role="group"] aria-label (no soundBody)',
              text: decoded,
              innerHTML: '',
            });
            const titleMatch = decoded.match(/Titre\s*[:\u00A0]\s*(.+?)(?:\s+par\s+|$)/i);
            if (titleMatch && titleMatch[1]) {
              title = titleMatch[1].trim();
            } else {
              const simpleMatch = decoded.match(/Titre\s*[:\u00A0]\s*(.+)/i);
              if (simpleMatch && simpleMatch[1]) {
                title = simpleMatch[1].split(/\s+par\s+/i)[0].trim();
              } else {
                title = decoded;
              }
            }
          }
        }

        // 6. Chercher dans les attributs du lien
        if (!title) {
          const linkTitle = link.getAttribute('title') || link.getAttribute('aria-label') || '';
          if (linkTitle) {
            const decoded = decodeHtmlEntities(linkTitle);
            allTitleElements.push({
              selector: 'link attributes',
              text: decoded,
              innerHTML: '',
            });
            title = decoded.trim();
          }
        }

        // 7. Fallback sur le slug
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

        // Extraire la date de publication - chercher dans plusieurs endroits
        let releaseDate: string | undefined;
        const allDateElements: Array<{
          selector: string;
          text: string;
          datetime?: string;
          title?: string;
        }> = [];

        if (soundBody) {
          // 1. PRIORITÉ : Chercher dans .soundTitle__uploadTime time[datetime] (c'est là que se trouve la date)
          const uploadTimeEl = soundBody.querySelector('.soundTitle__uploadTime time[datetime]');
          if (uploadTimeEl) {
            const datetime = uploadTimeEl.getAttribute('datetime') || '';
            const text = uploadTimeEl.textContent?.trim() || '';
            const titleAttr = uploadTimeEl.getAttribute('title') || '';
            if (datetime || titleAttr) {
              allDateElements.push({
                selector: '.soundTitle__uploadTime time[datetime]',
                text: text,
                datetime: datetime,
                title: titleAttr,
              });
              if (datetime) {
                try {
                  const date = new Date(datetime);
                  if (!isNaN(date.getTime())) {
                    releaseDate = date.toISOString().split('T')[0];
                  }
                } catch (e) {
                  // Ignorer les erreurs de parsing
                }
              }
            }
          }

          // 2. Chercher tous les éléments time[datetime] dans soundBody
          if (!releaseDate) {
            const timeEls = soundBody.querySelectorAll('time[datetime]');
            timeEls.forEach((timeEl) => {
              const datetime = timeEl.getAttribute('datetime') || '';
              const text = timeEl.textContent?.trim() || '';
              const titleAttr = timeEl.getAttribute('title') || '';
              if (datetime || titleAttr) {
                allDateElements.push({
                  selector: 'time[datetime]',
                  text: text,
                  datetime: datetime,
                  title: titleAttr,
                });
                if (!releaseDate && datetime) {
                  try {
                    const date = new Date(datetime);
                    if (!isNaN(date.getTime())) {
                      releaseDate = date.toISOString().split('T')[0];
                    }
                  } catch (e) {
                    // Ignorer les erreurs de parsing
                  }
                }
              }
            });
          }

          // 3. Chercher tous les éléments time (sans datetime)
          if (!releaseDate) {
            const timeEls = soundBody.querySelectorAll('time:not([datetime])');
            timeEls.forEach((timeEl) => {
              const text = timeEl.textContent?.trim() || '';
              const titleAttr = timeEl.getAttribute('title') || '';
              if (titleAttr || text) {
                allDateElements.push({
                  selector: 'time',
                  text: text,
                  datetime: undefined,
                  title: titleAttr,
                });
                if (!releaseDate && titleAttr) {
                  // Essayer de parser le format "Posté le 1 août 2025"
                  const dateMatch = titleAttr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
                  if (dateMatch) {
                    try {
                      // Essayer de parser avec la locale française
                      const dateStr = titleAttr.replace(/Posté le\s+/i, '').trim();
                      const date = new Date(dateStr);
                      if (!isNaN(date.getTime())) {
                        releaseDate = date.toISOString().split('T')[0];
                      }
                    } catch (e) {
                      // Ignorer les erreurs de parsing
                    }
                  } else {
                    try {
                      const date = new Date(titleAttr);
                      if (!isNaN(date.getTime())) {
                        releaseDate = date.toISOString().split('T')[0];
                      }
                    } catch (e) {
                      // Ignorer les erreurs de parsing
                    }
                  }
                }
              }
            });
          }

          // 4. Chercher dans les éléments avec des classes contenant "date" ou "time"
          if (!releaseDate) {
            const dateSelectors = [
              '.sound__date',
              '.soundDate',
              '.soundTitle__uploadTime',
              '[class*="date"]',
              '[class*="Date"]',
              '[class*="time"]',
              '[class*="Time"]',
            ];

            for (const selector of dateSelectors) {
              const dateEls = soundBody.querySelectorAll(selector);
              dateEls.forEach((dateEl) => {
                const text = dateEl.textContent?.trim() || '';
                const titleAttr = dateEl.getAttribute('title') || '';
                const datetime = dateEl.getAttribute('datetime') || '';
                if (text || titleAttr || datetime) {
                  allDateElements.push({
                    selector: selector,
                    text: text,
                    datetime: datetime,
                    title: titleAttr,
                  });
                  if (!releaseDate) {
                    const dateStr = datetime || titleAttr || text;
                    if (dateStr) {
                      try {
                        const date = new Date(dateStr);
                        if (!isNaN(date.getTime())) {
                          releaseDate = date.toISOString().split('T')[0];
                        }
                      } catch (e) {
                        // Ignorer les erreurs de parsing
                      }
                    }
                  }
                }
              });
            }
          }

          // 5. Chercher dans les attributs data-*
          if (!releaseDate) {
            const dataDate =
              soundBody.getAttribute('data-date') ||
              soundBody.getAttribute('data-published') ||
              soundBody.getAttribute('data-created');
            if (dataDate) {
              allDateElements.push({
                selector: 'data-* attributes',
                text: '',
                datetime: dataDate,
              });
              try {
                const date = new Date(dataDate);
                if (!isNaN(date.getTime())) {
                  releaseDate = date.toISOString().split('T')[0];
                }
              } catch (e) {
                // Ignorer les erreurs de parsing
              }
            }
          }
        }

        // Pour la première track, collecter les données de debug
        if (isFirstTrack && debug) {
          // Collecter le HTML brut depuis soundBody ou parentGroup
          const htmlSource = soundBody || parentGroup || link.parentElement;
          if (htmlSource) {
            debug.rawHtml = htmlSource.outerHTML.substring(0, 5000); // Limiter à 5000 caractères
          }
          debug.allTitleElements = allTitleElements;
          debug.allDateElements = allDateElements;
          debug.soundBodyFound = !!soundBody;
          debug.parentGroupFound = !!parentGroup;
          debug.finalTitle = title;
          debug.finalReleaseDate = releaseDate;
        }

        tracks.push({
          url: trackUrl,
          title,
          imageUrl,
          releaseDate,
          ...(isFirstTrack && { debug }),
        });
      });

      return tracks;
    }, profileName);

    // Logger le JSON brut de la première track pour debug
    if (tracksData.length > 0 && tracksData[0].debug) {
      logger.debug(
        `[SOUNDCLOUD] JSON brut de la première track extraite du HTML:`,
        JSON.stringify(tracksData[0], null, 2)
      );
    }

    // Convertir les données extraites en SoundCloudTrack
    const tracks: SoundCloudTrack[] = tracksData.map(
      (trackData: { url: string; title: string; imageUrl?: string; releaseDate?: string }) => {
        const trackMatch = trackData.url.match(/soundcloud\.com\/([^\/]+)\/([^\/\?]+)/);
        if (!trackMatch) {
          throw new Error(`URL invalide: ${trackData.url}`);
        }

        const embedId = `${trackMatch[1]}/${trackMatch[2]}`;
        const trackId = `sc_${trackMatch[1]}_${trackMatch[2]}`.replace(/[^a-z0-9_]/gi, '_');

        // Utiliser la date extraite du DOM, sinon utiliser la date actuelle
        const releaseDate = trackData.releaseDate || new Date().toISOString().split('T')[0];

        // Parser le titre pour extraire l'artiste et le titre proprement
        const { artist, title } = parseSoundCloudTitle(trackData.title, profileName);
        const type = detectTrackType(trackData.title);

        return {
          id: trackId,
          title,
          artist,
          url: trackData.url,
          embedId,
          releaseDate,
          imageUrl: trackData.imageUrl,
          type,
        };
      }
    );

    if (tracks.length > 0) {
      logger.debug(`[SOUNDCLOUD] ${tracks.length} tracks trouvées via scraping Puppeteer`);

      // Enrichir avec les cover arts si manquantes
      await enrichTracksWithCoverArts(tracks);
      return tracks;
    }

    logger.debug(`[SOUNDCLOUD] Aucune track trouvée via scraping direct`);
    return [];
  } catch (error) {
    const errorDetails = {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      profileName,
      VERCEL: process.env.VERCEL,
      NODE_ENV: process.env.NODE_ENV,
      AWS_LAMBDA_JS_RUNTIME: process.env.AWS_LAMBDA_JS_RUNTIME,
    };
    logger.error('[SOUNDCLOUD] Erreur lors du scraping direct avec Puppeteer:', errorDetails);

    // Si c'est une erreur de timeout, lever une erreur explicite
    if (
      error instanceof Error &&
      (error.message.includes('timeout') ||
        error.message.includes('Timeout') ||
        error.message.includes('Navigation timeout'))
    ) {
      throw new Error(
        `Timeout lors du scraping SoundCloud pour ${profileName}. Le scraping a pris trop de temps.`
      );
    }

    // Si c'est une erreur de lancement de Chromium, lever une erreur explicite
    if (
      error instanceof Error &&
      (error.message.includes('Chromium') ||
        error.message.includes('executable') ||
        error.message.includes('launch'))
    ) {
      throw new Error(
        `Erreur lors du lancement de Chromium: ${error.message}. Vérifiez la configuration de Puppeteer sur Vercel.`
      );
    }

    // Pour les autres erreurs, propager l'erreur originale
    throw error;
  } finally {
    // Fermer le navigateur dans tous les cas
    if (browser) {
      try {
        await browser.close();
        logger.debug(`[SOUNDCLOUD] Navigateur Puppeteer fermé`);
      } catch (closeError) {
        logger.warn('[SOUNDCLOUD] Erreur lors de la fermeture du navigateur:', closeError);
      }
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
