import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decrypt } from './session';
import { db } from './db';

export const verifySession = cache(async () => {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;

  if (!session) {
    redirect('/login');
  }

  const payload = await decrypt(session);

  if (!payload) {
    redirect('/login');
  }

  return {
    isAuth: true,
    userId: payload.userId,
    role: payload.role,
  };
});

export async function verifyAdmin() {
  const session = await verifySession();

  if (session.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required');
  }

  return session;
}

export async function verifyManagerOrAbove() {
  const session = await verifySession();

  if (!['ADMIN', 'MANAGER'].includes(session.role)) {
    throw new Error('Unauthorized: Manager or Admin access required');
  }

  return session;
}

export const getUser = cache(async () => {
  const session = await verifySession();

  try {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    return user;
  } catch (error) {
    return null;
  }
});
