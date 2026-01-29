#!/usr/bin/env node
/**
 * Script de seed pour initialiser tous les LiveItem en base de données
 * Garantit que tous les items définis dans src/lib/live/items.ts existent
 * avec les mêmes caractéristiques (nom, description, icône) qu'en développement
 *
 * Usage: pnpm run db:seed:live-items
 */

import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import pg from 'pg';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Charger les variables d'environnement
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

dotenv.config({ path: join(rootDir, '.env.local') });
dotenv.config({ path: join(rootDir, '.env') });

// Fonction pour créer l'adaptateur Prisma approprié
// Utilise la même logique que src/lib/prisma.ts
function createPrismaAdapter(databaseUrl) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL n'est pas défini");
  }

  const isSQLiteUrl = databaseUrl.startsWith('file:');
  const isPostgreSQLUrl =
    databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://');
  const isNeonUrl =
    databaseUrl.includes('neon.tech') ||
    databaseUrl.includes('neon') ||
    databaseUrl.includes('pooler');

  if (isSQLiteUrl) {
    // SQLite - utiliser better-sqlite3 adapter
    try {
      const sqlitePath = databaseUrl.replace('file:', '');
      const sqlite = new Database(sqlitePath);
      return new PrismaBetterSqlite3(sqlite);
    } catch (error) {
      throw new Error(`Erreur lors de l'initialisation de l'adaptateur SQLite: ${error.message}`);
    }
  } else if (isNeonUrl) {
    // Neon - utiliser Neon adapter avec connectionString
    // PrismaNeon attend un objet avec connectionString, pas la fonction neon()
    try {
      return new PrismaNeon({
        connectionString: databaseUrl,
      });
    } catch (error) {
      // Fallback vers pg si Neon échoue
      console.warn(`⚠️  Erreur avec l'adaptateur Neon, utilisation de pg: ${error.message}`);
      const pool = new pg.Pool({ connectionString: databaseUrl });
      return new PrismaPg(pool);
    }
  } else if (isPostgreSQLUrl) {
    // PostgreSQL standard - utiliser pg adapter
    const pool = new pg.Pool({ connectionString: databaseUrl });
    return new PrismaPg(pool);
  } else {
    throw new Error(`Format de DATABASE_URL non supporté: ${databaseUrl.substring(0, 30)}...`);
  }
}

// Définitions des items (copiées depuis src/lib/live/items.ts pour éviter les imports TypeScript)
const LIVE_ITEMS = {
  SUBSCRIBER_BONUS: {
    type: 'SUBSCRIBER_BONUS',
    name: 'Subscriber Bonus',
    description: 'Bonus pour les abonnés Twitch',
    icon: '👑',
  },
  LOYALTY_BONUS: {
    type: 'LOYALTY_BONUS',
    name: 'Loyalty Bonus',
    description: 'Bonus de fidélité (au-dessus de 6)',
    icon: '💎',
  },
  WATCH_STREAK: {
    type: 'WATCH_STREAK',
    name: 'Watch Streak Bonus',
    description: 'Bonus pour avoir regardé plusieurs streams consécutifs',
    icon: '🔥',
  },
  CHEER_PROGRESS: {
    type: 'CHEER_PROGRESS',
    name: 'Cheer Bonus',
    description: 'Bonus pour avoir cheer sur Twitch',
    icon: '💜',
  },
  ETERNAL_TICKET: {
    type: 'ETERNAL_TICKET',
    name: 'Eternal Ticket',
    description: 'Ticket permanent pour les soumissions',
    icon: '🎫',
  },
  WAVEFORM_COLOR: {
    type: 'WAVEFORM_COLOR',
    name: 'Waveform Color',
    description: 'Couleur personnalisée pour le waveform',
    icon: '🎨',
  },
  BACKGROUND_IMAGE: {
    type: 'BACKGROUND_IMAGE',
    name: 'Background Image',
    description: 'Image de fond personnalisée',
    icon: '🖼️',
  },
  QUEUE_SKIP: {
    type: 'QUEUE_SKIP',
    name: 'Queue Skip',
    description: "Passe la file d'attente pour la prochaine soumission",
    icon: '⏭️',
  },
  SUB_GIFT_BONUS: {
    type: 'SUB_GIFT_BONUS',
    name: 'Sub Gift Bonus',
    description: 'Bonus pour avoir offert un abonnement',
    icon: '🎁',
  },
  MARBLES_WINNER_BONUS: {
    type: 'MARBLES_WINNER_BONUS',
    name: 'Marbles Winner Bonus',
    description: 'Bonus pour avoir gagné un jeu de marbles',
    icon: '🎲',
  },
};

// Créer le client Prisma avec l'adaptateur approprié
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ ERREUR: DATABASE_URL n'est pas défini");
  console.error(
    "   Assurez-vous que DATABASE_URL est configuré dans les variables d'environnement"
  );
  console.error(
    "   Variables d'environnement chargées:",
    Object.keys(process.env)
      .filter((k) => k.includes('DATABASE'))
      .join(', ') || 'aucune'
  );
  process.exit(1);
}

// Debug: afficher le type de base de données détecté (sans exposer les credentials)
const dbType = databaseUrl.startsWith('file:')
  ? 'SQLite'
  : databaseUrl.includes('neon')
    ? 'Neon'
    : databaseUrl.startsWith('postgres')
      ? 'PostgreSQL'
      : 'Inconnu';
console.log(`   🔗 Type de base de données détecté: ${dbType}`);

let adapter;
try {
  adapter = createPrismaAdapter(databaseUrl);
} catch (error) {
  console.error("❌ ERREUR lors de la création de l'adaptateur Prisma:", error.message);
  console.error('   Type de base de données:', dbType);
  console.error(
    '   DATABASE_URL (masqué):',
    databaseUrl.substring(0, 20) + '...' + databaseUrl.substring(databaseUrl.length - 10)
  );
  process.exit(1);
}

const prisma = new PrismaClient({ adapter });

async function seedLiveItems() {
  console.log('🌱 Initialisation des LiveItem...\n');

  let created = 0;
  let updated = 0;
  let skipped = 0;

  try {
    // Parcourir tous les items définis
    for (const definition of Object.values(LIVE_ITEMS)) {
      const itemType = definition.type;

      // Vérifier si l'item existe déjà
      const existingItem = await prisma.liveItem.findUnique({
        where: { type: itemType },
      });

      if (existingItem) {
        // Vérifier si les caractéristiques sont identiques
        const needsUpdate =
          existingItem.name !== definition.name ||
          existingItem.description !== definition.description ||
          existingItem.icon !== definition.icon ||
          existingItem.isActive !== true;

        if (needsUpdate) {
          // Mettre à jour l'item pour qu'il corresponde à la définition
          await prisma.liveItem.update({
            where: { type: itemType },
            data: {
              name: definition.name,
              description: definition.description,
              icon: definition.icon,
              isActive: true, // Toujours actif par défaut
            },
          });
          console.log(`  ✅ Mis à jour: ${definition.name} (${itemType})`);
          updated++;
        } else {
          console.log(`  ⏭️  Déjà à jour: ${definition.name} (${itemType})`);
          skipped++;
        }
      } else {
        // Créer l'item s'il n'existe pas
        await prisma.liveItem.create({
          data: {
            type: itemType,
            name: definition.name,
            description: definition.description,
            icon: definition.icon,
            isActive: true,
          },
        });
        console.log(`  ✨ Créé: ${definition.name} (${itemType})`);
        created++;
      }
    }

    console.log('\n📊 Résumé:');
    console.log(`   - ${created} item(s) créé(s)`);
    console.log(`   - ${updated} item(s) mis à jour`);
    console.log(`   - ${skipped} item(s) déjà à jour`);
    console.log(`   - Total: ${Object.keys(LIVE_ITEMS).length} item(s) défini(s)`);
    console.log('\n✅ Seed terminé avec succès!');
  } catch (error) {
    console.error('\n❌ Erreur lors du seed:', error);
    if (error.message) {
      console.error('   Message:', error.message);
    }
    if (error.stack) {
      console.error('   Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le seed
seedLiveItems()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });
