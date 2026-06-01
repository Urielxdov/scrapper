import { auth } from '@/lib/auth/infrastructure/adapters/authjs.config';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;

  const publicPaths = ['/', '/auth'];
  const isPublic = publicPaths.includes(pathname) ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico';

  if (!isAuthenticated && !isPublic) {
    return NextResponse.redirect(new URL('/auth', req.url));
  }
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
