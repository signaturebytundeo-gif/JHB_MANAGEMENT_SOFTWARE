import { verifySession } from '@/lib/dal';
import { db } from '@/lib/db';
import { RawMaterialForm } from '@/components/production/RawMaterialForm';
import { RawMaterialList } from '@/components/production/RawMaterialList';
import Link from 'next/link';

export default async function RawMaterialsPage() {
  // Verify user is authenticated
  await verifySession();

  // Fetch active raw materials
  const materials = await db.rawMaterial.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      expirationDate: 'asc',
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/production"
          className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block"
        >
          &larr; Back to Production
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Raw Materials</h1>
        <p className="text-muted-foreground mt-2">
          Track raw materials with lot numbers, suppliers, and expiration dates for traceability.
        </p>
      </div>

      {/* Add Raw Material Form */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Add New Material</h2>
        <RawMaterialForm />
      </div>

      {/* Divider */}
      <hr className="border-border" />

      {/* Raw Materials List */}
      <div className="rounded-lg border bg-card">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Material Inventory</h2>
          <RawMaterialList materials={materials} />
        </div>
      </div>
    </div>
  );
}
