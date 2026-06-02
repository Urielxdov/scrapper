// ./middleware.ts
import NextAuth from 'next-auth';
// Importamos ÚNICAMENTE la configuración ligera para evitar meter a Prisma aquí
import { authConfig } from './lib/auth/infrastructure/adapters/authjs.config';
import { NextResponse } from 'next/server';

// Inicializamos el auth ligero para el middleware
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;

  // 1. LÓGICA PARA RUTAS DE LA API (/api/:path*)
  if (pathname.startsWith('/api/')) {
    const isAuthRoute = pathname.startsWith('/api/auth');
    if (!isAuthRoute && !isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); // Cambiado a 401 que es el estándar de No Autorizado
    }
    return NextResponse.next();
  }

  // 2. LÓGICA PARA RUTAS DE LA APLICACIÓN (Páginas Web)
  const publicPaths = ['/', '/auth'];
  const isPublic = publicPaths.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico';

  // Si ya está logueado e intenta ir a /auth, mándalo al dashboard
  if (isAuthenticated && pathname === '/auth') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Si NO está logueado y la ruta NO es pública, al login
  if (!isAuthenticated && !isPublic) {
    return NextResponse.redirect(new URL('/auth', req.url));
  }

  return NextResponse.next();
});

// El matcher debe cubrir tanto las páginas de la app como las rutas de la API
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/api/:path*'
  ],
};