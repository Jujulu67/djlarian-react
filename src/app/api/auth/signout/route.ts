import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Fonction utilitaire pour nettoyer tous les cookies d'authentification
 */
function clearAllAuthCookies(request: NextRequest, response: NextResponse): void {
  const cookiesToClear = [
    'authjs.session-token',
    'authjs.csrf-token',
    'authjs.callback-url',
    '__Secure-authjs.session-token',
    '__Secure-authjs.csrf-token',
    '__Host-authjs.csrf-token',
    'next-auth.session-token',
    'next-auth.csrf-token',
    'next-auth.callback-url',
    '__Secure-next-auth.session-token',
    '__Secure-next-auth.csrf-token',
    '__Host-next-auth.csrf-token',
  ];

  // Récupérer tous les cookies de la requête
  const allCookies = request.cookies.getAll();

  // Ajouter les cookies de la requête qui contiennent 'auth'
  allCookies.forEach((cookie) => {
    if (
      cookie.name.includes('auth') ||
      cookie.name.includes('session') ||
      cookie.name.includes('csrf')
    ) {
      if (!cookiesToClear.includes(cookie.name)) {
        cookiesToClear.push(cookie.name);
      }
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';

  cookiesToClear.forEach((cookieName) => {
    response.cookies.set(cookieName, '', {
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
    });
    response.cookies.delete(cookieName);
  });
}

/**
 * POST /api/auth/signout - Déconnexion complète.
 * Pas de GET : un simple lien ou une image vers cette adresse déconnectait l'utilisateur.
 */
export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true }, { status: 200 });
    clearAllAuthCookies(request, response);

    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    // Seulement les cookies : "storage" effaçait aussi le localStorage (préférences d'affichage,
    // brouillons…) à chaque déconnexion
    response.headers.set('Clear-Site-Data', '"cookies"');

    return response;
  } catch (error: unknown) {
    logger.error('[API] /api/auth/signout - Erreur:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la déconnexion';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
