import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { convertToWebP, canConvertToWebP } from '@/lib/utils/convertToWebP';
import { fetchThumbnailFromPlatforms } from '@/lib/utils/fetchThumbnailFromPlatforms';
import { generateImageId } from '@/lib/utils/generateImageId';
import { saveImage } from '@/lib/utils/saveImage';

// Refresh cover endpoint - Vercel (Node.js runtime natif)

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing track ID' }, { status: 400 });

  // 1. Récupérer la track avec plateformes
  const track = await prisma.track.findUnique({
    where: { id },
    include: { TrackPlatform: true },
  });
  if (!track) return NextResponse.json({ error: 'Track not found' }, { status: 404 });

  // 2. Récupérer les URLs des plateformes
  const spotify = track.TrackPlatform.find((p: { platform: string }) => p.platform === 'spotify');
  const soundcloud = track.TrackPlatform.find(
    (p: { platform: string }) => p.platform === 'soundcloud'
  );
  const youtube = track.TrackPlatform.find((p: { platform: string }) => p.platform === 'youtube');

  // 3. Récupérer l'image depuis les plateformes (priorité: Spotify > SoundCloud > YouTube)
  const thumbnailResult = await fetchThumbnailFromPlatforms({
    spotify: spotify?.url,
    soundcloud: soundcloud?.url,
    youtube: youtube?.url,
  });

  if (!thumbnailResult) {
    return NextResponse.json(
      { error: 'Aucune cover trouvée sur Spotify, SoundCloud ou YouTube.' },
      { status: 404 }
    );
  }

  const { url: coverUrl, source } = thumbnailResult;

  // 4. Télécharger et sauvegarder l'image
  try {
    const imageId = generateImageId();
    const response = await fetch(coverUrl);
    if (!response.ok) throw new Error('Cover fetch failed');
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer) as Buffer;

    // Convertir en WebP si possible
    let webpBuffer = buffer;
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (canConvertToWebP(contentType)) {
      try {
        webpBuffer = await convertToWebP(buffer);
        logger.debug('API REFRESH COVER - Image convertie en WebP');
      } catch (error) {
        logger.warn('API REFRESH COVER - Erreur conversion WebP, utilisation originale', error);
      }
    }

    // Sauvegarder l'image (locale ou Blob) via la fonction utilitaire partagée
    const savedImageId = await saveImage(imageId, webpBuffer, webpBuffer);
    if (!savedImageId) {
      return NextResponse.json(
        { error: "Erreur lors de la sauvegarde de l'image." },
        { status: 500 }
      );
    }

    // 5. Mettre à jour la track
    await prisma.track.update({ where: { id }, data: { imageId: savedImageId } });

    // 6. Retourner la nouvelle cover
    return NextResponse.json({
      success: true,
      imageId: savedImageId,
      source,
    });
  } catch (err) {
    logger.error('REFRESH COVER - Erreur téléchargement/sauvegarde', err);
    return NextResponse.json(
      { error: 'Erreur lors du téléchargement ou de la sauvegarde de la cover.' },
      { status: 500 }
    );
  }
}
