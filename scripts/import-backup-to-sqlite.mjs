#!/usr/bin/env node

/**
 * Script pour importer les données du backup PostgreSQL dans SQLite
 * Parse le fichier backup.sql et insère les données via Prisma
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Utiliser SQLite local
process.env.DATABASE_URL = 'file:./prisma/dev.db';

const prisma = new PrismaClient();

// Parser les données COPY du backup PostgreSQL
function parseCopyData(sqlContent) {
  const tables = {};
  let currentTable = null;
  let currentData = [];
  let inCopyBlock = false;

  const lines = sqlContent.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Détecter le début d'un bloc COPY
    if (line.startsWith('COPY public.')) {
      const match = line.match(/COPY public\.\"?(\w+)\"?\s*\(/);
      if (match) {
        currentTable = match[1];
        inCopyBlock = true;
        currentData = [];
        tables[currentTable] = [];
        continue;
      }
    }

    // Détecter la fin d'un bloc COPY
    if (line === '\\.' || line === '\\\\.') {
      inCopyBlock = false;
      currentTable = null;
      continue;
    }

    // Collecter les données dans le bloc COPY
    if (inCopyBlock && currentTable && line && !line.startsWith('--')) {
      // Parser la ligne de données (format tab-separated)
      const values = line.split('\t');
      if (values.length > 0 && values[0] !== '') {
        tables[currentTable].push(values);
      }
    }
  }

  return tables;
}

// Convertir les valeurs pour SQLite
function convertValue(value, columnIndex, tableName) {
  if (value === '\\N' || value === null || value === '') {
    return null;
  }

  // Dates
  if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
    return new Date(value);
  }

  // Booleans (PostgreSQL utilise 't'/'f')
  if (value === 't' || value === 'true' || value === true) return true;
  if (value === 'f' || value === 'false' || value === false) return false;

  // Nombres
  if (value.match(/^-?\d+$/)) {
    return parseInt(value, 10);
  }
  if (value.match(/^-?\d+\.\d+$/)) {
    return parseFloat(value);
  }

  // JSON (pour excludedDates, etc.)
  if (value.startsWith('{') || value.startsWith('[')) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
}

// Mapping des colonnes pour chaque table
const columnMappings = {
  Account: [
    'id',
    'userId',
    'type',
    'provider',
    'providerAccountId',
    'refresh_token',
    'access_token',
    'expires_at',
    'token_type',
    'scope',
    'id_token',
    'session_state',
  ],
  Event: [
    'id',
    'title',
    'description',
    'location',
    'address',
    'startDate',
    'endDate',
    'image',
    'status',
    'isPublished',
    'createdAt',
    'updatedAt',
    'featured',
    'originalImageUrl',
    'isMasterEvent',
    'masterId',
    'userId',
  ],
  Genre: ['id', 'name', 'createdAt', 'updatedAt'],
  GenresOnTracks: ['trackId', 'genreId', 'assignedAt'],
  MusicCollection: [
    'id',
    'title',
    'description',
    'coverUrl',
    'releaseDate',
    'type',
    'createdAt',
    'updatedAt',
  ],
  RecurrenceConfig: [
    'id',
    'frequency',
    'day',
    'endDate',
    'createdAt',
    'updatedAt',
    'eventId',
    'excludedDates',
  ],
  Session: ['id', 'sessionToken', 'userId', 'expires'],
  TicketInfo: [
    'id',
    'eventId',
    'price',
    'currency',
    'buyUrl',
    'availableFrom',
    'availableTo',
    'quantity',
  ],
  Track: [
    'id',
    'title',
    'artist',
    'coverUrl',
    'releaseDate',
    'bpm',
    'description',
    'type',
    'featured',
    'isPublished',
    'createdAt',
    'updatedAt',
    'userId',
    'collectionId',
    'publishAt',
  ],
  TrackPlatform: ['id', 'platform', 'url', 'embedId', 'trackId', 'createdAt', 'updatedAt'],
  User: ['id', 'name', 'email', 'emailVerified', 'image', 'hashedPassword', 'role'],
  VerificationToken: ['identifier', 'token', 'expires'],
  SiteConfig: ['id', 'section', 'key', 'value', 'createdAt', 'updatedAt'],
  ConfigHistory: [
    'id',
    'configId',
    'previousValue',
    'newValue',
    'createdAt',
    'createdBy',
    'description',
    'reverted',
  ],
  ConfigSnapshot: ['id', 'name', 'description', 'data', 'createdAt', 'createdBy'],
};

// Adapter les noms de colonnes pour Prisma (camelCase)
function toCamelCase(str) {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

// Nettoyer les imageId pour qu'ils ne contiennent que le nom de fichier
// sans le chemin /uploads/ ni l'extension
function cleanImageId(imageId) {
  if (!imageId) return null;

  // Si c'est déjà une URL complète (http/https), la garder telle quelle
  if (imageId.startsWith('http://') || imageId.startsWith('https://')) {
    return imageId;
  }

  // Enlever le préfixe /uploads/ s'il existe
  let cleaned = imageId.replace(/^\/uploads\//, '');

  // Enlever l'extension .jpg, .jpeg, .png, etc.
  cleaned = cleaned.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');

  return cleaned;
}

async function importTable(tableName, rows) {
  if (!rows || rows.length === 0) {
    console.log(`  ⏭️  ${tableName}: aucune donnée`);
    return;
  }

  const columns = columnMappings[tableName];
  if (!columns) {
    console.log(`  ⚠️  ${tableName}: mapping de colonnes non trouvé, ignoré`);
    return;
  }

  console.log(`  📥 ${tableName}: ${rows.length} lignes à importer...`);

  try {
    // Créer les objets de données
    const dataToInsert = rows.map((row) => {
      const obj = {};
      columns.forEach((col, idx) => {
        // Gérer les colonnes manquantes dans le backup
        if (idx < row.length) {
          const value = convertValue(row[idx], idx, tableName);
          const camelKey = toCamelCase(col);

          // Mapping spécial pour Event (image -> imageId)
          if (tableName === 'Event' && col === 'image') {
            obj.imageId = cleanImageId(value);
          } else if (tableName === 'Track' && col === 'coverUrl') {
            // Track utilise imageId dans le schema mais coverUrl dans le backup
            // Si c'est une URL externe (YouTube, etc.), la garder telle quelle
            // Sinon, nettoyer le chemin
            obj.imageId = cleanImageId(value);
          } else if (col === 'originalImageUrl') {
            // Ignorer originalImageUrl qui n'existe plus dans le schema
            // Ne rien faire
          } else {
            // Ne pas ajouter les valeurs null pour les champs optionnels avec defaults
            if (
              value !== null ||
              !['isVip', 'createdAt', 'updatedAt', 'publishAt'].includes(camelKey)
            ) {
              obj[camelKey] = value;
            }
          }
        }
      });
      return obj;
    });

    // Insérer les données une par une pour gérer les doublons
    let inserted = 0;
    let skipped = 0;

    for (const data of dataToInsert) {
      try {
        await prisma[tableName.charAt(0).toLowerCase() + tableName.slice(1)].create({
          data,
        });
        inserted++;
      } catch (error) {
        // Ignorer les erreurs de doublons (unique constraint)
        if (error.code === 'P2002' || error.message.includes('UNIQUE constraint')) {
          skipped++;
        } else {
          console.error(`  ⚠️  Erreur lors de l'insertion dans ${tableName}:`, error.message);
        }
      }
    }

    if (skipped > 0) {
      console.log(`  ⚠️  ${tableName}: ${skipped} lignes ignorées (doublons)`);
    }

    console.log(
      `  ✅ ${tableName}: ${inserted} lignes importées${skipped > 0 ? `, ${skipped} ignorées` : ''}`
    );
  } catch (error) {
    if (skipOnError.includes(tableName)) {
      console.log(`  ⚠️  ${tableName}: ignoré (contraintes de clés étrangères)`);
    } else {
      console.error(`  ❌ ${tableName}: erreur`, error.message);
    }
    // Continuer avec les autres tables même en cas d'erreur
  }
}

async function main() {
  const backupPath = path.join(projectRoot, 'backup.sql');

  if (!fs.existsSync(backupPath)) {
    console.error('❌ Fichier backup.sql introuvable');
    process.exit(1);
  }

  console.log('📖 Lecture du backup.sql...');
  const sqlContent = fs.readFileSync(backupPath, 'utf-8');

  console.log('🔍 Parsing des données...');
  const tables = parseCopyData(sqlContent);

  console.log(`\n📊 Tables trouvées: ${Object.keys(tables).length}`);
  Object.keys(tables).forEach((table) => {
    console.log(`  - ${table}: ${tables[table].length} lignes`);
  });

  console.log('\n🚀 Import des données...\n');

  // Ordre d'import important (tables sans dépendances en premier)
  const importOrder = [
    'User',
    'Genre',
    'MusicCollection',
    'Event',
    'Track',
    'Account',
    'Session',
    'VerificationToken',
    'GenresOnTracks',
    'TrackPlatform',
    'RecurrenceConfig',
    'TicketInfo',
    'SiteConfig',
    'ConfigHistory',
    'ConfigSnapshot',
  ];

  // Tables à ignorer si elles échouent (contraintes de clés étrangères)
  const skipOnError = ['RecurrenceConfig', 'TicketInfo'];

  for (const tableName of importOrder) {
    if (tables[tableName]) {
      await importTable(tableName, tables[tableName]);
    }
  }

  console.log('\n✅ Import terminé !');
}

main()
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
