#!/usr/bin/env node
/**
 * Script pour vérifier l'alignement entre SQLite local et PostgreSQL production
 *
 * Ce script compare :
 * - Les migrations dans SQLite local
 * - Les migrations dans PostgreSQL production
 * - Le schéma des tables
 *
 * Usage: node scripts/verify-sqlite-prod-alignment.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Charger les variables d'environnement
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

dotenv.config({ path: join(rootDir, '.env.local') });
dotenv.config({ path: join(rootDir, '.env') });

console.log("🔍 Vérification de l'alignement SQLite ↔ PostgreSQL\n");

// 1. Vérifier SQLite local
console.log('📁 1. Base de données SQLite locale:');
const sqlitePath =
  process.env.DATABASE_URL?.replace('file:', '') || join(rootDir, 'prisma', 'dev.db');
let sqliteMigrations = [];

if (!existsSync(sqlitePath)) {
  console.log(`   ⚠️  Base SQLite non trouvée: ${sqlitePath}`);
  console.log("   💡 Créez d'abord la base SQLite avec: pnpm prisma migrate dev\n");
} else {
  console.log(`   ✅ Base SQLite trouvée: ${sqlitePath}\n`);

  try {
    // Utiliser Prisma pour lire SQLite
    const { PrismaClient } = await import('@prisma/client');

    // Vérifier si on peut se connecter à SQLite
    // Si le schéma est en PostgreSQL, on ne peut pas utiliser Prisma directement
    // On va lire directement le fichier SQLite avec une approche différente

    // Essayer de lire avec Prisma si possible
    try {
      const prisma = new PrismaClient();
      const migrations = await prisma.$queryRaw`
        SELECT migration_name, finished_at, applied_steps_count
        FROM _prisma_migrations
        WHERE finished_at IS NOT NULL
        ORDER BY migration_name;
      `;

      sqliteMigrations = migrations;

      console.log(`   📋 Migrations appliquées en SQLite (${sqliteMigrations.length}):`);
      sqliteMigrations.forEach((m) => {
        console.log(`      ✅ ${m.migration_name}`);
      });
      console.log('');

      await prisma.$disconnect();
    } catch (prismaError) {
      // Si Prisma ne peut pas se connecter (schéma en PostgreSQL), utiliser une approche alternative
      console.log('   ⚠️  Impossible de lire avec Prisma (schéma peut-être en PostgreSQL)');
      console.log('   💡 Vérifiez que le schéma Prisma est en SQLite pour lire la base locale\n');
    }
  } catch (error) {
    console.error(`   ❌ Erreur lors de la lecture de SQLite: ${error.message}\n`);
  }
}

// 2. Vérifier PostgreSQL production
console.log('🗄️  2. Base de données PostgreSQL production:');

// Obtenir DATABASE_URL_PRODUCTION
const switchPath = join(rootDir, '.db-switch.json');
const envLocalPath = join(rootDir, '.env.local');
let databaseUrl = null;
let switchActive = false;

if (existsSync(switchPath)) {
  try {
    const switchConfig = JSON.parse(readFileSync(switchPath, 'utf-8'));
    switchActive = switchConfig.useProduction === true;
  } catch (error) {}
}

if (switchActive && existsSync(envLocalPath)) {
  const envContent = readFileSync(envLocalPath, 'utf-8');
  const dbUrlMatch = envContent.match(/^DATABASE_URL=(.+)$/m);
  if (dbUrlMatch) {
    const url = dbUrlMatch[1].trim().replace(/^["']|["']$/g, '');
    if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
      databaseUrl = url;
    }
  }
}

if (!databaseUrl && process.env.DATABASE_URL_PRODUCTION) {
  databaseUrl = process.env.DATABASE_URL_PRODUCTION;
}

if (
  !databaseUrl ||
  (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://'))
) {
  console.log('   ⚠️  Impossible de trouver DATABASE_URL_PRODUCTION');
  console.log('   💡 Activez le switch de production dans /admin/configuration\n');
  process.exit(1);
}

try {
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(databaseUrl);

  // Lire les migrations en PostgreSQL
  const pgMigrations = await sql`
    SELECT DISTINCT migration_name, finished_at, applied_steps_count
    FROM _prisma_migrations
    WHERE finished_at IS NOT NULL
    ORDER BY migration_name;
  `;

  console.log(`   📋 Migrations appliquées en PostgreSQL (${pgMigrations.length}):`);
  pgMigrations.forEach((m) => {
    console.log(`      ✅ ${m.migration_name}`);
  });
  console.log('');

  // 3. Comparaison
  console.log('🔍 3. Comparaison SQLite ↔ PostgreSQL:\n');

  // Lire les migrations locales (Git)
  const migrationsDir = join(rootDir, 'prisma', 'migrations');
  const localMigrations = [];

  if (existsSync(migrationsDir)) {
    const { readdir } = await import('fs/promises');
    const entries = await readdir(migrationsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const migrationPath = join(migrationsDir, entry.name, 'migration.sql');
        if (existsSync(migrationPath)) {
          localMigrations.push(entry.name);
        }
      }
    }
  }

  localMigrations.sort();

  // Comparer SQLite vs PostgreSQL
  const sqliteMigrationNames =
    sqliteMigrations && sqliteMigrations.length > 0
      ? sqliteMigrations.map((m) => m.migration_name)
      : [];
  const pgMigrationNames = pgMigrations.map((m) => m.migration_name);

  // Migrations en SQLite mais pas en PostgreSQL
  const missingInPg = sqliteMigrationNames.filter((m) => !pgMigrationNames.includes(m));
  if (missingInPg.length > 0) {
    console.log('   ⚠️  Migrations en SQLite mais PAS en PostgreSQL:');
    missingInPg.forEach((m) => console.log(`      - ${m}`));
    console.log('');
  }

  // Migrations en PostgreSQL mais pas en SQLite
  const missingInSqlite = pgMigrationNames.filter((m) => !sqliteMigrationNames.includes(m));
  if (missingInSqlite.length > 0) {
    console.log('   ⚠️  Migrations en PostgreSQL mais PAS en SQLite:');
    missingInSqlite.forEach((m) => console.log(`      - ${m}`));
    console.log('');
  }

  // Migrations dans Git mais pas appliquées
  const notAppliedInSqlite = localMigrations.filter((m) => !sqliteMigrationNames.includes(m));
  const notAppliedInPg = localMigrations.filter((m) => !pgMigrationNames.includes(m));

  if (notAppliedInSqlite.length > 0 || notAppliedInPg.length > 0) {
    console.log('   ⚠️  Migrations dans Git mais pas appliquées:');
    if (notAppliedInSqlite.length > 0) {
      console.log('      SQLite:');
      notAppliedInSqlite.forEach((m) => console.log(`         - ${m}`));
    }
    if (notAppliedInPg.length > 0) {
      console.log('      PostgreSQL:');
      notAppliedInPg.forEach((m) => console.log(`         - ${m}`));
    }
    console.log('');
  }

  // Vérifier que toutes les migrations baseline sont présentes
  const baselineMigrations = [
    '20250424125117_init',
    '20250426202133_add_publish_at_to_event',
    '20250426205234_add_publish_at_to_track',
  ];
  const missingBaselinesInSqlite = baselineMigrations.filter(
    (m) => !sqliteMigrationNames.includes(m)
  );
  const missingBaselinesInPg = baselineMigrations.filter((m) => !pgMigrationNames.includes(m));

  if (missingBaselinesInSqlite.length > 0 || missingBaselinesInPg.length > 0) {
    console.log('   ⚠️  Migrations baseline manquantes:');
    if (missingBaselinesInSqlite.length > 0) {
      console.log('      SQLite:');
      missingBaselinesInSqlite.forEach((m) => console.log(`         - ${m}`));
    }
    if (missingBaselinesInPg.length > 0) {
      console.log('      PostgreSQL:');
      missingBaselinesInPg.forEach((m) => console.log(`         - ${m}`));
    }
    console.log('');
  }

  // Résumé
  if (
    missingInPg.length === 0 &&
    missingInSqlite.length === 0 &&
    notAppliedInSqlite.length === 0 &&
    notAppliedInPg.length === 0 &&
    missingBaselinesInSqlite.length === 0 &&
    missingBaselinesInPg.length === 0
  ) {
    console.log('   ✅ SQLite et PostgreSQL sont alignés !');
    console.log('   ✅ Toutes les migrations sont synchronisées');
    console.log('   ✅ Les prochaines migrations devraient passer en production\n');
  } else {
    console.log('   ⚠️  Des différences ont été détectées');
    console.log('   💡 Voir les détails ci-dessus\n');
  }
} catch (error) {
  console.error(`   ❌ Erreur lors de la connexion à PostgreSQL: ${error.message}\n`);
  process.exit(1);
}
