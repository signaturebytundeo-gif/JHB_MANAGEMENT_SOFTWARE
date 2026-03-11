import { Badge } from '@/components/ui/badge';
import type { OperatorOrderStatus } from '@prisma/client';

const STATUS_CONFIG: Record<
  OperatorOrderStatus,
  { label: string; className: string }
> = {
  DRAFT: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-blue-500 text-white' },
  PROCESSING: { label: 'Processing', className: 'bg-yellow-500 text-black' },
  SHIPPED: { label: 'Shipped', className: 'bg-purple-500 text-white' },
  DELIVERED: { label: 'Delivered', className: 'bg-emerald-500 text-white' },
  COMPLETED: { label: 'Completed', className: 'bg-green-500 text-white' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-500 text-white' },
};

interface OrderStatusBadgeProps {
  status: string;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status as OperatorOrderStatus] ?? {
    label: status,
    className: 'bg-muted text-foreground',
  };

  return <Badge className={config.className}>{config.label}</Badge>;
}
