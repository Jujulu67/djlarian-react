#!/usr/bin/env node

/**
 * Script de bootstrap de la base de données locale
 * Applique les migrations manquantes sans perte de données
 * Utilisé pour initialiser ou réparer la DB locale
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const rootDir = process.cwd();

/**
 * Vérifie que DATABASE_URL est configuré
 */
function checkDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("❌ DATABASE_URL n'est pas défini");
    console.error('   Configurez DATABASE_URL dans .env.local');
    console.error('   Pour PostgreSQL local: DATABASE_URL_PRODUCTION="postgresql://..."');
    process.exit(1);
  }

  console.log(`✅ DATABASE_URL configuré: ${databaseUrl.substring(0, 30)}...`);
  return databaseUrl;
}

/**
 * Crée un backup de la base de données si elle existe
 */
function createBackup(databaseUrl) {
  if (databaseUrl.startsWith('file:')) {
    // SQLite
    const dbPath = databaseUrl.replace('file:', '');
    const fullPath = join(rootDir, dbPath);

    if (existsSync(fullPath)) {
      const backupPath = `${fullPath}.backup.${Date.now()}`;
      console.log(`📦 Création d'un backup: ${backupPath}`);

      try {
        const fs = require('fs');
        fs.copyFileSync(fullPath, backupPath);
        console.log(`✅ Backup créé: ${backupPath}`);
        return backupPath;
      } catch (error) {
        console.warn(`⚠️  Impossible de créer le backup: ${error.message}`);
      }
    }
  } else {
    // PostgreSQL - documenter la commande pg_dump
    console.log('📦 Pour PostgreSQL, créez un backup avec:');
    console.log(`   pg_dump "${databaseUrl}" > backup_${Date.now()}.sql`);
  }

  return null;
}

/**
 * Applique les migrations manquantes
 */
function applyMigrations() {
  console.log('🔄 Application des migrations...');

  try {
    const output = execSync('npx prisma migrate deploy', {
      stdio: 'pipe',
      cwd: rootDir,
      env: process.env,
    });

    const result = output.toString();

    if (result.includes('No pending migrations') || result.includes('already applied')) {
      console.log('✅ Toutes les migrations sont déjà appliquées');
    } else {
      console.log('✅ Migrations appliquées avec succès');
      console.log(result);
    }

    return true;
  } catch (error) {
    const errorOutput = error.stdout?.toString() || error.stderr?.toString() || error.message;

    if (errorOutput.includes('P3009') || errorOutput.includes('failed migration')) {
      console.error('❌ Migration échouée détectée');
      console.error(
        '   Résolvez-la avec: npx prisma migrate resolve --rolled-back <migration_name>'
      );
      console.error('   Puis réessayez: npm run prisma:bootstrap:local');
      return false;
    }

    console.error("❌ Erreur lors de l'application des migrations:");
    console.error(errorOutput);
    return false;
  }
}

/**
 * Vérifie que le schéma est synchronisé
 */
function verifySchemaSync() {
  console.log('🔍 Vérification de la synchronisation du schéma...');

  try {
    const output = execSync('npx prisma migrate status', {
      stdio: 'pipe',
      cwd: rootDir,
      env: process.env,
    });

    const status = output.toString();

    if (
      status.includes('Database schema is up to date') ||
      status.includes('All migrations have been applied')
    ) {
      console.log('✅ Schéma synchronisé');
      return true;
    }

    if (status.includes('not yet been applied')) {
      console.warn('⚠️  Des migrations sont encore en attente');
      console.log(status);
      return false;
    }

    console.log('✅ État des migrations vérifié');
    return true;
  } catch (error) {
    const errorOutput = error.stdout?.toString() || error.stderr?.toString() || error.message;

    if (errorOutput.includes('does not exist') || errorOutput.includes('P1003')) {
      console.error('❌ Base de données non trouvée');
      console.error('   Créez la base de données et réessayez');
      return false;
    }

    console.warn("⚠️  Impossible de vérifier l'état des migrations");
    console.warn(errorOutput);
    return true; // Ne pas faire échouer si on ne peut pas vérifier
  }
}

/**
 * Génère le client Prisma
 */
function generateClient() {
  console.log('🔄 Génération du client Prisma...');

  try {
    execSync('npx prisma generate', {
      stdio: 'pipe',
      cwd: rootDir,
    });

    console.log('✅ Client Prisma généré');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la génération du client:');
    console.error(error.message);
    return false;
  }
}

/**
 * Fonction principale
 */
function main() {
  console.log('🚀 Bootstrap de la base de données locale\n');

  const databaseUrl = checkDatabaseUrl();
  const backupPath = createBackup(databaseUrl);

  console.log('');

  const migrationsApplied = applyMigrations();
  if (!migrationsApplied) {
    process.exit(1);
  }

  const schemaSynced = verifySchemaSync();
  if (!schemaSynced) {
    console.warn("⚠️  Le schéma n'est pas complètement synchronisé");
    console.warn('   Vérifiez avec: npx prisma migrate status');
  }

  const clientGenerated = generateClient();
  if (!clientGenerated) {
    process.exit(1);
  }

  console.log('\n✅ Bootstrap terminé avec succès');

  if (backupPath) {
    console.log(`\n💾 Backup disponible: ${backupPath}`);
  }

  process.exit(0);
}

main();
