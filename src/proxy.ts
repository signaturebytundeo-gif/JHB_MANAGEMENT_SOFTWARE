import { NextRequest, NextResponse } from 'next/server';
import { decrypt, updateSession } from '@/lib/session';
import { getRoleDashboard } from '@/lib/auth/permissions';
import { cookies } from 'next/headers';

const protectedRoutes = ['/dashboard'];
const publicRoutes = ['/login', '/register', '/invite'];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Check if path is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route)
  );
  const isPublicRoute = publicRoutes.some((route) => path.startsWith(route));

  // Get session
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;
  const session = await decrypt(sessionCookie);

  // Redirect to login if accessing protected route without session
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect to dashboard if accessing public auth route with valid session
  if (isPublicRoute && session) {
    return NextResponse.redirect(
      new URL(getRoleDashboard(session.role), request.url)
    );
  }

  // Update session for sliding expiration
  if (session) {
    await updateSession();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
