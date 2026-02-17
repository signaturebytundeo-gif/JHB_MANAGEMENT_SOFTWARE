import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      status: {
        PLANNED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        IN_PROGRESS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        QC_REVIEW: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
        RELEASED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        HOLD: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      },
    },
    defaultVariants: {
      status: 'PLANNED',
    },
  }
);

type BatchStatus = 'PLANNED' | 'IN_PROGRESS' | 'QC_REVIEW' | 'RELEASED' | 'HOLD';

interface BatchStatusBadgeProps {
  status: BatchStatus | string;
  className?: string;
}

const statusLabels: Record<string, string> = {
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  QC_REVIEW: 'QC Review',
  RELEASED: 'Released',
  HOLD: 'Hold',
};

export function BatchStatusBadge({ status, className }: BatchStatusBadgeProps) {
  const validStatus = status as BatchStatus;
  return (
    <span className={cn(badgeVariants({ status: validStatus }), className)}>
      {statusLabels[status] || status}
    </span>
  );
}
