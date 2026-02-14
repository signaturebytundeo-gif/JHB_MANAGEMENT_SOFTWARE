import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSession } from '@/lib/session';
import { getRoleDashboard } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    // Get token from URL search params
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(
        new URL('/login?error=invalid_link', request.url)
      );
    }

    // Find magic link token
    const magicLink = await db.magicLinkToken.findUnique({
      where: { token },
    });

    // Validate token
    if (
      !magicLink ||
      magicLink.usedAt !== null ||
      magicLink.expiresAt < new Date()
    ) {
      return NextResponse.redirect(
        new URL('/login?error=expired_link', request.url)
      );
    }

    // Mark token as used
    await db.magicLinkToken.update({
      where: { token },
      data: { usedAt: new Date() },
    });

    // Find user
    const user = await db.user.findUnique({
      where: { email: magicLink.email },
    });

    // Validate user exists and is active
    if (!user || !user.isActive) {
      return NextResponse.redirect(
        new URL('/login?error=account_inactive', request.url)
      );
    }

    // Create session
    await createSession(user.id, user.role);

    // Redirect to role-appropriate dashboard
    return NextResponse.redirect(
      new URL(getRoleDashboard(user.role), request.url)
    );
  } catch (error) {
    console.error('Error verifying magic link:', error);
    return NextResponse.redirect(
      new URL('/login?error=verification_failed', request.url)
    );
  }
}
