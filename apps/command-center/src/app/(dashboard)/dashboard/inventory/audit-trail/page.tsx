import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { getAuditTrail } from '@/app/actions/inventory';
import { AuditTrailTable } from '@/components/inventory/AuditTrailTable';

export default async function AuditTrailPage() {
  await verifySession();

  const movements = await getAuditTrail();

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
          deductions. Last 100 entries.
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

      {/* Audit trail table */}
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        {movements.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No inventory movements recorded yet.</p>
            <p className="text-sm mt-1">
              Movements are created when batches are released, transferred, or adjusted.
            </p>
          </div>
        ) : (
          <AuditTrailTable movements={movements} />
        )}
      </div>
    </div>
  );
}
