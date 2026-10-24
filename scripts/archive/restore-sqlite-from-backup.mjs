#!/usr/bin/env node
/**
 * Script de restauration SQLite depuis backup
 *
 * Usage:
 *   node scripts/restore-sqlite-from-backup.mjs <backup_path>
 *
 * Exemple:
 *   node scripts/restore-sqlite-from-backup.mjs prisma/dev.db.backup.2025-12-14T14-30-00
 */

import { copyFile, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const SQLITE_DB_PATH = join(rootDir, 'prisma', 'dev.db');

async function listBackups() {
  const prismaDir = join(rootDir, 'prisma');
  const files = await readdir(prismaDir);
  const backups = files
    .filter((f) => f.startsWith('dev.db.backup.'))
    .map((f) => ({
      name: f,
      path: join(prismaDir, f),
    }));

  // Trier par date (plus récent en premier)
  const stats = await Promise.all(
    backups.map(async (b) => ({
      ...b,
      mtime: (await stat(b.path)).mtime,
    }))
  );

  return stats.sort((a, b) => b.mtime - a.mtime);
}

async function main() {
  const backupPath = process.argv[2];

  if (!backupPath) {
    console.log('📋 Liste des backups disponibles:\n');
    const backups = await listBackups();

    if (backups.length === 0) {
      console.log('   Aucun backup trouvé dans prisma/');
      console.log('\n💡 Pour créer un backup:');
      console.log('   node scripts/backup-sqlite.mjs');
      process.exit(1);
    }

    console.log('   Backups disponibles:');
    backups.forEach((b, i) => {
      console.log(`   ${i + 1}. ${b.name} (${b.mtime.toISOString()})`);
    });

    console.log('\n💡 Pour restaurer:');
    console.log(`   node scripts/restore-sqlite-from-backup.mjs <backup_path>`);
    console.log(`\n   Exemple:`);
    console.log(`   node scripts/restore-sqlite-from-backup.mjs ${backups[0].path}`);
    process.exit(0);
  }

  // Vérifier que le backup existe
  if (!existsSync(backupPath)) {
    console.error(`❌ Backup non trouvé: ${backupPath}`);
    process.exit(1);
  }

  // Vérifier que c'est bien un fichier de backup
  if (!basename(backupPath).startsWith('dev.db.backup.')) {
    console.warn(`⚠️  Le fichier ne semble pas être un backup (dev.db.backup.*)`);
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise((resolve) => {
      rl.question('   Continuer quand même? (o/N) ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'o') {
      console.log('   Restauration annulée');
      process.exit(0);
    }
  }

  // Backup de la DB actuelle si elle existe
  if (existsSync(SQLITE_DB_PATH)) {
    const currentBackup = `${SQLITE_DB_PATH}.before-restore.${Date.now()}`;
    console.log(`📦 Backup de la DB actuelle: ${currentBackup}`);
    await copyFile(SQLITE_DB_PATH, currentBackup);
  }

  // Restaurer
  console.log(`\n🔄 Restauration depuis: ${backupPath}`);
  try {
    await copyFile(backupPath, SQLITE_DB_PATH);
    console.log(`✅ Restauration terminée: ${SQLITE_DB_PATH}`);

    // Vérifier la taille
    const stats = await stat(SQLITE_DB_PATH);
    console.log(`   Taille: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  } catch (err) {
    console.error(`❌ Erreur lors de la restauration: ${err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\n❌ Erreur fatale: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
