import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');

  if (isAdminRoute && !isApiRoute) {
    if (!token) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    if (token.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
