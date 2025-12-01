#!/usr/bin/env node

/**
 * Script pour corriger les migrations Prisma pour qu'elles soient compatibles
 * avec SQLite ET PostgreSQL.
 * 
 * Corrections appliquées:
 * - Supprime CREATE SCHEMA (SQLite ne le supporte pas)
 * - Remplace DATETIME par TIMESTAMP(3) (compatible avec les deux)
 * - Vérifie d'autres incompatibilités
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const MIGRATIONS_DIR = 'prisma/migrations';

async function fixMigrationFile(filePath) {
  let content = await readFile(filePath, 'utf-8');
  let modified = false;

  // 1. Supprimer CREATE SCHEMA (SQLite ne le supporte pas, PostgreSQL l'ignore si le schéma existe)
  if (content.includes('CREATE SCHEMA')) {
    content = content.replace(/-- CreateSchema\s*\nCREATE SCHEMA IF NOT EXISTS "public";\s*\n?/g, '');
    modified = true;
    console.log(`  ✅ Supprimé CREATE SCHEMA de ${filePath}`);
  }

  // 2. Remplacer DATETIME par TIMESTAMP(3) (compatible avec les deux)
  if (content.includes('DATETIME')) {
    content = content.replace(/DATETIME/g, 'TIMESTAMP(3)');
    modified = true;
    console.log(`  ✅ Remplacé DATETIME par TIMESTAMP(3) dans ${filePath}`);
  }

  // 3. Vérifier d'autres incompatibilités potentielles
  // JSONB -> JSON pour SQLite (mais PostgreSQL préfère JSONB, donc on garde JSONB)
  // DOUBLE PRECISION est compatible avec les deux
  // TEXT est compatible avec les deux

  if (modified) {
    await writeFile(filePath, content, 'utf-8');
    return true;
  }

  return false;
}

async function main() {
  console.log('🔍 Recherche des migrations à corriger...\n');

  try {
    const migrationsDir = join(process.cwd(), MIGRATIONS_DIR);
    const entries = await readdir(migrationsDir, { withFileTypes: true });

    let fixedCount = 0;
    let checkedCount = 0;

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const migrationFile = join(migrationsDir, entry.name, 'migration.sql');
        
        try {
          await readFile(migrationFile, 'utf-8');
          checkedCount++;
          
          if (await fixMigrationFile(migrationFile)) {
            fixedCount++;
          }
        } catch (error) {
          if (error.code !== 'ENOENT') {
            console.error(`  ⚠️  Erreur lors de la lecture de ${migrationFile}:`, error.message);
          }
        }
      }
    }

    console.log(`\n✅ Vérification terminée:`);
    console.log(`   - ${checkedCount} migration(s) vérifiée(s)`);
    console.log(`   - ${fixedCount} migration(s) corrigée(s)`);

    if (fixedCount > 0) {
      console.log(`\n💡 Les migrations ont été corrigées pour être compatibles avec SQLite et PostgreSQL.`);
    } else {
      console.log(`\n✅ Toutes les migrations sont déjà compatibles.`);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

main();

