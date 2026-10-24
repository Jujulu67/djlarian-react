/**
 * Scraping de la page /tracks d'un profil SoundCloud avec Puppeteer
 */

import { logger } from '@/lib/logger';
import { buildLaunchOptions, loadPuppeteer } from './browser';
import { toScrapeError } from './errors';
import { jitter, sleep } from './humanBehavior';
import { enrichTracksWithCoverArts } from './thumbnail';
import { toSoundCloudTrack } from './trackMapper';
import type { Browser, DebugData, HTTPRequest, SoundCloudTrack } from './types';

/**
 * Scrape la page /tracks d'un profil SoundCloud avec Puppeteer
 * Optimisé pour charger toutes les tracks via lazy loading
 *
 * Note: Sur Vercel, utilise puppeteer-core avec @sparticuz/chromium-min
 * En local, utilise puppeteer standard
 */
export async function scrapeSoundCloudTracksPage(profileName: string): Promise<SoundCloudTrack[]> {
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
    const launchOptions = buildLaunchOptions(process.env.VERCEL !== '1');

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
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Configurer les headers supplémentaires pour paraître plus humain
    await page.setExtraHTTPHeaders?.({
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      Referer: 'https://www.google.com/',
    });

    // Configurer un viewport réaliste
    await page.setViewport?.({
      width: jitter(1280, 100),
      height: jitter(720, 100),
      deviceScaleFactor: 1,
    });

    // Petit délai aléatoire avant la navigation
    await sleep(jitter(500, 1000));

    // Charger la page avec domcontentloaded (plus rapide que networkidle2)
    logger.debug(`[SOUNDCLOUD] Chargement de la page avec Puppeteer...`);
    await page.goto(tracksUrl, {
      waitUntil: 'domcontentloaded', // Plus rapide que networkidle2
      timeout: 10000, // Réduit à 10 secondes
    });

    // Attendre que les éléments de tracks soient présents (timeout réduit)
    logger.debug(`[SOUNDCLOUD] Attente du chargement des tracks...`);
    try {
      await page.waitForSelector(
        '.soundList_item, .soundBadge, .soundBadgeList__item, .sound__coverArt, .sound_coverArt',
        {
          timeout: 3000, // Réduit à 3 secondes
          visible: false, // Plus rapide, on n'a pas besoin que ce soit visible
        }
      );
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
        return document.querySelectorAll(
          '.sound_coverArt, .sound__coverArt, .soundBadge, .soundBadgeList__item'
        ).length;
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

      // Attendre un peu (200ms à 600ms) pour simuler une lecture humaine
      await sleep(jitter(200, 400));

      // Attendre que de nouveaux éléments soient chargés avec timeout très court
      try {
        await page.waitForFunction(
          (prevCount: number) => {
            const currentCount = document.querySelectorAll(
              '.sound_coverArt, .sound__coverArt, .soundBadge, .soundBadgeList__item'
            ).length;
            return currentCount > prevCount;
          },
          { timeout: 1000, polling: 100 }, // Un peu plus de temps pour laisser le contenu charger
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

      // Chercher tous les éléments de track possibles
      const coverArts = document.querySelectorAll(
        '.soundBadge, .soundBadgeList__item, .sound_coverArt, .sound__coverArt'
      );

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
              .replace('-badge', '-t500x500') // Gérer le nouveau format badge
              .split('?')[0];
          }
        }

        // Si pas d'image trouvée dans le lien, chercher dans les enfants (format badge)
        if (!imageUrl) {
          const badgeImg = link.querySelector('img.sc-artwork, .soundBadge__artwork img');
          if (badgeImg) {
            const src = badgeImg.getAttribute('src');
            if (src) {
              imageUrl = src
                .replace('-t200x200', '-t500x500')
                .replace('-large', '-t500x500')
                .replace('-badge', '-t500x500')
                .split('?')[0];
            }
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
    const tracks: SoundCloudTrack[] = tracksData.map((trackData) =>
      toSoundCloudTrack(trackData, profileName)
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

    throw toScrapeError(error, profileName);
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
