import { getInvoices, getARAgingReport, flagOverdueInvoices } from '@/app/actions/invoices';
import { FinanceDashboardClient } from '@/components/finance/FinanceDashboardClient';

export default async function FinancePage() {
  // Flag overdue invoices first, then query
  await flagOverdueInvoices();
  const [invoices, report] = await Promise.all([getInvoices(), getARAgingReport()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Finance</h1>
        <p className="text-muted-foreground mt-2">
          Manage invoices, track payments, and monitor accounts receivable aging.
        </p>
      </div>

      <FinanceDashboardClient invoices={invoices} report={report} />
    </div>
  );
}
