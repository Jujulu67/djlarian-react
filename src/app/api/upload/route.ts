import fs from 'fs';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { uploadToBlob, isBlobConfigured, getBlobPublicUrl } from '@/lib/blob';
import { logger } from '@/lib/logger';
import { convertToWebP, canConvertToWebP } from '@/lib/utils/convertToWebP';
import { shouldUseBlobStorage } from '@/lib/utils/getStorageConfig';

// Upload endpoint - Support local (public/uploads/) et production (Vercel Blob)

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // Vérifier l'authentification et les autorisations
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const formData = await request.formData();
    const imageId = formData.get('imageId') as string | null;
    const croppedImage = formData.get('croppedImage') as Blob | null;
    const originalImage = formData.get('originalImage') as File | null;

    // Logs de débogage (uniquement en développement)
    logger.debug('API UPLOAD - Début', {
      imageId,
      NODE_ENV: process.env.NODE_ENV,
      blobConfigured: isBlobConfigured,
      croppedImage: croppedImage ? `${croppedImage.size} bytes, type: ${croppedImage.type}` : null,
      originalImage: originalImage
        ? `${originalImage.size} bytes, type: ${originalImage.type}, name: ${originalImage.name}`
        : null,
    });

    if (!imageId) {
      logger.error('API UPLOAD - Image ID manquant');
      return NextResponse.json({ error: 'Image ID manquant' }, { status: 400 });
    }
    if (!croppedImage) {
      logger.error('API UPLOAD - Image recadrée manquante');
      return NextResponse.json({ error: 'Image recadrée manquante' }, { status: 400 });
    }

    const croppedBytes = await croppedImage.arrayBuffer();
    let croppedBuffer = Buffer.from(croppedBytes) as Buffer;

    // Convertir en WebP si possible
    if (canConvertToWebP(croppedImage.type)) {
      try {
        croppedBuffer = await convertToWebP(croppedBuffer);
        logger.debug('API UPLOAD - Image recadrée convertie en WebP');
      } catch (error) {
        logger.warn(
          'API UPLOAD - Erreur conversion WebP pour image recadrée, utilisation originale',
          error
        );
        // Continuer avec l'image originale si la conversion échoue
      }
    }

    // Utiliser la fonction utilitaire qui respecte le switch
    let useBlobStorage = shouldUseBlobStorage();

    // Si on veut utiliser Blob mais qu'il n'est pas configuré, fallback vers local
    if (useBlobStorage && !isBlobConfigured) {
      logger.warn(
        'API UPLOAD - Blob demandé mais non configuré, utilisation du dossier local en fallback'
      );
      useBlobStorage = false;
    }

    // Sauvegarder dans public/uploads/ si on n'utilise pas Blob
    if (!useBlobStorage) {
      try {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

        // Créer le dossier s'il n'existe pas
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Sauvegarder l'image recadrée en WebP
        const croppedPath = path.join(uploadsDir, `${imageId}.webp`);
        fs.writeFileSync(croppedPath, croppedBuffer);
        logger.debug(`API UPLOAD - Image recadrée sauvegardée localement: ${croppedPath}`);

        // Sauvegarder l'image originale si fournie (convertie en WebP)
        if (originalImage && originalImage.type.startsWith('image/')) {
          if (originalImage.size <= 15 * 1024 * 1024) {
            try {
              const originalBytes = await originalImage.arrayBuffer();
              let originalBuffer = Buffer.from(originalBytes) as Buffer;

              // Convertir en WebP si possible
              if (canConvertToWebP(originalImage.type)) {
                try {
                  originalBuffer = await convertToWebP(originalBuffer);
                  logger.debug('API UPLOAD - Image originale convertie en WebP');
                } catch (error) {
                  logger.warn(
                    'API UPLOAD - Erreur conversion WebP pour image originale, utilisation originale',
                    error
                  );
                }
              }

              const originalPath = path.join(uploadsDir, `${imageId}-ori.webp`);
              fs.writeFileSync(originalPath, originalBuffer);
              logger.debug(`API UPLOAD - Image originale sauvegardée localement: ${originalPath}`);
            } catch (error) {
              logger.error('API UPLOAD - Erreur sauvegarde image originale locale', error);
              // Ne pas bloquer si l'originale échoue
            }
          } else {
            logger.warn(
              `API UPLOAD - Fichier original trop volumineux: ${originalImage.size} bytes`
            );
          }
        }

        const localUrl = `/uploads/${imageId}.webp`;
        logger.debug(`API UPLOAD - Upload local terminé pour imageId: ${imageId}`);
        return NextResponse.json({
          success: true,
          imageId: imageId,
          url: localUrl,
        });
      } catch (error) {
        logger.error(`API UPLOAD - Erreur sauvegarde locale pour ${imageId}`, error);
        // Fallback vers Blob si erreur locale et Blob configuré
        if (isBlobConfigured) {
          logger.debug('API UPLOAD - Fallback vers Vercel Blob...');
        } else {
          throw new Error("Impossible d'uploader l'image localement.");
        }
      }
    }

    // Utiliser Vercel Blob si demandé et configuré
    if (useBlobStorage && isBlobConfigured) {
      // Upload vers Vercel Blob
      try {
        const croppedKey = `uploads/${imageId}.webp`;
        const croppedUrl = await uploadToBlob(croppedKey, croppedBuffer, 'image/webp');
        logger.debug(`API UPLOAD - Image recadrée uploadée vers Vercel Blob: ${croppedUrl}`);

        // Upload de l'image originale si fournie (convertie en WebP)
        if (originalImage && originalImage.type.startsWith('image/')) {
          if (originalImage.size <= 15 * 1024 * 1024) {
            try {
              const originalBytes = await originalImage.arrayBuffer();
              let originalBuffer = Buffer.from(originalBytes) as Buffer;

              // Convertir en WebP si possible
              if (canConvertToWebP(originalImage.type)) {
                try {
                  originalBuffer = await convertToWebP(originalBuffer);
                  logger.debug('API UPLOAD - Image originale convertie en WebP');
                } catch (error) {
                  logger.warn(
                    'API UPLOAD - Erreur conversion WebP pour image originale, utilisation originale',
                    error
                  );
                }
              }

              const originalKey = `uploads/${imageId}-ori.webp`;
              await uploadToBlob(originalKey, originalBuffer, 'image/webp');
              logger.debug(
                `API UPLOAD - Image originale uploadée vers Vercel Blob: ${originalKey}`
              );
            } catch (error) {
              logger.error('API UPLOAD - Erreur upload image originale vers Blob', error);
              // Ne pas bloquer si l'originale échoue
            }
          } else {
            logger.warn(
              `API UPLOAD - Fichier original trop volumineux: ${originalImage.size} bytes`
            );
          }
        }

        logger.debug(`API UPLOAD - Upload Vercel Blob terminé pour imageId: ${imageId}`);
        return NextResponse.json({
          success: true,
          imageId: imageId,
          url: croppedUrl,
        });
      } catch (error) {
        logger.error(`API UPLOAD - Erreur upload Blob pour ${imageId}`, error);
        throw new Error("Impossible d'uploader l'image vers Vercel Blob.");
      }
    }

    // Si ni local ni Blob, erreur
    return NextResponse.json({ error: 'Aucun système de stockage configuré' }, { status: 503 });
  } catch (error) {
    logger.error('API UPLOAD - Erreur lors du téléchargement du fichier', error);
    const message =
      error instanceof Error ? error.message : 'Erreur inconnue lors du téléchargement';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
