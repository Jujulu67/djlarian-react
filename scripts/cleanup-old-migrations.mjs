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
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Charger les variables d'environnement
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

dotenv.config({ path: join(rootDir, '.env.local') });
dotenv.config({ path: join(rootDir, '.env') });

// Vérifier que DATABASE_URL est défini
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL n'est pas défini");
  process.exit(1);
}

// Initialiser PrismaClient avec gestion d'erreur
let prisma;
try {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
} catch (error) {
  console.error("❌ Erreur lors de l'initialisation de PrismaClient:", error.message);
  console.error('   Assurez-vous que le client Prisma est généré: pnpm prisma generate');
  process.exit(1);
}

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
    console.log('🔍 Connexion à la base de données...');
    // Utiliser $queryRawUnsafe pour éviter les problèmes de typage
    const migrations = await prisma.$queryRawUnsafe(`
      SELECT migration_name 
      FROM _prisma_migrations 
      ORDER BY migration_name
    `);

    console.log(`✅ Connexion réussie, ${migrations.length} migrations trouvées`);
    return migrations.map((m) => m.migration_name);
  } catch (error) {
    console.error('❌ Erreur lors de la lecture des migrations de la DB:');
    console.error(`   Type: ${error.constructor.name}`);
    console.error(`   Message: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);

    // Si la table n'existe pas encore, retourner un tableau vide
    if (
      error.message &&
      (error.message.includes('does not exist') ||
        (error.message.includes('relation') && error.message.includes('does not exist')))
    ) {
      console.log("ℹ️  Table _prisma_migrations n'existe pas encore");
      return [];
    }
    // Si erreur de connexion, ne pas faire échouer le script
    if (
      error.message &&
      (error.message.includes('connect') ||
        error.message.includes('timeout') ||
        error.message.includes('ECONNREFUSED') ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT')
    ) {
      console.error('⚠️  Erreur de connexion à la base de données');
      console.error('   Le nettoyage sera ignoré, les baselines seront créées à la place');
      return [];
    }
    // Ne pas throw, retourner un tableau vide pour permettre le fallback
    console.error("⚠️  Erreur inconnue, retour d'un tableau vide pour fallback");
    return [];
  }
}

async function cleanupOldMigrations(dryRun = true) {
  console.log('🔍 Analyse des migrations...\n');
  console.log(
    `📋 DATABASE_URL: ${process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 50) + '...' : 'NON DÉFINI'}\n`
  );

  const localMigrations = await getLocalMigrations();
  console.log(`📋 Migrations locales trouvées: ${localMigrations.length}`);

  const dbMigrations = await getDatabaseMigrations();
  console.log(`📋 Migrations DB trouvées: ${dbMigrations.length}`);

  console.log(`📋 Migrations locales: ${localMigrations.length}`);
  localMigrations.forEach((m) => console.log(`   ✅ ${m}`));

  console.log(`\n📋 Migrations en base de données: ${dbMigrations.length}`);
  dbMigrations.forEach((m) => console.log(`   ${localMigrations.includes(m) ? '✅' : '⚠️ '} ${m}`));

  // Trouver les migrations en DB mais pas localement
  const orphanMigrations = dbMigrations.filter((m) => !localMigrations.includes(m));

  if (orphanMigrations.length === 0) {
    console.log('\n✅ Aucune migration obsolète trouvée. Tout est synchronisé !');
    return;
  }

  console.log(`\n⚠️  Migrations obsolètes détectées (${orphanMigrations.length}):`);
  orphanMigrations.forEach((m) => console.log(`   🗑️  ${m}`));

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
      // Utiliser $executeRawUnsafe avec la syntaxe PostgreSQL correcte
      // Échapper le nom de migration pour éviter les injections SQL
      const escapedMigration = migration.replace(/'/g, "''");
      await prisma.$executeRawUnsafe(
        `DELETE FROM _prisma_migrations WHERE migration_name = '${escapedMigration}'`
      );
      console.log(`   ✅ Supprimée: ${migration}`);
    } catch (error) {
      console.error(`   ❌ Erreur lors de la suppression de ${migration}:`, error.message);
      // Ne pas faire échouer le script pour une seule migration
    }
  }

  console.log('\n✅ Nettoyage terminé !');
  console.log('   Les migrations obsolètes ont été supprimées de la table _prisma_migrations.');
  console.log("   Aucune donnée réelle n'a été affectée.\n");
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
    // Exit avec succès même si aucune migration n'a été nettoyée
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    // En mode exécution depuis le build, ne pas faire échouer
    // Le script de build gérera l'échec et utilisera le fallback
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
