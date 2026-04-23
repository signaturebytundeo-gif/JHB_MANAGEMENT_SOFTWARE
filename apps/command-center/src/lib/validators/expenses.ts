import { z } from 'zod';
import { ExpenseCategory, PaymentMethod } from '@prisma/client';

export const logExpenseSchema = z.object({
  description: z.string().min(1, { error: 'Description is required' }).max(200, { error: 'Description must be 200 characters or less' }),
  amount: z.coerce.number().positive({ error: 'Amount must be positive' }),
  category: z.nativeEnum(ExpenseCategory, { error: 'Invalid category' }),
  expenseDate: z.coerce.date({ error: 'Invalid date' }),
  vendorName: z.string().optional(),
  notes: z.string().max(500, { error: 'Notes must be 500 characters or less' }).optional(),
  // New recurring expense fields
  subcategory: z.string().max(100, { error: 'Subcategory must be 100 characters or less' }).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod, { error: 'Invalid payment method' }).optional(),
  isRecurring: z.coerce.boolean().optional(),
  recurrenceFrequency: z.enum(['Weekly', 'Monthly', 'Quarterly', 'Annually']).optional(),
  nextDueDate: z.coerce.date().optional(),
  // Receipt scanner fields — populated by /api/scan-receipt before form submit
  prefilledReceiptUrl: z.string().url().optional(),
  lineItems: z.string().optional(), // JSON-stringified array of { name, qty, unit_price }
  scanConfidence: z.enum(['high', 'medium', 'low']).optional(),
  documentType: z.enum(['receipt', 'invoice', 'packing_slip', 'other']).optional(),
});

export const approveExpenseSchema = z.object({
  expenseId: z.string().min(1, { error: 'Expense ID is required' }),
  action: z.enum(['approve', 'reject'], { error: 'Action must be approve or reject' }),
  bankAuthorizationRef: z.string().optional(),
});

export type LogExpenseFormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};

export type ApproveExpenseFormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};
