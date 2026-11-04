#!/usr/bin/env node

/**
 * Script pour créer un compte admin pour le bot assistant IA
 *
 * Usage: pnpm tsx scripts/create-bot-admin.mjs
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import bcrypt from 'bcryptjs';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Charger les variables d'environnement
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

// Importer Prisma et les adaptateurs
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaNeon } from '@prisma/adapter-neon';

// Fonction pour obtenir la DATABASE_URL
function getDatabaseUrl() {
  if (process.env.NODE_ENV === 'production') {
    return process.env.DATABASE_URL || '';
  }

  // Vérifier le switch
  try {
    const switchPath = join(process.cwd(), '.db-switch.json');
    if (existsSync(switchPath)) {
      const switchConfig = JSON.parse(readFileSync(switchPath, 'utf-8'));
      if (switchConfig.useProduction && process.env.DATABASE_URL_PRODUCTION) {
        return process.env.DATABASE_URL_PRODUCTION;
      }
    }
  } catch (error) {
    // Ignorer les erreurs
  }

  return process.env.DATABASE_URL || '';
}

// Fonction pour créer l'adaptateur (async)
async function createAdapter(databaseUrl) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined');
  }

  if (databaseUrl.startsWith('file:')) {
    // SQLite - PrismaBetterSqlite3 attend un objet avec url
    return new PrismaBetterSqlite3({
      url: databaseUrl,
    });
  } else if (databaseUrl.includes('neon.tech') || databaseUrl.includes('@ep-')) {
    // Neon
    const { Pool } = await import('@neondatabase/serverless');
    const pool = new Pool({ connectionString: databaseUrl });
    return new PrismaNeon(pool);
  } else {
    // PostgreSQL standard
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: databaseUrl });
    return new PrismaPg(pool);
  }
}

const BOT_EMAIL = 'assistant-ia@djlarian.local';
const BOT_NAME = 'Assistant IA Bot';
const BOT_PASSWORD = process.env.BOT_ADMIN_PASSWORD;
if (!BOT_PASSWORD) {
  console.error('BOT_ADMIN_PASSWORD est requis (aucun mot de passe par défaut).');
  process.exit(1);
}

async function createBotAdmin() {
  // Créer le client Prisma avec adaptateur
  const databaseUrl = getDatabaseUrl();
  const adapter = await createAdapter(databaseUrl);
  const prisma = new PrismaClient({ adapter });
  try {
    console.log('🤖 Création du compte admin pour le bot assistant IA...\n');

    // Vérifier si le bot existe déjà
    const existingBot = await prisma.user.findUnique({
      where: { email: BOT_EMAIL },
    });

    if (existingBot) {
      console.log(`✅ Le compte bot existe déjà :`);
      console.log(`   - ID: ${existingBot.id}`);
      console.log(`   - Email: ${existingBot.email}`);
      console.log(`   - Nom: ${existingBot.name}`);
      console.log(`   - Rôle: ${existingBot.role}`);

      // Mettre à jour le rôle si nécessaire
      if (existingBot.role !== 'ADMIN') {
        console.log(`\n⚠️  Le compte n'est pas admin. Mise à jour du rôle...`);
        await prisma.user.update({
          where: { id: existingBot.id },
          data: { role: 'ADMIN' },
        });
        console.log(`✅ Rôle mis à jour en ADMIN`);
      }

      return existingBot;
    }

    // Hasher le mot de passe
    console.log('🔐 Hashage du mot de passe...');
    const hashedPassword = await bcrypt.hash(BOT_PASSWORD, 12);

    // Créer le compte bot
    console.log('📝 Création du compte...');
    const botUser = await prisma.user.create({
      data: {
        email: BOT_EMAIL,
        name: BOT_NAME,
        hashedPassword,
        role: 'ADMIN',
        emailVerified: new Date(),
        isVip: false,
      },
    });

    console.log('\n✅ Compte bot créé avec succès !\n');
    console.log('📋 Informations du compte :');
    console.log(`   - ID: ${botUser.id}`);
    console.log(`   - Email: ${botUser.email}`);
    console.log(`   - Nom: ${botUser.name}`);
    console.log(`   - Rôle: ${botUser.role}`);
    console.log(`   - Mot de passe: ${BOT_PASSWORD}`);
    console.log('\n💡 Note: Le mot de passe est stocké dans BOT_ADMIN_PASSWORD (optionnel)');
    console.log('   Si non défini, le mot de passe par défaut est utilisé.\n');

    return botUser;
  } catch (error) {
    console.error('❌ Erreur lors de la création du compte bot:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter
createBotAdmin()
  .then(() => {
    console.log('✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
