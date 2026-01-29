#!/usr/bin/env node
/**
 * Script de diagnostic pour comparer l'état de la base de données avec le schéma Prisma
 * Aide à identifier ce qui manque et génère le SQL nécessaire
 *
 * Usage: node scripts/diagnose-db-schema.mjs
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

dotenv.config({ path: join(rootDir, '.env.local') });
dotenv.config({ path: join(rootDir, '.env') });

const prisma = new PrismaClient();

// Tables attendues selon le schéma Prisma
const expectedTables = [
  'Account',
  'Event',
  'Genre',
  'GenresOnTracks',
  'MusicCollection',
  'RecurrenceConfig',
  'Session',
  'TicketInfo',
  'Track',
  'TrackPlatform',
  'User',
  'VerificationToken',
  'SiteConfig',
  'ConfigHistory',
  'ConfigSnapshot',
  'Image',
  'Project',
];

async function diagnose() {
  try {
    console.log('🔍 Diagnostic de la base de données...\n');

    // 1. Vérifier les tables existantes
    console.log('📊 1. Tables existantes dans la base de données:');
    const existingTables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    const existingTableNames = existingTables.map((t) => t.table_name);

    if (existingTableNames.length === 0) {
      console.log('   ❌ Aucune table trouvée dans la base de données !\n');
    } else {
      existingTableNames.forEach((table) => {
        console.log(`   ✅ ${table}`);
      });
      console.log(`\n   Total: ${existingTableNames.length} tables\n`);
    }

    // 2. Comparer avec les tables attendues
    console.log('📋 2. Comparaison avec le schéma Prisma:');
    const missingTables = expectedTables.filter((t) => !existingTableNames.includes(t));
    const extraTables = existingTableNames.filter(
      (t) => !expectedTables.includes(t) && t !== '_prisma_migrations'
    );

    if (missingTables.length === 0 && extraTables.length === 0) {
      console.log('   ✅ Toutes les tables attendues sont présentes !\n');
    } else {
      if (missingTables.length > 0) {
        console.log(`\n   ❌ Tables manquantes (${missingTables.length}):`);
        missingTables.forEach((table) => {
          console.log(`      - ${table}`);
        });
      }

      if (extraTables.length > 0) {
        console.log(`\n   ⚠️  Tables supplémentaires (${extraTables.length}):`);
        extraTables.forEach((table) => {
          console.log(`      - ${table}`);
        });
      }
      console.log('');
    }

    // 3. Vérifier l'état des migrations
    console.log('🔄 3. État des migrations Prisma:');
    try {
      const migrations = await prisma.$queryRaw`
        SELECT 
          migration_name, 
          finished_at, 
          applied_steps_count, 
          started_at,
          logs
        FROM _prisma_migrations
        ORDER BY started_at DESC
        LIMIT 10;
      `;

      if (migrations.length === 0) {
        console.log('   ⚠️  Aucune migration trouvée dans _prisma_migrations\n');
        console.log("   💡 La base de données n'a jamais été migrée avec Prisma\n");
      } else {
        migrations.forEach((m) => {
          const status = m.finished_at ? '✅ Appliquée' : '❌ Échouée/En cours';
          const date = m.finished_at || m.started_at;
          console.log(`   ${status}: ${m.migration_name}`);
          console.log(`      Étapes appliquées: ${m.applied_steps_count}`);
          console.log(`      Date: ${date}`);
          if (m.logs) {
            console.log(`      Logs: ${m.logs.substring(0, 100)}...`);
          }
          console.log('');
        });
      }
    } catch (error) {
      if (error.code === 'P2021') {
        console.log("   ❌ La table _prisma_migrations n'existe pas !");
        console.log("   💡 La base de données n'a jamais été migrée avec Prisma\n");
      } else {
        console.log(`   ⚠️  Erreur: ${error.message}\n`);
      }
    }

    // 4. Générer le SQL pour créer les tables manquantes
    if (missingTables.length > 0) {
      console.log('💡 4. Recommandations:');
      console.log('\n   Pour créer les tables manquantes, vous avez plusieurs options:\n');

      console.log('   Option A: Rollback et réappliquer la migration');
      console.log('   ```bash');
      console.log('   pnpm prisma migrate resolve --rolled-back 20251128000927_init');
      console.log('   pnpm prisma migrate deploy');
      console.log('   ```\n');

      console.log('   Option B: Utiliser prisma db push (temporaire, pour tester)');
      console.log('   ```bash');
      console.log('   pnpm prisma db push --accept-data-loss');
      console.log('   ```\n');

      console.log('   Option C: Créer une nouvelle migration baseline');
      console.log('   ```bash');
      console.log("   # Supprimer l'ancienne migration");
      console.log('   rm -rf prisma/migrations/20251128000927_init');
      console.log('   # Créer une nouvelle migration');
      console.log('   pnpm prisma migrate dev --name init --create-only');
      console.log('   # Appliquer');
      console.log('   pnpm prisma migrate deploy');
      console.log('   ```\n');

      // Lire le fichier de migration pour voir ce qui devrait être créé
      const migrationFile = join(rootDir, 'prisma/migrations/20251128000927_init/migration.sql');
      try {
        const migrationSQL = readFileSync(migrationFile, 'utf-8');
        const createTableStatements = migrationSQL.match(/CREATE TABLE "([^"]+)"/g) || [];
        const tablesInMigration = createTableStatements
          .map((stmt) => {
            const match = stmt.match(/"([^"]+)"/);
            return match ? match[1] : null;
          })
          .filter(Boolean);

        console.log('   📄 Tables dans le fichier de migration:');
        tablesInMigration.forEach((table) => {
          const exists = existingTableNames.includes(table);
          const shouldExist = expectedTables.includes(table);
          const status = exists ? '✅' : '❌';
          const note = shouldExist ? '' : ' (non attendue)';
          console.log(`      ${status} ${table}${note}`);
        });
        console.log('');
      } catch (error) {
        console.log(`   ⚠️  Impossible de lire le fichier de migration: ${error.message}\n`);
      }
    }

    // 5. Résumé
    console.log('📊 5. Résumé:');
    console.log(`   Tables attendues: ${expectedTables.length}`);
    console.log(`   Tables existantes: ${existingTableNames.length}`);
    console.log(`   Tables manquantes: ${missingTables.length}`);
    console.log(`   Tables supplémentaires: ${extraTables.length}`);

    if (missingTables.length > 0) {
      console.log('\n   ❌ ACTION REQUISE: Des tables manquantes doivent être créées\n');
      process.exit(1);
    } else {
      console.log('\n   ✅ La base de données est à jour\n');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.code === 'P2021') {
      console.error("\n   La base de données n'existe pas ou n'est pas accessible.");
      console.error('   Vérifiez que DATABASE_URL est correcte.');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
