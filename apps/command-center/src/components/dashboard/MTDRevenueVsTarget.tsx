import { TrendingUp } from 'lucide-react';

interface MTDRevenueVsTargetProps {
  mtdRevenue: number;
  targetRevenue: number;
  mtdRevenuePercent: number;
}

export function MTDRevenueVsTarget({
  mtdRevenue,
  targetRevenue,
  mtdRevenuePercent,
}: MTDRevenueVsTargetProps) {
  const cappedPercent = Math.min(mtdRevenuePercent, 100);

  const barColor =
    mtdRevenuePercent >= 80
      ? 'bg-green-500'
      : mtdRevenuePercent >= 50
      ? 'bg-amber-500'
      : 'bg-red-500';

  const targetK = (targetRevenue / 1000).toFixed(0);

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm border-l-4 border-l-caribbean-green">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">MTD Revenue</p>
          <div className="mt-2">
            <p className="text-3xl font-bold">${mtdRevenue.toFixed(2)}</p>
          </div>
          {/* Progress bar */}
          <div className="mt-3 space-y-1">
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full transition-all ${barColor}`}
                style={{ width: `${cappedPercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {mtdRevenuePercent.toFixed(1)}% of ${targetK}K target
            </p>
          </div>
        </div>
        <div className="rounded-lg bg-caribbean-green/10 p-3 text-caribbean-green">
          <TrendingUp className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
