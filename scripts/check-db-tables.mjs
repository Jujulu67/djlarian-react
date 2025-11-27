#!/usr/bin/env node
/**
 * Script pour vérifier l'état des tables dans la base de données
 * Usage: node scripts/check-db-tables.mjs
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

dotenv.config({ path: join(rootDir, '.env.local') });
dotenv.config({ path: join(rootDir, '.env') });

const prisma = new PrismaClient();

async function checkTables() {
  try {
    console.log('🔍 Vérification des tables dans la base de données...\n');
    
    // Liste des tables attendues
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
    
    // Vérifier quelles tables existent
    const existingTables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const existingTableNames = existingTables.map(t => t.table_name);
    
    console.log('📊 Tables existantes dans la base de données:');
    existingTableNames.forEach(table => {
      console.log(`   ✅ ${table}`);
    });
    
    console.log('\n📋 Tables attendues mais manquantes:');
    const missingTables = expectedTables.filter(t => !existingTableNames.includes(t));
    
    if (missingTables.length === 0) {
      console.log('   ✅ Toutes les tables sont présentes !');
    } else {
      missingTables.forEach(table => {
        console.log(`   ❌ ${table}`);
      });
    }
    
    // Vérifier l'état des migrations
    console.log('\n🔄 État des migrations Prisma:');
    try {
      const migrations = await prisma.$queryRaw`
        SELECT migration_name, finished_at, applied_steps_count, started_at
        FROM _prisma_migrations
        ORDER BY started_at DESC
        LIMIT 10;
      `;
      
      if (migrations.length === 0) {
        console.log('   ⚠️  Aucune migration trouvée dans _prisma_migrations');
      } else {
        migrations.forEach(m => {
          const status = m.finished_at ? '✅ Appliquée' : '⚠️  En cours/Échouée';
          console.log(`   ${status}: ${m.migration_name} (${m.applied_steps_count} étapes)`);
          if (m.started_at && !m.finished_at) {
            console.log(`      ⚠️  Commencée le ${m.started_at} mais pas terminée`);
          }
        });
      }
    } catch (error) {
      console.log('   ⚠️  Impossible de vérifier les migrations:', error.message);
    }
    
    console.log('\n💡 Recommandations:');
    if (missingTables.length > 0) {
      console.log('   1. La migration a été marquée comme appliquée mais les tables n\'existent pas');
      console.log('   2. Résolvez la migration échouée:');
      console.log('      npx prisma migrate resolve --rolled-back 20251128000927_init');
      console.log('   3. Réappliquez la migration:');
      console.log('      npx prisma migrate deploy');
    } else {
      console.log('   ✅ La base de données semble correcte');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.code === 'P2021') {
      console.error('   La table _prisma_migrations n\'existe pas.');
      console.error('   La base de données n\'a jamais été migrée.');
      console.error('   Exécutez: npx prisma migrate deploy');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();

