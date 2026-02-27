import { z } from 'zod';
import { ProductionSource, BatchStatus } from '@prisma/client';

export const createBatchSchema = z
  .object({
    productId: z.string().min(1, 'Product is required'),
    productionDate: z.coerce.date(),
    productionSource: z.nativeEnum(ProductionSource),
    totalUnits: z.coerce.number().int().positive('Total units must be positive'),
    notes: z.string().optional(),
    coPackerPartnerId: z.string().optional(),
    coPackerLotNumber: z.string().optional(),
    coPackerReceivingDate: z.coerce.date().optional(),
    allocations: z
      .array(
        z.object({
          locationId: z.string(),
          quantity: z.coerce.number().int().nonnegative(),
        })
      )
      .optional(),
  })
  .refine(
    (data) => {
      if (data.productionSource === ProductionSource.CO_PACKER) {
        return !!data.coPackerPartnerId;
      }
      return true;
    },
    {
      message: 'Co-packer partner is required when production source is CO_PACKER',
      path: ['coPackerPartnerId'],
    }
  )
  .refine(
    (data) => {
      if (data.allocations && data.allocations.length > 0) {
        const sum = data.allocations.reduce((acc, curr) => acc + curr.quantity, 0);
        return sum === data.totalUnits;
      }
      return true;
    },
    {
      message: 'Sum of allocation quantities must equal total units',
      path: ['allocations'],
    }
  );

export type CreateBatchFormState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean }
  | undefined;

export const qcTestSchema = z
  .object({
    batchId: z.string().min(1),
    testType: z.enum(['pH', 'visual_taste']),
    phLevel: z.coerce.number().min(0).max(14).optional(),
    passed: z.coerce.boolean(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.testType === 'pH') {
        return data.phLevel !== undefined;
      }
      return true;
    },
    {
      message: 'pH level is required for pH tests',
      path: ['phLevel'],
    }
  );

export type QCTestFormState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean }
  | undefined;

export const rawMaterialSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  supplier: z.string().min(1, 'Supplier is required'),
  lotNumber: z.string().min(1, 'Lot number is required'),
  expirationDate: z.coerce.date(),
  receivedDate: z.coerce.date(),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
});

export type RawMaterialFormState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean }
  | undefined;

export const coPackerPartnerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export type CoPackerPartnerFormState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean }
  | undefined;

export const updateBatchStatusSchema = z.object({
  batchId: z.string().min(1),
  status: z.nativeEnum(BatchStatus),
});

export const deleteBatchSchema = z.object({
  batchId: z.string().min(1, 'Batch ID is required'),
  reason: z.string().min(1, 'Reason is required'),
});

export type DeleteBatchFormState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean }
  | undefined;

export const updateBatchSchema = z.object({
  batchId: z.string().min(1, 'Batch ID is required'),
  totalUnits: z.coerce.number().int().positive('Total units must be positive'),
  notes: z.string().optional(),
  productionDate: z.coerce.date(),
});

export type UpdateBatchFormState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean }
  | undefined;
