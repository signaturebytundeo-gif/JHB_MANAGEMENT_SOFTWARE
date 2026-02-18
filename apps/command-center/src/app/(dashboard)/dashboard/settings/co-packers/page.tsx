import { verifyAdmin } from '@/lib/dal';
import { db } from '@/lib/db';
import { CoPackerPartnerList } from '@/components/settings/CoPackerPartnerList';
import { CoPackerPartnerForm } from '@/components/settings/CoPackerPartnerForm';
import Link from 'next/link';

export default async function CoPackersPage() {
  // Verify admin access
  await verifyAdmin();

  // Fetch all partners
  const partners = await db.coPackerPartner.findMany({
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/settings"
          className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block"
        >
          &larr; Back to Settings
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Co-Packer Partners</h1>
        <p className="text-muted-foreground mt-2">
          Manage co-packing partner list for production tracking.
        </p>
      </div>

      {/* Add/Edit Form */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Add New Partner</h2>
        <CoPackerPartnerForm />
      </div>

      {/* Partners List */}
      <div className="rounded-lg border bg-card">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Existing Partners</h2>
          <CoPackerPartnerList partners={partners} />
        </div>
      </div>
    </div>
  );
}
