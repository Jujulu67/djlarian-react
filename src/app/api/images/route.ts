import { NextRequest, NextResponse } from 'next/server';
import { listBlobFiles, deleteFromBlob, isBlobConfigured } from '@/lib/blob';
import { logger } from '@/lib/logger';


// GET - Récupérer toutes les images
export async function GET() {
  try {
    // Utiliser Vercel Blob pour le stockage des fichiers
    if (!isBlobConfigured) {
      logger.warn('Vercel Blob not configured, returning empty images list');
      return NextResponse.json({ images: [] }, { status: 200 });
    }

    const images = await listBlobFiles();
    return NextResponse.json({ images }, { status: 200 });
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
    if (!isBlobConfigured) {
      return NextResponse.json(
        { error: 'Vercel Blob not configured' },
        { status: 503 }
      );
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
