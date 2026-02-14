import { DollarSign } from 'lucide-react';

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Finance & Expenses</h1>
        <p className="text-muted-foreground mt-2">
          Track revenue, expenses, and financial health of Jamaica House Brand.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-12 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-caribbean-green/10 flex items-center justify-center mb-6">
          <DollarSign className="h-8 w-8 text-caribbean-green" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Coming in Phase 6</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Expense logging, revenue tracking, P&L statements, approval thresholds, and financial dashboards.
        </p>
      </div>
    </div>
  );
}
