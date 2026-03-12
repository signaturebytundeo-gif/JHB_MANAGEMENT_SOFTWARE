'use client';

import { Pie, PieChart, Cell } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

type ChannelRevenueItem = {
  channel: string;
  revenue: number;
};

type Props = {
  data: ChannelRevenueItem[];
};

export function ChannelPieChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No channel revenue data available.
      </div>
    );
  }

  // Build dynamic chart config from data keys
  const chartConfig: ChartConfig = data.reduce(
    (acc, item, i) => ({
      ...acc,
      [item.channel]: {
        label: item.channel,
        color: CHART_COLORS[i % CHART_COLORS.length],
      },
    }),
    {} as ChartConfig
  );

  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);

  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <PieChart>
        <Pie
          data={data}
          dataKey="revenue"
          nameKey="channel"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ channel, percent }) =>
            `${channel} ${(percent * 100).toFixed(0)}%`
          }
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
            />
          ))}
        </Pie>
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
      </PieChart>
    </ChartContainer>
  );
}
