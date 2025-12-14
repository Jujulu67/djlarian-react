import fs from 'fs';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { shouldUseBlobStorage } from '@/lib/utils/getStorageConfig';
import { deleteFromBlob } from '@/lib/blob';

// Suppression de photo de profil - Accessible aux utilisateurs connectés
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    // Vérifier l'authentification
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    });

    if (!user?.image) {
      return NextResponse.json({ error: 'Aucune photo de profil à supprimer' }, { status: 400 });
    }

    const oldImage = user.image;
    const useBlobStorage = await shouldUseBlobStorage();

    // Supprimer l'image du stockage
    if (useBlobStorage) {
      // Si l'image est stockée dans Vercel Blob, utiliser l'URL complète
      try {
        await deleteFromBlob(oldImage);
        logger.debug(`Avatar supprimé de Vercel Blob: ${oldImage}`);
      } catch (error) {
        logger.warn('Erreur suppression avatar depuis Blob', error);
        // Continuer même si la suppression du blob échoue
      }
    } else {
      // Supprimer l'image locale
      if (oldImage.startsWith('/uploads/avatars/')) {
        const oldImagePath = path.join(process.cwd(), 'public', oldImage);
        if (fs.existsSync(oldImagePath)) {
          try {
            fs.unlinkSync(oldImagePath);
            logger.debug(`Avatar supprimé localement: ${oldImagePath}`);
          } catch (error) {
            logger.warn('Erreur suppression avatar locale', error);
            // Continuer même si la suppression locale échoue
          }
        }
      }
    }

    // Mettre à jour l'utilisateur pour supprimer l'image
    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: null },
    });

    logger.debug(`Avatar supprimé pour l'utilisateur ${session.user.id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Erreur suppression avatar', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
