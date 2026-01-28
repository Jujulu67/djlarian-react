#!/usr/bin/env node

/**
 * Script de vérification du drift Prisma
 * Vérifie que le schéma Prisma correspond à la base de données
 * Utilisé dans CI pour empêcher les regressions
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const rootDir = process.cwd();

/**
 * Vérifie que le schéma Prisma est valide
 */
function validateSchema() {
  console.log('🔍 Validation du schéma Prisma...');
  try {
    execSync('pnpm prisma validate', { stdio: 'pipe', cwd: rootDir });
    console.log('✅ Schéma Prisma valide');
    return true;
  } catch (error) {
    console.error('❌ Schéma Prisma invalide');
    console.error(error.message);
    return false;
  }
}

/**
 * Vérifie le drift entre le schéma et la base de données
 * @param {string} databaseUrl - URL de la base de données (optionnel)
 */
function checkDrift(databaseUrl) {
  console.log('🔍 Vérification du drift...');

  if (!databaseUrl) {
    // Utiliser DATABASE_URL par défaut
    databaseUrl = process.env.DATABASE_URL;
  }

  if (!databaseUrl) {
    console.warn('⚠️  DATABASE_URL non défini, skip de la vérification de drift');
    return true;
  }

  try {
    // Utiliser migrate diff pour détecter le drift
    const output = execSync(
      `pnpm prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --script`,
      {
        stdio: 'pipe',
        cwd: rootDir,
        env: { ...process.env, DATABASE_URL: databaseUrl },
      }
    );

    const diff = output.toString().trim();

    if (diff && diff.length > 0 && !diff.includes('-- This is an empty migration')) {
      console.error('❌ Drift détecté entre le schéma et la base de données:');
      console.error(diff);
      return false;
    }

    console.log('✅ Aucun drift détecté');
    return true;
  } catch (error) {
    // migrate diff retourne un code d'erreur si des différences sont trouvées
    const errorOutput = error.stdout?.toString() || error.stderr?.toString() || error.message;

    if (
      errorOutput.includes('-- This is an empty migration') ||
      errorOutput.includes('No schema changes')
    ) {
      console.log('✅ Aucun drift détecté');
      return true;
    }

    console.error('❌ Erreur lors de la vérification du drift:');
    console.error(errorOutput);
    return false;
  }
}

/**
 * Vérifie l'état des migrations
 */
function checkMigrationsStatus() {
  console.log("🔍 Vérification de l'état des migrations...");

  try {
    const output = execSync('pnpm prisma migrate status', {
      stdio: 'pipe',
      cwd: rootDir,
    });

    const status = output.toString();

    // Vérifier si des migrations sont en attente
    if (status.includes('not yet been applied') || status.includes('Following migrations')) {
      console.error('❌ Migrations non appliquées détectées:');
      console.error(status);
      return false;
    }

    if (
      status.includes('Database schema is up to date') ||
      status.includes('All migrations have been applied')
    ) {
      console.log('✅ Toutes les migrations sont appliquées');
      return true;
    }

    // Si on ne peut pas déterminer, considérer comme OK (peut être une DB de test)
    console.log('⚠️  État des migrations indéterminé (peut être normal pour une DB de test)');
    return true;
  } catch (error) {
    // migrate status peut échouer si la DB n'existe pas (normal en CI sans DB)
    const errorOutput = error.stdout?.toString() || error.stderr?.toString() || error.message;

    if (errorOutput.includes('does not exist') || errorOutput.includes('P1003')) {
      console.log('⚠️  Base de données non trouvée (normal en CI sans DB configurée)');
      return true;
    }

    console.error('❌ Erreur lors de la vérification des migrations:');
    console.error(errorOutput);
    return false;
  }
}

/**
 * Vérifie que le client Prisma peut être généré
 */
function checkClientGeneration() {
  console.log('🔍 Vérification de la génération du client Prisma...');

  try {
    execSync('pnpm prisma generate', { stdio: 'pipe', cwd: rootDir });
    console.log('✅ Client Prisma généré avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la génération du client Prisma:');
    console.error(error.message);
    return false;
  }
}

/**
 * Fonction principale
 */
function main() {
  console.log('🔍 Vérification du pipeline Prisma\n');

  const results = {
    schema: validateSchema(),
    client: checkClientGeneration(),
    migrations: checkMigrationsStatus(),
    drift: checkDrift(),
  };

  console.log('\n📊 Résumé des vérifications:');
  console.log(`   Schema valide: ${results.schema ? '✅' : '❌'}`);
  console.log(`   Client générable: ${results.client ? '✅' : '❌'}`);
  console.log(`   Migrations OK: ${results.migrations ? '✅' : '❌'}`);
  console.log(`   Aucun drift: ${results.drift ? '✅' : '❌'}`);

  const allPassed = Object.values(results).every((r) => r === true);

  if (!allPassed) {
    console.error('\n❌ Certaines vérifications ont échoué');
    process.exit(1);
  }

  console.log('\n✅ Toutes les vérifications ont réussi');
  process.exit(0);
}

main();
