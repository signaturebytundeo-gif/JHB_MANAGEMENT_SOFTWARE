import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

export const createSaleSchema = z.object({
  saleDate: z.coerce.date(),
  channelId: z.string().min(1, 'Sales channel is required'),
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().int().positive('Quantity must be positive'),
  unitPrice: z.coerce.number().positive('Unit price must be positive'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export type SaleFormState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean }
  | undefined;

export const updateSaleSchema = z.object({
  saleId: z.string().min(1, 'Sale ID is required'),
  saleDate: z.coerce.date(),
  channelId: z.string().min(1, 'Sales channel is required'),
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().int().positive('Quantity must be positive'),
  unitPrice: z.coerce.number().positive('Unit price must be positive'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export type UpdateSaleFormState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean }
  | undefined;
