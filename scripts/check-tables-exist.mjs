#!/usr/bin/env node
/**
 * Script pour vérifier si les tables principales existent dans la base de données
 * Retourne le nombre de tables trouvées (0-4)
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
    const result = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('User', 'Event', 'Image', 'Project');
    `;
    
    const count = parseInt(result[0]?.count || '0', 10);
    console.log(count);
    process.exit(0);
  } catch (error) {
    // Si la table _prisma_migrations n'existe pas, retourner 0
    if (error.code === 'P2021' || error.message.includes('does not exist')) {
      console.log('0');
      process.exit(0);
    }
    console.error('Error:', error.message);
    console.log('0');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();

