import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

import {
  parseUiVersion,
  UI_VERSION_COOKIE,
  UI_VERSION_COOKIE_MAX_AGE,
  UI_VERSION_PARAM,
} from '@/lib/ui-version';

export async function proxy(request: NextRequest) {
  // `?ui=v2` ou `?ui=legacy` : mémoriser la version d'UI puis revenir sur l'URL propre
  const uiVersion = parseUiVersion(request.nextUrl.searchParams.get(UI_VERSION_PARAM));
  if (uiVersion) {
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete(UI_VERSION_PARAM);
    const response = NextResponse.redirect(cleanUrl);
    response.cookies.set(UI_VERSION_COOKIE, uiVersion, {
      path: '/',
      maxAge: UI_VERSION_COOKIE_MAX_AGE,
      sameSite: 'lax',
    });
    return response;
  }

  // Le proxy Edge ne peut pas utiliser auth() car il nécessite Prisma
  // La vérification d'authentification se fait dans les pages/API routes
  // qui utilisent auth() depuis @/auth
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
