/**
 * Lancement du navigateur Puppeteer pour le scraping SoundCloud
 * (import conditionnel : puppeteer-core + chromium sur Vercel, puppeteer standard en local)
 */

import { logger } from '@/lib/logger';
import type { Browser, LaunchOptions, PuppeteerLike } from './types';

// Import conditionnel de Puppeteer
// Sur Vercel, on utilise puppeteer-core avec @sparticuz/chromium-min
// En local, on utilise puppeteer standard
let puppeteer: PuppeteerLike | null = null;

// Fonction pour charger Puppeteer de manière conditionnelle
export async function loadPuppeteer(): Promise<PuppeteerLike | null> {
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
        // Utiliser une variable pour l'import afin d'éviter que Webpack/Next.js ne détecte et bundle puppeteer
        // @ts-ignore
        const puppeteerPkg = 'puppeteer';
        const puppeteerModule = await import(puppeteerPkg);
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

/**
 * Options de lancement du scraping. Les args personnalisés ne sont ajoutés qu'en local
 * (sur Vercel, chromium-min fournit déjà sa configuration).
 *
 * @param isLocal - true si VERCEL !== '1'
 */
export function buildLaunchOptions(isLocal: boolean): LaunchOptions {
  const launchOptions: LaunchOptions = {
    headless: true,
  };

  // En local seulement, ajouter les args personnalisés
  if (isLocal) {
    launchOptions.args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
    ];
  }

  return launchOptions;
}
