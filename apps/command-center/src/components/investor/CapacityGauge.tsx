import { cn } from '@/lib/utils';

type Props = {
  utilization: number;
  totalUnits: number;
  target: number;
};

function getColorClass(utilization: number): string {
  if (utilization >= 70) return 'bg-caribbean-green';
  if (utilization >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

export function CapacityGauge({ utilization, totalUnits, target }: Props) {
  const cappedPercent = Math.min(utilization, 100);
  const colorClass = getColorClass(utilization);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold">{utilization.toFixed(1)}%</span>
        <span className="text-muted-foreground text-sm">utilized</span>
      </div>

      <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full transition-all duration-500', colorClass)}
          style={{ width: `${cappedPercent}%` }}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {totalUnits.toLocaleString()} of {target.toLocaleString()} unit capacity
      </p>

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-caribbean-green" />
          &ge;70% healthy
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
          40–69% moderate
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
          &lt;40% low
        </span>
      </div>
    </div>
  );
}
