import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { uploadToR2, isR2Configured, getR2PublicUrl } from '@/lib/r2';

// Note: Pas de Edge Runtime car Auth.js v5 avec Prisma/bcrypt nécessite Node.js

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
    console.log('R2 configured:', isR2Configured);
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

    // Utiliser R2 uniquement (Edge Runtime ne supporte pas fs)
    if (!isR2Configured) {
      return NextResponse.json(
        { error: 'R2 not configured. Please configure Cloudflare R2.' },
        { status: 503 }
      );
    }

    // Upload vers R2
    try {
      const croppedKey = `uploads/${imageId}.jpg`;
      const croppedUrl = await uploadToR2(croppedKey, croppedBuffer, 'image/jpeg');
      console.log(`[API UPLOAD] Image recadrée uploadée vers R2: ${croppedUrl}`);

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
            await uploadToR2(originalKey, originalBuffer, contentType);
            console.log(`[API UPLOAD] Image originale uploadée vers R2: ${originalKey}`);
          } catch (error) {
            console.error(`[API UPLOAD] Erreur upload image originale vers R2:`, error);
            // Ne pas bloquer si l'originale échoue
          }
        } else {
          console.warn(
            `[API UPLOAD] Fichier original trop volumineux: ${originalImage.size} bytes`
          );
        }
      }

      console.log(`[API UPLOAD] Upload R2 terminé pour imageId: ${imageId}`);
      return NextResponse.json({
        success: true,
        imageId: imageId,
        url: croppedUrl,
      });
    } catch (error) {
      console.error(`[API UPLOAD] Erreur upload R2 pour ${imageId}:`, error);
      throw new Error("Impossible d'uploader l'image vers R2.");
    }
  } catch (error) {
    console.error('[API UPLOAD] Erreur lors du téléchargement du fichier:', error);
    const message =
      error instanceof Error ? error.message : 'Erreur inconnue lors du téléchargement';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
