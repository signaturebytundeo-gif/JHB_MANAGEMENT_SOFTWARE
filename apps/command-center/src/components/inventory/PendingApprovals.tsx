'use client';

import { useState } from 'react';
import { approveAdjustment } from '@/app/actions/inventory';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

type PendingMovement = {
  id: string;
  batchCode: string;
  productName: string;
  fromLocation: string | null;
  toLocation: string | null;
  quantity: number;
  reason: string | null;
  notes: string | null;
  createdBy: string;
  createdById: string;
  createdAt: string;
  requiresApproval: boolean;
};

interface PendingApprovalsProps {
  pendingMovements: PendingMovement[];
  currentUserId: string;
  isAdmin: boolean;
}

const REASON_LABELS: Record<string, string> = {
  DAMAGE: 'Damage',
  SHRINKAGE: 'Shrinkage',
  SAMPLING: 'Sampling',
  EXPIRED: 'Expired',
  COUNT_CORRECTION: 'Count Correction',
};

function ApproveButton({
  movementId,
  isOwnAdjustment,
}: {
  movementId: string;
  isOwnAdjustment: boolean;
}) {
  const [approving, setApproving] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null);

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await approveAdjustment(movementId);
      setResult(res);
    } catch {
      setResult({ message: 'An error occurred. Please try again.' });
    } finally {
      setApproving(false);
    }
  };

  if (result?.success) {
    return (
      <span className="text-sm text-green-600 dark:text-green-400 font-medium">Approved</span>
    );
  }

  if (result?.message) {
    return (
      <span className="text-sm text-destructive">{result.message}</span>
    );
  }

  if (isOwnAdjustment) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled
        className="h-9 text-sm opacity-50 cursor-not-allowed"
        title="Cannot approve your own adjustment"
      >
        Cannot Approve Own
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      onClick={handleApprove}
      disabled={approving}
      className="h-9 text-sm bg-caribbean-green hover:bg-caribbean-green/90 text-white"
    >
      {approving ? 'Approving...' : 'Approve'}
    </Button>
  );
}

export function PendingApprovals({
  pendingMovements,
  currentUserId,
  isAdmin,
}: PendingApprovalsProps) {
  if (!isAdmin) return null;

  if (pendingMovements.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        No adjustments awaiting approval.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pendingMovements.map((movement) => {
        const isPositive = movement.toLocation !== null;
        const quantityDisplay = isPositive ? `+${movement.quantity}` : `-${movement.quantity}`;
        const locationDisplay = movement.toLocation ?? movement.fromLocation ?? '—';
        const isOwnAdjustment = movement.createdById === currentUserId;

        let createdAtDisplay = '—';
        try {
          createdAtDisplay = format(new Date(movement.createdAt), 'MMM d, yyyy h:mm a');
        } catch {
          // fallback
        }

        return (
          <div
            key={movement.id}
            className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-3"
          >
            {/* Header row */}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-sm">
                  {movement.batchCode}{' '}
                  <span className="text-muted-foreground font-normal">— {movement.productName}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Location: {locationDisplay}
                </p>
              </div>
              <Badge variant="warning" className="shrink-0">
                Pending Approval
              </Badge>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm">
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Qty Change</span>
                <p
                  className={`font-semibold ${
                    isPositive
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {quantityDisplay}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Reason</span>
                <p>{movement.reason ? (REASON_LABELS[movement.reason] ?? movement.reason) : '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Submitted By</span>
                <p>{movement.createdBy}</p>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Submitted At</span>
                <p>{createdAtDisplay}</p>
              </div>
            </div>

            {/* Notes */}
            {movement.notes && (
              <div className="text-sm">
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Notes: </span>
                <span>{movement.notes}</span>
              </div>
            )}

            {/* Action */}
            <div className="flex justify-end pt-1">
              <ApproveButton movementId={movement.id} isOwnAdjustment={isOwnAdjustment} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
