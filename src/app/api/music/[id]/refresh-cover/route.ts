import * as cheerio from 'cheerio';
import { NextResponse } from 'next/server';
import { generateImageId } from '@/lib/utils/generateImageId';

import { uploadToBlob, isBlobConfigured, getBlobPublicUrl } from '@/lib/blob';
import { convertToWebP, canConvertToWebP } from '@/lib/utils/convertToWebP';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';

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

  // 2. Déterminer la source de cover
  let coverUrl: string | null = null;
  let source: 'soundcloud' | 'youtube' | null = null;
  const sc = track.TrackPlatform.find((p) => p.platform === 'soundcloud');
  const yt = track.TrackPlatform.find((p) => p.platform === 'youtube');

  // 2a. SoundCloud (prioritaire)
  if (sc) {
    try {
      const res = await fetch(sc.url);
      const html = await res.text();
      const $ = cheerio.load(html);
      // Essayer meta og:image
      coverUrl = $('meta[property="og:image"]').attr('content') || null;
      if (!coverUrl) {
        // Essayer balise img avatar
        coverUrl = $('img.sc-artwork').attr('src') || null;
      }
      if (coverUrl) source = 'soundcloud';
    } catch (err) {
      logger.error('REFRESH COVER - Erreur scrap SoundCloud', err);
    }
  }

  // 2b. YouTube (si pas de SC ou SC échoué)
  if (!coverUrl && yt) {
    try {
      // Extraire l'ID de la vidéo depuis l'URL de la vidéo ou embedId
      const videoIdMatch = yt.url.match(/[?&]v=([^&]+)/);
      const videoId = videoIdMatch ? videoIdMatch[1] : yt.embedId;
      logger.debug('YOUTUBE SCRAP - yt.url', yt.url);
      logger.debug('YOUTUBE SCRAP - videoId extrait', videoId);
      if (videoId) {
        // Essayer d'abord maxresdefault.jpg
        let testCoverUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        let testRes = await fetch(testCoverUrl, { method: 'HEAD' });
        logger.debug(
          'YOUTUBE SCRAP - Test maxresdefault.jpg',
          testCoverUrl,
          'status:',
          testRes.status
        );
        if (testRes.ok) {
          coverUrl = testCoverUrl;
        } else {
          // Fallback sur hqdefault.jpg
          testCoverUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          testRes = await fetch(testCoverUrl, { method: 'HEAD' });
          logger.debug(
            'YOUTUBE SCRAP - Test hqdefault.jpg',
            testCoverUrl,
            'status:',
            testRes.status
          );
          if (testRes.ok) {
            coverUrl = testCoverUrl;
          } else {
            logger.warn('YOUTUBE SCRAP - Aucune miniature trouvée pour videoId', videoId);
          }
        }
        if (coverUrl) {
          source = 'youtube';
          logger.debug('YOUTUBE SCRAP - coverUrl finale', coverUrl);
        }
      } else {
        logger.warn("YOUTUBE SCRAP - Impossible d'extraire l'ID vidéo pour yt.url", yt.url);
      }
    } catch (err) {
      logger.error('REFRESH COVER - Erreur scrap YouTube', err);
    }
  }

  if (!coverUrl) {
    return NextResponse.json(
      { error: 'Aucune cover trouvée sur SoundCloud ou YouTube.' },
      { status: 404 }
    );
  }

  // 3. Télécharger et sauvegarder l'image
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

    // Sauvegarder dans Vercel Blob si configuré, sinon erreur
    if (!isBlobConfigured) {
      return NextResponse.json(
        { error: 'Vercel Blob not configured. Please configure BLOB_READ_WRITE_TOKEN in Vercel.' },
        { status: 503 }
      );
    }

    const key = `uploads/${imageId}.webp`;
    const originalKey = `uploads/${imageId}-ori.webp`;
    const blobUrl = await uploadToBlob(key, webpBuffer, 'image/webp');
    await uploadToBlob(originalKey, webpBuffer, 'image/webp');

    // 4. Mettre à jour la track
    await prisma.track.update({ where: { id }, data: { imageId } });

    // 5. Retourner la nouvelle cover (Vercel Blob retourne directement l'URL)
    return NextResponse.json({
      success: true,
      imageId,
      coverUrl: blobUrl,
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
