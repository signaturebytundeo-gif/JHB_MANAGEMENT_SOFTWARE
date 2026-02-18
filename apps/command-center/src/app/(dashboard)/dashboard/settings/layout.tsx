import { verifyAdmin } from '@/lib/dal';

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Only admins can access settings
  await verifyAdmin();

  return <>{children}</>;
}
