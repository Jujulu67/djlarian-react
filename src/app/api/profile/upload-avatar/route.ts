import fs from 'fs';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { uploadToBlob } from '@/lib/blob';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { convertToWebP, canConvertToWebP } from '@/lib/utils/convertToWebP';
import { shouldUseBlobStorage } from '@/lib/utils/getStorageConfig';

// Upload de photo de profil - Accessible aux utilisateurs connectés
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // Vérifier l'authentification
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: 'Aucune image fournie' }, { status: 400 });
    }

    // Vérifier le type de fichier
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Le fichier doit être une image' }, { status: 400 });
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

    // Convertir l'image en buffer
    const imageBytes = await imageFile.arrayBuffer();
    let imageBuffer: Buffer = Buffer.from(imageBytes);

    // Convertir en WebP si possible
    if (canConvertToWebP(imageFile.type)) {
      try {
        imageBuffer = await convertToWebP(imageBuffer);
        logger.debug('Avatar converti en WebP');
      } catch (error) {
        logger.warn('Erreur conversion WebP, utilisation originale', error);
      }
    }

    // Déterminer si on utilise Blob Storage
    const useBlobStorage = shouldUseBlobStorage();
    let imageUrl: string;

    if (useBlobStorage) {
      // Upload vers Vercel Blob
      try {
        const key = `uploads/avatars/${imageId}.webp`;
        imageUrl = await uploadToBlob(key, imageBuffer, 'image/webp');
        logger.debug(`Avatar uploadé vers Vercel Blob: ${imageUrl}`);

        // Stocker l'URL dans la DB
        await prisma.image.upsert({
          where: { imageId },
          create: {
            imageId,
            blobUrl: imageUrl,
            size: imageBuffer.length,
            contentType: 'image/webp',
          },
          update: {
            blobUrl: imageUrl,
            size: imageBuffer.length,
            contentType: 'image/webp',
          },
        });
      } catch (error) {
        logger.error('Erreur upload avatar vers Blob', error);
        return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 });
      }
    } else {
      // Sauvegarder localement dans public/uploads/avatars/
      try {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');

        // Créer le dossier s'il n'existe pas
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Supprimer l'ancienne photo de profil si elle existe (uniquement si c'est une image locale)
        const oldImage = session.user.image;
        if (oldImage && oldImage.startsWith('/uploads/avatars/')) {
          const oldImagePath = path.join(process.cwd(), 'public', oldImage);
          if (fs.existsSync(oldImagePath)) {
            try {
              fs.unlinkSync(oldImagePath);
              logger.debug(`Ancienne photo supprimée: ${oldImagePath}`);
            } catch (error) {
              logger.warn('Erreur suppression ancienne photo', error);
              // Ne pas bloquer l'upload si la suppression échoue
            }
          }
        }

        // Sauvegarder la nouvelle image
        const imagePath = path.join(uploadsDir, `${imageId}.webp`);
        fs.writeFileSync(imagePath, imageBuffer);
        imageUrl = `/uploads/avatars/${imageId}.webp`;
        logger.debug(`Avatar sauvegardé localement: ${imagePath}`);
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
