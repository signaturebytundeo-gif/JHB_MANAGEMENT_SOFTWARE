'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BudgetVsActualItem } from '@/app/actions/budgets';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatPct(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

type Props = {
  data: BudgetVsActualItem[];
};

export function BudgetVsActualTable({ data }: Props) {
  const overBudgetCount = data.filter((item) => item.variance < 0).length;

  const totals = data.reduce(
    (acc, item) => ({
      budgeted: acc.budgeted + item.budgeted,
      actual: acc.actual + item.actual,
      variance: acc.variance + item.variance,
    }),
    { budgeted: 0, actual: 0, variance: 0 }
  );

  const totalsVariancePct =
    totals.budgeted > 0 ? (totals.variance / totals.budgeted) * 100 : 0;

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Budget vs Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm italic">
            No budget data for this period. Set budgets using the form below.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Budget vs Actual</CardTitle>
        <p className="text-sm text-muted-foreground">
          {overBudgetCount} of {data.length} {data.length === 1 ? 'category' : 'categories'} over budget
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2">Category</th>
                <th className="text-right py-2">Budgeted</th>
                <th className="text-right py-2">Actual</th>
                <th className="text-right py-2">Variance ($)</th>
                <th className="text-right py-2">Variance (%)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => {
                const isOverBudget = item.variance < 0;
                const varianceColor = isOverBudget ? 'text-red-600' : 'text-green-600';

                return (
                  <tr key={item.category} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="py-2 capitalize">
                      {item.category.replace(/_/g, ' ').toLowerCase()}
                    </td>
                    <td className="py-2 text-right">{formatCurrency(item.budgeted)}</td>
                    <td className="py-2 text-right">{formatCurrency(item.actual)}</td>
                    <td className={`py-2 text-right font-medium ${varianceColor}`}>
                      {formatCurrency(item.variance)}
                    </td>
                    <td className={`py-2 text-right font-medium ${varianceColor}`}>
                      {formatPct(item.variancePct)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className={`border-t-2 font-bold ${totals.variance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                <td className="py-2">Total</td>
                <td className="py-2 text-right text-foreground">{formatCurrency(totals.budgeted)}</td>
                <td className="py-2 text-right text-foreground">{formatCurrency(totals.actual)}</td>
                <td className="py-2 text-right">{formatCurrency(totals.variance)}</td>
                <td className="py-2 text-right">{formatPct(totalsVariancePct)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
