'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { ExpenseListItem } from '@/app/actions/expenses';

interface COGSSummaryWidgetProps {
  expenses: ExpenseListItem[];
}

const fmtCurrency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export function COGSSummaryWidget({ expenses }: COGSSummaryWidgetProps) {
  const totals = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let cogs = 0; // Ingredients + Packaging
    let marketFees = 0; // Overhead (closest enum match — booth fees etc.)
    let total = 0;

    for (const e of expenses) {
      const d = new Date(e.expenseDate);
      if (d < startOfMonth) continue;
      // Only count approved + auto-approved against the monthly view
      if (e.approvalStatus === 'rejected') continue;

      total += e.amount;
      if (e.category === 'INGREDIENTS' || e.category === 'PACKAGING') cogs += e.amount;
      if (e.category === 'OVERHEAD') marketFees += e.amount;
    }

    return { cogs, marketFees, total };
  }, [expenses]);

  // Bar widths relative to total
  const barWidth = (n: number) => (totals.total > 0 ? `${Math.min(100, (n / totals.total) * 100)}%` : '0%');

  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            This Month — {monthLabel}
          </h3>
          <span className="text-2xl font-bold text-foreground">{fmtCurrency(totals.total)}</span>
        </div>

        <div className="space-y-3">
          {/* COGS row */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">COGS (Ingredients + Packaging)</span>
              <span className="font-medium tabular-nums">{fmtCurrency(totals.cogs)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-caribbean-green transition-all"
                style={{ width: barWidth(totals.cogs) }}
              />
            </div>
          </div>

          {/* Market fees / overhead row */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Market Fees &amp; Overhead</span>
              <span className="font-medium tabular-nums">{fmtCurrency(totals.marketFees)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all"
                style={{ width: barWidth(totals.marketFees) }}
              />
            </div>
          </div>

          {/* Other row */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Other Expenses</span>
              <span className="font-medium tabular-nums">
                {fmtCurrency(totals.total - totals.cogs - totals.marketFees)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-slate-400 transition-all"
                style={{ width: barWidth(totals.total - totals.cogs - totals.marketFees) }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
