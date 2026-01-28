#!/usr/bin/env node
/**
 * Script pour synchroniser les migrations baseline de SQLite avec PostgreSQL
 * 
 * Ce script applique les migrations baseline en SQLite local pour aligner
 * avec la production PostgreSQL.
 * 
 * Usage: node scripts/sync-sqlite-baselines.mjs
 */

import { execSync } from 'child_process';
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

console.log('🔄 Synchronisation des migrations baseline SQLite ↔ PostgreSQL\n');

// Vérifier que le switch est en SQLite
const switchPath = join(rootDir, '.db-switch.json');
let switchActive = false;

if (existsSync(switchPath)) {
  try {
    const switchConfig = JSON.parse(readFileSync(switchPath, 'utf-8'));
    switchActive = switchConfig.useProduction === true;
  } catch (error) {}
}

if (switchActive) {
  console.log('⚠️  Le switch de production est activé');
  console.log('   Désactivez-le d\'abord pour utiliser SQLite local\n');
  process.exit(1);
}

// Migrations baseline à synchroniser
const baselineMigrations = [
  '20250424125117_init',
  '20250426202133_add_publish_at_to_event',
  '20250426205234_add_publish_at_to_track'
];

console.log('📋 Migrations baseline à synchroniser:');
baselineMigrations.forEach(m => console.log(`   - ${m}`));
console.log('');

// Vérifier l'état actuel
console.log('🔍 Vérification de l\'état actuel...\n');

try {
  const statusOutput = execSync('PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=true pnpm prisma migrate status', {
    encoding: 'utf-8',
    cwd: rootDir,
    stdio: 'pipe'
  });
  
  console.log(statusOutput);
  
  // Vérifier si les baselines sont déjà appliquées
  const baselineApplied = baselineMigrations.every(m => statusOutput.includes(m));
  
  if (baselineApplied) {
    console.log('\n✅ Toutes les migrations baseline sont déjà appliquées en SQLite\n');
    process.exit(0);
  }
  
} catch (error) {
  const output = error.stdout || error.stderr || '';
  console.log(output);
  
  // Si le statut montre des migrations manquantes, on va les marquer comme appliquées
  if (output.includes('not found locally') || output.includes('different')) {
    console.log('\n⚠️  Conflit d\'historique détecté');
    console.log('   Les migrations baseline doivent être marquées comme appliquées\n');
  }
}

// Marquer les migrations baseline comme appliquées
console.log('🔧 Marquage des migrations baseline comme appliquées...\n');

for (const migrationName of baselineMigrations) {
  try {
    console.log(`   📝 ${migrationName}...`);
    execSync(`PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=true pnpm prisma migrate resolve --applied ${migrationName}`, {
      encoding: 'utf-8',
      cwd: rootDir,
      stdio: 'pipe'
    });
    console.log(`      ✅ ${migrationName} marquée comme appliquée`);
  } catch (error) {
    const output = error.stdout || error.stderr || '';
    if (output.includes('already applied') || output.includes('already exists')) {
      console.log(`      ℹ️  ${migrationName} est déjà appliquée`);
    } else {
      console.log(`      ⚠️  ${migrationName}: ${error.message}`);
    }
  }
}

console.log('\n✅ Synchronisation terminée !');
console.log('\n📝 Vérification finale:');

try {
  const finalStatus = execSync('PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=true pnpm prisma migrate status', {
    encoding: 'utf-8',
    cwd: rootDir,
    stdio: 'pipe'
  });
  
  console.log(finalStatus);
  
  if (finalStatus.includes('up to date') || finalStatus.includes('Database schema is up to date')) {
    console.log('\n✅ SQLite est maintenant aligné avec PostgreSQL !\n');
  }
} catch (error) {
  const output = error.stdout || error.stderr || '';
  console.log(output);
}

