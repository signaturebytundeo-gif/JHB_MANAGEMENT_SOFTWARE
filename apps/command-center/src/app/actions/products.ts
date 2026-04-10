'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { verifyManagerOrAbove } from '@/lib/dal';
import { z } from 'zod';

const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z
    .string()
    .min(1, 'SKU is required')
    .transform((v) => v.trim().toUpperCase()),
  size: z.string().min(1, 'Size is required'),
  unitsPerCase: z.coerce.number().int().positive().optional().nullable(),
  description: z.string().optional(),
  retailPrice: z.coerce.number().positive('Price must be > 0'),
  reorderPoint: z.coerce.number().int().min(0).default(0),
  leadTimeDays: z.coerce.number().int().min(0).default(14),
  startingStock: z.coerce.number().int().min(0).default(0),
  locationId: z.string().optional(),
});

export type CreateProductFormState = {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export async function createProduct(
  prevState: CreateProductFormState | undefined,
  formData: FormData
): Promise<CreateProductFormState> {
  try {
    const session = await verifyManagerOrAbove();

    const validatedFields = createProductSchema.safeParse({
      name: formData.get('name'),
      sku: formData.get('sku'),
      size: formData.get('size'),
      unitsPerCase: formData.get('unitsPerCase') || null,
      description: formData.get('description') || undefined,
      retailPrice: formData.get('retailPrice'),
      reorderPoint: formData.get('reorderPoint') || 0,
      leadTimeDays: formData.get('leadTimeDays') || 14,
      startingStock: formData.get('startingStock') || 0,
      locationId: formData.get('locationId') || undefined,
    });

    if (!validatedFields.success) {
      return { errors: validatedFields.error.flatten().fieldErrors };
    }

    const data = validatedFields.data;

    // Check for duplicate SKU
    const existing = await db.product.findUnique({ where: { sku: data.sku } });
    if (existing) {
      return { errors: { sku: [`SKU "${data.sku}" already exists`] } };
    }

    // Create product
    const product = await db.product.create({
      data: {
        name: data.name,
        sku: data.sku,
        size: data.size,
        unitsPerCase: data.unitsPerCase ?? null,
        description: data.description,
        reorderPoint: data.reorderPoint,
        leadTimeDays: data.leadTimeDays,
        isActive: true,
      },
    });

    // Create retail pricing tier
    await db.pricingTier.create({
      data: {
        productId: product.id,
        tierName: 'Retail',
        unitPrice: data.retailPrice,
        casePrice: null,
      },
    });

    // Create starting stock if provided
    if (data.startingStock > 0 && data.locationId) {
      await db.inventoryTransaction.create({
        data: {
          productId: product.id,
          locationId: data.locationId,
          type: 'ADJUSTMENT',
          quantityChange: data.startingStock,
          reason: 'Initial stock',
          notes: `Initial stock of ${data.startingStock} units added at product creation`,
          createdById: session.userId,
        },
      });
    }

    revalidatePath('/dashboard/inventory');
    return {
      success: true,
      message: `${data.name} (${data.sku}) created with $${data.retailPrice} retail price${data.startingStock > 0 ? ` and ${data.startingStock} starting stock` : ''}`,
    };
  } catch (error) {
    console.error('Error creating product:', error);
    return { message: 'Failed to create product' };
  }
}
