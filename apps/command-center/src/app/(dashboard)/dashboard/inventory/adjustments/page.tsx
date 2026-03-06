import Link from 'next/link';
import { verifyManagerOrAbove } from '@/lib/dal';
import {
  getReleasedBatches,
  getLocationsForTransfer,
  getPendingAdjustments,
  getAuditTrail,
} from '@/app/actions/inventory';
import { AdjustmentForm } from '@/components/inventory/AdjustmentForm';
import { PendingApprovals } from '@/components/inventory/PendingApprovals';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const REASON_LABELS: Record<string, string> = {
  DAMAGE: 'Damage',
  SHRINKAGE: 'Shrinkage',
  SAMPLING: 'Sampling',
  EXPIRED: 'Expired',
  COUNT_CORRECTION: 'Count Correction',
};

export default async function AdjustmentsPage() {
  const session = await verifyManagerOrAbove();

  const [batches, locations, pendingAdjustments, recentAdjustments] = await Promise.all([
    getReleasedBatches(),
    getLocationsForTransfer(),
    getPendingAdjustments(),
    getAuditTrail({ movementType: 'ADJUSTMENT' as const }),
  ]);

  const isAdmin = session.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/dashboard/inventory" className="hover:text-foreground transition-colors">
            Inventory
          </Link>
          <span>/</span>
          <span className="text-foreground">Adjustments</span>
        </nav>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Inventory Adjustments</h1>
        <p className="text-muted-foreground mt-1">
          Correct inventory discrepancies with a reason code. Adjustments over 2% variance require
          admin approval.
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
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-foreground text-background"
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

      {/* Pending approvals banner — admin only */}
      {isAdmin && pendingAdjustments.length > 0 && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-yellow-700 dark:text-yellow-400">
              {pendingAdjustments.length} adjustment{pendingAdjustments.length === 1 ? '' : 's'} awaiting your approval
            </span>
          </div>
          <PendingApprovals
            pendingMovements={pendingAdjustments}
            currentUserId={session.userId}
            isAdmin={isAdmin}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Adjustment form */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-5">New Adjustment</h2>
          {batches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No released batches available. Batches must be in RELEASED status to adjust.
            </p>
          ) : (
            <AdjustmentForm batches={batches} locations={locations} />
          )}
        </div>

        {/* Recent adjustments */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Adjustments</h2>
          {recentAdjustments.length === 0 ? (
            <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
              No adjustments yet.
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
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reason</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Qty</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentAdjustments.slice(0, 20).map((adj) => {
                      const isPositive = adj.toLocation !== null;
                      const qtyDisplay = isPositive ? `+${adj.quantity}` : `-${adj.quantity}`;
                      let dateStr = '—';
                      try {
                        dateStr = format(new Date(adj.createdAt), 'MMM d, h:mm a');
                      } catch { /* empty */ }

                      let statusLabel = 'Auto-Approved';
                      let statusVariant: 'success' | 'warning' = 'success';
                      if (adj.requiresApproval && !adj.approvedAt) {
                        statusLabel = 'Pending Approval';
                        statusVariant = 'warning';
                      } else if (adj.requiresApproval && adj.approvedAt) {
                        statusLabel = 'Approved';
                      }

                      return (
                        <tr key={adj.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{dateStr}</td>
                          <td className="px-4 py-3">{adj.productName}</td>
                          <td className="px-4 py-3">
                            {adj.reason ? (REASON_LABELS[adj.reason] ?? adj.reason) : '—'}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-semibold ${
                              isPositive
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {qtyDisplay}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={statusVariant}>{statusLabel}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-3">
                {recentAdjustments.slice(0, 10).map((adj) => {
                  const isPositive = adj.toLocation !== null;
                  const qtyDisplay = isPositive ? `+${adj.quantity}` : `-${adj.quantity}`;
                  let dateStr = '—';
                  try {
                    dateStr = format(new Date(adj.createdAt), 'MMM d, h:mm a');
                  } catch { /* empty */ }

                  let statusLabel = 'Auto-Approved';
                  let statusVariant: 'success' | 'warning' = 'success';
                  if (adj.requiresApproval && !adj.approvedAt) {
                    statusLabel = 'Pending Approval';
                    statusVariant = 'warning';
                  } else if (adj.requiresApproval && adj.approvedAt) {
                    statusLabel = 'Approved';
                  }

                  return (
                    <div key={adj.id} className="rounded-lg border bg-card p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-sm">{adj.productName}</p>
                        <p
                          className={`text-sm font-semibold ${
                            isPositive
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {qtyDisplay}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariant}>{statusLabel}</Badge>
                        {adj.reason && (
                          <span className="text-xs text-muted-foreground">
                            {REASON_LABELS[adj.reason] ?? adj.reason}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{dateStr} · {adj.createdBy}</p>
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
