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
  // OAuth (optionnel mais recommandé - 100% gratuit)
  GOOGLE_CLIENT_ID: 'Client ID Google OAuth (voir docs/OAUTH_SETUP.md)',
  GOOGLE_CLIENT_SECRET: 'Client Secret Google OAuth (voir docs/OAUTH_SETUP.md)',
  TWITCH_CLIENT_ID: 'Client ID Twitch OAuth (voir docs/OAUTH_SETUP.md)',
  TWITCH_CLIENT_SECRET: 'Client Secret Twitch OAuth (voir docs/OAUTH_SETUP.md)',
};

const instagramVars = {
  // Instagram API (optionnel)
  INSTAGRAM_APP_ID: 'App ID Instagram (voir TODO_INSTAGRAM.md)',
  INSTAGRAM_APP_SECRET: 'App Secret Instagram (voir TODO_INSTAGRAM.md)',
  INSTAGRAM_USER_ID: 'User ID Instagram Business (voir TODO_INSTAGRAM.md)',
  INSTAGRAM_ACCESS_TOKEN: 'Access Token Instagram long-lived (voir TODO_INSTAGRAM.md)',
};

const otherOptionalVars = {
  // Autres services optionnels
  SPOTIFY_CLIENT_ID: 'Client ID Spotify (optionnel)',
  SPOTIFY_CLIENT_SECRET: 'Client Secret Spotify (optionnel)',
  YOUTUBE_API_KEY: 'API Key YouTube (optionnel)',
  MUSICBRAINZ_USER_AGENT: 'User-Agent MusicBrainz (requis pour enrichissement)',
  REQUIRE_MERGE_CONFIRMATION: 'Demander confirmation avant fusion de comptes OAuth (optionnel, par défaut: true, mettre false pour fusion automatique)',
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

// Vérifier les variables optionnelles OAuth
console.log('\n📋 Variables Optionnelles - OAuth (100% Gratuit) :\n');
let oauthGoogleConfigured = false;
let oauthTwitchConfigured = false;

Object.entries(optionalVars).forEach(([key, desc]) => {
  const value = envVars[key] || process.env[key];
  if (value) {
    const maskedValue = key.includes('SECRET')
      ? '***' + value.slice(-4)
      : value.length > 50
      ? value.substring(0, 30) + '...'
      : value;
    console.log(`   ✅ ${key} = ${maskedValue}`);
    if (key.includes('GOOGLE')) oauthGoogleConfigured = true;
    if (key.includes('TWITCH')) oauthTwitchConfigured = true;
  } else {
    console.log(`   ⚠️  ${key} - Non configuré (${desc})`);
  }
});

// Vérifier Instagram API
console.log('\n📋 Variables Optionnelles - Instagram API :\n');
let instagramConfigured = false;
let instagramPartiallyConfigured = false;

Object.entries(instagramVars).forEach(([key, desc]) => {
  const value = envVars[key] || process.env[key];
  if (value) {
    const maskedValue = key.includes('SECRET') || key.includes('TOKEN')
      ? '***' + value.slice(-4)
      : value.length > 50
      ? value.substring(0, 30) + '...'
      : value;
    console.log(`   ✅ ${key} = ${maskedValue}`);
    instagramPartiallyConfigured = true;
  } else {
    console.log(`   ⚠️  ${key} - Non configuré (${desc})`);
  }
});

// Vérifier si Instagram est complètement configuré
if (instagramPartiallyConfigured) {
  const allInstagramVars = Object.keys(instagramVars);
  const configuredVars = allInstagramVars.filter(key => envVars[key] || process.env[key]);
  instagramConfigured = configuredVars.length === allInstagramVars.length;
}

// Vérifier autres variables optionnelles
console.log('\n📋 Variables Optionnelles - Autres Services :\n');
Object.entries(otherOptionalVars).forEach(([key, desc]) => {
  const value = envVars[key] || process.env[key];
  if (value) {
    const maskedValue = key.includes('SECRET')
      ? '***' + value.slice(-4)
      : value.length > 50
      ? value.substring(0, 30) + '...'
      : value;
    console.log(`   ✅ ${key} = ${maskedValue}`);
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

// Résumé OAuth
if (oauthGoogleConfigured && oauthTwitchConfigured) {
  console.log('✅ OAuth Google et Twitch configurés (100% gratuit)');
} else if (oauthGoogleConfigured) {
  console.log('✅ OAuth Google configuré (100% gratuit)');
  console.log('⚠️  OAuth Twitch non configuré (optionnel, voir docs/OAUTH_SETUP.md)');
} else if (oauthTwitchConfigured) {
  console.log('✅ OAuth Twitch configuré (100% gratuit)');
  console.log('⚠️  OAuth Google non configuré (optionnel, voir docs/OAUTH_SETUP.md)');
} else {
  console.log('⚠️  OAuth non configuré (optionnel mais recommandé, voir docs/OAUTH_SETUP.md)');
  console.log('   💡 OAuth Google et Twitch sont 100% gratuits pour l\'authentification');
}

// Résumé Instagram
if (instagramConfigured) {
  console.log('✅ Instagram API complètement configuré');
} else if (instagramPartiallyConfigured) {
  console.log('⚠️  Instagram API partiellement configuré (voir TODO_INSTAGRAM.md)');
} else {
  console.log('⚠️  Instagram API non configuré (optionnel, voir TODO_INSTAGRAM.md)');
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

