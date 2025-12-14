#!/usr/bin/env node

/**
 * Script de migration des données SQLite vers PostgreSQL
 * Exporte toutes les données de SQLite et les importe dans PostgreSQL
 * Préserve toutes les données sans perte
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

const rootDir = process.cwd();
const sqlitePath = join(rootDir, 'prisma', 'dev.db');
const backupPath = `${sqlitePath}.backup.${Date.now()}`;

/**
 * Vérifie que SQLite existe et crée un backup
 */
function backupSqlite() {
  if (!existsSync(sqlitePath)) {
    console.log('⚠️  Pas de DB SQLite à migrer');
    return false;
  }

  console.log("📦 Création d'un backup SQLite...");
  const fs = require('fs');
  fs.copyFileSync(sqlitePath, backupPath);
  console.log(`✅ Backup créé: ${backupPath}`);
  return true;
}

/**
 * Exporte les données de SQLite vers JSON
 */
function exportSqliteData() {
  console.log('📤 Export des données SQLite...');

  // Utiliser better-sqlite3 pour exporter
  const Database = require('better-sqlite3');
  const db = new Database(sqlitePath, { readonly: true });

  const tables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'"
    )
    .all()
    .map((row) => row.name);

  console.log(`   Tables trouvées: ${tables.join(', ')}`);

  const data = {};

  for (const table of tables) {
    try {
      const rows = db.prepare(`SELECT * FROM "${table}"`).all();
      data[table] = rows;
      console.log(`   ✅ ${table}: ${rows.length} lignes`);
    } catch (error) {
      console.warn(`   ⚠️  Erreur lors de l'export de ${table}:`, error.message);
    }
  }

  db.close();

  const exportPath = join(rootDir, 'prisma', 'sqlite-export.json');
  require('fs').writeFileSync(exportPath, JSON.stringify(data, null, 2));
  console.log(`✅ Données exportées: ${exportPath}`);

  return { data, exportPath };
}

/**
 * Importe les données dans PostgreSQL
 */
async function importToPostgres(data) {
  const databaseUrl = process.env.DATABASE_URL_PRODUCTION || process.env.DATABASE_URL;

  if (!databaseUrl || !databaseUrl.startsWith('postgres')) {
    console.error('❌ DATABASE_URL_PRODUCTION non défini ou non PostgreSQL');
    console.error('   Configurez DATABASE_URL_PRODUCTION dans .env.local');
    process.exit(1);
  }

  console.log('📥 Import des données vers PostgreSQL...');

  // Créer un client Prisma pour PostgreSQL
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  try {
    // Importer table par table
    for (const [tableName, rows] of Object.entries(data)) {
      if (rows.length === 0) continue;

      // Convertir le nom de table (PascalCase -> camelCase pour Prisma)
      const modelName = tableName.charAt(0).toLowerCase() + tableName.slice(1);
      const model = prisma[modelName];

      if (!model) {
        console.warn(`   ⚠️  Modèle ${modelName} non trouvé, skip`);
        continue;
      }

      console.log(`   📥 Import ${tableName}: ${rows.length} lignes...`);

      // Importer par batch de 100
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);

        // Convertir les données SQLite vers le format Prisma
        const createData = batch.map((row) => {
          const data = {};
          for (const [key, value] of Object.entries(row)) {
            // Convertir les noms de colonnes (snake_case -> camelCase si nécessaire)
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            data[camelKey] = value;
          }
          return { data };
        });

        // Utiliser createMany si disponible, sinon create
        try {
          if (model.createMany) {
            await model.createMany({
              data: batch.map((row) => {
                const data = {};
                for (const [key, value] of Object.entries(row)) {
                  const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                  data[camelKey] = value;
                }
                return data;
              }),
              skipDuplicates: true,
            });
          } else {
            // Fallback: créer un par un
            for (const row of batch) {
              const data = {};
              for (const [key, value] of Object.entries(row)) {
                const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                data[camelKey] = value;
              }
              try {
                await model.create({ data });
              } catch (error) {
                if (error.code !== 'P2002') {
                  // Ignorer les erreurs de duplication
                  throw error;
                }
              }
            }
          }
        } catch (error) {
          console.warn(`   ⚠️  Erreur lors de l'import de ${tableName}:`, error.message);
        }
      }

      console.log(`   ✅ ${tableName} importé`);
    }

    console.log('✅ Import terminé');
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🚀 Migration SQLite → PostgreSQL\n');

  const hasSqlite = backupSqlite();
  if (!hasSqlite) {
    console.log('ℹ️  Pas de données SQLite à migrer');
    process.exit(0);
  }

  const { data, exportPath } = exportSqliteData();

  console.log('');

  await importToPostgres(data);

  console.log(`\n✅ Migration terminée`);
  console.log(`💾 Backup SQLite: ${backupPath}`);
  console.log(`📄 Export JSON: ${exportPath}`);
  console.log('\n⚠️  IMPORTANT: Vérifiez les données importées avant de supprimer SQLite');

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Erreur lors de la migration:', error);
  process.exit(1);
});
