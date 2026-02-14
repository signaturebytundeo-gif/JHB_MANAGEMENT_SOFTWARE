import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { ReactNode } from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

export function KPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'caribbean-green',
}: KPICardProps) {
  const trendIcon = trend === 'up'
    ? <ArrowUp className="h-4 w-4 text-green-500" />
    : trend === 'down'
    ? <ArrowDown className="h-4 w-4 text-red-500" />
    : trend === 'neutral'
    ? <Minus className="h-4 w-4 text-muted-foreground" />
    : null;

  return (
    <div className={`rounded-lg border bg-card p-6 shadow-sm border-l-4 border-l-${color}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-bold">{value}</p>
            {trendIcon && <span className="flex items-center">{trendIcon}</span>}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={`rounded-lg bg-${color}/10 p-3 text-${color}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
