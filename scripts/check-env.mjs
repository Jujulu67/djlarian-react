#!/usr/bin/env node

/**
 * Script pour vérifier les variables d'environnement requises
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const requiredVars = {
  // Obligatoires pour NextAuth
  NEXTAUTH_URL: 'URL de votre application (ex: http://localhost:3000)',
  NEXTAUTH_SECRET: 'Secret NextAuth (générer avec: openssl rand -base64 32)',
  DATABASE_URL: 'Connection string de la base de données',
};

const optionalVars = {
  // OAuth (optionnel mais recommandé)
  GOOGLE_CLIENT_ID: 'Client ID Google OAuth',
  GOOGLE_CLIENT_SECRET: 'Client Secret Google OAuth',
  TWITCH_CLIENT_ID: 'Client ID Twitch OAuth',
  TWITCH_CLIENT_SECRET: 'Client Secret Twitch OAuth',
};

console.log('🔍 Vérification des variables d\'environnement...\n');

// Vérifier si .env.local existe
const envLocalPath = join(process.cwd(), '.env.local');
const envPath = join(process.cwd(), '.env');

let envContent = '';
if (existsSync(envLocalPath)) {
  console.log('✅ Fichier .env.local trouvé\n');
  envContent = readFileSync(envLocalPath, 'utf-8');
} else if (existsSync(envPath)) {
  console.log('✅ Fichier .env trouvé\n');
  envContent = readFileSync(envPath, 'utf-8');
} else {
  console.log('❌ Aucun fichier .env.local ou .env trouvé\n');
  console.log('💡 Créez un fichier .env.local avec les variables suivantes :\n');
  Object.entries(requiredVars).forEach(([key, desc]) => {
    console.log(`   ${key}=... # ${desc}`);
  });
  process.exit(1);
}

// Parser les variables
const envVars = {};
envContent.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      envVars[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
    }
  }
});

// Vérifier les variables obligatoires
console.log('📋 Variables Obligatoires :\n');
let allRequiredPresent = true;

Object.entries(requiredVars).forEach(([key, desc]) => {
  const value = envVars[key] || process.env[key];
  if (value) {
    const maskedValue = key.includes('SECRET') || key.includes('PASSWORD') || key.includes('TOKEN')
      ? '***' + value.slice(-4)
      : value.length > 50
      ? value.substring(0, 30) + '...'
      : value;
    console.log(`   ✅ ${key} = ${maskedValue}`);
  } else {
    console.log(`   ❌ ${key} - MANQUANT (${desc})`);
    allRequiredPresent = false;
  }
});

// Vérifier les variables optionnelles
console.log('\n📋 Variables Optionnelles (OAuth) :\n');
let oauthConfigured = false;

Object.entries(optionalVars).forEach(([key, desc]) => {
  const value = envVars[key] || process.env[key];
  if (value) {
    const maskedValue = key.includes('SECRET')
      ? '***' + value.slice(-4)
      : value.length > 50
      ? value.substring(0, 30) + '...'
      : value;
    console.log(`   ✅ ${key} = ${maskedValue}`);
    oauthConfigured = true;
  } else {
    console.log(`   ⚠️  ${key} - Non configuré (${desc})`);
  }
});

// Résumé
console.log('\n' + '='.repeat(60));
if (allRequiredPresent) {
  console.log('✅ Toutes les variables obligatoires sont présentes');
} else {
  console.log('❌ Certaines variables obligatoires sont manquantes');
  console.log('\n💡 Pour générer NEXTAUTH_SECRET :');
  console.log('   openssl rand -base64 32\n');
}

if (oauthConfigured) {
  console.log('✅ OAuth configuré (Google et/ou Twitch)');
} else {
  console.log('⚠️  OAuth non configuré (optionnel, voir docs/OAUTH_SETUP.md)');
}

console.log('='.repeat(60) + '\n');

// Vérifications spécifiques
if (envVars.NEXTAUTH_URL) {
  const url = envVars.NEXTAUTH_URL;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    console.log('⚠️  NEXTAUTH_URL devrait commencer par http:// ou https://');
  }
  if (url.endsWith('/')) {
    console.log('⚠️  NEXTAUTH_URL ne devrait pas se terminer par un slash');
  }
}

if (envVars.NEXTAUTH_SECRET || envVars.AUTH_SECRET) {
  const secret = envVars.NEXTAUTH_SECRET || envVars.AUTH_SECRET;
  if (secret.length < 32) {
    console.log('⚠️  NEXTAUTH_SECRET devrait faire au moins 32 caractères');
  }
}

process.exit(allRequiredPresent ? 0 : 1);

