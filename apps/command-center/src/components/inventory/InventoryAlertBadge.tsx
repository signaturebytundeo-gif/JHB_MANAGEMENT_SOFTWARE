import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type { StockLevel } from '@/lib/utils/reorder-point';

const alertVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      level: {
        HEALTHY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        REORDER: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      },
    },
    defaultVariants: {
      level: 'HEALTHY',
    },
  }
);

interface InventoryAlertBadgeProps extends VariantProps<typeof alertVariants> {
  currentStock: number;
  stockLevel: StockLevel;
  className?: string;
}

export function InventoryAlertBadge({
  currentStock,
  stockLevel,
  className,
}: InventoryAlertBadgeProps) {
  return (
    <span className={cn(alertVariants({ level: stockLevel }), className)}>
      {currentStock.toLocaleString()}
    </span>
  );
}

export { alertVariants };
