import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decrypt } from '@/lib/session';
import { getRoleDashboard } from '@/lib/auth/permissions';

export default async function Home() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;
  const session = await decrypt(sessionCookie);

  if (session) {
    redirect(getRoleDashboard(session.role));
  }

  redirect('/login');
}
