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
import { TransactionType } from '@prisma/client';

// ============================================================================
// READ ACTIONS
// ============================================================================

export async function getInventorySummary() {
  try {
    const products = await db.product.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    const locations = await db.location.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    // Get all inventory transactions
    const transactions = await db.inventoryTransaction.findMany({
      select: {
        productId: true,
        locationId: true,
        quantityChange: true,
      },
    });

    const summary = products.map((product) => {
      // Total stock across all locations
      const totalStock = transactions
        .filter((t) => t.productId === product.id)
        .reduce((sum, t) => sum + t.quantityChange, 0);

      // Per-location breakdown
      const locationBreakdown = locations
        .map((loc) => {
          const locStock = transactions
            .filter((t) => t.productId === product.id && t.locationId === loc.id)
            .reduce((sum, t) => sum + t.quantityChange, 0);

          return {
            locationId: loc.id,
            locationName: loc.name,
            stock: locStock,
          };
        })
        .filter((loc) => loc.stock !== 0);

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        size: product.size,
        currentStock: totalStock,
        locationBreakdown,
      };
    });

    return summary;
  } catch (error) {
    console.error('Error fetching inventory summary:', error);
    return [];
  }
}

export async function getTransactionLog(filters?: {
  productId?: string;
  locationId?: string;
  type?: TransactionType;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) {
  try {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 25;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (filters?.productId) {
      where.productId = filters.productId;
    }
    if (filters?.locationId) {
      where.locationId = filters.locationId;
    }
    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo + 'T23:59:59');
      }
    }

    const [transactions, total] = await Promise.all([
      db.inventoryTransaction.findMany({
        where,
        include: {
          product: { select: { name: true, sku: true, size: true } },
          location: { select: { name: true } },
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      db.inventoryTransaction.count({ where }),
    ]);

    return {
      transactions: transactions.map((t) => ({
        id: t.id,
        productName: t.product.name,
        productSku: t.product.sku,
        productSize: t.product.size,
        locationName: t.location.name,
        type: t.type,
        quantityChange: t.quantityChange,
        referenceId: t.referenceId,
        reason: t.reason,
        notes: t.notes,
        createdBy: t.createdBy.name,
        createdAt: t.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error) {
    console.error('Error fetching transaction log:', error);
    return { transactions: [], total: 0, page: 1, pageSize: 25, totalPages: 0 };
  }
}

export async function getLocationStock(productId: string, locationId: string): Promise<number> {
  try {
    const result = await db.inventoryTransaction.aggregate({
      where: { productId, locationId },
      _sum: { quantityChange: true },
    });
    return result._sum.quantityChange || 0;
  } catch (error) {
    console.error('Error fetching location stock:', error);
    return 0;
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

// ============================================================================
// WRITE ACTIONS
// ============================================================================

export async function createStockAdjustment(
  prevState: StockAdjustmentFormState,
  formData: FormData
): Promise<StockAdjustmentFormState> {
  try {
    const session = await verifyManagerOrAbove();

    const validatedFields = stockAdjustmentSchema.safeParse({
      productId: formData.get('productId'),
      locationId: formData.get('locationId'),
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

    await db.inventoryTransaction.create({
      data: {
        productId: data.productId,
        locationId: data.locationId,
        type: TransactionType.ADJUSTMENT,
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

    // Negative stock prevention: check available stock at source location
    const result = await db.$transaction(async (tx) => {
      const sourceStock = await tx.inventoryTransaction.aggregate({
        where: {
          productId: data.productId,
          locationId: data.fromLocationId,
        },
        _sum: { quantityChange: true },
      });

      const availableStock = sourceStock._sum.quantityChange || 0;

      if (availableStock < data.quantity) {
        const location = await tx.location.findUnique({
          where: { id: data.fromLocationId },
          select: { name: true },
        });
        return {
          error: `Insufficient stock at ${location?.name || 'source'}. Available: ${availableStock} units`,
        };
      }

      // Create paired transfer transactions
      const transferId = `xfer_${Date.now()}`;

      await tx.inventoryTransaction.createMany({
        data: [
          {
            productId: data.productId,
            locationId: data.fromLocationId,
            type: TransactionType.TRANSFER_OUT,
            quantityChange: -data.quantity,
            referenceId: transferId,
            notes: transferNote,
            createdById: session.userId,
          },
          {
            productId: data.productId,
            locationId: data.toLocationId,
            type: TransactionType.TRANSFER_IN,
            quantityChange: data.quantity,
            referenceId: transferId,
            notes: transferNote,
            createdById: session.userId,
          },
        ],
      });

      return { success: true };
    });

    if ('error' in result) {
      return { message: result.error };
    }

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
