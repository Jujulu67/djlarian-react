#!/usr/bin/env node
/**
 * Script pour créer les migrations baseline manquantes dans Git
 *
 * Ce script crée les migrations baseline qui existent en DB mais pas dans Git
 * pour aligner l'historique et éviter les conflits futurs.
 *
 * Usage: node scripts/create-baseline-migrations.mjs
 */

import { mkdir, writeFile, existsSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const mkdirAsync = promisify(mkdir);
const writeFileAsync = promisify(writeFile);

// Charger les variables d'environnement
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

dotenv.config({ path: join(rootDir, '.env.local') });
dotenv.config({ path: join(rootDir, '.env') });

// Obtenir DATABASE_URL (même logique que fix-notification-table.mjs)
const { readFileSync: readFile } = await import('fs');
const switchPath = join(rootDir, '.db-switch.json');
const envLocalPath = join(rootDir, '.env.local');
let databaseUrl = null;
let switchActive = false;

if (existsSync(switchPath)) {
  try {
    const switchConfig = JSON.parse(readFile(switchPath, 'utf-8'));
    switchActive = switchConfig.useProduction === true;
  } catch (error) {}
}

if (switchActive && existsSync(envLocalPath)) {
  const envContent = readFile(envLocalPath, 'utf-8');
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

if (!databaseUrl && process.env.DATABASE_URL) {
  databaseUrl = process.env.DATABASE_URL;
}

if (
  !databaseUrl ||
  (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://'))
) {
  console.error('❌ Impossible de trouver une connection string PostgreSQL valide');
  console.error('   Activez le switch de production dans /admin/configuration');
  process.exit(1);
}

// Connexion Neon
const { neon } = await import('@neondatabase/serverless');
const sql = neon(databaseUrl);

console.log('🔍 Recherche des migrations baseline manquantes...\n');

// 1. Lire les migrations locales
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

// 2. Lire les migrations en DB
const dbMigrations = await sql`
  SELECT DISTINCT migration_name, finished_at
  FROM _prisma_migrations
  WHERE finished_at IS NOT NULL
  ORDER BY migration_name;
`;

// 3. Trouver les migrations en DB mais pas locales
const missingLocal = dbMigrations
  .filter((db) => !localMigrations.includes(db.migration_name))
  .map((db) => db.migration_name);

if (missingLocal.length === 0) {
  console.log('✅ Toutes les migrations sont déjà synchronisées !');
  console.log('   Aucune migration baseline à créer.\n');
  process.exit(0);
}

console.log(`📋 Migrations baseline à créer (${missingLocal.length}):`);
missingLocal.forEach((m) => console.log(`   - ${m}`));
console.log('');

// 4. Créer les migrations baseline
console.log('🔧 Création des migrations baseline...\n');

for (const migrationName of missingLocal) {
  const baselineDir = join(migrationsDir, migrationName);

  if (existsSync(baselineDir)) {
    console.log(`   ℹ️  ${migrationName} existe déjà, ignoré`);
    continue;
  }

  try {
    await mkdirAsync(baselineDir, { recursive: true });

    const migrationContent = `-- Baseline migration: Cette migration existe déjà dans la base de données de production
-- Elle est marquée comme baseline pour synchroniser l'historique des migrations
-- Aucune modification SQL n'est nécessaire, le schéma est déjà à jour
--
-- Cette migration a été créée automatiquement pour aligner Git avec la base de données
-- Date de création: ${new Date().toISOString()}
--
-- IMPORTANT: Cette migration est vide car elle existe déjà en production
-- Ne pas modifier ce fichier, il sert uniquement à synchroniser l'historique
`;

    await writeFileAsync(join(baselineDir, 'migration.sql'), migrationContent, 'utf-8');
    console.log(`   ✅ ${migrationName} créée`);
  } catch (error) {
    console.error(`   ❌ Erreur lors de la création de ${migrationName}:`, error.message);
  }
}

console.log('\n✅ Migrations baseline créées !');
console.log('\n📝 Prochaines étapes:');
console.log('   1. Vérifiez les migrations créées:');
console.log('      ls -la prisma/migrations/');
console.log("   2. Vérifiez l'état des migrations:");
console.log('      pnpm run db:analyze-migrations');
console.log('   3. Commitez les migrations baseline:');
console.log('      git add prisma/migrations/');
console.log('      git commit -m "Add baseline migrations to align Git with production DB"');
console.log('');
