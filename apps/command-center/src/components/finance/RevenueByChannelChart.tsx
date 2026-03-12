'use client';

import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { RevenueByChannelItem } from '@/app/actions/financial-reports';

const chartConfig: ChartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'hsl(var(--chart-1))',
  },
};

type Props = {
  data: RevenueByChannelItem[];
};

export function RevenueByChannelChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
        No revenue recorded for this date.
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="channel"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(value: number) =>
            value >= 1000 ? `$${(value / 1000).toFixed(0)}K` : `$${value}`
          }
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
                }).format(value as number)
              }
            />
          }
        />
        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
