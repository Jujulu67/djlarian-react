import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { uploadToR2, isR2Configured, getR2PublicUrl } from '@/lib/r2';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

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

    // Utiliser R2 si configuré, sinon système de fichiers local
    if (isR2Configured) {
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
    } else {
      // Système de fichiers local (développement)
      const publicPath = join(process.cwd(), 'public', 'uploads');

      // S'assurer que le dossier d'upload existe
      if (!existsSync(publicPath)) {
        await mkdir(publicPath, { recursive: true });
        console.log('[API UPLOAD] Dossier uploads créé:', publicPath);
      }

      // 1. Sauvegarder l'image recadrée (<imageId>.jpg)
      try {
        const croppedFilename = `${imageId}.jpg`;
        const croppedFilePath = join(publicPath, croppedFilename);
        await writeFile(croppedFilePath, croppedBuffer);
        console.log(`[API UPLOAD] Image recadrée sauvegardée: ${croppedFilePath}`);
      } catch (error) {
        console.error(`[API UPLOAD] Erreur sauvegarde image recadrée ${imageId}:`, error);
        throw new Error("Impossible de sauvegarder l'image recadrée.");
      }

      // 2. Sauvegarder l'image originale si fournie (<imageId>-ori.<ext>)
      if (originalImage) {
        if (!originalImage.type.startsWith('image/')) {
          console.warn(
            `[API UPLOAD] Type de fichier original invalide pour ${imageId}: ${originalImage.type}`
          );
        } else if (originalImage.size > 15 * 1024 * 1024) {
          console.warn(
            `[API UPLOAD] Fichier original trop volumineux pour ${imageId}: ${originalImage.size}`
          );
        } else {
          try {
            const originalBytes = await originalImage.arrayBuffer();
            const originalBuffer = Buffer.from(originalBytes);
            const extension = originalImage.name.includes('.')
              ? originalImage.name.split('.').pop()
              : 'jpg';
            const originalFilename = `${imageId}-ori.${extension}`;
            const originalFilePath = join(publicPath, originalFilename);
            await writeFile(originalFilePath, originalBuffer);
            console.log(`[API UPLOAD] Image originale sauvegardée: ${originalFilePath}`);
          } catch (error) {
            console.error(`[API UPLOAD] Erreur sauvegarde image originale ${imageId}:`, error);
            // Ne pas bloquer la réponse si l'originale échoue
          }
        }
      } else {
        console.log(`[API UPLOAD] Pas de fichier original fourni pour ${imageId}`);
      }

      // LOG SUCCÈS FINAL
      console.log(`[API UPLOAD] Upload terminé pour imageId: ${imageId}`);
      return NextResponse.json({
        success: true,
        imageId: imageId,
        url: `/uploads/${imageId}.jpg`,
      });
    }
  } catch (error) {
    console.error('[API UPLOAD] Erreur lors du téléchargement du fichier:', error);
    const message =
      error instanceof Error ? error.message : 'Erreur inconnue lors du téléchargement';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
