import type { AlertStatus, LowInventoryAlert } from '@/app/actions/alerts';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AlertConfigPanelProps {
  alertStatus: AlertStatus;
}

// ── Badge helper ──────────────────────────────────────────────────────────────

function Badge({
  level,
  children,
}: {
  level: 'ok' | 'warning' | 'critical';
  children: React.ReactNode;
}) {
  const styles = {
    ok: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    critical: 'bg-red-100 text-red-800 border-red-200',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[level]}`}
    >
      {children}
    </span>
  );
}

// ── Low inventory badge logic ─────────────────────────────────────────────────

function getInventoryBadge(items: LowInventoryAlert[]) {
  if (items.length === 0) return <Badge level="ok">OK</Badge>;
  if (items.some((i) => i.level === 'CRITICAL')) return <Badge level="critical">CRITICAL</Badge>;
  return <Badge level="warning">WARNING</Badge>;
}

// ── Format currency ───────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AlertConfigPanel({ alertStatus }: AlertConfigPanelProps) {
  const { lowInventory, overdueInvoices, qcFailures, pendingApprovals } = alertStatus;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Low Inventory */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Low Inventory</h3>
          {getInventoryBadge(lowInventory)}
        </div>
        <p className="text-xs text-muted-foreground">
          Reorder threshold: per-product setting
        </p>
        {lowInventory.length === 0 ? (
          <p className="text-sm text-muted-foreground">All products above reorder point.</p>
        ) : (
          <ul className="space-y-1.5">
            {lowInventory.map((item) => (
              <li key={item.product} className="flex items-center justify-between text-sm">
                <span className="text-foreground font-medium">{item.product}</span>
                <span
                  className={`text-xs ${
                    item.level === 'CRITICAL' ? 'text-red-600 font-semibold' : 'text-amber-600'
                  }`}
                >
                  {item.currentStock} / {item.reorderPoint} units
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Overdue Invoices */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Overdue Invoices</h3>
          {overdueInvoices.count === 0 ? (
            <Badge level="ok">OK</Badge>
          ) : overdueInvoices.count <= 3 ? (
            <Badge level="warning">WARNING</Badge>
          ) : (
            <Badge level="critical">{overdueInvoices.count} OVERDUE</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Overdue: past due date</p>
        {overdueInvoices.count === 0 ? (
          <p className="text-sm text-muted-foreground">No overdue invoices.</p>
        ) : (
          <div className="space-y-1 text-sm">
            <p className="text-foreground">
              <span className="font-semibold">{overdueInvoices.count}</span> invoice(s) overdue
            </p>
            <p className="text-foreground">
              Total outstanding:{' '}
              <span className="font-semibold text-red-600">
                {formatCurrency(overdueInvoices.totalAmount)}
              </span>
            </p>
            {overdueInvoices.oldest && (
              <p className="text-muted-foreground text-xs">
                Oldest due:{' '}
                {new Date(overdueInvoices.oldest).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            )}
          </div>
        )}
      </div>

      {/* QC Failures */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">QC Failures (7 days)</h3>
          {qcFailures.count === 0 ? (
            <Badge level="ok">OK</Badge>
          ) : (
            <Badge level="critical">{qcFailures.count} ON HOLD</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">QC: auto-hold on fail</p>
        {qcFailures.count === 0 ? (
          <p className="text-sm text-muted-foreground">No batches on hold.</p>
        ) : (
          <ul className="space-y-1.5">
            {qcFailures.batches.map((batch) => (
              <li key={batch.code} className="text-sm">
                <span className="font-medium text-foreground">{batch.code}</span>
                <span className="text-muted-foreground"> — {batch.product}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pending Approvals */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Pending Approvals</h3>
          {pendingApprovals.count === 0 ? (
            <Badge level="ok">OK</Badge>
          ) : pendingApprovals.count <= 5 ? (
            <Badge level="warning">{pendingApprovals.count} PENDING</Badge>
          ) : (
            <Badge level="critical">{pendingApprovals.count} PENDING</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Approval threshold: per-amount rule</p>
        {pendingApprovals.count === 0 ? (
          <p className="text-sm text-muted-foreground">No pending expense approvals.</p>
        ) : (
          <div className="space-y-1 text-sm">
            <p className="text-foreground">
              <span className="font-semibold">{pendingApprovals.count}</span> expense(s) awaiting approval
            </p>
            <p className="text-foreground">
              Total:{' '}
              <span className="font-semibold text-amber-600">
                {formatCurrency(pendingApprovals.totalAmount)}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
