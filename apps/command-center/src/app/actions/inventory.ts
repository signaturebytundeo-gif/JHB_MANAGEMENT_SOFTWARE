'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { verifySession, verifyManagerOrAbove } from '@/lib/dal';
import {
  stockAdjustmentSchema,
  type StockAdjustmentFormState,
  inventoryTransferSchema,
  type InventoryTransferFormState,
} from '@/lib/validators/inventory';
import { AdjustmentReason, BatchStatus } from '@prisma/client';

export async function getInventorySummary() {
  try {
    // Get all active products
    const products = await db.product.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    // Get produced units from RELEASED batches (with allocations)
    const releasedAllocations = await db.batchAllocation.findMany({
      where: {
        batch: {
          status: BatchStatus.RELEASED,
          isActive: true,
        },
      },
      include: {
        batch: {
          select: { productId: true },
        },
        location: {
          select: { id: true, name: true },
        },
      },
    });

    // Get total produced per product (from RELEASED batches without allocations)
    const releasedBatches = await db.batch.findMany({
      where: {
        status: BatchStatus.RELEASED,
        isActive: true,
      },
      select: {
        id: true,
        productId: true,
        totalUnits: true,
        allocations: { select: { id: true } },
      },
    });

    // Get all sales
    const allSales = await db.sale.findMany({
      select: {
        productId: true,
        quantity: true,
      },
    });

    // Get all stock adjustments
    const adjustments = await db.stockAdjustment.findMany({
      select: {
        productId: true,
        locationId: true,
        quantityChange: true,
      },
    });

    // Get all locations
    const locations = await db.location.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    // Build summary per product
    const summary = products.map((product) => {
      // Total produced from RELEASED batches
      const produced = releasedBatches
        .filter((b) => b.productId === product.id)
        .reduce((sum, b) => sum + b.totalUnits, 0);

      // Total sold
      const sold = allSales
        .filter((s) => s.productId === product.id)
        .reduce((sum, s) => sum + s.quantity, 0);

      // Total adjusted
      const adjusted = adjustments
        .filter((a) => a.productId === product.id)
        .reduce((sum, a) => sum + a.quantityChange, 0);

      const currentStock = produced - sold + adjusted;

      // Per-location breakdown
      const locationBreakdown = locations.map((loc) => {
        const allocated = releasedAllocations
          .filter((a) => a.batch.productId === product.id && a.location.id === loc.id)
          .reduce((sum, a) => sum + a.quantity, 0);

        const locAdjusted = adjustments
          .filter((a) => a.productId === product.id && a.locationId === loc.id)
          .reduce((sum, a) => sum + a.quantityChange, 0);

        return {
          locationId: loc.id,
          locationName: loc.name,
          allocated,
          adjusted: locAdjusted,
          stock: allocated + locAdjusted,
        };
      }).filter((loc) => loc.allocated !== 0 || loc.adjusted !== 0);

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        size: product.size,
        produced,
        sold,
        adjusted,
        currentStock,
        locationBreakdown,
      };
    });

    return summary;
  } catch (error) {
    console.error('Error fetching inventory summary:', error);
    return [];
  }
}

export async function createStockAdjustment(
  prevState: StockAdjustmentFormState,
  formData: FormData
): Promise<StockAdjustmentFormState> {
  try {
    const session = await verifyManagerOrAbove();

    const validatedFields = stockAdjustmentSchema.safeParse({
      productId: formData.get('productId'),
      locationId: formData.get('locationId') || undefined,
      quantityChange: formData.get('quantityChange'),
      reason: formData.get('reason'),
      notes: formData.get('notes') || undefined,
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const data = validatedFields.data;

    await db.stockAdjustment.create({
      data: {
        productId: data.productId,
        locationId: data.locationId,
        quantityChange: data.quantityChange,
        reason: data.reason,
        notes: data.notes,
        createdById: session.userId,
      },
    });

    revalidatePath('/dashboard/inventory');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Stock adjustment recorded',
    };
  } catch (error) {
    console.error('Error creating stock adjustment:', error);
    return {
      message: 'Failed to record stock adjustment',
    };
  }
}

export async function createInventoryTransfer(
  prevState: InventoryTransferFormState,
  formData: FormData
): Promise<InventoryTransferFormState> {
  try {
    const session = await verifyManagerOrAbove();

    const validatedFields = inventoryTransferSchema.safeParse({
      productId: formData.get('productId'),
      fromLocationId: formData.get('fromLocationId'),
      toLocationId: formData.get('toLocationId'),
      quantity: formData.get('quantity'),
      notes: formData.get('notes') || undefined,
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const data = validatedFields.data;
    const transferNote = data.notes
      ? `Transfer: ${data.notes}`
      : 'Inventory transfer';

    // Create two adjustments in a transaction
    await db.$transaction([
      db.stockAdjustment.create({
        data: {
          productId: data.productId,
          locationId: data.fromLocationId,
          quantityChange: -data.quantity,
          reason: AdjustmentReason.TRANSFER,
          notes: transferNote,
          createdById: session.userId,
        },
      }),
      db.stockAdjustment.create({
        data: {
          productId: data.productId,
          locationId: data.toLocationId,
          quantityChange: data.quantity,
          reason: AdjustmentReason.TRANSFER,
          notes: transferNote,
          createdById: session.userId,
        },
      }),
    ]);

    revalidatePath('/dashboard/inventory');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Inventory transfer completed',
    };
  } catch (error) {
    console.error('Error creating inventory transfer:', error);
    return {
      message: 'Failed to complete inventory transfer',
    };
  }
}

export async function getLocations() {
  try {
    return await db.location.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return [];
  }
}
