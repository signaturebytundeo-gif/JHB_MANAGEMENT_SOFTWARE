'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Save } from 'lucide-react';
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
import { ExpenseCategory, PaymentMethod } from '@prisma/client';
import type { ExpenseListItem } from '@/app/actions/expenses';

// Category options (matching database enum values)
const CATEGORY_OPTIONS = [
  'COGS_INGREDIENTS',
  'COGS_PACKAGING',
  'MARKET_FEES_OVERHEAD',
  'TRAVEL_TRANSPORT',
  'MARKETING_PROMO',
  'STORAGE_RENT',
  'OTHER',
] as const;

// Payment method options (matching database enum values)
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

// Category labels for display
const CATEGORY_LABELS: Record<string, string> = {
  'COGS_INGREDIENTS': 'COGS - Ingredients',
  'COGS_PACKAGING': 'COGS - Packaging',
  'MARKET_FEES_OVERHEAD': 'Market Fees & Overhead',
  'TRAVEL_TRANSPORT': 'Travel & Transport',
  'MARKETING_PROMO': 'Marketing & Promo',
  'STORAGE_RENT': 'Storage & Rent',
  'OTHER': 'Other',
};

// Payment method labels for display
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  'CASH': 'Cash',
  'MASTERCARD_6842': 'Mastercard 6842',
  'BUSINESS_CARD': 'Business Card',
  'OTHER': 'Other',
};

interface EditExpenseFormProps {
  expense: ExpenseListItem;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EditExpenseForm({ expense, onSuccess, onCancel }: EditExpenseFormProps) {
  // Form state
  const [description, setDescription] = useState(expense.description);
  const [amount, setAmount] = useState(String(expense.amount));
  const [category, setCategory] = useState<string>(expense.category);
  const [expenseDate, setExpenseDate] = useState(
    expense.expenseDate.toISOString().split('T')[0]
  );
  const [vendorName, setVendorName] = useState(expense.vendorName || '');
  const [notes, setNotes] = useState(expense.notes || '');
  const [subcategory, setSubcategory] = useState(expense.subcategory || '');
  const [paymentMethod, setPaymentMethod] = useState<string>(expense.paymentMethod || '');
  const [isRecurring, setIsRecurring] = useState(expense.isRecurring);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState(expense.recurrenceFrequency || '');
  const [nextDueDate, setNextDueDate] = useState(
    expense.nextDueDate ? expense.nextDueDate.toISOString().split('T')[0] : ''
  );
  const [editReason, setEditReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editReason.trim()) {
      toast.error('Edit reason is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/edit-expense', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expenseId: expense.id,
          description,
          amount: parseFloat(amount),
          category,
          expenseDate,
          vendorName: vendorName || undefined,
          notes: notes || undefined,
          subcategory: subcategory || undefined,
          paymentMethod: paymentMethod || undefined,
          isRecurring,
          recurrenceFrequency: recurrenceFrequency || undefined,
          nextDueDate: nextDueDate || undefined,
          editReason,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update expense');
      }

      toast.success(result.message);

      if (result.needsReapproval) {
        toast.info('Expense now requires re-approval due to significant changes.');
      }

      onSuccess();
    } catch (error) {
      console.error('Edit expense error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Editing Expense</p>
          <p>
            Significant changes to approved expenses may require re-approval.
            Please provide a reason for your edits.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Description */}
        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="description">Description *</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Scotch bonnet peppers from Walmart"
            required
          />
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount ($) *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <Label htmlFor="category">Category *</Label>
          <Select value={category} onValueChange={setCategory} required>
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
        </div>

        {/* Expense Date */}
        <div className="space-y-1.5">
          <Label htmlFor="expenseDate">Date *</Label>
          <Input
            id="expenseDate"
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            required
          />
        </div>

        {/* Vendor Name */}
        <div className="space-y-1.5">
          <Label htmlFor="vendorName">Vendor Name</Label>
          <Input
            id="vendorName"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            placeholder="e.g., ExtraSpace Storage"
          />
        </div>

        {/* Subcategory */}
        <div className="space-y-1.5">
          <Label htmlFor="subcategory">Subcategory</Label>
          <Input
            id="subcategory"
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            placeholder="Optional"
          />
        </div>

        {/* Payment Method */}
        <div className="space-y-1.5">
          <Label htmlFor="paymentMethod">Payment Method</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
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
              checked={isRecurring}
              onChange={(e) => handleRecurringToggle(e.target.checked)}
              className="h-4 w-4 rounded border border-input"
            />
            <Label htmlFor="isRecurring">This is a recurring expense</Label>
          </div>
        </div>

        {/* Recurrence Frequency - only show if recurring */}
        {isRecurring && (
          <div className="space-y-1.5">
            <Label htmlFor="recurrenceFrequency">Recurrence Frequency *</Label>
            <Select
              value={recurrenceFrequency}
              onValueChange={handleRecurrenceChange}
              required={isRecurring}
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
              type="date"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
              required={isRecurring}
            />
          </div>
        )}

        {/* Notes */}
        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes (max 500 characters)"
            rows={3}
          />
        </div>

        {/* Edit Reason */}
        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="editReason">Reason for Edit *</Label>
          <Textarea
            id="editReason"
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
            placeholder="Please explain why you are editing this expense..."
            rows={3}
            required
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-caribbean-green hover:bg-caribbean-green/90 text-white"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}