import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { writeFile } from 'fs/promises';
import path from 'path';
import * as cheerio from 'cheerio';

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
      console.error('[REFRESH COVER] Erreur scrap SoundCloud:', err);
    }
  }

  // 2b. YouTube (si pas de SC ou SC échoué)
  if (!coverUrl && yt) {
    try {
      // Extraire l'ID de la chaîne depuis l'URL de la vidéo
      const videoIdMatch = yt.url.match(/[?&]v=([^&]+)/);
      const videoId = videoIdMatch ? videoIdMatch[1] : yt.embedId;
      console.log('[YOUTUBE SCRAP] yt.url:', yt.url, 'videoId:', videoId);
      if (videoId) {
        const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
        console.log('[YOUTUBE SCRAP] Fetching video page:', videoPageUrl);
        const videoPage = await fetch(videoPageUrl);
        const videoHtml = await videoPage.text();
        console.log('[YOUTUBE SCRAP] videoHtml length:', videoHtml.length);
        const $v = cheerio.load(videoHtml);
        const channelId = $v('meta[itemprop="channelId"]').attr('content');
        console.log('[YOUTUBE SCRAP] channelId:', channelId);
        if (channelId) {
          // URL directe de la PP de chaîne YouTube
          coverUrl = `https://yt3.googleusercontent.com/${channelId}=s176-c-k-c0x00ffffff-no-rj`;
          source = 'youtube';
          console.log('[YOUTUBE SCRAP] coverUrl:', coverUrl);
        } else {
          console.warn('[YOUTUBE SCRAP] channelId not found in videoHtml');
        }
      } else {
        console.warn('[YOUTUBE SCRAP] videoId not found for yt.url:', yt.url);
      }
    } catch (err) {
      console.error('[REFRESH COVER] Erreur scrap YouTube:', err);
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
    const imageId = uuidv4();
    const response = await fetch(coverUrl);
    if (!response.ok) throw new Error('Cover fetch failed');
    const buffer = Buffer.from(await response.arrayBuffer());
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await writeFile(path.join(uploadsDir, `${imageId}.jpg`), buffer);
    await writeFile(path.join(uploadsDir, `${imageId}-ori.jpg`), buffer);
    // 4. Mettre à jour la track
    await prisma.track.update({ where: { id }, data: { imageId } });
    // 5. Retourner la nouvelle cover
    return NextResponse.json({
      success: true,
      imageId,
      coverUrl: `/uploads/${imageId}.jpg`,
      source,
    });
  } catch (err) {
    console.error('[REFRESH COVER] Erreur téléchargement/sauvegarde:', err);
    return NextResponse.json(
      { error: 'Erreur lors du téléchargement ou de la sauvegarde de la cover.' },
      { status: 500 }
    );
  }
}
