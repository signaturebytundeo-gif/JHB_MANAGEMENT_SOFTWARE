import { verifySession } from '@/lib/dal';
import { redirect } from 'next/navigation';

export default async function InvestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();

  // Only ADMIN and INVESTOR can access this section
  if (session.role !== 'ADMIN' && session.role !== 'INVESTOR') {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
