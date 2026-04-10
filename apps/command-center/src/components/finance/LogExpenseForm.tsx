'use client';

import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';
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
import { useVoiceFill } from '@/lib/voice/use-voice-fill';

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

export type ScannerPrefill = {
  description?: string;
  amount?: string;
  category?: ExpenseCategory;
  expenseDate?: string;
  vendorName?: string;
  notes?: string;
  receiptUrl?: string;
  lineItems?: Array<{ name: string; qty: number; unit_price: number }>;
  scanConfidence?: 'high' | 'medium' | 'low';
  documentType?: 'receipt' | 'invoice' | 'packing_slip' | 'other';
};

interface LogExpenseFormProps {
  approvalThresholds: ApprovalThreshold[];
  prefill?: ScannerPrefill | null;
}

const initialState: LogExpenseFormState = {};

const todayISO = () => new Date().toISOString().split('T')[0];

export function LogExpenseForm({ approvalThresholds, prefill }: LogExpenseFormProps) {
  const [state, formAction, isPending] = useActionState(logExpense, initialState);

  // Controlled fields — so the scanner can populate them programmatically.
  const [description, setDescription] = useState(prefill?.description ?? '');
  const [amount, setAmount] = useState(prefill?.amount ?? '');
  const [category, setCategory] = useState<ExpenseCategory | ''>(prefill?.category ?? '');
  const [expenseDate, setExpenseDate] = useState(prefill?.expenseDate ?? todayISO());
  const [vendorName, setVendorName] = useState(prefill?.vendorName ?? '');
  const [notes, setNotes] = useState(prefill?.notes ?? '');

  // When a new prefill arrives (user just scanned a receipt), refresh the controlled state.
  useEffect(() => {
    if (!prefill) return;
    if (prefill.description !== undefined) setDescription(prefill.description);
    if (prefill.amount !== undefined) setAmount(prefill.amount);
    if (prefill.category !== undefined) setCategory(prefill.category);
    if (prefill.expenseDate !== undefined) setExpenseDate(prefill.expenseDate);
    if (prefill.vendorName !== undefined) setVendorName(prefill.vendorName);
    if (prefill.notes !== undefined) setNotes(prefill.notes);
  }, [prefill]);

  // Voice fill — uses the same controlled state setters
  const { voiceFields, consumeVoice } = useVoiceFill('finance');
  useEffect(() => {
    if (!voiceFields) return;
    if (voiceFields.description) setDescription(String(voiceFields.description));
    if (voiceFields.amount) setAmount(String(voiceFields.amount));
    if (voiceFields.category) setCategory(voiceFields.category as ExpenseCategory);
    if (voiceFields.expenseDate) setExpenseDate(String(voiceFields.expenseDate));
    if (voiceFields.vendorName) setVendorName(String(voiceFields.vendorName));
    if (voiceFields.notes) setNotes(String(voiceFields.notes));
    consumeVoice();
  }, [voiceFields, consumeVoice]);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? 'Expense logged');
    } else if (state.message && !state.success && !state.errors) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form data-voice-page="finance" action={formAction} className="space-y-4">
      {prefill?.receiptUrl && (
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4" />
          <span>Auto-filled from receipt{prefill.scanConfidence ? ` · ${prefill.scanConfidence} confidence` : ''}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Description */}
        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="description">Description *</Label>
          <Input
            id="description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
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
          <Select
            name="category"
            required
            value={category || undefined}
            onValueChange={(v) => setCategory(v as ExpenseCategory)}
          >
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
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
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
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            placeholder="Optional"
          />
        </div>

        {/* Receipt Upload — only shown when the scanner did NOT already provide a receipt */}
        {!prefill?.receiptUrl && (
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="receipt">Receipt (optional)</Label>
            <Input
              id="receipt"
              name="receipt"
              type="file"
              accept="image/*,.pdf"
            />
            <p className="text-xs text-muted-foreground">
              Accepted formats: JPG, PNG, PDF — or use the Scan Receipt button above for auto-fill.
            </p>
          </div>
        )}

        {/* Notes */}
        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes (max 500 characters)"
            rows={3}
          />
          {state.errors?.notes && (
            <p className="text-sm text-destructive">{state.errors.notes[0]}</p>
          )}
        </div>
      </div>

      {/* Hidden scanner-provided fields */}
      {prefill?.receiptUrl && (
        <input type="hidden" name="prefilledReceiptUrl" value={prefill.receiptUrl} />
      )}
      {prefill?.lineItems && prefill.lineItems.length > 0 && (
        <input type="hidden" name="lineItems" value={JSON.stringify(prefill.lineItems)} />
      )}
      {prefill?.scanConfidence && (
        <input type="hidden" name="scanConfidence" value={prefill.scanConfidence} />
      )}
      {prefill?.documentType && (
        <input type="hidden" name="documentType" value={prefill.documentType} />
      )}

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
