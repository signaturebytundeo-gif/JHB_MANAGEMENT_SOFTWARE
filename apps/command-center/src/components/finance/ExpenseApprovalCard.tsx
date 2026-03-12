'use client';

import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';
import { approveExpense } from '@/app/actions/expenses';
import type { ExpenseListItem } from '@/app/actions/expenses';
import type { ApproveExpenseFormState } from '@/lib/validators/expenses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ExpenseApprovalCardProps {
  expense: ExpenseListItem;
  currentUserId: string;
}

const initialState: ApproveExpenseFormState = {};

export function ExpenseApprovalCard({ expense, currentUserId }: ExpenseApprovalCardProps) {
  const [state, formAction, isPending] = useActionState(approveExpense, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? 'Action completed');
    } else if (state.message && !state.success) {
      toast.error(state.message);
    }
  }, [state]);

  const isFirstApproverSet = !!expense.approvedById;
  const isCurrentUserFirstApprover = expense.approvedById === currentUserId;
  const isPendingBank = expense.approvalStatus === 'pending_bank';
  const isDualWaitingSecond =
    (expense.approvalStatus === 'pending_dual' || isPendingBank) && isFirstApproverSet;

  // If current user is already the first approver on dual-control, show waiting state
  if (isDualWaitingSecond && isCurrentUserFirstApprover) {
    return (
      <Card className="border border-yellow-200 bg-yellow-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{expense.description}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-medium">${expense.amount.toFixed(2)}</span>
          </div>
          <p className="text-muted-foreground italic">Awaiting second approver...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-yellow-200 bg-yellow-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium">{expense.description}</CardTitle>
          <Badge variant="outline" className="text-xs border-yellow-400 text-yellow-700">
            {expense.approvalStatus?.replace(/_/g, ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Amount</span>
            <p className="font-semibold">${expense.amount.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Category</span>
            <p>{expense.category}</p>
          </div>
          {expense.vendorName && (
            <div>
              <span className="text-muted-foreground">Vendor</span>
              <p>{expense.vendorName}</p>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Submitted by</span>
            <p>{expense.createdBy?.name ?? 'Unknown'}</p>
          </div>
        </div>

        {isPendingBank && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
            This expense requires dual approval + a bank authorization reference number.
          </p>
        )}

        <form action={formAction} className="space-y-3">
          <input type="hidden" name="expenseId" value={expense.id} />

          {isPendingBank && (
            <div className="space-y-1.5">
              <Label htmlFor={`bankRef-${expense.id}`} className="text-sm">
                Bank Authorization Ref *
              </Label>
              <Input
                id={`bankRef-${expense.id}`}
                name="bankAuthorizationRef"
                placeholder="e.g., AUTH-2026-001"
                required
              />
            </div>
          )}

          {state.errors && (
            <p className="text-xs text-destructive">
              {Object.values(state.errors).flat()[0]}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              name="action"
              value="approve"
              disabled={isPending}
              size="sm"
              className="flex-1 bg-caribbean-green hover:bg-caribbean-green/90 text-white"
            >
              {isPending ? 'Processing...' : isDualWaitingSecond ? 'Approve (2nd)' : 'Approve'}
            </Button>
            <Button
              type="submit"
              name="action"
              value="reject"
              disabled={isPending}
              size="sm"
              variant="destructive"
              className="flex-1"
            >
              Reject
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
