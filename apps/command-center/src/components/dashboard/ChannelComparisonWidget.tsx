'use client';

import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { ChannelStatItem } from '@/app/actions/channel-stats';

const chartConfig: ChartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'hsl(var(--chart-1))',
  },
  orders: {
    label: 'Orders',
    color: 'hsl(var(--chart-2))',
  },
};

type Props = {
  data: ChannelStatItem[];
};

export function ChannelComparisonWidget({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          No orders recorded this month.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      {/* Bar chart — revenue per channel */}
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
                formatter={(value, name) => {
                  if (name === 'revenue') {
                    return new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(value as number);
                  }
                  return String(value);
                }}
              />
            }
          />
          <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="orderCount" fill="var(--color-orders)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>

      {/* Summary table */}
      <table className="w-full mt-4 text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 font-medium text-muted-foreground">Channel</th>
            <th className="text-right py-2 font-medium text-muted-foreground">Revenue</th>
            <th className="text-right py-2 font-medium text-muted-foreground">Orders</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.channel} className="border-b last:border-0">
              <td className="py-2 text-foreground">{row.channel}</td>
              <td className="py-2 text-right font-medium">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 0,
                }).format(row.revenue)}
              </td>
              <td className="py-2 text-right text-muted-foreground">{row.orderCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
