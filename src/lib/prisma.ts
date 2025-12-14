/**
 * Prisma Client avec hot swap de base de données
 *
 * Permet de basculer entre Local et Production sans redémarrage.
 * Utilise un cache de clients Prisma par URL pour éviter les reconnexions inutiles.
 */

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import {
  getActiveDatabaseTarget,
  getBlobTokenForTarget,
  getDatabaseUrlForTarget,
  initializeDatabaseTarget,
} from '@/lib/database-target';
import { logger } from '@/lib/logger';

declare global {
  // Cache de clients Prisma par URL (pour éviter les reconnexions)
  var __prismaClients: Map<string, InstanceType<typeof PrismaClient>> | undefined;
  // Client Prisma par défaut (pour compatibilité avec l'usage existant)
  var prisma: InstanceType<typeof PrismaClient> | undefined;
  // Mutex pour éviter les race conditions lors du switch
  var __prismaMutex: Promise<void> | undefined;
  // URL actuelle du client par défaut
  var __prismaCurrentUrl: string | undefined;
}

// Initialiser le cache global si nécessaire
if (!global.__prismaClients) {
  global.__prismaClients = new Map();
}

/**
 * Détermine le type de base de données et crée l'adaptateur approprié
 */
function createAdapter(databaseUrl: string): PrismaBetterSqlite3 | PrismaNeon | PrismaPg {
  const isSQLiteUrl = databaseUrl.startsWith('file:');
  const isPostgreSQLUrl =
    databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://');
  const isNeonUrl = databaseUrl.includes('neon.tech') || databaseUrl.includes('neon');

  if (isSQLiteUrl) {
    // SQLite - uniquement pour les tests
    logger.warn(
      '⚠️  SQLite détecté. PostgreSQL est maintenant requis. SQLite est uniquement supporté pour les tests.'
    );
    try {
      const betterSqlite3 = require('better-sqlite3');
      if (!betterSqlite3) {
        throw new Error('better-sqlite3 module not found (requis uniquement pour les tests)');
      }
      return new PrismaBetterSqlite3({
        url: databaseUrl || 'file:./dev.db',
      });
    } catch (error) {
      logger.error("Erreur lors de l'initialisation de l'adaptateur SQLite:", error);
      throw new Error(
        "SQLite n'est plus supporté en développement. Utilisez PostgreSQL local (localhost:5433)."
      );
    }
  } else if (isNeonUrl) {
    // Neon - utiliser Neon adapter
    return new PrismaNeon({
      connectionString: databaseUrl,
    });
  } else if (isPostgreSQLUrl) {
    // PostgreSQL standard - utiliser pg adapter
    return new PrismaPg({
      connectionString: databaseUrl,
    });
  } else {
    throw new Error(
      `Type de base de données non reconnu dans DATABASE_URL. Attendu: postgresql:// ou postgres://. URL: ${databaseUrl.substring(0, 50)}...`
    );
  }
}

/**
 * Configuration des logs Prisma
 */
function getPrismaLogConfig(): Array<'query' | 'error' | 'warn' | 'info'> {
  const shouldLogQueries =
    process.env.PRISMA_LOG_QUERIES === 'true' || process.env.PRISMA_LOG_QUERIES === '1';

  return process.env.NODE_ENV === 'development'
    ? shouldLogQueries
      ? ['query', 'error', 'warn']
      : ['error', 'warn']
    : ['error'];
}

/**
 * Crée un nouveau client Prisma pour une URL donnée
 */
function createPrismaClient(databaseUrl: string): InstanceType<typeof PrismaClient> {
  const adapter = createAdapter(databaseUrl);
  const logConfig = getPrismaLogConfig();

  const client = new PrismaClient({
    adapter,
    log: logConfig,
  });

  if (process.env.NODE_ENV === 'development') {
    const maskedUrl = databaseUrl.replace(/:([^:@]+)@/, ':****@');
    logger.debug(`[PRISMA] Client créé pour: ${maskedUrl.substring(0, 80)}...`);
  }

  return client;
}

/**
 * Déconnecte proprement un client Prisma
 */
async function disconnectPrismaClient(client: InstanceType<typeof PrismaClient>): Promise<void> {
  try {
    await client.$disconnect();
  } catch (error) {
    // Ignorer les erreurs de déconnexion (client peut déjà être déconnecté)
    logger.debug('[PRISMA] Erreur lors de la déconnexion (non-bloquante):', error);
  }
}

/**
 * Met à jour le client Prisma par défaut selon la cible DB active
 *
 * Cette fonction est thread-safe grâce au mutex global.
 * Si la cible change, l'ancien client est déconnecté et un nouveau est créé.
 */
export async function updateDefaultPrismaClient(): Promise<InstanceType<typeof PrismaClient>> {
  // Attendre que le mutex soit libéré si un switch est en cours
  if (global.__prismaMutex) {
    await global.__prismaMutex;
  }

  // Créer un nouveau mutex pour cette opération
  let resolveMutex: () => void;
  global.__prismaMutex = new Promise((resolve) => {
    resolveMutex = resolve;
  });

  try {
    // Récupérer la cible active et l'URL correspondante
    const target = await getActiveDatabaseTarget();
    const databaseUrl = await getDatabaseUrlForTarget(target);

    // Si l'URL n'a pas changé, retourner le client existant
    if (global.__prismaCurrentUrl === databaseUrl && global.prisma) {
      return global.prisma;
    }

    // Déconnecter l'ancien client si nécessaire
    if (global.prisma && global.__prismaCurrentUrl !== databaseUrl) {
      logger.debug("[PRISMA] Déconnexion de l'ancien client...");
      await disconnectPrismaClient(global.prisma);

      // Retirer l'ancien client du cache
      if (global.__prismaCurrentUrl) {
        global.__prismaClients!.delete(global.__prismaCurrentUrl);
      }
    }

    // Vérifier si on a déjà un client pour cette URL dans le cache
    let client = global.__prismaClients!.get(databaseUrl);

    if (!client) {
      // Créer un nouveau client pour cette URL
      client = createPrismaClient(databaseUrl);
      global.__prismaClients!.set(databaseUrl, client);
    }

    // Mettre à jour le client par défaut
    global.prisma = client;
    global.__prismaCurrentUrl = databaseUrl;

    if (process.env.NODE_ENV === 'development') {
      logger.debug(`[PRISMA] Client mis à jour pour la cible: ${target}`);
    }

    return client;
  } finally {
    // Libérer le mutex
    resolveMutex!();
    global.__prismaMutex = undefined;
  }
}

/**
 * Récupère le client Prisma pour la cible DB active (avec cache)
 *
 * Cette fonction est thread-safe grâce au mutex global.
 * Si la cible change, l'ancien client est déconnecté et un nouveau est créé.
 */
export async function getPrismaClient(): Promise<InstanceType<typeof PrismaClient>> {
  return updateDefaultPrismaClient();
}

/**
 * Force la déconnexion de tous les clients Prisma (utile lors d'un switch)
 */
export async function disconnectAllPrismaClients(): Promise<void> {
  const clients = Array.from(global.__prismaClients!.values());
  global.__prismaClients!.clear();
  global.prisma = undefined;
  global.__prismaCurrentUrl = undefined;

  // Déconnecter tous les clients en parallèle
  await Promise.all(clients.map(disconnectPrismaClient));
}

/**
 * Initialise le système Prisma (appelé au démarrage)
 */
export async function initializePrisma(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    // En production, toujours utiliser production
    await initializeDatabaseTarget();
  } else {
    // En dev, initialiser depuis le fichier
    await initializeDatabaseTarget();
  }

  // ⚠️ IMPORTANT: Mettre à jour process.env.BLOB_READ_WRITE_TOKEN selon la cible active
  // Le SDK @vercel/blob lit directement cette variable
  try {
    const target = await getActiveDatabaseTarget();
    const blobToken = await getBlobTokenForTarget(target);
    if (blobToken) {
      process.env.BLOB_READ_WRITE_TOKEN = blobToken;
      logger.debug(`[PRISMA] BLOB_READ_WRITE_TOKEN initialisé pour la cible: ${target}`);
    } else {
      delete process.env.BLOB_READ_WRITE_TOKEN;
    }
  } catch (error) {
    logger.warn("[PRISMA] Erreur lors de l'initialisation du token Blob (non-bloquante):", error);
  }

  // Précharger le client pour la cible active
  try {
    await updateDefaultPrismaClient();
  } catch (error) {
    logger.warn('[PRISMA] Erreur lors du préchargement du client (non-bloquante):', error);
  }
}

/**
 * Export par défaut pour compatibilité avec le code existant
 *
 * ⚠️ IMPORTANT: Ce client est mis à jour automatiquement lors d'un switch DB.
 * L'export par défaut pointe toujours vers global.prisma qui est mis à jour lors du switch.
 *
 * Pour les nouvelles routes, préférez utiliser getPrismaClient() pour garantir
 * que vous utilisez toujours la bonne cible.
 */
function getDefaultPrisma(): InstanceType<typeof PrismaClient> {
  // Toujours retourner global.prisma qui est mis à jour lors du switch
  if (global.prisma) {
    return global.prisma;
  }

  // Si le client n'est pas encore initialisé, créer un client par défaut
  // (sera mis à jour lors de l'initialisation)
  const defaultUrl =
    process.env.DATABASE_URL ||
    process.env.DATABASE_URL_LOCAL ||
    'postgresql://djlarian:djlarian_dev_password@localhost:5433/djlarian_dev?sslmode=disable';

  const client = createPrismaClient(defaultUrl);
  global.prisma = client;
  global.__prismaCurrentUrl = defaultUrl;

  // Initialiser de manière asynchrone (non-bloquant)
  initializePrisma().catch((error) => {
    logger.warn("[PRISMA] Erreur lors de l'initialisation (non-bloquante):", error);
  });

  return client;
}

// Créer un proxy qui délègue toutes les propriétés à global.prisma
// Cela garantit que l'export par défaut pointe toujours vers le client actuel
const prisma = new Proxy({} as InstanceType<typeof PrismaClient>, {
  get(_target, prop) {
    const client = getDefaultPrisma();
    const value = (client as unknown as Record<string, unknown>)[prop as string];

    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

if (process.env.NODE_ENV !== 'production') {
  // S'assurer que global.prisma est défini
  if (!global.prisma) {
    global.prisma = getDefaultPrisma();
  }
}

export default prisma;
