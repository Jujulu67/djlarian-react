import fs from 'fs';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { listBlobFiles, deleteFromBlob } from '@/lib/blob';
import { logger } from '@/lib/logger';
import { shouldUseBlobStorage } from '@/lib/utils/getStorageConfig';

/**
 * Lister les fichiers locaux depuis public/uploads/
 * Retourne le même format que listBlobFiles() pour compatibilité
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

    // Si on doit utiliser le blob (prod ou switch activé), récupérer depuis Blob
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
      blobImages = await listBlobFiles();
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
