import fs from 'fs';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { deleteFromBlob } from '@/lib/blob';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { shouldUseBlobStorage } from '@/lib/utils/getStorageConfig';

/**
 * Lister les fichiers locaux depuis public/uploads/
 * Retourne le même format que les images de la DB pour compatibilité
 */
function listLocalFiles(): Array<{
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  lastModified: string;
}> {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

  if (!fs.existsSync(uploadsDir)) {
    return [];
  }

  try {
    const files = fs.readdirSync(uploadsDir);
    const imageExtensions = ['.webp', '.jpg', '.jpeg', '.png', '.gif']; // WebP en priorité

    return files
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      })
      .map((file) => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);

        // Déterminer le type d'image basé sur le nom du fichier
        let type = 'Autre';
        if (file.includes('cover')) type = 'Couverture';
        else if (file.includes('event')) type = 'Événement';
        else if (file.includes('staff')) type = 'Staff';

        return {
          id: `uploads/${file}`,
          name: `uploads/${file}`,
          path: `/uploads/${file}`,
          type,
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
        };
      });
  } catch (error) {
    logger.error('[API IMAGES] Erreur lors de la liste des fichiers locaux:', error);
    return [];
  }
}

// GET - Récupérer toutes les images
export async function GET() {
  try {
    const useBlobStorage = shouldUseBlobStorage();

    // OPTIMISATION: Utiliser la DB au lieu de list() pour éviter les Advanced Operations
    let blobImages: Array<{
      id: string;
      name: string;
      path: string;
      type: string;
      size: number;
      lastModified: string;
    }> = [];

    // useBlobStorage vérifie déjà si Blob est configuré, mais on double-vérifie pour être sûr
    const blobConfigured = !!process.env.BLOB_READ_WRITE_TOKEN;
    if (useBlobStorage && blobConfigured) {
      try {
        // Récupérer toutes les images depuis la DB (évite list() coûteux)
        const dbImages = await prisma.image.findMany({
          select: {
            imageId: true,
            blobUrl: true,
            blobUrlOriginal: true,
            size: true,
            contentType: true,
            updatedAt: true,
          },
        });

        // Transformer les données de la DB au format attendu
        blobImages = dbImages
          .filter((img): img is typeof img & { blobUrl: string } => !!img.blobUrl) // Ne garder que les images avec URL blob
          .map((img) => {
            // Extraire le nom du fichier depuis le pathname de l'URL blob
            // Format: uploads/{imageId}.webp ou uploads/{imageId}-ori.png
            const url = img.blobUrl;
            const urlParts = url.split('/');
            const filename = urlParts[urlParts.length - 1] || `uploads/${img.imageId}.webp`;
            const fullPath = filename.startsWith('uploads/') ? filename : `uploads/${filename}`;

            // Déterminer le type d'image basé sur le nom du fichier
            let type = 'Autre';
            if (filename.includes('cover')) type = 'Couverture';
            else if (filename.includes('event')) type = 'Événement';
            else if (filename.includes('staff')) type = 'Staff';

            return {
              id: fullPath,
              name: fullPath,
              path: url,
              type,
              size: img.size || 0,
              lastModified: img.updatedAt.toISOString(),
            };
          });

        logger.debug(
          `[API IMAGES] ${blobImages.length} images récupérées depuis la DB (0 list() appelé)`
        );
      } catch (dbError) {
        logger.error('[API IMAGES] Erreur lors de la récupération depuis la DB:', dbError);
        // En cas d'erreur DB, on continue avec les fichiers locaux uniquement
      }
    }

    // Lister aussi les fichiers locaux (pour le développement et la compatibilité)
    // Si le switch est activé, on liste quand même les fichiers locaux mais on priorise le blob
    const localImages = listLocalFiles();

    // Fusionner les deux listes, en évitant les doublons basés sur le nom
    const imageMap = new Map<string, (typeof blobImages)[0]>();

    if (useBlobStorage) {
      // Si on utilise le blob, prioriser les images blob (elles écrasent les locales si même nom)
      localImages.forEach((img) => {
        imageMap.set(img.name, img);
      });
      blobImages.forEach((img) => {
        imageMap.set(img.name, img);
      });
    } else {
      // Sinon, prioriser les images locales
      blobImages.forEach((img) => {
        imageMap.set(img.name, img);
      });
      localImages.forEach((img) => {
        imageMap.set(img.name, img);
      });
    }

    const allImages = Array.from(imageMap.values());

    return NextResponse.json({ images: allImages }, { status: 200 });
  } catch (error) {
    logger.error('Erreur API:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des images' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer une image spécifique
export async function DELETE(request: NextRequest) {
  try {
    const blobConfigured = !!process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobConfigured) {
      return NextResponse.json({ error: 'Vercel Blob not configured' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url'); // Avec Vercel Blob, on utilise l'URL complète

    if (!url) {
      return NextResponse.json({ error: 'URL du fichier requise' }, { status: 400 });
    }

    // Supprimer le fichier de Vercel Blob
    await deleteFromBlob(url);

    return NextResponse.json(
      { success: true, message: 'Image supprimée avec succès' },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Erreur lors de la suppression:', error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'image" },
      { status: 500 }
    );
  }
}
