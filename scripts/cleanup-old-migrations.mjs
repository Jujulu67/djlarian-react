#!/usr/bin/env node
/**
 * Script pour nettoyer automatiquement les migrations obsolètes de la base de données
 * 
 * Ce script supprime les entrées de la table _prisma_migrations qui n'existent plus
 * dans le dossier prisma/migrations local, sans affecter les données.
 * 
 * SÉCURITÉ : Ne supprime que les entrées de la table _prisma_migrations,
 *            jamais les tables ou données réelles.
 */

import { PrismaClient } from '@prisma/client';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const prisma = new PrismaClient();

async function getLocalMigrations() {
  const migrationsDir = join(process.cwd(), 'prisma', 'migrations');
  
  if (!existsSync(migrationsDir)) {
    console.log('❌ Dossier prisma/migrations introuvable');
    return [];
  }

  const entries = await readdir(migrationsDir, { withFileTypes: true });
  const migrations = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const migrationPath = join(migrationsDir, entry.name, 'migration.sql');
      // Vérifier que c'est une vraie migration (avec fichier migration.sql)
      if (existsSync(migrationPath)) {
        migrations.push(entry.name);
      }
    }
  }

  return migrations.sort();
}

async function getDatabaseMigrations() {
  try {
    const migrations = await prisma.$queryRaw`
      SELECT migration_name 
      FROM _prisma_migrations 
      ORDER BY migration_name
    `;
    
    return migrations.map(m => m.migration_name);
  } catch (error) {
    console.error('❌ Erreur lors de la lecture des migrations de la DB:', error.message);
    throw error;
  }
}

async function cleanupOldMigrations(dryRun = true) {
  console.log('🔍 Analyse des migrations...\n');

  const localMigrations = await getLocalMigrations();
  const dbMigrations = await getDatabaseMigrations();

  console.log(`📋 Migrations locales: ${localMigrations.length}`);
  localMigrations.forEach(m => console.log(`   ✅ ${m}`));
  
  console.log(`\n📋 Migrations en base de données: ${dbMigrations.length}`);
  dbMigrations.forEach(m => console.log(`   ${localMigrations.includes(m) ? '✅' : '⚠️ '} ${m}`));

  // Trouver les migrations en DB mais pas localement
  const orphanMigrations = dbMigrations.filter(m => !localMigrations.includes(m));

  if (orphanMigrations.length === 0) {
    console.log('\n✅ Aucune migration obsolète trouvée. Tout est synchronisé !');
    return;
  }

  console.log(`\n⚠️  Migrations obsolètes détectées (${orphanMigrations.length}):`);
  orphanMigrations.forEach(m => console.log(`   🗑️  ${m}`));

  if (dryRun) {
    console.log('\n🔍 MODE DRY-RUN (aucune modification)');
    console.log('   Pour supprimer ces migrations, exécutez:');
    console.log('   node scripts/cleanup-old-migrations.mjs --execute\n');
    return;
  }

  // Supprimer les migrations obsolètes
  console.log('\n🗑️  Suppression des migrations obsolètes...');
  
  for (const migration of orphanMigrations) {
    try {
      await prisma.$executeRaw`
        DELETE FROM _prisma_migrations 
        WHERE migration_name = ${migration}
      `;
      console.log(`   ✅ Supprimée: ${migration}`);
    } catch (error) {
      console.error(`   ❌ Erreur lors de la suppression de ${migration}:`, error.message);
    }
  }

  console.log('\n✅ Nettoyage terminé !');
  console.log('   Les migrations obsolètes ont été supprimées de la table _prisma_migrations.');
  console.log('   Aucune donnée réelle n\'a été affectée.\n');
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');

  if (dryRun) {
    console.log('🔍 MODE DRY-RUN - Aucune modification ne sera effectuée\n');
  } else {
    console.log('⚠️  MODE EXÉCUTION - Les migrations obsolètes seront supprimées\n');
  }

  try {
    await cleanupOldMigrations(dryRun);
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

