'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WeeklyCashPositionItem } from '@/app/actions/financial-reports';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

type Props = {
  data: WeeklyCashPositionItem[];
};

export function WeeklyCashPositionTable({ data }: Props) {
  const avgNetPosition =
    data.length > 0 ? data.reduce((sum, w) => sum + w.netPosition, 0) / data.length : 0;

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Weekly Cash Position</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm italic">No data available for the last 8 weeks.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Weekly Cash Position</CardTitle>
        <p className="text-sm text-muted-foreground">
          Average weekly net position:{' '}
          <span className={avgNetPosition >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
            {formatCurrency(avgNetPosition)}
          </span>
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2">Week</th>
                <th className="text-right py-2">Inflows</th>
                <th className="text-right py-2">Outflows</th>
                <th className="text-right py-2">Net Position</th>
              </tr>
            </thead>
            <tbody>
              {data.map((week) => {
                const netColor = week.netPosition >= 0 ? 'text-green-600' : 'text-red-600';
                return (
                  <tr key={week.weekStart} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="py-2 text-muted-foreground">
                      {week.weekStart} – {week.weekEnd}
                    </td>
                    <td className="py-2 text-right text-green-700">
                      {formatCurrency(week.inflows)}
                    </td>
                    <td className="py-2 text-right text-red-600">
                      ({formatCurrency(week.outflows)})
                    </td>
                    <td className={`py-2 text-right font-semibold ${netColor}`}>
                      {formatCurrency(week.netPosition)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
