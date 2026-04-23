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

// New categories per requirements (matching database enum values)
const CATEGORY_OPTIONS = [
  'COGS_INGREDIENTS',
  'COGS_PACKAGING',
  'MARKET_FEES_OVERHEAD',
  'TRAVEL_TRANSPORT',
  'MARKETING_PROMO',
  'STORAGE_RENT',
  'OTHER',
] as const;

// Payment method options per requirements (matching database enum values)
const PAYMENT_METHOD_OPTIONS = [
  'CASH',
  'MASTERCARD_6842',
  'BUSINESS_CARD',
  'OTHER',
] as const;

// Recurrence frequency options
const RECURRENCE_OPTIONS = [
  'Weekly',
  'Monthly',
  'Quarterly',
  'Annually',
] as const;

// Category labels for template grouping
const CATEGORY_LABELS: Record<string, string> = {
  'COGS_INGREDIENTS': 'COGS - Ingredients',
  'COGS_PACKAGING': 'COGS - Packaging',
  'MARKET_FEES_OVERHEAD': 'Market Fees & Overhead',
  'TRAVEL_TRANSPORT': 'Travel & Transport',
  'MARKETING_PROMO': 'Marketing & Promo',
  'STORAGE_RENT': 'Storage & Rent',
  'OTHER': 'Other',
};

// Payment method labels for user-friendly display
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  'CASH': 'Cash',
  'MASTERCARD_6842': 'Mastercard 6842',
  'BUSINESS_CARD': 'Business Card',
  'OTHER': 'Other',
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

type ExpenseTemplate = {
  id: string;
  vendor: string;
  category: string;
  subcategory: string | null;
  description: string;
  paymentMethod: string | null;
  isRecurring: boolean;
  recurrenceFrequency: string | null;
};

interface LogExpenseFormProps {
  approvalThresholds: ApprovalThreshold[];
  templates: ExpenseTemplate[];
  prefill?: ScannerPrefill | null;
}

const initialState: LogExpenseFormState = {};

const todayISO = () => new Date().toISOString().split('T')[0];

export function LogExpenseForm({ approvalThresholds, templates, prefill }: LogExpenseFormProps) {
  const [state, formAction, isPending] = useActionState(logExpense, initialState);

  // Controlled fields — so the scanner can populate them programmatically.
  const [description, setDescription] = useState(prefill?.description ?? '');
  const [amount, setAmount] = useState(prefill?.amount ?? '');
  const [category, setCategory] = useState<string>(prefill?.category ?? '');
  const [expenseDate, setExpenseDate] = useState(prefill?.expenseDate ?? todayISO());
  const [vendorName, setVendorName] = useState(prefill?.vendorName ?? '');
  const [notes, setNotes] = useState(prefill?.notes ?? '');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // New fields for recurring expenses
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [subcategory, setSubcategory] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<string>('');
  const [nextDueDate, setNextDueDate] = useState<string>('');

  // Auto-calculate next due date when recurrence frequency changes
  const calculateNextDueDate = (frequency: string, baseDate = new Date()) => {
    const nextDate = new Date(baseDate);
    switch (frequency) {
      case 'Weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'Monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'Quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'Annually':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        return '';
    }
    return nextDate.toISOString().split('T')[0];
  };

  // Handle recurrence frequency change
  const handleRecurrenceChange = (frequency: string) => {
    setRecurrenceFrequency(frequency);
    if (frequency && isRecurring) {
      const baseDate = expenseDate ? new Date(expenseDate) : new Date();
      setNextDueDate(calculateNextDueDate(frequency, baseDate));
    }
  };

  // Handle recurring toggle
  const handleRecurringToggle = (checked: boolean) => {
    setIsRecurring(checked);
    if (checked && recurrenceFrequency) {
      const baseDate = expenseDate ? new Date(expenseDate) : new Date();
      setNextDueDate(calculateNextDueDate(recurrenceFrequency, baseDate));
    } else {
      setNextDueDate('');
      setRecurrenceFrequency('');
    }
  };

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    if (!templateId) {
      setSelectedTemplate('');
      return;
    }

    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setVendorName(template.vendor);
      setCategory(template.category as ExpenseCategory);
      setDescription(template.description);
      setSubcategory(template.subcategory || '');
      setPaymentMethod(template.paymentMethod || '');
      setIsRecurring(template.isRecurring);
      if (template.isRecurring && template.recurrenceFrequency) {
        setRecurrenceFrequency(template.recurrenceFrequency);
        const baseDate = expenseDate ? new Date(expenseDate) : new Date();
        setNextDueDate(calculateNextDueDate(template.recurrenceFrequency, baseDate));
      }
      // Amount and date are intentionally left blank as per requirements
      // setAmount(''); // Already blank
      // setExpenseDate(todayISO()); // Already set to today
    }
  };

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

      {/* Template Selection */}
      {templates.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="template">Load from saved expense</Label>
          <Select
            value={selectedTemplate}
            onValueChange={handleTemplateSelect}
          >
            <SelectTrigger id="template">
              <SelectValue placeholder="Quick-fill from a past expense..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(
                templates.reduce((groups, template) => {
                  const category = CATEGORY_LABELS[template.category as ExpenseCategory] || template.category;
                  if (!groups[category]) groups[category] = [];
                  groups[category].push(template);
                  return groups;
                }, {} as Record<string, ExpenseTemplate[]>)
              ).map(([category, categoryTemplates]) => (
                <div key={category}>
                  <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                    {category}
                  </div>
                  {categoryTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.vendor} — {template.description}
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Select a saved expense to pre-fill vendor, category, and description. Amount and date will remain blank for you to enter.
          </p>
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
            onValueChange={(v) => setCategory(v)}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {CATEGORY_LABELS[option] || option}
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
          <Label htmlFor="vendorName">Vendor Name *</Label>
          <Input
            id="vendorName"
            name="vendorName"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            placeholder="e.g., ExtraSpace Storage"
            required
          />
        </div>

        {/* Subcategory */}
        <div className="space-y-1.5">
          <Label htmlFor="subcategory">Subcategory</Label>
          <Input
            id="subcategory"
            name="subcategory"
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            placeholder="Optional"
          />
        </div>

        {/* Payment Method */}
        <div className="space-y-1.5">
          <Label htmlFor="paymentMethod">Payment Method *</Label>
          <Select
            name="paymentMethod"
            required
            value={paymentMethod || undefined}
            onValueChange={(v) => setPaymentMethod(v)}
          >
            <SelectTrigger id="paymentMethod">
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHOD_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {PAYMENT_METHOD_LABELS[option] || option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Is Recurring Checkbox */}
        <div className="md:col-span-2 space-y-1.5">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isRecurring"
              name="isRecurring"
              checked={isRecurring}
              onChange={(e) => handleRecurringToggle(e.target.checked)}
              className="h-4 w-4 rounded border border-input"
            />
            <Label htmlFor="isRecurring">This is a recurring expense</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Recurring expenses are automatically approved and will be scheduled for future periods.
          </p>
        </div>

        {/* Recurrence Frequency - only show if recurring */}
        {isRecurring && (
          <div className="space-y-1.5">
            <Label htmlFor="recurrenceFrequency">Recurrence Frequency *</Label>
            <Select
              name="recurrenceFrequency"
              required={isRecurring}
              value={recurrenceFrequency || undefined}
              onValueChange={handleRecurrenceChange}
            >
              <SelectTrigger id="recurrenceFrequency">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {RECURRENCE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Next Due Date - only show if recurring */}
        {isRecurring && (
          <div className="space-y-1.5">
            <Label htmlFor="nextDueDate">Next Due Date *</Label>
            <Input
              id="nextDueDate"
              name="nextDueDate"
              type="date"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
              required={isRecurring}
            />
          </div>
        )}

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
