import Link from 'next/link';
import { Suspense } from 'react';
import { verifySession } from '@/lib/dal';
import { getAuditTrail } from '@/app/actions/inventory';
import { db } from '@/lib/db';
import { AuditTrailTable } from '@/components/inventory/AuditTrailTable';
import { AuditTrailFilters } from '@/components/inventory/AuditTrailFilters';
import { MovementType, TransferType } from '@prisma/client';

interface AuditTrailPageProps {
  searchParams?: {
    productId?: string;
    locationId?: string;
    movementType?: string;
    transferType?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

async function AuditTrailContent({ searchParams }: { searchParams?: AuditTrailPageProps['searchParams'] }) {
  // Build filters from search params
  const filters = {
    productId: searchParams?.productId || undefined,
    locationId: searchParams?.locationId || undefined,
    movementType: searchParams?.movementType as MovementType | undefined,
    transferType: searchParams?.transferType as TransferType | undefined,
    dateFrom: searchParams?.dateFrom || undefined,
    dateTo: searchParams?.dateTo || undefined,
  };

  // Remove undefined values
  const cleanFilters = Object.fromEntries(
    Object.entries(filters).filter(([_, value]) => value !== undefined)
  );

  const [movements, products, locations] = await Promise.all([
    getAuditTrail(Object.keys(cleanFilters).length > 0 ? cleanFilters : undefined),
    db.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, sku: true },
      orderBy: { name: 'asc' },
    }),
    db.location.findMany({
      where: { isActive: true },
      select: { id: true, name: true, type: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const hasFilters = Object.keys(cleanFilters).length > 0;
  const movementCount = movements.length;

  return (
    <>
      {/* Filter controls */}
      <AuditTrailFilters products={products} locations={locations} />

      {/* Results summary */}
      {hasFilters && (
        <div className="text-sm text-muted-foreground">
          Found {movementCount} movement{movementCount !== 1 ? 's' : ''} matching your filters
        </div>
      )}

      {/* Audit trail table */}
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        {movements.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {hasFilters ? (
              <>
                <p>No inventory movements match your current filters.</p>
                <p className="text-sm mt-1">
                  Try adjusting your filters or clearing them to see all movements.
                </p>
              </>
            ) : (
              <>
                <p>No inventory movements recorded yet.</p>
                <p className="text-sm mt-1">
                  Movements are created when batches are released, transferred, or adjusted.
                </p>
              </>
            )}
          </div>
        ) : (
          <AuditTrailTable movements={movements} />
        )}
      </div>
    </>
  );
}

function AuditTrailLoading() {
  return (
    <div className="space-y-6">
      {/* Filter skeleton */}
      <div className="h-10 bg-muted rounded-md animate-pulse" />
      {/* Table skeleton */}
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function AuditTrailPage({ searchParams }: AuditTrailPageProps) {
  await verifySession();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/dashboard/inventory" className="hover:text-foreground transition-colors">
            Inventory
          </Link>
          <span>/</span>
          <span className="text-foreground">Audit Trail</span>
        </nav>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Audit Trail</h1>
        <p className="text-muted-foreground mt-1">
          Complete history of all inventory movements — production, transfers, adjustments, and
          deductions. Use filters to find specific movements.
        </p>
      </div>

      {/* Sub-page navigation */}
      <nav className="flex flex-wrap gap-2 border-b border-border pb-3">
        <Link
          href="/dashboard/inventory"
          className="px-3 py-1.5 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Stock Levels
        </Link>
        <Link
          href="/dashboard/inventory/transfers"
          className="px-3 py-1.5 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Transfers
        </Link>
        <Link
          href="/dashboard/inventory/adjustments"
          className="px-3 py-1.5 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Adjustments
        </Link>
        <Link
          href="/dashboard/inventory/packaging"
          className="px-3 py-1.5 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Packaging
        </Link>
        <Link
          href="/dashboard/inventory/audit-trail"
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-foreground text-background"
        >
          Audit Trail
        </Link>
      </nav>

      {/* Content */}
      <Suspense fallback={<AuditTrailLoading />}>
        <AuditTrailContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
