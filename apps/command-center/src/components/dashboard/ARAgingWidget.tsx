import { Receipt } from 'lucide-react';

interface ARAgingWidgetProps {
  totalAR: number;
  overdueAmount: number;
  overdueCount: number;
}

export function ARAgingWidget({
  totalAR,
  overdueAmount,
  overdueCount,
}: ARAgingWidgetProps) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm border-l-4 border-l-caribbean-green">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">Accounts Receivable</p>
          <div className="mt-2">
            <p className="text-3xl font-bold">${totalAR.toFixed(2)}</p>
          </div>
          <div className="mt-1">
            {overdueAmount > 0 ? (
              <p className="text-xs font-medium text-red-500">
                {overdueCount} overdue (${overdueAmount.toFixed(2)})
              </p>
            ) : (
              <p className="text-xs font-medium text-green-600">No overdue invoices</p>
            )}
          </div>
        </div>
        <div className="rounded-lg bg-caribbean-green/10 p-3 text-caribbean-green">
          <Receipt className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
