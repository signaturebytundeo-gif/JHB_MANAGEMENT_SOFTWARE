import { type ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/dal';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar user={user} />

      {/* Main content area */}
      <div className="lg:pl-64 transition-all duration-300">
        <Header user={user} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
