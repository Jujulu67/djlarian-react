import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';

import { isBlobConfigured } from '@/lib/blob';
import { logger } from '@/lib/logger';
import { shouldUseBlobStorage } from '@/lib/utils/getStorageConfig';

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

    // Extensions à essayer
    const extensions = ['webp', 'jpg', 'jpeg', 'png']; // WebP en priorité (nouveau format)
    const suffix = isOriginal ? '-ori' : '';

    // Si on utilise Blob (production)
    if (useBlobStorage && isBlobConfigured) {
      try {
        // Vercel Blob ajoute un hash au nom de fichier, donc on cherche avec le préfixe sans extension
        // Exemple: uploads/b3c5d146-6c3a-4aac-b6d2-b68a2a679892.jpg devient
        // uploads/b3c5d146-6c3a-4aac-b6d2-b68a2a679892-wceW79eYMblstqONMYlH1rdkdBIwHv.jpg
        const basePrefix = `uploads/${imageId}${suffix}`;

        logger.debug(`[API IMAGES] Recherche blob avec préfixe: ${basePrefix}`, {
          imageId,
          suffix,
          useBlobStorage,
          isBlobConfigured,
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
                `[API IMAGES] Image trouvée: ${matchingBlob.pathname} -> ${matchingBlob.url}`
              );
              return NextResponse.redirect(matchingBlob.url, 302);
            }

            // Si aucun ne correspond aux extensions attendues, prendre le premier qui contient l'imageId
            const fallbackBlob = blobs.find((blob) =>
              blob.pathname.toLowerCase().includes(imageId.toLowerCase())
            );

            if (fallbackBlob) {
              logger.warn(
                `[API IMAGES] Image trouvée mais extension non reconnue: ${fallbackBlob.pathname}, utilisation quand même`
              );
              return NextResponse.redirect(fallbackBlob.url, 302);
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
