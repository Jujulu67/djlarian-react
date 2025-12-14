#!/usr/bin/env node
/**
 * Script de backup SQLite avant migration
 *
 * Crée:
 * 1. Backup binaire: prisma/dev.db.backup.<timestamp>
 * 2. Dump SQL: dumps/dev.db.<timestamp>.sql
 *
 * Usage:
 *   node scripts/backup-sqlite.mjs
 */

import { copyFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const SQLITE_DB_PATH = join(rootDir, 'prisma', 'dev.db');
const DUMPS_DIR = join(rootDir, 'dumps');

// Générer timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupPath = `${SQLITE_DB_PATH}.backup.${timestamp}`;
const dumpPath = join(DUMPS_DIR, `dev.db.${timestamp}.sql`);

async function main() {
  console.log('📦 Backup SQLite avant migration\n');

  // Vérifier que SQLite existe
  if (!existsSync(SQLITE_DB_PATH)) {
    console.error(`❌ SQLite DB non trouvée: ${SQLITE_DB_PATH}`);
    process.exit(1);
  }

  // Créer dumps/ si n'existe pas
  if (!existsSync(DUMPS_DIR)) {
    await mkdir(DUMPS_DIR, { recursive: true });
    console.log(`📁 Dossier créé: ${DUMPS_DIR}`);
  }

  // 1. Backup binaire
  console.log(`📋 Création du backup binaire...`);
  try {
    await copyFile(SQLITE_DB_PATH, backupPath);
    console.log(`✅ Backup binaire créé: ${backupPath}`);
  } catch (err) {
    console.error(`❌ Erreur lors du backup binaire: ${err.message}`);
    process.exit(1);
  }

  // 2. Dump SQL
  console.log(`📋 Création du dump SQL...`);
  try {
    // Vérifier que sqlite3 est disponible
    try {
      execSync('which sqlite3', { stdio: 'ignore' });
    } catch {
      console.warn(`⚠️  sqlite3 non trouvé, skip du dump SQL`);
      console.warn(`   Pour créer un dump SQL manuellement:`);
      console.warn(`   sqlite3 ${SQLITE_DB_PATH} .dump > ${dumpPath}`);
      console.log(`\n✅ Backup binaire terminé`);
      console.log(`\n📝 Preuve de backup:`);
      console.log(`   Binaire: ${backupPath}`);
      return;
    }

    // Créer le dump
    execSync(`sqlite3 ${SQLITE_DB_PATH} .dump > ${dumpPath}`, { stdio: 'inherit' });
    console.log(`✅ Dump SQL créé: ${dumpPath}`);
  } catch (err) {
    console.warn(`⚠️  Erreur lors du dump SQL: ${err.message}`);
    console.warn(`   Le backup binaire est toujours disponible: ${backupPath}`);
  }

  // Afficher la preuve de backup
  console.log(`\n✅ Backup terminé avec succès!`);
  console.log(`\n📝 Preuve de backup:`);
  console.log(`   Binaire: ${backupPath}`);
  if (existsSync(dumpPath)) {
    const stats = await import('fs/promises').then((m) => m.stat(dumpPath));
    console.log(`   Dump SQL: ${dumpPath} (${(stats.size / 1024).toFixed(2)} KB)`);
  }

  // Vérifier la taille du backup
  const { stat } = await import('fs/promises');
  const backupStats = await stat(backupPath);
  console.log(`   Taille backup: ${(backupStats.size / 1024 / 1024).toFixed(2)} MB`);

  console.log(`\n💾 Pour restaurer depuis le backup:`);
  console.log(`   cp ${backupPath} prisma/dev.db`);
  if (existsSync(dumpPath)) {
    console.log(`   sqlite3 prisma/dev.db < ${dumpPath}`);
  }
}

main().catch((err) => {
  console.error(`\n❌ Erreur fatale: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
