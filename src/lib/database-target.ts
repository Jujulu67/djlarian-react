/**
 * Système de hot swap de base de données sans redémarrage
 *
 * Permet de basculer entre Local et Production en runtime,
 * sans modifier .env.local ni redémarrer le serveur.
 */

import fs from 'fs/promises';
import path from 'path';

import { logger } from '@/lib/logger';

export type DatabaseTarget = 'local' | 'production';

interface DatabaseTargetState {
  target: DatabaseTarget;
  timestamp: number;
  userId?: string;
}

// État global serveur (persiste entre requêtes dans Next.js)
declare global {
  var __activeDatabaseTarget: DatabaseTarget | undefined;
  var __databaseTargetMutex: Promise<void> | undefined;
}

const RUNTIME_DIR = path.join(process.cwd(), '.runtime');
const TARGET_FILE = path.join(RUNTIME_DIR, 'db-target.json');

/**
 * Charge la cible DB depuis le fichier de persistance
 */
async function loadTargetFromFile(): Promise<DatabaseTarget> {
  try {
    const content = await fs.readFile(TARGET_FILE, 'utf-8');
    const state: DatabaseTargetState = JSON.parse(content);
    return state.target;
  } catch {
    // Fichier n'existe pas ou erreur, utiliser la valeur par défaut
    return 'local';
  }
}

/**
 * Sauvegarde la cible DB dans le fichier de persistance
 */
async function saveTargetToFile(target: DatabaseTarget, userId?: string): Promise<void> {
  try {
    // Créer le répertoire .runtime s'il n'existe pas
    await fs.mkdir(RUNTIME_DIR, { recursive: true });

    const state: DatabaseTargetState = {
      target,
      timestamp: Date.now(),
      userId,
    };

    await fs.writeFile(TARGET_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    logger.error('Erreur lors de la sauvegarde de la cible DB:', error);
    throw error;
  }
}

/**
 * Récupère la cible DB active (depuis le cache global ou le fichier)
 */
export async function getActiveDatabaseTarget(): Promise<DatabaseTarget> {
  // Si déjà en cache global, utiliser celui-ci
  if (global.__activeDatabaseTarget) {
    return global.__activeDatabaseTarget;
  }

  // Sinon, charger depuis le fichier
  const target = await loadTargetFromFile();
  global.__activeDatabaseTarget = target;
  return target;
}

/**
 * Définit la cible DB active (avec mutex pour éviter les race conditions)
 */
export async function setActiveDatabaseTarget(
  target: DatabaseTarget,
  userId?: string
): Promise<void> {
  // Attendre que le mutex soit libéré si un switch est en cours
  if (global.__databaseTargetMutex) {
    await global.__databaseTargetMutex;
  }

  // Créer un nouveau mutex pour ce switch
  let resolveMutex: () => void;
  global.__databaseTargetMutex = new Promise((resolve) => {
    resolveMutex = resolve;
  });

  try {
    // Sauvegarder dans le fichier
    await saveTargetToFile(target, userId);

    // Mettre à jour le cache global
    global.__activeDatabaseTarget = target;

    logger.info(`[DB TARGET] Cible DB changée vers: ${target}${userId ? ` (par ${userId})` : ''}`);
  } finally {
    // Libérer le mutex
    resolveMutex!();
    global.__databaseTargetMutex = undefined;
  }
}

/**
 * Récupère l'URL de la base de données selon la cible active
 */
export async function getDatabaseUrlForTarget(target?: DatabaseTarget): Promise<string> {
  const activeTarget = target || (await getActiveDatabaseTarget());

  if (activeTarget === 'production') {
    const prodUrl = process.env.DATABASE_URL_PRODUCTION || process.env.DATABASE_URL;
    if (!prodUrl) {
      throw new Error("DATABASE_URL_PRODUCTION non définie dans les variables d'environnement");
    }
    return prodUrl;
  } else {
    // Local
    const localUrl =
      process.env.DATABASE_URL_LOCAL ||
      'postgresql://djlarian:djlarian_dev_password@localhost:5433/djlarian_dev?sslmode=disable';
    return localUrl;
  }
}

/**
 * Récupère le token Blob selon la cible active
 */
export async function getBlobTokenForTarget(target?: DatabaseTarget): Promise<string | undefined> {
  const activeTarget = target || (await getActiveDatabaseTarget());

  if (activeTarget === 'production') {
    return process.env.BLOB_READ_WRITE_TOKEN_PRODUCTION || process.env.BLOB_READ_WRITE_TOKEN;
  } else {
    // Local
    return process.env.BLOB_READ_WRITE_TOKEN_LOCAL || process.env.BLOB_READ_WRITE_TOKEN;
  }
}

/**
 * Initialise la cible DB au démarrage (charge depuis le fichier)
 */
export async function initializeDatabaseTarget(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    // En production, toujours utiliser production
    global.__activeDatabaseTarget = 'production';
    return;
  }

  // En dev, charger depuis le fichier
  const target = await loadTargetFromFile();
  global.__activeDatabaseTarget = target;

  if (process.env.NODE_ENV === 'development') {
    logger.debug(`[DB TARGET] Cible DB initialisée: ${target}`);
  }
}
