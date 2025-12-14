import fs from 'fs';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { shouldUseBlobStorage } from '@/lib/utils/getStorageConfig';

// Cache en mémoire pour les résultats de recherche Blob (évite trop d'appels list())
const blobUrlCache: Record<string, { url: string; timestamp: number }> = {};
const BLOB_CACHE_TTL = 86400000; // 24 heures en millisecondes (augmenté pour réduire les appels)

function getCachedBlobUrl(key: string): string | null {
  const cached = blobUrlCache[key];
  if (cached && Date.now() - cached.timestamp < BLOB_CACHE_TTL) {
    return cached.url;
  }
  return null;
}

function setCachedBlobUrl(key: string, url: string): void {
  blobUrlCache[key] = {
    url,
    timestamp: Date.now(),
  };
}

// Route API pour servir les images depuis blob (prod) ou local (dev)
// GET /api/images/[imageId]?original=true

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const { imageId } = await params;
    const { searchParams } = new URL(request.url);
    const isOriginal = searchParams.get('original') === 'true';

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID manquant' }, { status: 400 });
    }

    // Utiliser la fonction utilitaire qui respecte le switch
    const useBlobStorage = await shouldUseBlobStorage();

    const blobConfigured = !!process.env.BLOB_READ_WRITE_TOKEN;
    logger.debug(`[API IMAGES] Configuration:`, {
      imageId,
      useBlobStorage,
      blobConfigured,
      nodeEnv: process.env.NODE_ENV,
      hasBlobToken: blobConfigured,
    });

    // Extensions à essayer
    const extensions = ['webp', 'jpg', 'jpeg', 'png']; // WebP en priorité (nouveau format)
    const suffix = isOriginal ? '-ori' : '';

    // Si on utilise Blob (production)
    // useBlobStorage vérifie déjà si Blob est configuré, mais on double-vérifie pour être sûr
    if (useBlobStorage && blobConfigured) {
      try {
        const cacheKey = `${imageId}${suffix}`;

        // Vérifier le cache en mémoire d'abord
        const cachedUrl = getCachedBlobUrl(cacheKey);
        if (cachedUrl) {
          logger.debug(`[API IMAGES] URL trouvée dans le cache: ${cachedUrl}`);
          return NextResponse.redirect(cachedUrl, {
            status: 302,
            headers: {
              'Cache-Control': 'public, max-age=31536000, immutable',
              'CDN-Cache-Control': 'public, max-age=31536000, immutable',
            },
          });
        }

        // OPTIMISATION: Chercher d'abord dans la base de données pour éviter les appels list() coûteux
        try {
          const imageRecord = await prisma.image.findUnique({
            where: { imageId },
            select: {
              blobUrl: true,
              blobUrlOriginal: true,
            },
          });

          if (imageRecord) {
            const blobUrl = isOriginal ? imageRecord.blobUrlOriginal : imageRecord.blobUrl;
            if (blobUrl) {
              logger.debug(`[API IMAGES] URL trouvée dans la DB: ${blobUrl}`);
              // Mettre en cache l'URL trouvée
              setCachedBlobUrl(cacheKey, blobUrl);
              return NextResponse.redirect(blobUrl, {
                status: 302,
                headers: {
                  'Cache-Control': 'public, max-age=31536000, immutable',
                  'CDN-Cache-Control': 'public, max-age=31536000, immutable',
                },
              });
            }
          }
        } catch (dbError) {
          // Ne pas faire échouer si la DB échoue, logger l'erreur et retourner 404
          logger.error(`[API IMAGES] Erreur lors de la recherche DB pour ${imageId}:`, dbError);
        }

        // OPTIMISATION: Suppression du fallback list() pour éviter les Advanced Operations
        // Si l'image n'est pas dans la DB, elle doit être migrée ou n'existe pas
        logger.warn(
          `[API IMAGES] Image ${imageId}${suffix} non trouvée dans la DB. ` +
            `Migration requise ou image inexistante. (0 list() appelé)`
        );
        return NextResponse.json({ error: 'Image non trouvée' }, { status: 404 });
      } catch (error) {
        logger.error(`[API IMAGES] Erreur récupération blob pour ${imageId}:`, error);
        return NextResponse.json(
          { error: "Erreur lors de la récupération de l'image" },
          { status: 500 }
        );
      }
    }

    // Sinon, servir depuis le système de fichiers local
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

    // Essayer chaque extension
    for (const ext of extensions) {
      const filename = `${imageId}${suffix}.${ext}`;
      const filePath = path.join(uploadsDir, filename);

      if (fs.existsSync(filePath)) {
        try {
          const fileBuffer = fs.readFileSync(filePath);
          const contentType = getContentType(ext);

          return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          });
        } catch (error) {
          logger.error(`[API IMAGES] Erreur lecture fichier ${filename}:`, error);
          continue;
        }
      }
    }

    logger.warn(`[API IMAGES] Image non trouvée localement: ${imageId}${suffix}`);
    return NextResponse.json({ error: 'Image non trouvée' }, { status: 404 });
  } catch (error) {
    logger.error('[API IMAGES] Erreur générale:', error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'image" },
      { status: 500 }
    );
  }
}

/**
 * Détermine le Content-Type selon l'extension
 */
function getContentType(ext: string): string {
  const contentTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
  };

  return contentTypes[ext.toLowerCase()] || 'image/webp'; // WebP par défaut maintenant
}
