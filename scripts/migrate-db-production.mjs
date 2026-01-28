#!/usr/bin/env node
/**
 * Script de migration de la base de données en production
 * 
 * Ce script :
 * 1. Vérifie le drift de migration
 * 2. Applique la migration de la table Image
 * 3. Vérifie que tout est OK
 * 
 * Usage:
 *   node scripts/migrate-db-production.mjs
 */

import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Charger les variables d'environnement
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

dotenv.config({ path: join(rootDir, '.env.local') });
dotenv.config({ path: join(rootDir, '.env') });

// Vérifier qu'on est en production ou que DATABASE_URL pointe vers PostgreSQL
const databaseUrl = process.env.DATABASE_URL || '';
const isProduction = process.env.NODE_ENV === 'production';
const isPostgreSQL = databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://');

if (!isProduction && !isPostgreSQL) {
  console.error('❌ Ce script est destiné à la production (PostgreSQL)');
  console.error('   DATABASE_URL doit pointer vers PostgreSQL');
  console.error('   Ou définissez NODE_ENV=production');
  process.exit(1);
}

console.log('🚀 Migration de la base de données en production...\n');

try {
  // 1. Vérifier le drift
  console.log('📋 Vérification du drift de migration...');
  try {
    const driftCheck = execSync('pnpm prisma migrate status', {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: rootDir,
    });
    console.log('   ✓ Aucun drift détecté\n');
  } catch (error) {
    const output = error.stdout || error.stderr || '';
    if (output.includes('drift')) {
      console.error('   ⚠️  Drift détecté !');
      console.error('   Vérifiez les migrations manquantes avant de continuer.');
      console.error('\n   Pour résoudre le drift:');
      console.error('   1. Vérifiez que toutes les migrations sont appliquées');
      console.error('   2. Ou utilisez: pnpm prisma migrate resolve --applied <migration_name>');
      process.exit(1);
    } else {
      // Autre erreur, continuer quand même
      console.warn('   ⚠️  Impossible de vérifier le drift, continuation...\n');
    }
  }

  // 2. Appliquer les migrations
  console.log('💾 Application des migrations...');
  try {
    execSync('pnpm prisma migrate deploy', {
      encoding: 'utf-8',
      stdio: 'inherit',
      cwd: rootDir,
    });
    console.log('\n   ✅ Migrations appliquées avec succès\n');
  } catch (error) {
    console.error('\n   ❌ Erreur lors de l\'application des migrations');
    console.error('   Vérifiez les logs ci-dessus');
    process.exit(1);
  }

  // 3. Vérifier que la table Image existe
  console.log('🔍 Vérification de la table Image...');
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Image'
      );
    `;
    
    if (tableExists[0]?.exists) {
      console.log('   ✅ Table Image existe\n');
      
      // Compter les images
      const count = await prisma.image.count();
      console.log(`   📊 ${count} images dans la table Image\n`);
    } else {
      console.error('   ❌ Table Image n\'existe pas !');
      console.error('   La migration n\'a peut-être pas été appliquée correctement.');
      process.exit(1);
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('   ⚠️  Impossible de vérifier la table Image:', error.message);
    console.error('   Continuez quand même si vous êtes sûr que la migration a été appliquée.');
  }

  console.log('✅ Migration de la base de données terminée avec succès !\n');
  console.log('📝 Prochaine étape: Exécutez la migration des images blob');
  console.log('   node scripts/migrate-blob-images-production.mjs\n');
} catch (error) {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
}

