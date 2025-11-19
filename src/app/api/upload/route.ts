import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { uploadToBlob, isBlobConfigured, getBlobPublicUrl } from '@/lib/blob';

// Upload endpoint - Vercel (Node.js runtime natif)

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

    // LOGS DEBUG
    console.log('--- [API UPLOAD] ---');
    console.log('imageId:', imageId);
    console.log('Blob configured:', isBlobConfigured);
    console.log(
      'croppedImage:',
      croppedImage ? `${croppedImage.size} bytes, type: ${croppedImage.type}` : croppedImage
    );
    console.log(
      'originalImage:',
      originalImage
        ? `${originalImage.size} bytes, type: ${originalImage.type}, name: ${originalImage.name}`
        : originalImage
    );

    if (!imageId) {
      console.error('[API UPLOAD] Image ID manquant');
      return NextResponse.json({ error: 'Image ID manquant' }, { status: 400 });
    }
    if (!croppedImage) {
      console.error('[API UPLOAD] Image recadrée manquante');
      return NextResponse.json({ error: 'Image recadrée manquante' }, { status: 400 });
    }

    const croppedBytes = await croppedImage.arrayBuffer();
    const croppedBuffer = Buffer.from(croppedBytes);

    // Utiliser Vercel Blob pour le stockage des fichiers
    if (!isBlobConfigured) {
      return NextResponse.json(
        { error: 'Vercel Blob not configured. Please configure BLOB_READ_WRITE_TOKEN in Vercel.' },
        { status: 503 }
      );
    }

    // Upload vers Vercel Blob
    try {
      const croppedKey = `uploads/${imageId}.jpg`;
      const croppedUrl = await uploadToBlob(croppedKey, croppedBuffer, 'image/jpeg');
      console.log(`[API UPLOAD] Image recadrée uploadée vers Vercel Blob: ${croppedUrl}`);

      // Upload de l'image originale si fournie
      if (originalImage && originalImage.type.startsWith('image/')) {
        if (originalImage.size <= 15 * 1024 * 1024) {
          try {
            const originalBytes = await originalImage.arrayBuffer();
            const originalBuffer = Buffer.from(originalBytes);
            const extension = originalImage.name.includes('.')
              ? originalImage.name.split('.').pop()
              : 'jpg';
            const originalKey = `uploads/${imageId}-ori.${extension}`;
            const contentType = originalImage.type || `image/${extension}`;
            await uploadToBlob(originalKey, originalBuffer, contentType);
            console.log(`[API UPLOAD] Image originale uploadée vers Vercel Blob: ${originalKey}`);
          } catch (error) {
            console.error(`[API UPLOAD] Erreur upload image originale vers Blob:`, error);
            // Ne pas bloquer si l'originale échoue
          }
        } else {
          console.warn(
            `[API UPLOAD] Fichier original trop volumineux: ${originalImage.size} bytes`
          );
        }
      }

      console.log(`[API UPLOAD] Upload Vercel Blob terminé pour imageId: ${imageId}`);
      return NextResponse.json({
        success: true,
        imageId: imageId,
        url: croppedUrl,
      });
    } catch (error) {
      console.error(`[API UPLOAD] Erreur upload Blob pour ${imageId}:`, error);
      throw new Error("Impossible d'uploader l'image vers Vercel Blob.");
    }
  } catch (error) {
    console.error('[API UPLOAD] Erreur lors du téléchargement du fichier:', error);
    const message =
      error instanceof Error ? error.message : 'Erreur inconnue lors du téléchargement';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
