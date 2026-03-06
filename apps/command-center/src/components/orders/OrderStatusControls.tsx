'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrderStatus } from '@/app/actions/orders';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FulfillmentModal } from './FulfillmentModal';
import { Package, Truck, CheckCircle } from 'lucide-react';

interface OrderStatusControlsProps {
  orderId: string;
  currentStatus: string;
  customerName: string;
}

type NextStatusConfig = {
  label: string;
  nextStatus: string;
  icon: React.ReactNode;
  opensFulfillmentModal?: boolean;
};

const NEXT_STATUS_MAP: Record<string, NextStatusConfig> = {
  NEW: {
    label: 'Mark as Processing',
    nextStatus: 'PROCESSING',
    icon: <Package className="h-4 w-4 mr-2" />,
  },
  PROCESSING: {
    label: 'Mark as Shipped',
    nextStatus: 'SHIPPED',
    icon: <Truck className="h-4 w-4 mr-2" />,
    opensFulfillmentModal: true,
  },
  SHIPPED: {
    label: 'Mark as Delivered',
    nextStatus: 'DELIVERED',
    icon: <CheckCircle className="h-4 w-4 mr-2" />,
  },
};

export function OrderStatusControls({
  orderId,
  currentStatus,
  customerName,
}: OrderStatusControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showFulfillmentModal, setShowFulfillmentModal] = useState(false);

  const config = NEXT_STATUS_MAP[currentStatus];

  if (!config) {
    return (
      <p className="text-sm text-muted-foreground">
        This order is {currentStatus.toLowerCase()}. No further actions available.
      </p>
    );
  }

  const handleAdvance = () => {
    if (config.opensFulfillmentModal) {
      setShowFulfillmentModal(true);
      return;
    }

    startTransition(async () => {
      const result = await updateOrderStatus(orderId, config.nextStatus as any);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleAdvance}
        disabled={isPending}
        className="bg-caribbean-green hover:bg-caribbean-green/90 text-white"
      >
        {config.icon}
        {isPending ? 'Updating...' : config.label}
      </Button>

      <p className="text-xs text-muted-foreground">
        Current status: {currentStatus.charAt(0) + currentStatus.slice(1).toLowerCase()} &rarr; Next:{' '}
        {config.nextStatus.charAt(0) + config.nextStatus.slice(1).toLowerCase()}
      </p>

      {showFulfillmentModal && (
        <FulfillmentModal
          orderId={orderId}
          customerName={customerName}
          onClose={() => setShowFulfillmentModal(false)}
          onSuccess={() => {
            setShowFulfillmentModal(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
