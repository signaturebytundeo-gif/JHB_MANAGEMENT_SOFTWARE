'use client';

import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { MonthlyRevenueTrendItem } from '@/app/actions/financial-reports';

const chartConfig: ChartConfig = {
  revenue: {
    label: 'Actual Revenue',
    color: 'hsl(var(--chart-1))',
  },
  projection: {
    label: 'Projection',
    color: 'hsl(var(--chart-2))',
  },
};

type Props = {
  data: MonthlyRevenueTrendItem[];
};

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

export function RevenueVsProjectionChart({ data }: Props) {
  return (
    <ChartContainer config={chartConfig} className="h-72 w-full">
      <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={formatCurrency}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={60}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) =>
                new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 0,
                }).format(value as number)
              }
            />
          }
        />
        <Legend />
        <Bar dataKey="projection" fill="var(--color-projection)" radius={[4, 4, 0, 0]} opacity={0.5} />
        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
