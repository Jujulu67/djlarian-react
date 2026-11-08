import fs from 'node:fs';
import path from 'node:path';

import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/api/requireAuth';
import { uploadToBlobWithCheck } from '@/lib/blob';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { convertToWebP, canConvertToWebP } from '@/lib/utils/convertToWebP';
import { shouldUseBlobStorage } from '@/lib/utils/getStorageConfig';

// Upload de photo de profil - Accessible aux utilisateurs connectés
/** Types d'image acceptés pour un avatar, avec l'extension enregistrée. */
const AVATAR_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** Convertit l'image en WebP si possible ; sinon (ou en cas d'échec) garde l'original */
async function prepareAvatarImage(file: File, bytes: Buffer) {
  if (canConvertToWebP(file.type)) {
    try {
      const buffer = await convertToWebP(bytes);
      logger.debug('Avatar converti en WebP');
      return { buffer, contentType: 'image/webp', isWebP: true };
    } catch (error) {
      logger.warn('Erreur conversion WebP, utilisation originale', error);
    }
  } else {
    // Type non supporté pour conversion WebP (ex: SVG, HEIC, etc.)
    logger.warn(`Type d'image non supporté pour conversion WebP: ${file.type}`);
  }
  return { buffer: bytes, contentType: file.type, isWebP: false };
}

/** Upload vers Vercel Blob puis enregistrement de l'URL et du hash en base */
async function saveAvatarToBlob(
  key: string,
  imageId: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  // OPTIMISATION: Vérifier si l'avatar existe déjà avant d'uploader (évite put() redondant)
  const { url, hash } = await uploadToBlobWithCheck(key, buffer, contentType, imageId, false);
  logger.debug(`Avatar: ${url}`);

  // Stocker l'URL et le hash dans la DB
  await prisma.image.upsert({
    where: { imageId },
    create: {
      imageId,
      blobUrl: url,
      size: buffer.length,
      contentType,
      hash,
    },
    update: {
      blobUrl: url,
      size: buffer.length,
      contentType,
      hash,
    },
  });
  return url;
}

/** Supprime l'ancienne photo locale si elle existe (ne bloque pas l'upload en cas d'échec) */
function deleteOldLocalAvatar(oldImage: string | null | undefined) {
  if (!oldImage?.startsWith('/uploads/avatars/')) return;

  const oldImagePath = path.join(process.cwd(), 'public', oldImage);
  if (!fs.existsSync(oldImagePath)) return;
  try {
    fs.unlinkSync(oldImagePath);
    logger.debug(`Ancienne photo supprimée: ${oldImagePath}`);
  } catch (error) {
    logger.warn('Erreur suppression ancienne photo', error);
  }
}

/** Sauvegarde locale dans public/uploads/avatars/ */
function saveAvatarLocally(
  oldImage: string | null | undefined,
  imageId: string,
  extension: string,
  buffer: Buffer,
  contentType: string
): string {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');

  // Créer le dossier s'il n'existe pas
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  deleteOldLocalAvatar(oldImage);

  // Sauvegarder la nouvelle image avec la bonne extension
  const imagePath = path.join(uploadsDir, `${imageId}.${extension}`);
  fs.writeFileSync(imagePath, buffer);
  logger.debug(`Avatar sauvegardé localement: ${imagePath} (type: ${contentType})`);
  return `/uploads/avatars/${imageId}.${extension}`;
}

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const { session, error } = await requireAuth({
      requireUserId: true,
      onAnonymous: () => NextResponse.json({ error: 'Non autorisé' }, { status: 401 }),
    });
    if (error) return error;

    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: 'Aucune image fournie' }, { status: 400 });
    }

    // Vérifier le type de fichier
    // Liste fermée : pas de SVG/HTML qui pourraient exécuter du script une fois servis
    if (!Object.hasOwn(AVATAR_EXTENSIONS, imageFile.type)) {
      return NextResponse.json(
        { error: 'Format accepté : JPEG, PNG, WebP ou GIF' },
        { status: 400 }
      );
    }

    // Vérifier la taille (max 5MB)
    if (imageFile.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "L'image est trop volumineuse (max 5MB)" },
        { status: 400 }
      );
    }

    // Générer un ID unique pour l'image
    const imageId = `avatar-${session.user.id}-${Date.now()}`;

    // Convertir l'image (WebP si possible) en buffer
    const imageBytes = await imageFile.arrayBuffer();
    const {
      buffer: imageBuffer,
      contentType,
      isWebP,
    } = await prepareAvatarImage(imageFile, Buffer.from(imageBytes));

    // Utiliser la bonne extension selon le type final
    const extension = isWebP ? 'webp' : AVATAR_EXTENSIONS[imageFile.type];

    // Déterminer si on utilise Blob Storage
    const useBlobStorage = await shouldUseBlobStorage();
    let imageUrl: string;

    if (useBlobStorage) {
      try {
        imageUrl = await saveAvatarToBlob(
          `uploads/avatars/${imageId}.${extension}`,
          imageId,
          imageBuffer,
          contentType
        );
      } catch (error) {
        logger.error('Erreur upload avatar vers Blob', error);
        return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 });
      }
    } else {
      try {
        imageUrl = saveAvatarLocally(
          session.user.image,
          imageId,
          extension,
          imageBuffer,
          contentType
        );
      } catch (error) {
        logger.error('Erreur sauvegarde avatar locale', error);
        return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 });
      }
    }

    // Mettre à jour l'image de l'utilisateur dans la base de données
    try {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { image: imageUrl },
      });
      logger.debug(`Avatar mis à jour pour l'utilisateur ${session.user.id}`);
    } catch (error) {
      logger.error('Erreur mise à jour avatar dans DB', error);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    return NextResponse.json({ imageUrl });
  } catch (error) {
    logger.error('Erreur upload avatar', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
