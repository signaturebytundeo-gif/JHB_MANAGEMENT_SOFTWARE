import Link from 'next/link';
import { verifyManagerOrAbove } from '@/lib/dal';
import {
  getProductsForTransfer,
  getLocationsForTransfer,
  getAuditTrail,
} from '@/app/actions/inventory';
import { TransferForm } from '@/components/inventory/TransferForm';
import { format } from 'date-fns';

export default async function TransfersPage() {
  await verifyManagerOrAbove();

  const [products, locations, recentTransfers] = await Promise.all([
    getProductsForTransfer(),
    getLocationsForTransfer(),
    getAuditTrail({ movementType: 'TRANSFER' as const }),
  ]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/dashboard/inventory" className="hover:text-foreground transition-colors">
            Inventory
          </Link>
          <span>/</span>
          <span className="text-foreground">Transfers</span>
        </nav>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Inventory Transfers</h1>
        <p className="text-muted-foreground mt-1">
          Move inventory between locations. FIFO allocation ensures oldest batches move first.
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
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-foreground text-background"
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
          className="px-3 py-1.5 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Audit Trail
        </Link>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Transfer form */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-5">New Transfer</h2>
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No products available. Create and release a batch first.
            </p>
          ) : locations.length < 2 ? (
            <p className="text-sm text-muted-foreground">
              At least two locations are required to transfer inventory.
            </p>
          ) : (
            <TransferForm products={products} locations={locations} />
          )}
        </div>

        {/* Recent transfers */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Transfers</h2>
          {recentTransfers.length === 0 ? (
            <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
              No transfers yet.
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">From</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">To</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Qty</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentTransfers.slice(0, 20).map((t) => {
                      let dateStr = '—';
                      try {
                        dateStr = format(new Date(t.createdAt), 'MMM d, h:mm a');
                      } catch { /* empty */ }
                      return (
                        <tr key={t.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{dateStr}</td>
                          <td className="px-4 py-3">{t.productName}</td>
                          <td className="px-4 py-3">{t.fromLocation ?? '—'}</td>
                          <td className="px-4 py-3">{t.toLocation ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-medium">{t.quantity}</td>
                          <td className="px-4 py-3 text-muted-foreground">{t.createdBy}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-3">
                {recentTransfers.slice(0, 10).map((t) => {
                  let dateStr = '—';
                  try {
                    dateStr = format(new Date(t.createdAt), 'MMM d, h:mm a');
                  } catch { /* empty */ }
                  return (
                    <div key={t.id} className="rounded-lg border bg-card p-4 space-y-1.5">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-sm">{t.productName}</p>
                        <p className="text-sm font-semibold">{t.quantity} units</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.fromLocation ?? '—'} → {t.toLocation ?? '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dateStr} · {t.createdBy}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          <p className="text-xs text-muted-foreground">
            <Link href="/dashboard/inventory/audit-trail" className="underline hover:text-foreground">
              View full audit trail
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
