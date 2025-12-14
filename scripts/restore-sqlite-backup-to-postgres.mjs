#!/usr/bin/env node
/**
 * Script de restauration depuis backup SQLite vers PostgreSQL local
 *
 * Ce script:
 * 1. Restaure un backup SQLite vers prisma/dev.db (temporaire)
 * 2. Migre les données vers PostgreSQL local
 * 3. Nettoie le fichier SQLite temporaire
 *
 * Usage:
 *   node scripts/restore-sqlite-backup-to-postgres.mjs [<backup_path>]
 *
 * Exemple:
 *   node scripts/restore-sqlite-backup-to-postgres.mjs prisma/dev.db.backup.2025-12-14T14-01-57
 */

import { copyFile, readdir, stat, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Charger .env.local et .env
dotenv.config({ path: join(rootDir, '.env.local') });
dotenv.config({ path: join(rootDir, '.env') });

const SQLITE_DB_PATH = join(rootDir, 'prisma', 'dev.db');
const POSTGRES_URL = process.env.DATABASE_URL || process.env.DATABASE_URL_LOCAL;

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

function verifyPostgresConnection() {
  if (!POSTGRES_URL) {
    throw new Error('DATABASE_URL ou DATABASE_URL_LOCAL doit être défini');
  }

  // Vérifier que c'est bien PostgreSQL local
  if (!POSTGRES_URL.includes('localhost') && !POSTGRES_URL.includes('127.0.0.1')) {
    throw new Error(
      `⚠️  PROTECTION: DATABASE_URL ne pointe pas vers localhost!\n` +
        `   URL actuelle: ${POSTGRES_URL.replace(/:[^:@]+@/, ':****@')}\n` +
        `   Pour restaurer vers PostgreSQL local, DATABASE_URL doit contenir localhost ou 127.0.0.1`
    );
  }

  // Vérifier le port (devrait être 5433 pour local)
  if (!POSTGRES_URL.includes(':5433') && !POSTGRES_URL.includes(':5432')) {
    console.warn(
      `⚠️  ATTENTION: Port non standard détecté dans DATABASE_URL\n` +
        `   URL: ${POSTGRES_URL.replace(/:[^:@]+@/, ':****@')}`
    );
  }

  // Vérifier qu'il n'y a pas de domaines de production
  const prodDomains = ['neon.tech', 'vercel', 'production', 'prod', 'aws'];
  const hasProdDomain = prodDomains.some((domain) => POSTGRES_URL.includes(domain));
  if (hasProdDomain) {
    throw new Error(
      `⚠️  PROTECTION: DATABASE_URL contient un domaine de production!\n` +
        `   URL: ${POSTGRES_URL.replace(/:[^:@]+@/, ':****@')}\n` +
        `   Cette restauration ne peut pas pointer vers la production.`
    );
  }
}

async function getTableCounts(pool) {
  const tables = ['User', 'Project', 'Track', 'Event', 'Notification'];
  const counts = {};

  for (const table of tables) {
    try {
      const result = await pool.query(`SELECT COUNT(*) as count FROM "${table}"`);
      counts[table] = parseInt(result.rows[0].count, 10);
    } catch (err) {
      counts[table] = -1; // Erreur
    }
  }

  return counts;
}

async function main() {
  console.log('🔄 Restauration depuis backup SQLite vers PostgreSQL local\n');

  // Vérifier la connexion PostgreSQL
  verifyPostgresConnection();

  const backupPath = process.argv[2];

  if (!backupPath) {
    console.log('📋 Liste des backups disponibles:\n');
    const backups = await listBackups();

    if (backups.length === 0) {
      console.log('   ❌ Aucun backup trouvé dans prisma/');
      console.log('\n💡 Pour créer un backup:');
      console.log('   node scripts/backup-sqlite.mjs');
      process.exit(1);
    }

    console.log('   Backups disponibles:');
    backups.forEach((b, i) => {
      const sizeMB = (async () => {
        const s = await stat(b.path);
        return (s.size / 1024 / 1024).toFixed(2);
      })();
      console.log(`   ${i + 1}. ${b.name} (${b.mtime.toISOString()})`);
    });

    console.log('\n💡 Pour restaurer:');
    console.log(`   node scripts/restore-sqlite-backup-to-postgres.mjs <backup_path>`);
    console.log(`\n   Exemple:`);
    console.log(`   node scripts/restore-sqlite-backup-to-postgres.mjs ${backups[0].path}`);
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

  // Vérifier que PostgreSQL est démarré
  console.log('🔌 Vérification de PostgreSQL...');
  try {
    const pg = await import('pg');
    const { Pool } = pg;
    const pool = new Pool({ connectionString: POSTGRES_URL });
    await pool.query('SELECT 1');
    console.log('   ✅ PostgreSQL connecté');

    // Afficher les compteurs avant restauration
    console.log('\n📊 État actuel de la base PostgreSQL:');
    const countsBefore = await getTableCounts(pool);
    for (const [table, count] of Object.entries(countsBefore)) {
      if (count >= 0) {
        console.log(`   ${table}: ${count} enregistrement(s)`);
      }
    }

    // Demander confirmation si la base n'est pas vide
    const totalBefore = Object.values(countsBefore).reduce((sum, c) => sum + (c > 0 ? c : 0), 0);
    if (totalBefore > 0) {
      console.log('\n⚠️  ATTENTION: La base PostgreSQL contient déjà des données!');
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise((resolve) => {
        rl.question(
          '   Voulez-vous continuer? Les données existantes seront écrasées. (o/N) ',
          resolve
        );
      });
      rl.close();

      if (answer.toLowerCase() !== 'o') {
        console.log('   Restauration annulée');
        await pool.end();
        process.exit(0);
      }
    }

    await pool.end();
  } catch (err) {
    console.error(`❌ Erreur de connexion PostgreSQL: ${err.message}`);
    console.error('   Assurez-vous que PostgreSQL est démarré: docker compose up -d');
    process.exit(1);
  }

  // Restaurer le backup SQLite temporairement
  console.log(`\n📦 Restauration du backup SQLite: ${backupPath}`);
  const backupStats = await stat(backupPath);
  console.log(`   Taille: ${(backupStats.size / 1024 / 1024).toFixed(2)} MB`);

  // Backup de la DB SQLite actuelle si elle existe
  if (existsSync(SQLITE_DB_PATH)) {
    const currentBackup = `${SQLITE_DB_PATH}.before-restore.${Date.now()}`;
    console.log(`   Backup de la DB SQLite actuelle: ${currentBackup}`);
    await copyFile(SQLITE_DB_PATH, currentBackup);
  }

  // Restaurer le backup vers SQLite temporaire
  try {
    await copyFile(backupPath, SQLITE_DB_PATH);
    console.log(`   ✅ Backup restauré vers SQLite temporaire`);
  } catch (err) {
    console.error(`❌ Erreur lors de la restauration SQLite: ${err.message}`);
    process.exit(1);
  }

  // Migrer vers PostgreSQL
  console.log(`\n🚀 Migration SQLite -> PostgreSQL...`);
  try {
    // Utiliser le script de migration existant
    execSync(`node scripts/migrate-sqlite-to-postgres.mjs`, {
      stdio: 'inherit',
      cwd: rootDir,
      env: { ...process.env, DATABASE_URL: POSTGRES_URL },
    });
  } catch (err) {
    console.error(`❌ Erreur lors de la migration: ${err.message}`);
    // Ne pas supprimer le SQLite temporaire en cas d'erreur
    process.exit(1);
  }

  // Vérifier les compteurs après migration
  console.log(`\n📊 État après restauration:`);
  try {
    const pg = await import('pg');
    const { Pool } = pg;
    const pool = new Pool({ connectionString: POSTGRES_URL });
    const countsAfter = await getTableCounts(pool);
    for (const [table, count] of Object.entries(countsAfter)) {
      if (count >= 0) {
        console.log(`   ${table}: ${count} enregistrement(s)`);
      }
    }
    await pool.end();
  } catch (err) {
    console.warn(`⚠️  Impossible de vérifier les compteurs: ${err.message}`);
  }

  // Nettoyer le SQLite temporaire (optionnel, on peut le garder pour debug)
  console.log(`\n🧹 Nettoyage...`);
  const keepSqlite = process.argv.includes('--keep-sqlite');
  if (!keepSqlite) {
    try {
      await unlink(SQLITE_DB_PATH);
      console.log(`   ✅ Fichier SQLite temporaire supprimé`);
    } catch (err) {
      console.warn(`   ⚠️  Impossible de supprimer le SQLite temporaire: ${err.message}`);
      console.warn(`   Vous pouvez le supprimer manuellement: rm ${SQLITE_DB_PATH}`);
    }
  } else {
    console.log(`   ℹ️  Fichier SQLite temporaire conservé (--keep-sqlite)`);
  }

  console.log(`\n✅ Restauration terminée avec succès!`);
}

main().catch((err) => {
  console.error(`\n❌ Erreur fatale: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
