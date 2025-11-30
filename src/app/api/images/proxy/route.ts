import { NextRequest, NextResponse } from 'next/server';

/**
 * Route API proxy pour servir les images externes (OAuth, etc.)
 * Contourne les problèmes CORS en servant l'image via le serveur Next.js
 *
 * GET /api/images/proxy?url=https://lh3.googleusercontent.com/...
 */
export async function GET(request: NextRequest) {
  try {
    const urlParam = request.nextUrl.searchParams.get('url');

    if (!urlParam) {
      return NextResponse.json({ error: 'URL manquante' }, { status: 400 });
    }

    // Vérifier que l'URL est valide et sécurisée
    let imageUrl: URL;
    try {
      imageUrl = new URL(urlParam);
    } catch (error) {
      return NextResponse.json({ error: 'URL invalide' }, { status: 400 });
    }

    // Autoriser uniquement les domaines de confiance (Google OAuth, etc.)
    const allowedHosts = [
      'lh3.googleusercontent.com',
      'lh4.googleusercontent.com',
      'lh5.googleusercontent.com',
      'lh6.googleusercontent.com',
    ];

    if (!allowedHosts.includes(imageUrl.hostname)) {
      return NextResponse.json({ error: 'Domaine non autorisé' }, { status: 403 });
    }

    // Télécharger l'image depuis l'URL externe
    const imageResponse = await fetch(imageUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Next.js Image Proxy)',
      },
    });

    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: `Erreur lors du téléchargement de l'image: ${imageResponse.status}` },
        { status: imageResponse.status }
      );
    }

    // Récupérer le type de contenu de l'image
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await imageResponse.arrayBuffer();

    // Retourner l'image avec les headers appropriés
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'CDN-Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[API Images Proxy] Erreur:', error);
    return NextResponse.json({ error: "Erreur lors du proxy de l'image" }, { status: 500 });
  }
}
