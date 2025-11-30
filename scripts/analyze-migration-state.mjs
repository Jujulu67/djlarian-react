#!/usr/bin/env node
/**
 * Script pour analyser l'état des migrations et comprendre les décalages
 * 
 * Ce script compare :
 * - Les migrations dans prisma/migrations/
 * - Les migrations dans _prisma_migrations (DB)
 * - Les tables réelles dans la DB
 * 
 * Usage: node scripts/analyze-migration-state.mjs
 */

import { readdir, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const readdirAsync = promisify(readdir);

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

if (!databaseUrl || (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://'))) {
  console.error('❌ Impossible de trouver une connection string PostgreSQL valide');
  process.exit(1);
}

// Connexion Neon
const { neon } = await import('@neondatabase/serverless');
const sql = neon(databaseUrl);

console.log('🔍 Analyse de l\'état des migrations\n');
console.log(`📋 Connexion: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}\n`);

// 1. Lire les migrations locales
console.log('📁 1. Migrations locales (prisma/migrations/):');
const migrationsDir = join(rootDir, 'prisma', 'migrations');
const localMigrations = [];

if (existsSync(migrationsDir)) {
  const entries = await readdirAsync(migrationsDir, { withFileTypes: true });
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
localMigrations.forEach(m => console.log(`   ✅ ${m}`));
console.log(`   Total: ${localMigrations.length} migrations locales\n`);

// 2. Lire les migrations en DB
console.log('🗄️  2. Migrations en base de données (_prisma_migrations):');
const dbMigrations = await sql`
  SELECT migration_name, finished_at, applied_steps_count, started_at, logs
  FROM _prisma_migrations
  ORDER BY migration_name;
`;

dbMigrations.forEach(m => {
  const status = m.finished_at ? '✅' : m.started_at ? '⚠️' : '❓';
  const logs = m.logs ? ` (${m.logs.substring(0, 50)}...)` : '';
  console.log(`   ${status} ${m.migration_name} - applied: ${m.applied_steps_count}, finished: ${m.finished_at || 'NON'}`);
  if (m.logs) {
    console.log(`      Logs: ${m.logs.substring(0, 100)}`);
  }
});
console.log(`   Total: ${dbMigrations.length} migrations en DB\n`);

// 3. Vérifier les tables réelles
console.log('📊 3. Tables réelles dans la base de données:');
const tables = await sql`
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  ORDER BY table_name;
`;

const tableNames = tables.map(t => t.table_name);
tableNames.forEach(t => console.log(`   ✅ ${t}`));
console.log(`   Total: ${tableNames.length} tables\n`);

// 4. Analyser les décalages
console.log('🔍 4. Analyse des décalages:\n');

// Migrations locales mais pas en DB
const missingInDb = localMigrations.filter(m => !dbMigrations.some(db => db.migration_name === m));
if (missingInDb.length > 0) {
  console.log('⚠️  Migrations locales mais PAS en DB:');
  missingInDb.forEach(m => console.log(`   - ${m}`));
  console.log('');
}

// Migrations en DB mais pas locales
const missingLocal = dbMigrations.filter(db => !localMigrations.includes(db.migration_name));
if (missingLocal.length > 0) {
  console.log('⚠️  Migrations en DB mais PAS locales:');
  missingLocal.forEach(m => console.log(`   - ${m.migration_name} (finished: ${m.finished_at || 'NON'})`));
  console.log('');
}

// Migrations marquées comme finished mais tables manquantes
console.log('🔍 5. Vérification tables vs migrations:\n');

// Tables attendues selon le schéma
const expectedTables = ['Notification', 'MilestoneNotification'];
for (const table of expectedTables) {
  const exists = tableNames.includes(table);
  const status = exists ? '✅' : '❌';
  console.log(`   ${status} ${table}: ${exists ? 'EXISTE' : 'MANQUANTE'}`);
  
  // Chercher quelle migration devrait créer cette table
  if (!exists) {
    for (const migration of localMigrations) {
      const migrationPath = join(migrationsDir, migration, 'migration.sql');
      if (existsSync(migrationPath)) {
        const content = readFileSync(migrationPath, 'utf-8');
        if (content.includes(`CREATE TABLE "${table}"`) || content.includes(`CREATE TABLE ${table}`)) {
          const dbMigration = dbMigrations.find(db => db.migration_name === migration);
          if (dbMigration && dbMigration.finished_at) {
            console.log(`      ⚠️  Migration ${migration} est marquée comme finished mais la table n'existe pas !`);
            console.log(`      💡 La migration a probablement échoué mais a été marquée comme "applied"`);
          }
        }
      }
    }
  }
}

console.log('\n✅ Analyse terminée');

