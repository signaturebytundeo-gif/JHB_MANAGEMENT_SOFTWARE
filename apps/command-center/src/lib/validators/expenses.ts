import { z } from 'zod';
import { ExpenseCategory } from '@prisma/client';

export const logExpenseSchema = z.object({
  description: z.string().min(1, { error: 'Description is required' }).max(200, { error: 'Description must be 200 characters or less' }),
  amount: z.coerce.number().positive({ error: 'Amount must be positive' }),
  category: z.nativeEnum(ExpenseCategory, { error: 'Invalid category' }),
  expenseDate: z.coerce.date({ error: 'Invalid date' }),
  vendorName: z.string().optional(),
  notes: z.string().max(500, { error: 'Notes must be 500 characters or less' }).optional(),
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
