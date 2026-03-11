import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

export const createInvoiceSchema = z.object({
  orderId: z.string().min(1, 'Order is required'),
  notes: z.string().optional(),
  taxRate: z.coerce.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100').default(0),
});

export type CreateInvoiceFormState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean; invoiceId?: string }
  | undefined;

export const logPaymentSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice is required'),
  amount: z.coerce.number().positive('Payment amount must be positive'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  paidAt: z.coerce.date(),
  notes: z.string().optional(),
});

export type LogPaymentFormState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean }
  | undefined;
