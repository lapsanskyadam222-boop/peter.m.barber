// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE = 'session';

// Cesty, které mají být chráněné
const PROTECTED_PREFIXES = ['/admin', '/api/save-content', '/api/blob'];

async function verifySession(token: string | undefined) {
  if (!token) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ⛳️ Login stránky / API vždy povolíme – jinak vznikne smyčka
  if (pathname.startsWith('/admin/login') || pathname.startsWith('/api/auth/login')) {
    return NextResponse.next();
  }

  // Pouze chráněné cesty řešíme
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) {
    return NextResponse.next();
  }

  // Ověření session
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const ok = await verifySession(token);

  // API → vrať 401 JSON
  if (pathname.startsWith('/api')) {
    if (!ok) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return NextResponse.next();
  }

  // Stránky → redirect na login
  if (!ok) {
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  return NextResponse.next();
}

// Middleware spouštíme pouze na chráněných cestách
export const config = {
  matcher: [
    '/admin/:path*',
    '/api/save-content',
    '/api/save-content/:path*',
    '/api/blob',
    '/api/blob/:path*',
  ],
};
