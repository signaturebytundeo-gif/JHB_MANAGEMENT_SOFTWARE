'use client';

import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';
import { X, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { logPayment } from '@/app/actions/invoices';

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'SQUARE', label: 'Square' },
  { value: 'STRIPE', label: 'Stripe' },
  { value: 'ZELLE', label: 'Zelle' },
  { value: 'CHECK', label: 'Check' },
  { value: 'NET_30', label: 'Net 30' },
  { value: 'OTHER', label: 'Other' },
];

interface PaymentModalProps {
  invoiceId: string;
  invoiceNumber: string;
  balanceDue: number;
  onClose: () => void;
}

export function PaymentModal({
  invoiceId,
  invoiceNumber,
  balanceDue,
  onClose,
}: PaymentModalProps) {
  const [state, formAction, isPending] = useActionState(logPayment, undefined);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message ?? 'Payment recorded');
      onClose();
    } else if (state?.message && !state.success) {
      toast.error(state.message);
    }
  }, [state, onClose]);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-caribbean-green" />
            <h2 className="text-lg font-semibold">Log Payment</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Invoice context */}
        <div className="px-4 pt-4 pb-2 bg-muted/30 border-b">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Invoice</span>
            <span className="font-mono font-medium">{invoiceNumber}</span>
          </div>
          <div className="flex justify-between items-center text-sm mt-1">
            <span className="text-muted-foreground">Balance Due</span>
            <span className="font-semibold text-foreground">${balanceDue.toFixed(2)}</span>
          </div>
        </div>

        <form action={formAction} className="p-4 space-y-4">
          <input type="hidden" name="invoiceId" value={invoiceId} />

          <div className="space-y-2">
            <Label htmlFor="amount">Payment Amount</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={balanceDue}
              defaultValue={balanceDue.toFixed(2)}
              required
              className="h-11 text-base"
              placeholder="0.00"
            />
            {state?.errors?.amount && (
              <p className="text-xs text-destructive">{state.errors.amount[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select name="paymentMethod" defaultValue="CASH">
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state?.errors?.paymentMethod && (
              <p className="text-xs text-destructive">{state.errors.paymentMethod[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paidAt">Payment Date</Label>
            <Input
              id="paidAt"
              name="paidAt"
              type="date"
              defaultValue={today}
              required
              className="h-11 text-base"
            />
            {state?.errors?.paidAt && (
              <p className="text-xs text-destructive">{state.errors.paidAt[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="Check #, reference number..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {state?.message && !state.success && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-caribbean-green hover:bg-caribbean-green/90 text-white"
          >
            {isPending ? 'Recording...' : 'Record Payment'}
          </Button>
        </form>
      </div>
    </div>
  );
}
