#!/usr/bin/env node
/**
 * Script pour nettoyer les doublons de migrations dans _prisma_migrations
 * 
 * Ce script supprime les entrées multiples de la même migration dans la DB
 * en gardant uniquement celle qui est finished_at.
 * 
 * Usage: node scripts/cleanup-duplicate-migrations.mjs
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

// Charger les variables d'environnement
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

dotenv.config({ path: join(rootDir, '.env.local') });
dotenv.config({ path: join(rootDir, '.env') });

// Obtenir DATABASE_URL
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

console.log('🔍 Recherche des migrations en doublon dans _prisma_migrations...\n');

// Trouver les migrations en doublon
const duplicates = await sql`
  SELECT migration_name, COUNT(*) as count
  FROM _prisma_migrations
  GROUP BY migration_name
  HAVING COUNT(*) > 1
  ORDER BY migration_name;
`;

if (duplicates.length === 0) {
  console.log('✅ Aucun doublon trouvé, la base de données est propre !\n');
  process.exit(0);
}

console.log(`📋 Migrations en doublon trouvées (${duplicates.length}):`);
duplicates.forEach(d => console.log(`   - ${d.migration_name} (${d.count} entrées)`));
console.log('');

// Pour chaque migration en doublon, garder uniquement celle qui est finished
console.log('🧹 Nettoyage des doublons...\n');

for (const dup of duplicates) {
  const migrationName = dup.migration_name;
  
  // Récupérer toutes les entrées de cette migration
  const entries = await sql`
    SELECT id, migration_name, finished_at, started_at, applied_steps_count
    FROM _prisma_migrations
    WHERE migration_name = ${migrationName}
    ORDER BY started_at DESC;
  `;
  
  // Trouver celle qui est finished (priorité)
  const finished = entries.find(e => e.finished_at);
  
  if (finished) {
    console.log(`   ✅ ${migrationName}: Garde l'entrée finished (${finished.id})`);
    
    // Supprimer les autres entrées
    const toDelete = entries.filter(e => e.id !== finished.id);
    for (const entry of toDelete) {
      await sql`
        DELETE FROM _prisma_migrations
        WHERE id = ${entry.id};
      `;
      console.log(`      🗑️  Supprimé: ${entry.id} (started: ${entry.started_at}, finished: ${entry.finished_at || 'NON'})`);
    }
  } else {
    // Aucune n'est finished, garder la plus récente
    const mostRecent = entries[0];
    console.log(`   ⚠️  ${migrationName}: Aucune finished, garde la plus récente (${mostRecent.id})`);
    
    const toDelete = entries.filter(e => e.id !== mostRecent.id);
    for (const entry of toDelete) {
      await sql`
        DELETE FROM _prisma_migrations
        WHERE id = ${entry.id};
      `;
      console.log(`      🗑️  Supprimé: ${entry.id}`);
    }
  }
}

console.log('\n✅ Nettoyage terminé !');
console.log('\n📝 Vérification de l\'état:');
const remaining = await sql`
  SELECT migration_name, COUNT(*) as count
  FROM _prisma_migrations
  GROUP BY migration_name
  HAVING COUNT(*) > 1;
`;

if (remaining.length === 0) {
  console.log('   ✅ Aucun doublon restant\n');
} else {
  console.log(`   ⚠️  ${remaining.length} migrations encore en doublon:\n`);
  remaining.forEach(r => console.log(`      - ${r.migration_name} (${r.count} entrées)`));
}

