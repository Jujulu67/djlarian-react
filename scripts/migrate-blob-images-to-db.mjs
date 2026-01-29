#!/usr/bin/env node
/**
 * Script de migration : Importe les URLs blob existantes dans la table Image
 *
 * Ce script :
 * 1. Liste toutes les images blob existantes (une dernière fois avec list())
 * 2. Les stocke dans la table Image pour éviter les futurs appels list()
 * 3. Est idempotent (peut être exécuté plusieurs fois sans problème)
 * 4. Ne cause pas de régression (continue même en cas d'erreur)
 *
 * Usage:
 *   node scripts/migrate-blob-images-to-db.mjs
 */

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { list } from '@vercel/blob';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Charger les variables d'environnement
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

dotenv.config({ path: join(rootDir, '.env.local') });
dotenv.config({ path: join(rootDir, '.env') });

// Fonction pour obtenir la DATABASE_URL selon le switch (même logique que prisma.ts)
function getDatabaseUrl() {
  // En production, toujours utiliser la DATABASE_URL de l'environnement
  if (process.env.NODE_ENV === 'production') {
    return process.env.DATABASE_URL || '';
  }

  // En développement, vérifier le fichier de switch
  try {
    const switchPath = join(rootDir, '.db-switch.json');
    if (fs.existsSync(switchPath)) {
      const switchConfig = JSON.parse(fs.readFileSync(switchPath, 'utf-8'));
      if (switchConfig.useProduction && process.env.DATABASE_URL_PRODUCTION) {
        return process.env.DATABASE_URL_PRODUCTION;
      }
    }
  } catch (error) {
    // En cas d'erreur, utiliser la DATABASE_URL par défaut
  }

  // Par défaut, utiliser DATABASE_URL (qui pointe vers SQLite local en dev)
  return process.env.DATABASE_URL || 'file:./prisma/dev.db';
}

// Créer l'adaptateur Prisma approprié
async function createAdapter(databaseUrl) {
  const isSQLiteUrl = databaseUrl.startsWith('file:');
  const isPostgreSQLUrl =
    databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://');
  const isNeonUrl =
    databaseUrl.includes('neon.tech') ||
    databaseUrl.includes('neon.tech') ||
    databaseUrl.includes('neon');

  if (isSQLiteUrl) {
    // SQLite - utiliser better-sqlite3 adapter
    const { default: Database } = await import('better-sqlite3');
    return new PrismaBetterSqlite3({
      url: databaseUrl || 'file:./dev.db',
    });
  } else if (isNeonUrl) {
    // Neon - utiliser Neon adapter
    return new PrismaNeon({
      connectionString: databaseUrl,
    });
  } else if (isPostgreSQLUrl) {
    // PostgreSQL standard - utiliser pg adapter
    return new PrismaPg({
      connectionString: databaseUrl,
    });
  } else {
    // Par défaut, essayer SQLite
    const { default: Database } = await import('better-sqlite3');
    return new PrismaBetterSqlite3({
      url: databaseUrl || 'file:./dev.db',
    });
  }
}

// Initialiser Prisma de manière asynchrone
let prisma;

async function initPrisma() {
  const databaseUrl = getDatabaseUrl();
  const adapter = await createAdapter(databaseUrl);

  prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
  return prisma;
}

// Vérifier si Vercel Blob est configuré
const isBlobConfigured = !!process.env.BLOB_READ_WRITE_TOKEN;

if (!isBlobConfigured) {
  console.error("❌ BLOB_READ_WRITE_TOKEN n'est pas configuré");
  console.error("   Ce script nécessite l'accès à Vercel Blob");
  process.exit(1);
}

/**
 * Extrait l'imageId depuis un pathname blob
 * Exemples:
 *   uploads/abc123.webp -> abc123
 *   uploads/abc123-ori.webp -> abc123 (original)
 */
function extractImageId(pathname) {
  const filename = pathname.split('/').pop() || '';
  // Enlever l'extension et le suffixe -ori
  const withoutExt = filename.replace(/\.(webp|jpg|jpeg|png|gif)$/i, '');
  const imageId = withoutExt.replace(/-ori$/, '');
  return imageId;
}

/**
 * Détermine si un pathname est une image originale (-ori)
 */
function isOriginalImage(pathname) {
  return pathname.includes('-ori.');
}

/**
 * Migre les images blob vers la table Image
 */
async function migrateBlobImages() {
  // Initialiser Prisma
  await initPrisma();

  console.log('🚀 Début de la migration des images blob vers la table Image...\n');

  try {
    // 1. Lister toutes les images blob (dernière fois qu'on utilise list())
    console.log('📋 Récupération de toutes les images blob...');
    const { blobs } = await list({
      prefix: 'uploads/',
    });

    console.log(`   ✓ ${blobs.length} fichiers blob trouvés\n`);

    // 2. Filtrer pour ne garder que les images
    const imageExtensions = ['.webp', '.jpg', '.jpeg', '.png', '.gif'];
    const imageBlobs = blobs.filter((blob) => {
      const ext = blob.pathname.toLowerCase().substring(blob.pathname.lastIndexOf('.'));
      return imageExtensions.includes(ext);
    });

    console.log(`📸 ${imageBlobs.length} images trouvées\n`);

    // 3. Grouper par imageId (une image peut avoir .webp et -ori.webp)
    const imagesMap = new Map();

    for (const blob of imageBlobs) {
      const imageId = extractImageId(blob.pathname);
      const isOriginal = isOriginalImage(blob.pathname);

      if (!imagesMap.has(imageId)) {
        imagesMap.set(imageId, {
          imageId,
          blobUrl: null,
          blobUrlOriginal: null,
          size: null,
          contentType: blob.contentType || 'image/webp',
        });
      }

      const image = imagesMap.get(imageId);
      if (isOriginal) {
        image.blobUrlOriginal = blob.url;
      } else {
        image.blobUrl = blob.url;
        image.size = blob.size || null;
      }
    }

    console.log(`🔄 ${imagesMap.size} images uniques à migrer\n`);

    // 4. Stocker dans la base de données
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    console.log('💾 Stockage dans la base de données...\n');

    for (const [imageId, imageData] of imagesMap.entries()) {
      try {
        // Utiliser upsert pour éviter les doublons (idempotent)
        await prisma.image.upsert({
          where: { imageId },
          create: {
            imageId: imageData.imageId,
            blobUrl: imageData.blobUrl,
            blobUrlOriginal: imageData.blobUrlOriginal,
            size: imageData.size,
            contentType: imageData.contentType,
          },
          update: {
            // Mettre à jour seulement si les URLs sont différentes
            blobUrl: imageData.blobUrl || undefined,
            blobUrlOriginal: imageData.blobUrlOriginal || undefined,
            size: imageData.size || undefined,
            contentType: imageData.contentType,
          },
        });

        successCount++;
        if (successCount % 100 === 0) {
          console.log(`   ✓ ${successCount} images migrées...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`   ✗ Erreur pour ${imageId}:`, error.message);
        // Continuer même en cas d'erreur (pas de régression)
      }
    }

    console.log('\n✅ Migration terminée !\n');
    console.log(`   ✓ ${successCount} images migrées avec succès`);
    if (errorCount > 0) {
      console.log(`   ⚠ ${errorCount} erreurs (non bloquantes)`);
    }
    console.log(`   📊 Total: ${imagesMap.size} images traitées\n`);

    // 5. Statistiques
    const stats = await prisma.image.aggregate({
      _count: {
        id: true,
      },
      _sum: {
        size: true,
      },
    });

    console.log('📊 Statistiques de la table Image:');
    console.log(`   - Nombre d'images: ${stats._count.id}`);
    console.log(`   - Taille totale: ${(stats._sum.size || 0) / 1024 / 1024} MB\n`);

    console.log('🎉 Migration réussie ! Les appels list() ne seront plus nécessaires.\n');
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter la migration
migrateBlobImages().catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
