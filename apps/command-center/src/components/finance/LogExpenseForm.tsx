'use client';

import { useActionState } from 'react';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { logExpense } from '@/app/actions/expenses';
import type { LogExpenseFormState } from '@/lib/validators/expenses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExpenseCategory } from '@prisma/client';

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  INGREDIENTS: 'Ingredients',
  PACKAGING: 'Packaging',
  LABOR: 'Labor',
  EQUIPMENT: 'Equipment',
  MARKETING: 'Marketing',
  SHIPPING: 'Shipping',
  UTILITIES: 'Utilities',
  RENT: 'Rent',
  INSURANCE: 'Insurance',
  OVERHEAD: 'Overhead',
  OTHER: 'Other',
};

type ApprovalThreshold = {
  minAmount: number;
  maxAmount: number | null;
  approvalType: string;
  description: string;
};

interface LogExpenseFormProps {
  approvalThresholds: ApprovalThreshold[];
}

const initialState: LogExpenseFormState = {};

export function LogExpenseForm({ approvalThresholds }: LogExpenseFormProps) {
  const [state, formAction, isPending] = useActionState(logExpense, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? 'Expense logged');
    } else if (state.message && !state.success && !state.errors) {
      toast.error(state.message);
    }
  }, [state]);

  const today = new Date().toISOString().split('T')[0];

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Description */}
        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="description">Description *</Label>
          <Input
            id="description"
            name="description"
            placeholder="e.g., Scotch bonnet peppers from Walmart"
            required
          />
          {state.errors?.description && (
            <p className="text-sm text-destructive">{state.errors.description[0]}</p>
          )}
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount ($) *</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            required
          />
          {state.errors?.amount && (
            <p className="text-sm text-destructive">{state.errors.amount[0]}</p>
          )}
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <Label htmlFor="category">Category *</Label>
          <Select name="category" required>
            <SelectTrigger id="category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state.errors?.category && (
            <p className="text-sm text-destructive">{state.errors.category[0]}</p>
          )}
        </div>

        {/* Expense Date */}
        <div className="space-y-1.5">
          <Label htmlFor="expenseDate">Date *</Label>
          <Input
            id="expenseDate"
            name="expenseDate"
            type="date"
            defaultValue={today}
            required
          />
          {state.errors?.expenseDate && (
            <p className="text-sm text-destructive">{state.errors.expenseDate[0]}</p>
          )}
        </div>

        {/* Vendor Name */}
        <div className="space-y-1.5">
          <Label htmlFor="vendorName">Vendor Name</Label>
          <Input
            id="vendorName"
            name="vendorName"
            placeholder="Optional"
          />
        </div>

        {/* Receipt Upload */}
        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="receipt">Receipt (optional)</Label>
          <Input
            id="receipt"
            name="receipt"
            type="file"
            accept="image/*,.pdf"
          />
          <p className="text-xs text-muted-foreground">
            Accepted formats: JPG, PNG, PDF
          </p>
        </div>

        {/* Notes */}
        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            placeholder="Optional notes (max 500 characters)"
            rows={3}
          />
          {state.errors?.notes && (
            <p className="text-sm text-destructive">{state.errors.notes[0]}</p>
          )}
        </div>
      </div>

      {/* Approval Threshold Info */}
      {approvalThresholds.length > 0 && (
        <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
          <p className="font-medium text-muted-foreground">Approval Thresholds:</p>
          {approvalThresholds.map((t) => (
            <p key={t.description} className="text-muted-foreground">
              {t.description}: {t.approvalType.replace(/_/g, ' ')}
            </p>
          ))}
        </div>
      )}

      {state.message && !state.success && !state.errors && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-caribbean-green hover:bg-caribbean-green/90 text-white"
      >
        {isPending ? 'Logging Expense...' : 'Log Expense'}
      </Button>
    </form>
  );
}
