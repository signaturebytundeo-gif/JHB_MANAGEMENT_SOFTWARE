import { BarChart } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Analyze production, sales, and financial data with interactive reports.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-12 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-caribbean-green/10 flex items-center justify-center mb-6">
          <BarChart className="h-8 w-8 text-caribbean-green" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Coming in Phase 5</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Sales reports, production analytics, inventory summaries, trend analysis, and exportable data views.
        </p>
      </div>
    </div>
  );
}
