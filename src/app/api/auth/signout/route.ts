import { NextRequest, NextResponse } from 'next/server';

/** Préfixes des cookies posés par Auth.js (et par NextAuth v4 avant la migration). */
const AUTH_COOKIE_PREFIXES = ['authjs.', 'next-auth.'];

function isAuthCookie(name: string): boolean {
  const bare = name.replace(/^__(Secure|Host)-/, '');
  return AUTH_COOKIE_PREFIXES.some((prefix) => bare.startsWith(prefix));
}

/**
 * POST /api/auth/signout - Déconnexion : supprime les cookies d'Auth.js (y compris les
 * morceaux `session-token.0`, `.1`… d'un jeton découpé).
 * Pas de GET : un simple lien ou une image vers cette adresse déconnectait l'utilisateur.
 */
export function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true }, { status: 200 });

  for (const { name } of request.cookies.getAll()) {
    if (!isAuthCookie(name)) continue;
    response.cookies.set(name, '', {
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      // Les cookies __Secure- / __Host- ne peuvent être effacés que par un Set-Cookie sécurisé
      secure: name.startsWith('__') || process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  }

  response.headers.set('Cache-Control', 'no-store');
  // Pas de Clear-Site-Data : il effaçait aussi les préférences (cookie `ui`, localStorage)
  return response;
}
