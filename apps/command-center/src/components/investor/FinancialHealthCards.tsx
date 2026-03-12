import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  grossMargin: number;
  netMargin: number;
  totalRevenue: number;
  totalExpenses: number;
  monthlyProjection: number;
};

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  positive,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  positive?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p
            className={cn(
              'mt-2 text-2xl font-bold',
              positive === true && 'text-caribbean-green',
              positive === false && 'text-red-500'
            )}
          >
            {value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="rounded-lg bg-muted p-3 text-muted-foreground">{icon}</div>
      </div>
    </div>
  );
}

export function FinancialHealthCards({
  grossMargin,
  netMargin,
  totalRevenue,
  totalExpenses,
  monthlyProjection,
}: Props) {
  const revenueVsProjection = totalRevenue - monthlyProjection;
  const revenueVsProjectionPct =
    monthlyProjection > 0 ? (revenueVsProjection / monthlyProjection) * 100 : 0;
  const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Gross Margin"
        value={`${grossMargin.toFixed(1)}%`}
        subtitle="Revenue minus COGS"
        icon={<TrendingUp className="h-5 w-5" />}
        positive={grossMargin >= 40}
      />
      <MetricCard
        title="Net Margin"
        value={`${netMargin.toFixed(1)}%`}
        subtitle="After operating expenses"
        icon={<BarChart3 className="h-5 w-5" />}
        positive={netMargin >= 0}
      />
      <MetricCard
        title="Revenue vs Projection"
        value={`${revenueVsProjection >= 0 ? '+' : ''}${formatCurrency(revenueVsProjection)}`}
        subtitle={`${Math.abs(revenueVsProjectionPct).toFixed(1)}% ${revenueVsProjection >= 0 ? 'above' : 'below'} target`}
        icon={<DollarSign className="h-5 w-5" />}
        positive={revenueVsProjection >= 0}
      />
      <MetricCard
        title="Expense Ratio"
        value={`${expenseRatio.toFixed(1)}%`}
        subtitle="Operating expenses / revenue"
        icon={<TrendingDown className="h-5 w-5" />}
        positive={expenseRatio <= 60}
      />
    </div>
  );
}
