import { z } from 'zod';
import { AdjustmentReason } from '@prisma/client';

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  locationId: z.string().optional(),
  quantityChange: z.coerce.number().int().refine((val) => val !== 0, 'Quantity change cannot be zero'),
  reason: z.nativeEnum(AdjustmentReason),
  notes: z.string().optional(),
});

export type StockAdjustmentFormState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean }
  | undefined;

export const inventoryTransferSchema = z
  .object({
    productId: z.string().min(1, 'Product is required'),
    fromLocationId: z.string().min(1, 'Source location is required'),
    toLocationId: z.string().min(1, 'Destination location is required'),
    quantity: z.coerce.number().int().positive('Quantity must be positive'),
    notes: z.string().optional(),
  })
  .refine((data) => data.fromLocationId !== data.toLocationId, {
    message: 'Source and destination locations must be different',
    path: ['toLocationId'],
  });

export type InventoryTransferFormState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean }
  | undefined;
