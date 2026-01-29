#!/usr/bin/env node
/**
 * Script pour créer la table Notification si elle n'existe pas
 *
 * Ce script vérifie si la table Notification existe et la crée si nécessaire.
 * Utile pour corriger le cas où la migration a été marquée comme "applied"
 * mais n'a jamais été réellement exécutée.
 *
 * Usage: node scripts/fix-notification-table.mjs
 */

import { PrismaClient } from '@prisma/client';
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

// Obtenir DATABASE_URL (même logique que diagnose-prod-db.mjs)
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
if (switchActive && existsSync(envLocalPath)) {
  const envContent = readFileSync(envLocalPath, 'utf-8');
  const dbUrlMatch = envContent.match(/^DATABASE_URL=(.+)$/m);
  if (dbUrlMatch) {
    const url = dbUrlMatch[1].trim().replace(/^["']|["']$/g, '');
    if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
      databaseUrl = url;
      console.log(
        '✅ Switch de production activé, utilisation de DATABASE_URL depuis .env.local\n'
      );
    }
  }
}

// Priorité 2: DATABASE_URL_PRODUCTION depuis .env.local
if (!databaseUrl && existsSync(envLocalPath)) {
  const envContent = readFileSync(envLocalPath, 'utf-8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const cleanLine = line.trim();
    if (cleanLine.startsWith('DATABASE_URL_PRODUCTION=')) {
      const match = cleanLine.match(/DATABASE_URL_PRODUCTION=["']?([^"'\s]+)["']?/);
      if (match && match[1]) {
        databaseUrl = match[1];
        console.log('✅ DATABASE_URL_PRODUCTION trouvé dans .env.local\n');
        break;
      }
    }
  }
}

// Priorité 3: DATABASE_URL_PRODUCTION depuis process.env
if (!databaseUrl && process.env.DATABASE_URL_PRODUCTION) {
  databaseUrl = process.env.DATABASE_URL_PRODUCTION;
  console.log('✅ Utilisation de DATABASE_URL_PRODUCTION depuis process.env\n');
}

// Priorité 4: DATABASE_URL depuis process.env
if (!databaseUrl && process.env.DATABASE_URL) {
  databaseUrl = process.env.DATABASE_URL;
}

if (!databaseUrl) {
  console.error('❌ Impossible de trouver une connection string PostgreSQL valide');
  console.error('   Activez le switch de production dans /admin/configuration');
  console.error('   Ou ajoutez DATABASE_URL_PRODUCTION dans .env.local');
  process.exit(1);
}

console.log(`📋 Connexion à: ${databaseUrl.substring(0, 50)}...\n`);

// Vérifier si c'est PostgreSQL
const isPostgreSQL =
  databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://');

if (!isPostgreSQL) {
  console.error('❌ DATABASE_URL ne pointe pas vers PostgreSQL');
  console.error('   Ce script nécessite une connexion PostgreSQL');
  process.exit(1);
}

// Utiliser directement Neon pour exécuter des requêtes SQL (comme diagnose-prod-db.mjs)
let sql;
try {
  const { neon } = await import('@neondatabase/serverless');
  sql = neon(databaseUrl);
  console.log('✅ Connexion à la base de données établie\n');
} catch (error) {
  console.error('❌ Impossible de se connecter à la base de données');
  console.error('   Erreur:', error.message);
  console.error('\n   💡 Assurez-vous que @neondatabase/serverless est installé');
  process.exit(1);
}

// Initialiser PrismaClient avec l'adaptateur Neon (pour les requêtes Prisma si nécessaire)
let prisma;
try {
  const { PrismaNeon } = await import('@prisma/adapter-neon');
  const adapter = new PrismaNeon(sql);

  prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
} catch (error) {
  console.error("⚠️  Erreur lors de l'initialisation de PrismaClient:", error.message);
  console.error('   On utilisera directement Neon pour les requêtes SQL');
  prisma = null;
}

async function checkTableExists(tableName) {
  try {
    // Vérifier si la table existe (syntaxe PostgreSQL) - utiliser Neon directement
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      ) as exists;
    `;

    return result[0]?.exists || false;
  } catch (error) {
    console.error(`❌ Erreur lors de la vérification de la table ${tableName}:`, error.message);
    return false;
  }
}

async function createNotificationTable() {
  console.log('🔧 Création de la table Notification...');

  try {
    // Créer la table
    await sql`
      CREATE TABLE IF NOT EXISTS "Notification" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "message" TEXT,
        "metadata" TEXT,
        "isRead" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "readAt" TIMESTAMP(3),
        "projectId" TEXT,
        CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Notification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `;

    // Créer les index
    await sql`CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");`;
    await sql`CREATE INDEX IF NOT EXISTS "Notification_projectId_idx" ON "Notification"("projectId");`;
    await sql`CREATE INDEX IF NOT EXISTS "Notification_isRead_idx" ON "Notification"("isRead");`;
    await sql`CREATE INDEX IF NOT EXISTS "Notification_type_idx" ON "Notification"("type");`;
    await sql`CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");`;

    console.log('✅ Table Notification créée avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la création de la table:', error.message);
    return false;
  }
}

async function migrateData() {
  // Vérifier si MilestoneNotification existe encore
  const milestoneTableExists = await checkTableExists('MilestoneNotification');

  if (!milestoneTableExists) {
    console.log(
      "ℹ️  Table MilestoneNotification n'existe pas, pas de migration de données nécessaire"
    );
    return true;
  }

  console.log('🔄 Migration des données de MilestoneNotification vers Notification...');

  try {
    // Migrer les données
    await sql`
      INSERT INTO "Notification" ("id", "userId", "type", "title", "message", "metadata", "isRead", "createdAt", "readAt", "projectId")
      SELECT 
          "id",
          "userId",
          'MILESTONE' as "type",
          'Jalon ' || "milestoneType" || ' atteint' as "title",
          'Le projet a atteint le jalon ' || "milestoneType" as "message",
          json_build_object('milestoneType', "milestoneType")::text as "metadata",
          "isRead",
          "createdAt",
          "readAt",
          "projectId"
      FROM "MilestoneNotification"
      ON CONFLICT ("id") DO NOTHING;
    `;

    console.log('✅ Données migrées avec succès');

    // Supprimer l'ancienne table
    console.log("🗑️  Suppression de l'ancienne table MilestoneNotification...");
    await sql`DROP TABLE IF EXISTS "MilestoneNotification";`;
    console.log('✅ Table MilestoneNotification supprimée');

    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la migration des données:', error.message);
    return false;
  }
}

async function addArchiveColumns() {
  console.log("🔧 Vérification des colonnes d'archive...");

  // Vérifier si les colonnes existent déjà
  const columnsCheck = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Notification'
    AND column_name IN ('isArchived', 'deletedAt');
  `;

  const existingColumns = columnsCheck.map((c) => c.column_name);
  const needsIsArchived = !existingColumns.includes('isArchived');
  const needsDeletedAt = !existingColumns.includes('deletedAt');

  if (!needsIsArchived && !needsDeletedAt) {
    console.log("✅ Colonnes d'archive déjà présentes");
    return true;
  }

  if (needsIsArchived || needsDeletedAt) {
    console.log("🔧 Ajout des colonnes d'archive...");
    try {
      if (needsIsArchived) {
        await sql`ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;`;
        await sql`CREATE INDEX IF NOT EXISTS "Notification_isArchived_idx" ON "Notification"("isArchived");`;
      }
      if (needsDeletedAt) {
        await sql`ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);`;
      }

      console.log("✅ Colonnes d'archive ajoutées");
      return true;
    } catch (error) {
      console.error("❌ Erreur lors de l'ajout des colonnes:", error.message);
      return false;
    }
  }

  return true;
}

async function main() {
  console.log('🔍 Vérification de la table Notification...\n');

  const notificationExists = await checkTableExists('Notification');

  if (notificationExists) {
    console.log('✅ Table Notification existe déjà');

    // Vérifier quand même les colonnes d'archive
    await addArchiveColumns();

    console.log('\n✅ Tout est à jour !');
    await prisma.$disconnect();
    process.exit(0);
  }

  console.log("⚠️  Table Notification n'existe pas, création...\n");

  // Créer la table
  const created = await createNotificationTable();
  if (!created) {
    console.error('\n❌ Impossible de créer la table');
    await prisma.$disconnect();
    process.exit(1);
  }

  // Migrer les données
  await migrateData();

  // Ajouter les colonnes d'archive
  await addArchiveColumns();

  console.log('\n✅ Table Notification créée et configurée avec succès !');

  if (prisma) {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('\n❌ Erreur:', error);
  process.exit(1);
});
