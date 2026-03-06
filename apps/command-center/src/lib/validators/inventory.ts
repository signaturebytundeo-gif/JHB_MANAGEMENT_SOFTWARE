import { z } from 'zod';
import { TransactionType } from '@prisma/client';

// ============================================================================
// LEGACY SCHEMAS (Phase 2 - used by existing StockAdjustment / InventoryTransaction flows)
// ============================================================================

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  locationId: z.string().min(1, 'Location is required'),
  quantityChange: z.coerce.number().int().refine((val) => val !== 0, 'Quantity change cannot be zero'),
  reason: z.string().min(1, 'Reason is required'),
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

export const transactionLogFilterSchema = z.object({
  productId: z.string().optional(),
  locationId: z.string().optional(),
  type: z.nativeEnum(TransactionType).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().default(25),
});

// ============================================================================
// PHASE 3 SCHEMAS (InventoryMovement event-sourcing system)
// ============================================================================

/**
 * transferSchema — validates batch transfer between locations.
 * Used by InventoryMovement TRANSFER type records.
 */
export const transferSchema = z
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

export type TransferFormState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean }
  | undefined;

/**
 * adjustmentSchema — validates inventory adjustments against RELEASED batches.
 * Used by InventoryMovement ADJUSTMENT type records.
 */
export const adjustmentSchema = z.object({
  batchId: z.string().min(1, 'Batch is required'),
  locationId: z.string().min(1, 'Location is required'),
  quantityChange: z.coerce
    .number()
    .int()
    .refine((val) => val !== 0, 'Change cannot be zero'),
  reason: z.enum(['DAMAGE', 'SHRINKAGE', 'SAMPLING', 'EXPIRED', 'COUNT_CORRECTION'], {
    error: 'Invalid adjustment reason — must be one of: DAMAGE, SHRINKAGE, SAMPLING, EXPIRED, COUNT_CORRECTION',
  }),
  notes: z.string().optional(),
});

export type AdjustmentFormState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean }
  | undefined;

/**
 * packagingMaterialSchema — validates packaging material create/update forms.
 */
export const packagingMaterialSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  type: z.enum(['BOTTLE', 'CAP', 'LABEL', 'BOX', 'OTHER'], {
    error: 'Invalid packaging type — must be one of: BOTTLE, CAP, LABEL, BOX, OTHER',
  }),
  supplier: z.string().min(1, 'Supplier is required'),
  currentQuantity: z.coerce.number().int().min(0, 'Quantity must be 0 or greater'),
  unit: z.string().min(1, 'Unit is required'),
  reorderPoint: z.coerce.number().int().min(0, 'Reorder point must be 0 or greater'),
  leadTimeDays: z.coerce.number().int().min(1, 'Lead time must be at least 1 day'),
  costPerUnit: z.coerce.number().min(0, 'Cost must be 0 or greater').optional(),
});

export type PackagingFormState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean }
  | undefined;
