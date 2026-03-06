import Link from 'next/link';
import { verifyManagerOrAbove } from '@/lib/dal';
import { verifySession } from '@/lib/dal';
import { getPackagingMaterials } from '@/app/actions/packaging';
import { PackagingMaterialForm } from '@/components/inventory/PackagingMaterialForm';
import { PackagingMaterialList } from '@/components/inventory/PackagingMaterialList';
import { ChevronRight } from 'lucide-react';

export default async function PackagingPage() {
  const session = await verifyManagerOrAbove();
  const isAdmin = session.role === 'ADMIN';

  const materials = await getPackagingMaterials();

  return (
    <div className="space-y-6">
      {/* Header with breadcrumb */}
      <div>
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
          <Link href="/dashboard/inventory" className="hover:text-foreground transition-colors">
            Inventory
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">Packaging Materials</span>
        </nav>
        <h1 className="text-3xl font-bold text-foreground">Packaging Materials</h1>
        <p className="text-muted-foreground mt-2">
          Track bottles, caps, labels, and other packaging supplies. Monitor stock levels and
          reorder alerts to prevent production delays.
        </p>
      </div>

      {/* Add form */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Add Packaging Material</h2>
        <PackagingMaterialForm />
      </div>

      {/* Materials list */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">
          Packaging Materials{' '}
          {materials.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">({materials.length})</span>
          )}
        </h2>
        <PackagingMaterialList materials={materials} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
