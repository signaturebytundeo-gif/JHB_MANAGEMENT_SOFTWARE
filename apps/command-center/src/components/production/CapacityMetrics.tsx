import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CapacityMetricsProps {
  totalUnits: number;
  target?: number;
  batchCount: number;
  utilizationPercent: number;
}

export function CapacityMetrics({
  totalUnits,
  target = 15000,
  batchCount,
  utilizationPercent,
}: CapacityMetricsProps) {
  // Color coding based on utilization
  const getColorClass = () => {
    if (utilizationPercent >= 90) return 'bg-red-500';
    if (utilizationPercent >= 70) return 'bg-yellow-500';
    return 'bg-caribbean-green';
  };

  const cappedPercent = Math.min(utilizationPercent, 100);

  return (
    <Card className="border-l-4 border-l-caribbean-green">
      <CardHeader>
        <CardTitle className="text-lg">Production Capacity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold">{totalUnits.toLocaleString()}</p>
            <p className="text-muted-foreground">/ {target.toLocaleString()} units</p>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Current month target
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full transition-all', getColorClass())}
              style={{ width: `${cappedPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {utilizationPercent.toFixed(1)}% utilized
            </span>
            <span className="text-muted-foreground">
              {batchCount} {batchCount === 1 ? 'batch' : 'batches'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
