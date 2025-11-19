// Prisma Client pour Vercel (Node.js runtime natif)
// Plus besoin d'adaptateurs ou de hacks - tout fonctionne nativement
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';

declare global {
  var prisma: PrismaClient | undefined;
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
            logger.warn('Le schéma Prisma est en SQLite mais le switch indique PostgreSQL. Utilisez le switch dans l\'admin panel pour synchroniser le schéma.');
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

// Supprimer le marqueur de redémarrage requis au démarrage
if (process.env.NODE_ENV !== 'production') {
  try {
    const restartMarkerPath = path.join(process.cwd(), '.db-restart-required.json');
    if (fs.existsSync(restartMarkerPath)) {
      // Vérifier si le schéma correspond à la configuration
      const switchPath = path.join(process.cwd(), '.db-switch.json');
      if (fs.existsSync(switchPath)) {
        const switchConfig = JSON.parse(fs.readFileSync(switchPath, 'utf-8'));
        const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
        const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
        
        const expectedProvider = switchConfig.useProduction ? 'postgresql' : 'sqlite';
        const actualProvider = schemaContent.includes('provider = "postgresql"') ? 'postgresql' : 'sqlite';
        
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

const prisma: PrismaClient =
  global.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
