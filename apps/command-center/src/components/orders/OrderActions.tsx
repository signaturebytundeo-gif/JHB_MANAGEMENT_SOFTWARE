'use client';

import { useTransition, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  confirmOrder,
  approveOrder,
  updateOrderStatus,
} from '@/app/actions/operator-orders';
import type { PickPackList } from '@/app/actions/operator-orders';
import { PickPackList as PickPackListComponent } from './PickPackList';

interface OrderActionsProps {
  order: {
    id: string;
    status: string;
    approvalStatus: string | null;
    totalAmount: number;
    approvedById: string | null;
  };
  pickPackData?: PickPackList | null;
}

export function OrderActions({ order, pickPackData }: OrderActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [showPickList, setShowPickList] = useState(false);

  function handleConfirm() {
    startTransition(async () => {
      const result = await confirmOrder(order.id);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleApprove() {
    startTransition(async () => {
      const result = await approveOrder(order.id);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleStatusChange(newStatus: string) {
    startTransition(async () => {
      const result = await updateOrderStatus(order.id, newStatus);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleCancel() {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    handleStatusChange('CANCELLED');
  }

  const { status, approvalStatus } = order;
  const isPendingApproval =
    approvalStatus === 'pending_single' || approvalStatus === 'pending_dual';
  const canCancel = status !== 'COMPLETED' && status !== 'CANCELLED';

  return (
    <div className="space-y-4">
      {/* Approval status info */}
      {approvalStatus && (
        <div className="text-sm text-muted-foreground">
          {approvalStatus === 'approved' && (
            <span className="text-green-600 font-medium">Auto-approved</span>
          )}
          {approvalStatus === 'pending_single' && (
            <span className="text-yellow-600 font-medium">Awaiting single approval</span>
          )}
          {approvalStatus === 'pending_dual' && !order.approvedById && (
            <span className="text-yellow-600 font-medium">Awaiting first approval (dual control required)</span>
          )}
          {approvalStatus === 'pending_dual' && order.approvedById && (
            <span className="text-yellow-600 font-medium">First approval recorded — awaiting second approver</span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {/* DRAFT — primary action: confirm */}
        {status === 'DRAFT' && !isPendingApproval && (
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Confirming...' : 'Confirm Order'}
          </Button>
        )}

        {/* DRAFT with pending approval — approve button */}
        {status === 'DRAFT' && isPendingApproval && (
          <Button onClick={handleApprove} disabled={isPending} variant="default">
            {isPending ? 'Approving...' : 'Approve Order'}
          </Button>
        )}

        {/* CONFIRMED → PROCESSING */}
        {status === 'CONFIRMED' && (
          <Button onClick={() => handleStatusChange('PROCESSING')} disabled={isPending}>
            {isPending ? 'Updating...' : 'Start Processing'}
          </Button>
        )}

        {/* PROCESSING → SHIPPED + pick list toggle */}
        {status === 'PROCESSING' && (
          <>
            <Button onClick={() => handleStatusChange('SHIPPED')} disabled={isPending}>
              {isPending ? 'Updating...' : 'Mark Shipped'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowPickList((v) => !v)}
              disabled={isPending}
            >
              {showPickList ? 'Hide Pick List' : 'View Pick List'}
            </Button>
          </>
        )}

        {/* SHIPPED → DELIVERED */}
        {status === 'SHIPPED' && (
          <Button onClick={() => handleStatusChange('DELIVERED')} disabled={isPending}>
            {isPending ? 'Updating...' : 'Mark Delivered'}
          </Button>
        )}

        {/* DELIVERED → COMPLETED */}
        {status === 'DELIVERED' && (
          <Button onClick={() => handleStatusChange('COMPLETED')} disabled={isPending}>
            {isPending ? 'Updating...' : 'Complete Order'}
          </Button>
        )}

        {/* Cancel (any non-terminal status) */}
        {canCancel && status !== 'DRAFT' && (
          <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
            Cancel Order
          </Button>
        )}

        {/* Cancel from DRAFT as well */}
        {status === 'DRAFT' && (
          <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
            Cancel Order
          </Button>
        )}
      </div>

      {/* Inline pick/pack list (toggled in PROCESSING) */}
      {showPickList && pickPackData && (
        <div className="mt-4">
          <PickPackListComponent data={pickPackData} />
        </div>
      )}

      {/* Always show pick list for PROCESSING when data available */}
      {status === 'PROCESSING' && pickPackData && !showPickList && (
        <p className="text-sm text-muted-foreground">
          Click "View Pick List" to see batch allocation details for warehouse picking.
        </p>
      )}
    </div>
  );
}
