#!/usr/bin/env node
/**
 * Script de migration SQLite -> PostgreSQL local
 *
 * Ce script copie toutes les données de prisma/dev.db (SQLite) vers PostgreSQL local
 * en respectant les contraintes et l'ordre des dépendances.
 *
 * Usage:
 *   node scripts/migrate-sqlite-to-postgres.mjs [--dry-run]
 *
 * Prérequis:
 *   - PostgreSQL local démarré (docker compose up -d)
 *   - DATABASE_URL_LOCAL pointant vers PostgreSQL local dans .env.local
 *   - Backup SQLite créé automatiquement avant migration
 */

import Database from 'better-sqlite3';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const { Pool } = pg;

// Charger les variables d'environnement
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

dotenv.config({ path: join(rootDir, '.env.local') });
dotenv.config({ path: join(rootDir, '.env') });

const DRY_RUN = process.argv.includes('--dry-run');

// Configuration
const SQLITE_DB_PATH = join(rootDir, 'prisma', 'dev.db');
const POSTGRES_URL =
  process.env.DATABASE_URL_LOCAL || process.env.DATABASE_URL?.startsWith('postgresql://')
    ? process.env.DATABASE_URL
    : 'postgresql://djlarian:djlarian_dev_password@localhost:5432/djlarian_dev?sslmode=disable';

// Ordre de migration des tables (selon les dépendances foreign keys)
// User doit être en premier, puis les tables qui référencent User, etc.
const MIGRATION_ORDER = [
  // Tables sans dépendances
  'User',
  'Genre',
  'MusicCollection',
  'LiveItem',
  'SiteConfig',
  'Image',

  // Tables qui dépendent de User
  'Account',
  'Session',
  'VerificationToken',
  'MergeToken',
  'Project',
  'Notification',
  'LiveSubmission',
  'UserLiveItem',
  'UserTicket',
  'UserSlotMachineTokens',
  'Friendship',
  'AssistantConfirmation',

  // Tables qui dépendent d'autres tables
  'Event',
  'RecurrenceConfig',
  'TicketInfo',
  'Track',
  'TrackPlatform',
  'GenresOnTracks',
  'ConfigHistory',
  'ConfigSnapshot',
  'AdminSettings',
];

// Fonction pour créer un backup SQLite (utilisée dans main)
async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = `${SQLITE_DB_PATH}.backup.${timestamp}`;

  if (!existsSync(SQLITE_DB_PATH)) {
    throw new Error(`SQLite DB non trouvée: ${SQLITE_DB_PATH}`);
  }

  try {
    const fs = await import('fs/promises');
    await fs.copyFile(SQLITE_DB_PATH, backupPath);
    console.log(`✅ Backup créé: ${backupPath}`);
    return backupPath;
  } catch (err) {
    console.warn(`⚠️  Impossible de créer le backup automatique: ${err.message}`);
    console.warn(`   Créez manuellement: cp ${SQLITE_DB_PATH} ${backupPath}`);
    throw err;
  }
}

// Fonction pour obtenir le schéma d'une table SQLite
function getTableSchema(sqlite, tableName) {
  const columns = sqlite.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.map((col) => ({
    name: col.name,
    type: col.type,
    notnull: col.notnull === 1,
    dflt_value: col.dflt_value,
    pk: col.pk === 1,
  }));
}

// Fonction pour convertir les types SQLite vers PostgreSQL
function convertValue(value, sqliteType, columnName) {
  if (value === null) return null;

  // SQLite stocke les booléens comme 0/1, PostgreSQL attend true/false
  if (sqliteType?.toUpperCase().includes('BOOLEAN') || sqliteType?.toUpperCase().includes('BOOL')) {
    return value === 1 || value === '1' || value === true;
  }

  // SQLite stocke les dates comme strings ou nombres (millisecondes), PostgreSQL attend des timestamps
  // MAIS expires_at doit rester un entier (timestamp Unix en secondes)
  if (
    (sqliteType?.toUpperCase().includes('DATETIME') ||
      sqliteType?.toUpperCase().includes('TIMESTAMP')) &&
    columnName?.toLowerCase() !== 'expires_at' // expires_at reste un entier
  ) {
    if (typeof value === 'number') {
      // Timestamp en millisecondes (SQLite) -> convertir en ISO string
      try {
        return new Date(value).toISOString();
      } catch {
        // Si la conversion échoue, essayer comme secondes
        try {
          return new Date(value * 1000).toISOString();
        } catch {
          return null;
        }
      }
    }
    if (typeof value === 'string') {
      // Vérifier si c'est un nombre en string
      if (/^\d+$/.test(value)) {
        try {
          return new Date(parseInt(value, 10)).toISOString();
        } catch {
          return value;
        }
      }
      // Sinon, garder la string (déjà au format ISO)
      return value;
    }
  }

  // Pour les colonnes avec "at" ou "date" dans le nom (mais pas expires_at)
  if (
    (columnName?.toLowerCase().includes('at') || columnName?.toLowerCase().includes('date')) &&
    columnName?.toLowerCase() !== 'expires_at' &&
    !sqliteType?.toUpperCase().includes('INTEGER') // Ne pas convertir les entiers
  ) {
    if (typeof value === 'number' && value > 1000000000) {
      // Probablement un timestamp (millisecondes)
      try {
        return new Date(value).toISOString();
      } catch {
        return value;
      }
    }
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      // Nombre en string -> convertir
      try {
        return new Date(parseInt(value, 10)).toISOString();
      } catch {
        return value;
      }
    }
    // Sinon, garder la string (déjà au format ISO)
    return value;
  }

  // Champs entiers - expires_at reste un entier (timestamp Unix en secondes)
  if (sqliteType?.toUpperCase().includes('INTEGER') || sqliteType?.toUpperCase().includes('INT')) {
    // expires_at doit rester un entier (pas une date)
    if (columnName?.toLowerCase() === 'expires_at') {
      return value; // Garder comme entier
    }
    // Sinon, garder comme entier
    return value;
  }

  // JSON fields
  if (sqliteType?.toUpperCase().includes('JSON') || sqliteType?.toUpperCase().includes('TEXT')) {
    // Vérifier si c'est du JSON valide
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
      try {
        JSON.parse(value);
        return value; // Garder comme string JSON
      } catch {
        // Pas du JSON, garder tel quel
      }
    }
  }

  return value;
}

// Fonction pour migrer une table
async function migrateTable(sqlite, pgPool, tableName, dryRun = false) {
  console.log(`\n📋 Migration de la table: ${tableName}`);

  // Vérifier si la table existe dans SQLite
  const tableExists = sqlite
    .prepare(
      `
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name = ?
  `
    )
    .get(tableName);

  if (!tableExists) {
    console.log(`   ⚠️  Table ${tableName} n'existe pas dans SQLite, ignorée`);
    return { count: 0, skipped: true };
  }

  // Obtenir le schéma
  const schema = getTableSchema(sqlite, tableName);
  const columnNames = schema.map((col) => col.name);

  // Compter les lignes
  const countResult = sqlite.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
  const rowCount = countResult?.count || 0;

  if (rowCount === 0) {
    console.log(`   ℹ️  Table ${tableName} est vide, ignorée`);
    return { count: 0, skipped: true };
  }

  console.log(`   📊 ${rowCount} lignes à migrer`);

  if (dryRun) {
    console.log(`   🔍 DRY-RUN: Simulation de migration de ${rowCount} lignes`);
    return { count: rowCount, skipped: false };
  }

  // Récupérer toutes les données
  const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all();

  if (rows.length === 0) {
    return { count: 0, skipped: true };
  }

  // Préparer la requête d'insertion
  const placeholders = columnNames.map((_, i) => `$${i + 1}`).join(', ');
  const columns = columnNames.map((name) => `"${name}"`).join(', ');
  const insertQuery = `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

  let inserted = 0;
  let errors = 0;

  // Insérer par batch pour éviter les problèmes de mémoire
  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      // Créer un savepoint pour pouvoir rollback ligne par ligne
      await client.query('SAVEPOINT before_row');

      for (const row of batch) {
        try {
          // Vérifier quelles colonnes existent réellement dans PostgreSQL
          const pgColumnsResult = await client.query(
            `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = $1 AND table_schema = 'public'
          `,
            [tableName]
          );
          const pgColumnNames = pgColumnsResult.rows.map((r) => r.column_name);

          // Filtrer les colonnes qui existent dans PostgreSQL
          const existingColumns = columnNames.filter((col) => pgColumnNames.includes(col));
          const existingValues = existingColumns.map((colName) => {
            const col = schema.find((c) => c.name === colName);
            return convertValue(row[colName], col?.type, colName);
          });

          // Construire la requête avec seulement les colonnes existantes
          const existingPlaceholders = existingColumns.map((_, idx) => `$${idx + 1}`).join(', ');
          const existingColumnsList = existingColumns.map((name) => `"${name}"`).join(', ');
          const existingInsertQuery = `INSERT INTO "${tableName}" (${existingColumnsList}) VALUES (${existingPlaceholders}) ON CONFLICT DO NOTHING`;

          const result = await client.query(existingInsertQuery, existingValues);
          if (result.rowCount > 0) {
            inserted++;
          }
        } catch (err) {
          errors++;
          const rowNum = i + batch.indexOf(row) + 1;
          // Ne pas logger toutes les erreurs "transaction aborted" (cascade)
          if (!err.message.includes('current transaction is aborted')) {
            console.error(`   ❌ Erreur sur ligne ${rowNum}: ${err.message}`);
          }
          // Rollback cette ligne et continuer
          await client.query('ROLLBACK TO SAVEPOINT before_row');
          await client.query('SAVEPOINT before_row');
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`   ❌ Erreur sur le batch ${i / batchSize + 1}: ${err.message}`);
      errors++;
    } finally {
      client.release();
    }
  }

  console.log(`   ✅ ${inserted} lignes insérées${errors > 0 ? `, ${errors} erreurs` : ''}`);

  return { count: inserted, skipped: false, errors };
}

// Fonction pour vérifier les counts
async function verifyCounts(sqlite, pgPool) {
  console.log(`\n🔍 Vérification des counts...`);

  const results = [];

  for (const tableName of MIGRATION_ORDER) {
    // Vérifier dans SQLite
    const sqliteCount =
      sqlite.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get()?.count || 0;

    // Vérifier dans PostgreSQL
    const pgResult = await pgPool.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
    const pgCount = parseInt(pgResult.rows[0]?.count || 0, 10);

    const match = sqliteCount === pgCount;
    results.push({ table: tableName, sqlite: sqliteCount, postgres: pgCount, match });

    const icon = match ? '✅' : '❌';
    console.log(`   ${icon} ${tableName}: SQLite=${sqliteCount}, Postgres=${pgCount}`);
  }

  const allMatch = results.every((r) => r.match);
  if (allMatch) {
    console.log(`\n✅ Tous les counts correspondent!`);
  } else {
    console.log(`\n⚠️  Certains counts ne correspondent pas. Vérifiez les erreurs ci-dessus.`);
  }

  return results;
}

// Fonction principale
async function main() {
  console.log('🚀 Migration SQLite -> PostgreSQL\n');
  console.log(`SQLite: ${SQLITE_DB_PATH}`);
  console.log(`PostgreSQL: ${POSTGRES_URL.replace(/:[^:@]+@/, ':****@')}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (simulation)' : 'MIGRATION RÉELLE'}\n`);

  if (DRY_RUN) {
    console.log('⚠️  MODE DRY-RUN: Aucune donnée ne sera modifiée\n');
  }

  // Vérifier que SQLite existe
  if (!existsSync(SQLITE_DB_PATH)) {
    throw new Error(`SQLite DB non trouvée: ${SQLITE_DB_PATH}`);
  }

  // Créer un backup (obligatoire avant migration)
  if (!DRY_RUN) {
    console.log('📦 Création du backup SQLite (obligatoire)...');
    try {
      // Utiliser le script de backup dédié
      const { execSync } = await import('child_process');
      execSync(`node scripts/backup-sqlite.mjs`, { stdio: 'inherit', cwd: rootDir });
      console.log('');
    } catch (err) {
      console.error(`❌ ÉCHEC du backup SQLite!`);
      console.error(`   La migration ne peut pas continuer sans backup.`);
      console.error(`   Exécutez manuellement: node scripts/backup-sqlite.mjs`);
      process.exit(1);
    }
  }

  // Connexions
  console.log('🔌 Connexion aux bases de données...');
  const sqlite = new Database(SQLITE_DB_PATH, { readonly: true });
  const pgPool = new Pool({ connectionString: POSTGRES_URL });

  try {
    // Tester la connexion PostgreSQL
    await pgPool.query('SELECT 1');
    console.log('✅ Connexions établies\n');

    // Migrer chaque table dans l'ordre
    const results = [];
    for (const tableName of MIGRATION_ORDER) {
      try {
        const result = await migrateTable(sqlite, pgPool, tableName, DRY_RUN);
        results.push({ table: tableName, ...result });
      } catch (err) {
        console.error(`❌ Erreur lors de la migration de ${tableName}: ${err.message}`);
        results.push({ table: tableName, error: err.message });
      }
    }

    // Vérifier les counts
    if (!DRY_RUN) {
      await verifyCounts(sqlite, pgPool);
    }

    // Résumé
    console.log(`\n📊 Résumé de la migration:`);
    const total = results.reduce((sum, r) => sum + (r.count || 0), 0);
    const errors = results.filter((r) => r.error || r.errors).length;
    console.log(`   Total de lignes migrées: ${total}`);
    if (errors > 0) {
      console.log(`   ⚠️  ${errors} tables avec erreurs`);
    }
  } finally {
    sqlite.close();
    await pgPool.end();
  }

  console.log(`\n✅ Migration terminée!`);
}

// Exécuter
main().catch((err) => {
  console.error(`\n❌ Erreur fatale: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
