'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CashFlowProjectionWeek } from '@/app/actions/financial-reports';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

type Props = {
  data: CashFlowProjectionWeek[];
};

export function CashFlowProjectionChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">90-Day Cash Flow Projection</CardTitle>
          <p className="text-sm text-muted-foreground">Estimated based on 30-day averages</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            No projection data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">90-Day Cash Flow Projection</CardTitle>
        <p className="text-sm text-muted-foreground">
          Estimated based on 30-day rolling averages plus outstanding invoices due
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
              <defs>
                <linearGradient id="inflowGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="outflowGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="weekStart"
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === 'projectedInflow'
                    ? 'Projected Inflow'
                    : name === 'projectedOutflow'
                    ? 'Projected Outflow'
                    : 'Cumulative Net',
                ]}
              />
              <Legend
                formatter={(value) =>
                  value === 'projectedInflow'
                    ? 'Projected Inflow'
                    : value === 'projectedOutflow'
                    ? 'Projected Outflow'
                    : 'Cumulative Net'
                }
              />
              <Area
                type="monotone"
                dataKey="projectedInflow"
                stroke="#16a34a"
                strokeWidth={2}
                fill="url(#inflowGradient)"
              />
              <Area
                type="monotone"
                dataKey="projectedOutflow"
                stroke="#dc2626"
                strokeWidth={2}
                fill="url(#outflowGradient)"
              />
              <Area
                type="monotone"
                dataKey="cumulativeNet"
                stroke="#2563eb"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="url(#cumulativeGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
