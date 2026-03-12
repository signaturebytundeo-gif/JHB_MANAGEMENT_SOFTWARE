import { Suspense } from 'react';
import { format, startOfMonth } from 'date-fns';
import { getDailySalesSummary } from '@/app/actions/reports';
import { getAlertStatus } from '@/app/actions/alerts';
import { AlertConfigPanel } from '@/components/reports/AlertConfigPanel';
import { ReportsPageClient } from './ReportsPageClient';

// ── Server Component ──────────────────────────────────────────────────────────

export default async function ReportsPage() {
  const today = new Date();

  // Fetch default report (Daily Sales Summary for today)
  const initialData = await getDailySalesSummary(today);

  // Fetch alert status (separate Suspense boundary doesn't change with report selection)
  const alertStatus = await getAlertStatus();

  const defaultParams = {
    date: format(today, 'yyyy-MM-dd'),
    startDate: format(startOfMonth(today), 'yyyy-MM-dd'),
    endDate: format(today, 'yyyy-MM-dd'),
    month: today.getMonth() + 1,
    year: today.getFullYear(),
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Operational Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate, view, and export operational reports across all business areas.
        </p>
      </div>

      {/* Reports client section */}
      <ReportsPageClient
        initialData={initialData}
        defaultParams={defaultParams}
      />

      {/* Divider */}
      <div className="border-t border-border pt-6 print:hidden">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">System Alerts</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Current status of operational thresholds across inventory, finance, production, and expenses.
          </p>
        </div>
        <Suspense
          fallback={
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-card p-4 h-32 animate-pulse"
                />
              ))}
            </div>
          }
        >
          <AlertConfigPanel alertStatus={alertStatus} />
        </Suspense>
      </div>
    </div>
  );
}
