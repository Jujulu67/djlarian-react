import fs from 'fs';
import path from 'path';

import { list } from '@vercel/blob';
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
    const useBlobStorage = shouldUseBlobStorage();

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
          // Ne pas faire échouer si la DB échoue, continuer avec le fallback list()
          logger.warn(`[API IMAGES] Erreur lors de la recherche DB pour ${imageId}:`, dbError);
        }

        // FALLBACK: Si pas trouvé dans la DB, utiliser list() (opération coûteuse mais nécessaire pour les anciennes images)
        const basePrefix = `uploads/${imageId}${suffix}`;
        logger.debug(`[API IMAGES] Recherche blob avec préfixe (fallback): ${basePrefix}`, {
          imageId,
          suffix,
          useBlobStorage,
          blobConfigured,
        });

        try {
          // Chercher tous les fichiers qui commencent par ce préfixe
          const { blobs } = await list({
            prefix: basePrefix,
          });

          logger.debug(`[API IMAGES] Blobs trouvés: ${blobs.length}`, {
            blobs: blobs.map((b) => ({ pathname: b.pathname, url: b.url })),
          });

          if (blobs.length > 0) {
            // Filtrer par extension pour trouver le bon fichier
            // Pour l'image normale (sans -ori), chercher jpg/jpeg
            // Pour l'image originale (-ori), chercher png ou l'extension originale
            const targetExtensions = isOriginal
              ? ['png', 'jpg', 'jpeg', 'webp'] // Les originales sont souvent en PNG
              : ['jpg', 'jpeg', 'png', 'webp']; // Les recadrées sont en JPG

            const matchingBlob = blobs.find((blob) => {
              const pathname = blob.pathname.toLowerCase();
              // Vérifier si le pathname contient l'imageId et se termine par une extension valide
              const hasImageId = pathname.includes(imageId.toLowerCase());
              const hasValidExt = targetExtensions.some((ext) => pathname.endsWith(`.${ext}`));
              return hasImageId && hasValidExt;
            });

            if (matchingBlob) {
              logger.debug(
                `[API IMAGES] Image trouvée via list(): ${matchingBlob.pathname} -> ${matchingBlob.url}`
              );
              // Mettre en cache l'URL trouvée
              setCachedBlobUrl(cacheKey, matchingBlob.url);

              // OPTIMISATION: Stocker l'URL dans la DB pour les prochaines fois (évite les futurs list())
              try {
                await prisma.image.upsert({
                  where: { imageId },
                  create: {
                    imageId,
                    blobUrl: isOriginal ? undefined : matchingBlob.url,
                    blobUrlOriginal: isOriginal ? matchingBlob.url : undefined,
                  },
                  update: {
                    blobUrl: isOriginal ? undefined : matchingBlob.url,
                    blobUrlOriginal: isOriginal ? matchingBlob.url : undefined,
                  },
                });
              } catch (dbError) {
                // Ne pas faire échouer si la DB échoue
                logger.warn(
                  "[API IMAGES] Erreur lors du stockage de l'URL blob dans la DB:",
                  dbError
                );
              }

              // Redirection avec headers de cache pour éviter trop de requêtes vers Blob
              return NextResponse.redirect(matchingBlob.url, {
                status: 302,
                headers: {
                  'Cache-Control': 'public, max-age=31536000, immutable',
                  'CDN-Cache-Control': 'public, max-age=31536000, immutable',
                },
              });
            }

            // Si aucun ne correspond aux extensions attendues, prendre le premier qui contient l'imageId
            const fallbackBlob = blobs.find((blob) =>
              blob.pathname.toLowerCase().includes(imageId.toLowerCase())
            );

            if (fallbackBlob) {
              logger.warn(
                `[API IMAGES] Image trouvée mais extension non reconnue: ${fallbackBlob.pathname}, utilisation quand même`
              );
              // Mettre en cache l'URL trouvée
              setCachedBlobUrl(cacheKey, fallbackBlob.url);

              // OPTIMISATION: Stocker l'URL dans la DB pour les prochaines fois
              try {
                await prisma.image.upsert({
                  where: { imageId },
                  create: {
                    imageId,
                    blobUrl: isOriginal ? undefined : fallbackBlob.url,
                    blobUrlOriginal: isOriginal ? fallbackBlob.url : undefined,
                  },
                  update: {
                    blobUrl: isOriginal ? undefined : fallbackBlob.url,
                    blobUrlOriginal: isOriginal ? fallbackBlob.url : undefined,
                  },
                });
              } catch (dbError) {
                logger.warn(
                  "[API IMAGES] Erreur lors du stockage de l'URL blob dans la DB:",
                  dbError
                );
              }

              // Redirection avec headers de cache pour éviter trop de requêtes vers Blob
              return NextResponse.redirect(fallbackBlob.url, {
                status: 302,
                headers: {
                  'Cache-Control': 'public, max-age=31536000, immutable',
                  'CDN-Cache-Control': 'public, max-age=31536000, immutable',
                },
              });
            }
          }
        } catch (listError) {
          logger.error(`[API IMAGES] Erreur lors de la recherche blob pour ${imageId}:`, listError);
        }

        logger.warn(`[API IMAGES] Image non trouvée dans blob: ${imageId}${suffix}`);
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
