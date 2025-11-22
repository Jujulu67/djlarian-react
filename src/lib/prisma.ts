// Prisma Client pour Vercel (Node.js runtime natif)
// Prisma 7 nécessite des adaptateurs explicites pour chaque base de données
import fs from 'fs';
import path from 'path';

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { logger } from '@/lib/logger';

declare global {
  var prisma: InstanceType<typeof PrismaClient> | undefined;
}

// Fonction pour obtenir la DATABASE_URL selon le switch
function getDatabaseUrl(): string {
  // En production, toujours utiliser la DATABASE_URL de l'environnement
  if (process.env.NODE_ENV === 'production') {
    return process.env.DATABASE_URL || '';
  }

  // En développement, vérifier le fichier de switch
  try {
    const switchPath = path.join(process.cwd(), '.db-switch.json');
    if (fs.existsSync(switchPath)) {
      const switchConfig = JSON.parse(fs.readFileSync(switchPath, 'utf-8'));
      if (switchConfig.useProduction && process.env.DATABASE_URL_PRODUCTION) {
        // Vérifier que le schéma Prisma correspond
        const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
        if (fs.existsSync(schemaPath)) {
          const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
          if (!schemaContent.includes('provider = "postgresql"')) {
            logger.warn(
              "Le schéma Prisma est en SQLite mais le switch indique PostgreSQL. Utilisez le switch dans l'admin panel pour synchroniser le schéma."
            );
          }
        }
        return process.env.DATABASE_URL_PRODUCTION;
      }
    }
  } catch (error) {
    // En cas d'erreur, utiliser la DATABASE_URL par défaut
    logger.warn('Erreur lors de la lecture du switch de base de données', error);
  }

  // Par défaut, utiliser DATABASE_URL (qui pointe vers SQLite local en dev)
  return process.env.DATABASE_URL || '';
}

// Créer le client Prisma (singleton pattern)
// Sur Vercel, le runtime Node.js supporte nativement Prisma
const databaseUrl = getDatabaseUrl();

// Vérification de cohérence schema.prisma vs switch (uniquement en dev)
if (process.env.NODE_ENV !== 'production') {
  try {
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    const switchPath = path.join(process.cwd(), '.db-switch.json');

    if (fs.existsSync(schemaPath)) {
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
      const isPostgreSQL = schemaContent.includes('provider = "postgresql"');
      const isSQLite = schemaContent.includes('provider = "sqlite"');

      // Lire le switch pour déterminer le provider attendu
      let expectedProvider: 'postgresql' | 'sqlite' = 'sqlite'; // Par défaut SQLite
      if (fs.existsSync(switchPath)) {
        try {
          const switchConfig = JSON.parse(fs.readFileSync(switchPath, 'utf-8'));
          expectedProvider = switchConfig.useProduction ? 'postgresql' : 'sqlite';
        } catch (error) {
          // Si erreur de lecture, utiliser SQLite par défaut
          logger.warn('Erreur lors de la lecture du switch, utilisation de SQLite par défaut');
        }
      }

      // Vérifier la cohérence et synchroniser si nécessaire
      const actualProvider = isPostgreSQL ? 'postgresql' : 'sqlite';

      if (actualProvider !== expectedProvider) {
        logger.warn(
          `⚠️  Incohérence détectée: schema.prisma est en ${actualProvider} mais le switch indique ${expectedProvider}. Synchronisation automatique...`
        );

        // Synchroniser automatiquement le schéma
        try {
          let newSchemaContent = schemaContent;
          if (expectedProvider === 'sqlite') {
            newSchemaContent = newSchemaContent.replace(
              /provider\s*=\s*"postgresql"/,
              'provider = "sqlite"'
            );
          } else {
            newSchemaContent = newSchemaContent.replace(
              /provider\s*=\s*"sqlite"/,
              'provider = "postgresql"'
            );
          }

          fs.writeFileSync(schemaPath, newSchemaContent, 'utf-8');
          logger.info(`✅ Schema.prisma synchronisé vers ${expectedProvider}`);
        } catch (error) {
          logger.error('Erreur lors de la synchronisation automatique du schéma', error);
        }
      }

      // Vérifier aussi la cohérence avec DATABASE_URL
      const isSQLiteUrl = databaseUrl.startsWith('file:');
      const isPostgreSQLUrl =
        databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://');

      // Avertir si incohérence entre schéma et URL (après synchronisation)
      if (isPostgreSQL && isSQLiteUrl) {
        logger.warn(
          "⚠️  ATTENTION: schema.prisma est en PostgreSQL mais DATABASE_URL pointe vers SQLite. Utilisez le switch DB dans l'admin panel pour synchroniser."
        );
      } else if (isSQLite && isPostgreSQLUrl) {
        logger.warn(
          "⚠️  ATTENTION: schema.prisma est en SQLite mais DATABASE_URL pointe vers PostgreSQL. Utilisez le switch DB dans l'admin panel pour synchroniser."
        );
      }
    }

    // Supprimer le marqueur de redémarrage requis au démarrage
    const restartMarkerPath = path.join(process.cwd(), '.db-restart-required.json');
    if (fs.existsSync(restartMarkerPath)) {
      // Vérifier si le schéma correspond à la configuration
      const switchPath = path.join(process.cwd(), '.db-switch.json');
      if (fs.existsSync(switchPath)) {
        const switchConfig = JSON.parse(fs.readFileSync(switchPath, 'utf-8'));
        const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
        const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

        const expectedProvider = switchConfig.useProduction ? 'postgresql' : 'sqlite';
        const actualProvider = schemaContent.includes('provider = "postgresql"')
          ? 'postgresql'
          : 'sqlite';

        // Si le schéma correspond à la configuration, supprimer le marqueur
        if (expectedProvider === actualProvider) {
          fs.unlinkSync(restartMarkerPath);
          logger.debug('PRISMA - Marqueur de redémarrage supprimé - configuration synchronisée');
        }
      }
    }
  } catch (error) {
    // Ignorer les erreurs de nettoyage
  }
}

// Déterminer le type de base de données et créer l'adaptateur approprié
function createAdapter(databaseUrl: string): PrismaBetterSqlite3 | PrismaNeon | PrismaPg {
  const isSQLiteUrl = databaseUrl.startsWith('file:');
  const isPostgreSQLUrl =
    databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://');
  const isNeonUrl =
    databaseUrl.includes('neon.tech') ||
    databaseUrl.includes('neon.tech') ||
    databaseUrl.includes('neon');

  if (isSQLiteUrl) {
    // SQLite - utiliser better-sqlite3 adapter
    try {
      // Vérifier que better-sqlite3 est disponible

      const betterSqlite3 = require('better-sqlite3');
      if (!betterSqlite3) {
        throw new Error('better-sqlite3 module not found');
      }
      return new PrismaBetterSqlite3({
        url: databaseUrl || 'file:./dev.db',
      });
    } catch (error) {
      logger.error("Erreur lors de l'initialisation de l'adaptateur SQLite:", error);
      throw error;
    }
  } else if (isNeonUrl) {
    // Neon - utiliser Neon adapter
    // PrismaNeon attend un PoolConfig avec connectionString
    return new PrismaNeon({
      connectionString: databaseUrl,
    });
  } else if (isPostgreSQLUrl) {
    // PostgreSQL standard - utiliser pg adapter
    return new PrismaPg({
      connectionString: databaseUrl,
    });
  } else {
    // Par défaut, essayer SQLite
    logger.warn('Type de base de données non reconnu, utilisation de SQLite par défaut');
    return new PrismaBetterSqlite3({
      url: databaseUrl || 'file:./dev.db',
    });
  }
}

const adapter = createAdapter(databaseUrl);

// Configuration des logs Prisma
// Par défaut, masquer les queries en développement pour réduire le bruit
// Réactiver avec PRISMA_LOG_QUERIES=true pour le debug
const shouldLogQueries =
  process.env.PRISMA_LOG_QUERIES === 'true' || process.env.PRISMA_LOG_QUERIES === '1';

const prismaLogConfig: Array<'query' | 'error' | 'warn' | 'info'> =
  process.env.NODE_ENV === 'development'
    ? shouldLogQueries
      ? ['query', 'error', 'warn']
      : ['error', 'warn']
    : ['error'];

const prisma: InstanceType<typeof PrismaClient> =
  global.prisma ||
  new PrismaClient({
    adapter,
    log: prismaLogConfig,
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
