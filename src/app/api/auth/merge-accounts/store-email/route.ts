import { NextRequest, NextResponse } from 'next/server';

/**
 * Route pour stocker l'email dans un cookie temporaire
 * Utilisée avant la redirection OAuth pour pouvoir récupérer l'email après
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const response = NextResponse.json({ success: true });

    // Stocker l'email dans un cookie temporaire (1 heure)
    const isSecure = process.env.NODE_ENV === 'production';
    response.cookies.set('pending-merge-email', email, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 3600, // 1 heure
    });

    return response;
  } catch (error) {
    console.error('[API] Erreur store merge email:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
