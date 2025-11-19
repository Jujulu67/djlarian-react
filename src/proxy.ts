import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  // Le proxy Edge ne peut pas utiliser auth() car il nécessite Prisma
  // La vérification d'authentification se fait dans les pages/API routes
  // qui utilisent auth() depuis @/auth
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
