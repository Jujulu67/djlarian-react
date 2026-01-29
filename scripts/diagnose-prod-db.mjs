#!/usr/bin/env node
/**
 * Script de diagnostic pour comparer l'état de la base de données PRODUCTION avec le schéma Prisma
 * Utilise le switch de production pour se connecter à la base de prod
 *
 * Usage: node scripts/diagnose-prod-db.mjs
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Charger les variables d'environnement
dotenv.config({ path: join(rootDir, '.env.local') });
dotenv.config({ path: join(rootDir, '.env') });

// Le switch de production remplace DATABASE_URL par DATABASE_URL_PRODUCTION quand activé
// Donc on peut soit :
// 1. Utiliser DATABASE_URL si le switch est activé (car il a déjà fait le remplacement)
// 2. Ou lire DATABASE_URL_PRODUCTION directement depuis .env.local
const switchPath = join(rootDir, '.db-switch.json');
const envLocalPath = join(rootDir, '.env.local');
let databaseUrl = null;
let switchActive = false;

// Vérifier si le switch est activé
if (existsSync(switchPath)) {
  try {
    const switchConfig = JSON.parse(readFileSync(switchPath, 'utf-8'));
    switchActive = switchConfig.useProduction === true;
  } catch (error) {
    // Ignorer
  }
}

// Priorité 1: Si le switch est activé, lire DATABASE_URL directement depuis .env.local
// (car le switch a remplacé DATABASE_URL par DATABASE_URL_PRODUCTION dans le fichier)
if (switchActive && existsSync(envLocalPath)) {
  const envContent = readFileSync(envLocalPath, 'utf-8');
  const dbUrlMatch = envContent.match(/^DATABASE_URL=(.+)$/m);
  if (dbUrlMatch) {
    const url = dbUrlMatch[1].trim().replace(/^["']|["']$/g, '');
    if (
      (url.startsWith('postgresql://') || url.startsWith('postgres://')) &&
      !url.includes('dummy') &&
      !url.includes('localhost') &&
      !url.includes('file:')
    ) {
      databaseUrl = url;
      console.log(
        '✅ Switch de production activé, utilisation de DATABASE_URL depuis .env.local (déjà remplacé par DATABASE_URL_PRODUCTION)\n'
      );
    }
  }
}

// Priorité 2: Lire DATABASE_URL_PRODUCTION directement depuis .env.local
if (!databaseUrl && existsSync(envLocalPath)) {
  const envContent = readFileSync(envLocalPath, 'utf-8');
  // Chercher DATABASE_URL_PRODUCTION (même commenté)
  const lines = envContent.split('\n');
  for (const line of lines) {
    const cleanLine = line.trim();
    if (
      cleanLine.startsWith('DATABASE_URL_PRODUCTION=') ||
      cleanLine.startsWith('# DATABASE_URL_PRODUCTION=')
    ) {
      const match = cleanLine.match(/DATABASE_URL_PRODUCTION=["']?([^"'\s]+)["']?/);
      if (match && match[1] && !match[1].includes('dummy') && !match[1].includes('localhost')) {
        databaseUrl = match[1];
        console.log('✅ DATABASE_URL_PRODUCTION trouvé dans .env.local\n');
        break;
      }
    }
  }
}

// Priorité 3: DATABASE_URL_PRODUCTION depuis process.env (chargé par dotenv)
if (!databaseUrl && process.env.DATABASE_URL_PRODUCTION) {
  const url = process.env.DATABASE_URL_PRODUCTION;
  if (!url.includes('dummy') && !url.includes('localhost')) {
    databaseUrl = url;
    console.log('✅ Utilisation de DATABASE_URL_PRODUCTION depuis process.env\n');
  }
}

// Si toujours pas trouvé, donner des instructions
if (!databaseUrl || databaseUrl.includes('dummy') || databaseUrl.includes('localhost')) {
  console.error('❌ Impossible de trouver une connection string PostgreSQL valide');
  console.error('\n💡 Pour diagnostiquer la base de production:');
  console.error('   Option 1: Activez le switch de production dans /admin/configuration');
  console.error('              (le switch remplace DATABASE_URL par DATABASE_URL_PRODUCTION)');
  console.error('   Option 2: Ajoutez DATABASE_URL_PRODUCTION dans .env.local');
  console.error(
    '              Format: DATABASE_URL_PRODUCTION="postgresql://user:password@host.neon.tech/database?sslmode=require"'
  );
  console.error('   Puis relancez: pnpm run db:diagnose-prod');
  console.error('\n   Ou utilisez: pnpm run db:setup:production-url');
  process.exit(1);
}

// Vérifier que c'est PostgreSQL
if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
  console.error('❌ DATABASE_URL ne pointe pas vers PostgreSQL');
  console.error(`   URL actuelle: ${databaseUrl.substring(0, 50)}...`);
  console.error('\n💡 Pour diagnostiquer la base de production:');
  console.error('   1. Activez le switch de production dans /admin/configuration');
  console.error('      (ou modifiez .db-switch.json avec {"useProduction": true})');
  console.error(
    '   2. Définissez DATABASE_URL_PRODUCTION dans .env.local avec votre connection string Neon'
  );
  console.error('   3. Puis relancez: pnpm run db:diagnose-prod');
  process.exit(1);
}

console.log('🔍 Diagnostic de la base de données PRODUCTION');
console.log('==============================================\n');
console.log(`📍 Connexion: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}\n`);

// Vérifier et forcer le schéma en PostgreSQL si nécessaire
const schemaPath = join(rootDir, 'prisma/schema.prisma');
let schemaChanged = false;
let originalSchema = '';

if (existsSync(schemaPath)) {
  originalSchema = readFileSync(schemaPath, 'utf-8');
  if (originalSchema.includes('provider = "sqlite"')) {
    console.log('⚠️  Le schéma est en SQLite, passage temporaire à PostgreSQL...\n');
    const newSchema = originalSchema.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
    const { writeFileSync } = await import('fs');
    writeFileSync(schemaPath, newSchema, 'utf-8');
    schemaChanged = true;

    // Régénérer le client Prisma
    const { execSync } = await import('child_process');
    try {
      execSync('pnpm prisma generate', { stdio: 'pipe', cwd: rootDir });
    } catch (error) {
      console.error('⚠️  Erreur lors de la régénération du client Prisma');
    }
  }
}

// Utiliser directement l'adapter Neon pour exécuter des requêtes SQL
// Cela évite les problèmes de génération du client Prisma
let sql;

try {
  const { neon } = await import('@neondatabase/serverless');
  sql = neon(databaseUrl);
  console.log('✅ Connexion à la base de données établie\n');
} catch (error) {
  console.error('❌ Impossible de se connecter à la base de données');
  console.error('   Erreur:', error.message);
  console.error('\n   💡 Assurez-vous que @neondatabase/serverless est installé');

  // Restaurer le schéma si on l'a modifié
  if (schemaChanged && originalSchema) {
    const { writeFileSync } = await import('fs');
    writeFileSync(schemaPath, originalSchema, 'utf-8');
  }
  process.exit(1);
}

// Tables attendues selon le schéma Prisma
const expectedTables = [
  'Account',
  'Event',
  'Genre',
  'GenresOnTracks',
  'MusicCollection',
  'RecurrenceConfig',
  'Session',
  'TicketInfo',
  'Track',
  'TrackPlatform',
  'User',
  'VerificationToken',
  'SiteConfig',
  'ConfigHistory',
  'ConfigSnapshot',
  'Image',
  'Project',
];

async function diagnose() {
  try {
    // 1. Vérifier les tables existantes
    console.log('📊 1. Tables existantes dans la base de données:');
    const existingTablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    const existingTableNames = existingTablesResult.map((t) => t.table_name);

    if (existingTableNames.length === 0) {
      console.log('   ❌ Aucune table trouvée dans la base de données !\n');
    } else {
      existingTableNames.forEach((table) => {
        const isExpected = expectedTables.includes(table);
        const status = isExpected ? '✅' : '⚠️';
        console.log(`   ${status} ${table}${isExpected ? '' : ' (non attendue)'}`);
      });
      console.log(`\n   Total: ${existingTableNames.length} tables\n`);
    }

    // 2. Comparer avec les tables attendues
    console.log('📋 2. Comparaison avec le schéma Prisma:');
    const missingTables = expectedTables.filter((t) => !existingTableNames.includes(t));
    const extraTables = existingTableNames.filter(
      (t) => !expectedTables.includes(t) && t !== '_prisma_migrations'
    );

    if (missingTables.length === 0 && extraTables.length === 0) {
      console.log('   ✅ Toutes les tables attendues sont présentes !\n');
    } else {
      if (missingTables.length > 0) {
        console.log(`\n   ❌ Tables manquantes (${missingTables.length}):`);
        missingTables.forEach((table) => {
          console.log(`      - ${table}`);
        });
      }

      if (extraTables.length > 0) {
        console.log(`\n   ⚠️  Tables supplémentaires (${extraTables.length}):`);
        extraTables.forEach((table) => {
          console.log(`      - ${table}`);
        });
      }
      console.log('');
    }

    // 3. Vérifier les colonnes des tables existantes (pour les tables qui existent mais peuvent avoir des colonnes manquantes)
    if (missingTables.length > 0) {
      console.log('🔍 3. Détails des tables manquantes:');
      console.log('   Les tables suivantes doivent être créées:\n');

      // Lire le fichier de migration pour voir la structure attendue
      const migrationFile = join(rootDir, 'prisma/migrations/20251128000927_init/migration.sql');
      if (existsSync(migrationFile)) {
        const migrationSQL = readFileSync(migrationFile, 'utf-8');

        missingTables.forEach((table) => {
          console.log(`   📄 Table: ${table}`);
          // Extraire la définition CREATE TABLE pour cette table
          const tableRegex = new RegExp(
            `CREATE TABLE "${table}"[\\s\\S]*?(\\);|CONSTRAINT[\\s\\S]*?\\);)`
          );
          const match = migrationSQL.match(tableRegex);
          if (match) {
            const definition = match[0].substring(0, 500); // Limiter à 500 caractères
            console.log(`      ${definition.replace(/\n/g, '\n      ')}...`);
          }
          console.log('');
        });
      }
    }

    // 4. Vérifier l'état des migrations
    console.log('🔄 4. État des migrations Prisma:');
    try {
      const migrationsResult = await sql`
        SELECT 
          migration_name, 
          finished_at, 
          applied_steps_count, 
          started_at,
          logs
        FROM _prisma_migrations
        ORDER BY started_at DESC
        LIMIT 10;
      `;
      const migrations = migrationsResult;

      if (migrations.length === 0) {
        console.log('   ⚠️  Aucune migration trouvée dans _prisma_migrations\n');
        console.log("   💡 La base de données n'a jamais été migrée avec Prisma\n");
      } else {
        migrations.forEach((m) => {
          const status = m.finished_at ? '✅ Appliquée' : '❌ Échouée/En cours';
          const date = m.finished_at || m.started_at;
          console.log(`   ${status}: ${m.migration_name}`);
          console.log(`      Étapes appliquées: ${m.applied_steps_count}`);
          console.log(`      Date: ${date}`);
          if (m.logs) {
            const logsPreview = m.logs.substring(0, 200);
            console.log(`      Logs: ${logsPreview}${m.logs.length > 200 ? '...' : ''}`);
          }
          console.log('');
        });
      }
    } catch (error) {
      if (
        (error.message && error.message.includes('does not exist')) ||
        error.message.includes('relation "_prisma_migrations"')
      ) {
        console.log("   ❌ La table _prisma_migrations n'existe pas !");
        console.log("   💡 La base de données n'a jamais été migrée avec Prisma\n");
      } else {
        console.log(`   ⚠️  Erreur: ${error.message}\n`);
      }
    }

    // 5. Générer le SQL pour créer les tables manquantes
    if (missingTables.length > 0) {
      console.log('💡 5. Recommandations pour corriger:');
      console.log('\n   Pour créer les tables manquantes:\n');

      console.log('   Option A: Rollback et réappliquer la migration (RECOMMANDÉ)');
      console.log('   ```bash');
      console.log('   # Activer le switch de production');
      console.log('   # Puis dans le terminal:');
      console.log('   pnpm prisma migrate resolve --rolled-back 20251128000927_init');
      console.log('   pnpm prisma migrate deploy');
      console.log('   ```\n');

      console.log('   Option B: Utiliser prisma db push (temporaire, pour tester)');
      console.log('   ```bash');
      console.log('   # Activer le switch de production');
      console.log('   pnpm prisma db push --accept-data-loss');
      console.log('   ```\n');

      // Générer un fichier SQL avec les CREATE TABLE manquants
      const migrationFile = join(rootDir, 'prisma/migrations/20251128000927_init/migration.sql');
      if (existsSync(migrationFile)) {
        const migrationSQL = readFileSync(migrationFile, 'utf-8');
        const outputFile = join(rootDir, 'prisma/migrations/missing-tables.sql');

        // Extraire uniquement les CREATE TABLE pour les tables manquantes
        let missingTablesSQL = '';
        missingTables.forEach((table) => {
          const tableRegex = new RegExp(
            `-- CreateTable\\s+CREATE TABLE "${table}"[\\s\\S]*?(?=-- CreateTable|-- CreateIndex|-- AddForeignKey|$)`,
            'm'
          );
          const match = migrationSQL.match(tableRegex);
          if (match) {
            missingTablesSQL += match[0] + '\n\n';
          }
        });

        if (missingTablesSQL) {
          // Écrire dans un fichier temporaire
          const { writeFile } = await import('fs/promises');
          await writeFile(outputFile, missingTablesSQL, 'utf-8');
          console.log(`   📄 Fichier SQL généré: ${outputFile}`);
          console.log("   Vous pouvez l'examiner et l'exécuter manuellement si nécessaire\n");
        }
      }
    }

    // 6. Résumé
    console.log('📊 6. Résumé:');
    console.log(`   Tables attendues: ${expectedTables.length}`);
    console.log(`   Tables existantes: ${existingTableNames.length}`);
    console.log(`   Tables manquantes: ${missingTables.length}`);
    console.log(`   Tables supplémentaires: ${extraTables.length}`);

    if (missingTables.length > 0) {
      console.log('\n   ❌ ACTION REQUISE: Des tables manquantes doivent être créées\n');
      console.log('   💡 Exécutez: pnpm run db:diagnose-prod pour voir ce rapport\n');
      process.exit(1);
    } else {
      console.log('\n   ✅ La base de données est à jour avec le schéma Prisma\n');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.message && error.message.includes('does not exist')) {
      console.error("\n   La table n'existe pas ou la base de données n'est pas accessible.");
      console.error('   Vérifiez que DATABASE_URL_PRODUCTION est correcte.');
    }
    process.exit(1);
  } finally {
    // Restaurer le schéma si on l'a modifié
    if (schemaChanged && originalSchema) {
      const { writeFileSync } = await import('fs');
      writeFileSync(schemaPath, originalSchema, 'utf-8');
      console.log('\n✅ Schéma Prisma restauré en SQLite');
    }
  }
}

diagnose();
