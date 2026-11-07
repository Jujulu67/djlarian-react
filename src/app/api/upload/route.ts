import fs from 'node:fs';
import path from 'node:path';

import { NextRequest, NextResponse } from 'next/server';

import { uploadToBlobWithCheck } from '@/lib/blob';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { convertToWebP, canConvertToWebP } from '@/lib/utils/convertToWebP';
import { shouldUseBlobStorage } from '@/lib/utils/getStorageConfig';
import { requireAdmin } from '@/lib/api/requireAuth';

// Upload endpoint - Support local (public/uploads/) et production (Vercel Blob)

const MAX_ORIGINAL_SIZE = 15 * 1024 * 1024;

/** Convertit en WebP si possible ; à défaut, garde l'image telle quelle. */
async function toWebP(image: Blob, label: string): Promise<Buffer> {
  const buffer = Buffer.from(await image.arrayBuffer()) as Buffer;
  if (!canConvertToWebP(image.type)) return buffer;
  try {
    return await convertToWebP(buffer);
  } catch (error) {
    logger.warn(
      `API UPLOAD - Conversion WebP impossible (${label}), image gardée telle quelle`,
      error
    );
    return buffer;
  }
}

/** Image originale à conserver : une image de 15 Mo au plus, sinon rien. */
function isStorableOriginal(original: File | null): original is File {
  if (!original?.type.startsWith('image/')) return false;
  if (original.size <= MAX_ORIGINAL_SIZE) return true;
  logger.warn(`API UPLOAD - Fichier original trop volumineux: ${original.size} octets`);
  return false;
}

/** Enregistre dans public/uploads/ et renvoie l'URL de l'image recadrée. */
async function saveLocally(imageId: string, cropped: Buffer, original: File | null) {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  fs.writeFileSync(path.join(uploadsDir, `${imageId}.webp`), cropped);

  if (isStorableOriginal(original)) {
    try {
      const originalBuffer = await toWebP(original, 'originale');
      fs.writeFileSync(path.join(uploadsDir, `${imageId}-ori.webp`), originalBuffer);
    } catch (error) {
      // L'échec de l'originale ne bloque pas l'upload
      logger.error('API UPLOAD - Erreur sauvegarde image originale locale', error);
    }
  }
  return `/uploads/${imageId}.webp`;
}

async function uploadOriginalToBlob(imageId: string, original: File | null) {
  if (!isStorableOriginal(original)) return null;
  try {
    return await uploadToBlobWithCheck(
      `uploads/${imageId}-ori.webp`,
      await toWebP(original, 'originale'),
      'image/webp',
      imageId,
      true
    );
  } catch (error) {
    // L'échec de l'originale ne bloque pas l'upload
    logger.error('API UPLOAD - Erreur upload image originale vers Blob', error);
    return null;
  }
}

/** Envoie sur Vercel Blob, mémorise les URLs et les hashs en base, renvoie l'URL recadrée. */
async function saveToBlob(imageId: string, cropped: Buffer, original: File | null) {
  try {
    const { url, hash } = await uploadToBlobWithCheck(
      `uploads/${imageId}.webp`,
      cropped,
      'image/webp',
      imageId,
      false
    );
    const uploadedOriginal = await uploadOriginalToBlob(imageId, original);

    const record = {
      blobUrl: url,
      blobUrlOriginal: uploadedOriginal?.url || undefined,
      size: cropped.length,
      contentType: 'image/webp',
      hash,
      hashOriginal: uploadedOriginal?.url ? uploadedOriginal.hash : undefined,
    };
    try {
      await prisma.image.upsert({
        where: { imageId },
        create: { imageId, ...record },
        update: record,
      });
    } catch (dbError) {
      // L'image est bien en ligne : l'échec de la base ne fait pas échouer l'upload
      logger.warn('[API UPLOAD] Erreur lors du stockage des URLs blob dans la DB', dbError);
    }
    return url;
  } catch (error) {
    logger.error(`API UPLOAD - Erreur upload Blob pour ${imageId}`, error);
    throw new Error("Impossible d'uploader l'image vers Vercel Blob.");
  }
}

async function respondUploaded(
  imageId: string,
  url: string,
  storage: 'local' | 'blob',
  userId: string
) {
  const { sendWebhook } = await import('@/lib/api/webhooks');
  await sendWebhook('upload.completed', { imageId, url, storage }, { userId });
  return NextResponse.json({ success: true, imageId, url });
}

export async function POST(request: NextRequest) {
  // Rate limiting (20 uploads/min)
  const { rateLimit } = await import('@/lib/api/rateLimiter');
  const rateLimitResponse = await rateLimit(request, 20);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const { session, error: authError } = await requireAdmin({ nonAdminStatus: 401 });
    if (authError) return authError;

    const formData = await request.formData();
    const imageId = formData.get('imageId') as string | null;
    const croppedImage = formData.get('croppedImage') as Blob | null;
    const originalImage = formData.get('originalImage') as File | null;

    if (!imageId) {
      logger.error('API UPLOAD - Image ID manquant');
      return NextResponse.json({ error: 'Image ID manquant' }, { status: 400 });
    }
    if (!croppedImage) {
      logger.error('API UPLOAD - Image recadrée manquante');
      return NextResponse.json({ error: 'Image recadrée manquante' }, { status: 400 });
    }

    const croppedBuffer = await toWebP(croppedImage, 'recadrée');
    const userId = session.user.id;

    // Le switch d'administration décide ; sans jeton Blob, on reste en local
    const blobConfigured = !!process.env.BLOB_READ_WRITE_TOKEN;
    const useBlobStorage = blobConfigured && (await shouldUseBlobStorage());

    if (!useBlobStorage) {
      try {
        const url = await saveLocally(imageId, croppedBuffer, originalImage);
        return await respondUploaded(imageId, url, 'local', userId);
      } catch (error) {
        logger.error(`API UPLOAD - Erreur sauvegarde locale pour ${imageId}`, error);
        if (!blobConfigured) throw new Error("Impossible d'uploader l'image localement.");
        logger.debug('API UPLOAD - Fallback vers Vercel Blob...');
      }
    }

    const url = await saveToBlob(imageId, croppedBuffer, originalImage);
    return await respondUploaded(imageId, url, 'blob', userId);
  } catch (error) {
    logger.error('API UPLOAD - Erreur lors du téléchargement du fichier', error);
    const message =
      error instanceof Error ? error.message : 'Erreur inconnue lors du téléchargement';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
