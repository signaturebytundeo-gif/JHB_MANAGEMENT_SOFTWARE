'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { verifySession, verifyManagerOrAbove, verifyAdmin } from '@/lib/dal';
import {
  stockAdjustmentSchema,
  type StockAdjustmentFormState,
  inventoryTransferSchema,
  type InventoryTransferFormState,
  transferSchema,
  type TransferFormState,
  adjustmentSchema,
  type AdjustmentFormState,
} from '@/lib/validators/inventory';
import { TransactionType, MovementType } from '@prisma/client';
import { allocateInventoryFIFO } from '@/lib/utils/fifo';
import { classifyStockLevel } from '@/lib/utils/reorder-point';

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

// ============================================================================
// PHASE 3 ACTIONS — InventoryMovement event-sourcing system
// ============================================================================

/**
 * Returns stock levels for every active product at every active location.
 * Stock is computed from BatchAllocation initial quantities plus/minus
 * approved InventoryMovement events (unapproved movements are excluded).
 */
export async function getStockLevels() {
  try {
    const [products, locations, allAllocations, allMovements] = await Promise.all([
      db.product.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, sku: true, size: true, reorderPoint: true },
      }),
      db.location.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, type: true },
      }),
      // BatchAllocation initial quantities for RELEASED batches
      db.batchAllocation.findMany({
        where: { batch: { status: 'RELEASED', isActive: true } },
        select: {
          locationId: true,
          quantity: true,
          batch: { select: { productId: true } },
        },
      }),
      // Only approved InventoryMovements count toward stock
      db.inventoryMovement.findMany({
        where: { approvedAt: { not: null } },
        select: {
          batchId: true,
          fromLocationId: true,
          toLocationId: true,
          quantity: true,
          batch: { select: { productId: true } },
        },
      }),
    ]);

    // Build stock map: productId -> locationId -> quantity
    const stockMap = new Map<string, Map<string, number>>();

    // Initialize all product/location pairs to 0
    for (const product of products) {
      const locMap = new Map<string, number>();
      for (const location of locations) {
        locMap.set(location.id, 0);
      }
      stockMap.set(product.id, locMap);
    }

    // Add BatchAllocation initial quantities
    for (const allocation of allAllocations) {
      const productId = allocation.batch.productId;
      const locMap = stockMap.get(productId);
      if (locMap) {
        const current = locMap.get(allocation.locationId) ?? 0;
        locMap.set(allocation.locationId, current + allocation.quantity);
      }
    }

    // Apply InventoryMovements (approved only — filtered above)
    for (const movement of allMovements) {
      const productId = movement.batch.productId;
      const locMap = stockMap.get(productId);
      if (!locMap) continue;

      // Inbound: add to toLocation
      if (movement.toLocationId) {
        const current = locMap.get(movement.toLocationId) ?? 0;
        locMap.set(movement.toLocationId, current + movement.quantity);
      }

      // Outbound: subtract from fromLocation
      if (movement.fromLocationId) {
        const current = locMap.get(movement.fromLocationId) ?? 0;
        locMap.set(movement.fromLocationId, current - movement.quantity);
      }
    }

    // Sort locations by total stock across all products (highest first)
    // so the main warehouse / highest-stock location appears first
    const locationTotals = new Map<string, number>();
    for (const location of locations) {
      let locTotal = 0;
      for (const product of products) {
        const locMap = stockMap.get(product.id);
        if (locMap) locTotal += Math.max(0, locMap.get(location.id) ?? 0);
      }
      locationTotals.set(location.id, locTotal);
    }
    const sortedLocations = [...locations].sort(
      (a, b) => (locationTotals.get(b.id) ?? 0) - (locationTotals.get(a.id) ?? 0)
    );

    // Build output shape — products sorted by total stock descending
    const result = products.map((product) => {
      const locMap = stockMap.get(product.id) ?? new Map<string, number>();
      const locationStocks = sortedLocations.map((location) => {
        const quantity = Math.max(0, locMap.get(location.id) ?? 0);
        return {
          location: { id: location.id, name: location.name, type: location.type },
          quantity,
          stockLevel: classifyStockLevel(quantity, product.reorderPoint),
        };
      });
      const total = locationStocks.reduce((sum, l) => sum + l.quantity, 0);
      return {
        product,
        locations: locationStocks,
        total,
      };
    });

    result.sort((a, b) => b.total - a.total);
    return result;
  } catch (error) {
    console.error('Error fetching stock levels:', error);
    return [];
  }
}

/**
 * Returns the last 100 InventoryMovement records with optional filters.
 */
export async function getAuditTrail(filters?: {
  productId?: string;
  locationId?: string;
  movementType?: MovementType;
  dateFrom?: string;
  dateTo?: string;
}) {
  try {
    const where: Record<string, unknown> = {};

    if (filters?.movementType) {
      where.movementType = filters.movementType;
    }
    if (filters?.dateFrom || filters?.dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (filters.dateFrom) dateFilter.gte = new Date(filters.dateFrom);
      if (filters.dateTo) dateFilter.lte = new Date(filters.dateTo + 'T23:59:59');
      where.createdAt = dateFilter;
    }

    // Filter by product or location via batch/location relations
    const movements = await db.inventoryMovement.findMany({
      where: {
        ...where,
        ...(filters?.productId
          ? { batch: { productId: filters.productId } }
          : {}),
        ...(filters?.locationId
          ? {
              OR: [
                { fromLocationId: filters.locationId },
                { toLocationId: filters.locationId },
              ],
            }
          : {}),
      },
      include: {
        batch: {
          select: {
            batchCode: true,
            product: { select: { name: true, sku: true } },
          },
        },
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
        createdBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return movements.map((m) => ({
      id: m.id,
      movementType: m.movementType,
      batchCode: m.batch.batchCode,
      productName: m.batch.product.name,
      productSku: m.batch.product.sku,
      fromLocation: m.fromLocation?.name ?? null,
      toLocation: m.toLocation?.name ?? null,
      quantity: m.quantity,
      reason: m.reason,
      notes: m.notes,
      requiresApproval: m.requiresApproval,
      approvedBy: m.approvedBy?.name ?? null,
      approvedAt: m.approvedAt?.toISOString() ?? null,
      createdBy: m.createdBy.name,
      createdAt: m.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    return [];
  }
}

/**
 * Transfers inventory between locations using FIFO batch allocation.
 * Both outbound and inbound InventoryMovement records are created within
 * a single transaction and auto-approved (transfers don't require dual approval).
 */
export async function transferInventory(
  prevState: TransferFormState,
  formData: FormData
): Promise<TransferFormState> {
  try {
    const session = await verifyManagerOrAbove();

    const validatedFields = transferSchema.safeParse({
      productId: formData.get('productId'),
      fromLocationId: formData.get('fromLocationId'),
      toLocationId: formData.get('toLocationId'),
      quantity: formData.get('quantity'),
      notes: formData.get('notes') || undefined,
    });

    if (!validatedFields.success) {
      return { errors: validatedFields.error.flatten().fieldErrors };
    }

    const data = validatedFields.data;
    const now = new Date();

    await db.$transaction(async (tx) => {
      // FIFO allocation throws if insufficient inventory — this is the negative prevention guard
      const allocations = await allocateInventoryFIFO(
        data.productId,
        data.fromLocationId,
        data.quantity,
        tx as typeof db
      );

      // Create paired outbound + inbound InventoryMovement records per FIFO batch
      for (const allocation of allocations) {
        // Outbound
        await tx.inventoryMovement.create({
          data: {
            movementType: MovementType.TRANSFER,
            batchId: allocation.batchId,
            fromLocationId: data.fromLocationId,
            toLocationId: null,
            quantity: allocation.quantity,
            notes: data.notes,
            requiresApproval: false,
            approvedById: session.userId,
            approvedAt: now,
            createdById: session.userId,
          },
        });

        // Inbound
        await tx.inventoryMovement.create({
          data: {
            movementType: MovementType.TRANSFER,
            batchId: allocation.batchId,
            fromLocationId: null,
            toLocationId: data.toLocationId,
            quantity: allocation.quantity,
            notes: data.notes,
            requiresApproval: false,
            approvedById: session.userId,
            approvedAt: now,
            createdById: session.userId,
          },
        });
      }
    });

    revalidatePath('/dashboard/inventory');

    return { success: true, message: 'Transfer completed successfully' };
  } catch (error) {
    console.error('Error transferring inventory:', error);
    const message = error instanceof Error ? error.message : 'Failed to complete transfer';
    return { message };
  }
}

/**
 * Creates an inventory adjustment.
 * Adjustments > 2% variance from current batch stock require admin approval.
 * Auto-approved if variance is within 2%.
 */
export async function createAdjustment(
  prevState: AdjustmentFormState,
  formData: FormData
): Promise<AdjustmentFormState> {
  try {
    const session = await verifyManagerOrAbove();

    const validatedFields = adjustmentSchema.safeParse({
      batchId: formData.get('batchId'),
      locationId: formData.get('locationId'),
      quantityChange: formData.get('quantityChange'),
      reason: formData.get('reason'),
      notes: formData.get('notes') || undefined,
    });

    if (!validatedFields.success) {
      return { errors: validatedFields.error.flatten().fieldErrors };
    }

    const data = validatedFields.data;
    const now = new Date();

    // Calculate current stock for this batch at this location to determine variance
    const [initialAllocation, inboundAgg, outboundAgg] = await Promise.all([
      db.batchAllocation.findUnique({
        where: { batchId_locationId: { batchId: data.batchId, locationId: data.locationId } },
        select: { quantity: true },
      }),
      db.inventoryMovement.aggregate({
        where: { batchId: data.batchId, toLocationId: data.locationId, approvedAt: { not: null } },
        _sum: { quantity: true },
      }),
      db.inventoryMovement.aggregate({
        where: { batchId: data.batchId, fromLocationId: data.locationId, approvedAt: { not: null } },
        _sum: { quantity: true },
      }),
    ]);

    const currentStock =
      (initialAllocation?.quantity ?? 0) +
      (inboundAgg._sum.quantity ?? 0) -
      (outboundAgg._sum.quantity ?? 0);

    // Variance: |quantityChange| / currentStock * 100
    const absChange = Math.abs(data.quantityChange);
    const variance = currentStock > 0 ? (absChange / currentStock) * 100 : 100;
    const needsApproval = variance > 2;

    // Direction: positive = inbound (add), negative = outbound (remove)
    const isPositive = data.quantityChange > 0;

    await db.inventoryMovement.create({
      data: {
        movementType: MovementType.ADJUSTMENT,
        batchId: data.batchId,
        fromLocationId: isPositive ? null : data.locationId,
        toLocationId: isPositive ? data.locationId : null,
        quantity: absChange,
        reason: data.reason,
        notes: data.notes,
        requiresApproval: needsApproval,
        approvedById: needsApproval ? null : session.userId,
        approvedAt: needsApproval ? null : now,
        createdById: session.userId,
      },
    });

    revalidatePath('/dashboard/inventory');

    if (needsApproval) {
      return {
        success: true,
        message: `Adjustment submitted for admin approval (variance: ${variance.toFixed(1)}% exceeds 2% threshold)`,
      };
    }

    return { success: true, message: 'Adjustment applied successfully' };
  } catch (error) {
    console.error('Error creating adjustment:', error);
    return { message: 'Failed to create adjustment' };
  }
}

/**
 * Approves a pending InventoryMovement adjustment.
 * Requires Admin role. Approver must be different from the creator.
 */
export async function approveAdjustment(
  movementId: string
): Promise<{ success?: boolean; message?: string }> {
  try {
    const session = await verifyAdmin();

    const movement = await db.inventoryMovement.findUnique({
      where: { id: movementId },
      select: {
        requiresApproval: true,
        approvedAt: true,
        createdById: true,
      },
    });

    if (!movement) {
      return { message: 'Movement not found' };
    }

    if (!movement.requiresApproval) {
      return { message: 'This movement does not require approval' };
    }

    if (movement.approvedAt) {
      return { message: 'Movement has already been approved' };
    }

    if (movement.createdById === session.userId) {
      return { message: 'You cannot approve your own adjustment' };
    }

    await db.inventoryMovement.update({
      where: { id: movementId },
      data: {
        approvedById: session.userId,
        approvedAt: new Date(),
      },
    });

    revalidatePath('/dashboard/inventory');

    return { success: true, message: 'Adjustment approved' };
  } catch (error) {
    console.error('Error approving adjustment:', error);
    return { message: 'Failed to approve adjustment' };
  }
}

/**
 * Returns active products with their total available stock across all locations.
 * Used for transfer and adjustment form dropdowns.
 */
export async function getProductsForTransfer() {
  try {
    return await db.product.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, sku: true, size: true },
    });
  } catch (error) {
    console.error('Error fetching products for transfer:', error);
    return [];
  }
}

/**
 * Returns active locations for transfer and adjustment form dropdowns.
 */
export async function getLocationsForTransfer() {
  try {
    return await db.location.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, type: true },
    });
  } catch (error) {
    console.error('Error fetching locations for transfer:', error);
    return [];
  }
}

/**
 * Returns RELEASED batches with product name for the adjustment form dropdown.
 */
export async function getReleasedBatches() {
  try {
    const batches = await db.batch.findMany({
      where: { status: 'RELEASED', isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        batchCode: true,
        product: { select: { name: true } },
      },
    });
    return batches.map((b) => ({
      id: b.id,
      batchCode: b.batchCode,
      productName: b.product.name,
    }));
  } catch (error) {
    console.error('Error fetching released batches:', error);
    return [];
  }
}

/**
 * Returns pending inventory adjustments awaiting admin approval.
 * Includes createdById for the creator-not-approver dual-control check in the UI.
 */
export async function getPendingAdjustments() {
  try {
    const movements = await db.inventoryMovement.findMany({
      where: {
        movementType: 'ADJUSTMENT',
        requiresApproval: true,
        approvedAt: null,
      },
      include: {
        batch: {
          select: {
            batchCode: true,
            product: { select: { name: true } },
          },
        },
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return movements.map((m) => ({
      id: m.id,
      batchCode: m.batch.batchCode,
      productName: m.batch.product.name,
      fromLocation: m.fromLocation?.name ?? null,
      toLocation: m.toLocation?.name ?? null,
      quantity: m.quantity,
      reason: m.reason,
      notes: m.notes,
      createdBy: m.createdBy.name,
      createdById: m.createdById,
      createdAt: m.createdAt.toISOString(),
      requiresApproval: m.requiresApproval,
    }));
  } catch (error) {
    console.error('Error fetching pending adjustments:', error);
    return [];
  }
}

// ============================================================================
// PHASE 9 ACTIONS — Website Order Inventory Aggregation
// ============================================================================

/**
 * Exported type for a single per-SKU inventory aggregation row.
 */
export type InventoryAggregationRow = {
  productId: string;
  productName: string;
  sku: string;
  size: string;
  reorderPoint: number;
  totalProduced: number;
  allocated: number;
  available: number;
  stockLevel: 'HEALTHY' | 'REORDER' | 'CRITICAL';
};

/**
 * Maps a line item name string to a product via size suffix matching.
 * Primary: matches parenthetical suffix e.g. "Original Jerk Sauce (5oz)" -> "5oz"
 * Fallback: matches inline size e.g. "Free 2oz Jerk Sauce Sample" -> "2oz"
 * Items without a size match (e.g. "Shipping & Handling") return undefined.
 */
function resolveItemToProduct<T extends { size: string }>(
  itemName: string,
  sizeToProduct: Map<string, T>
): T | undefined {
  // Primary: parenthetical suffix "(5oz)"
  const parentheticalMatch = itemName.match(/\((\w+)\)$/);
  if (parentheticalMatch) {
    return sizeToProduct.get(parentheticalMatch[1].toLowerCase());
  }

  // Fallback: inline size "2oz"
  const inlineSizeMatch = itemName.match(/(\d+oz)/i);
  if (inlineSizeMatch) {
    return sizeToProduct.get(inlineSizeMatch[1].toLowerCase());
  }

  // No size match — skip (e.g. "Shipping & Handling")
  return undefined;
}

/**
 * Aggregates per-SKU inventory: released batch totals minus non-cancelled website order quantities.
 * Returns an array of InventoryAggregationRow for all active products.
 */
export async function getInventoryAggregation(): Promise<InventoryAggregationRow[]> {
  try {
    const [products, batchTotals, orders] = await Promise.all([
      db.product.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, sku: true, size: true, reorderPoint: true },
      }),
      db.batch.groupBy({
        by: ['productId'],
        where: { status: 'RELEASED', isActive: true },
        _sum: { totalUnits: true },
      }),
      db.websiteOrder.findMany({
        where: { status: { not: 'CANCELLED' } },
        select: { items: true },
      }),
    ]);

    // Build supply map: productId -> totalProduced
    const producedMap = new Map<string, number>();
    for (const row of batchTotals) {
      producedMap.set(row.productId, row._sum.totalUnits ?? 0);
    }

    // Build size lookup: size.toLowerCase() -> product
    const sizeToProduct = new Map<string, (typeof products)[number]>();
    for (const product of products) {
      sizeToProduct.set(product.size.toLowerCase(), product);
    }

    // Build demand map: productId -> allocated (non-cancelled orders)
    const allocatedMap = new Map<string, number>();
    for (const order of orders) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(order.items);
      } catch {
        continue;
      }
      if (!Array.isArray(parsed)) continue;

      for (const item of parsed as Record<string, unknown>[]) {
        const itemName = String(item.name ?? item.product ?? '');
        const quantity = Number(item.quantity ?? item.qty ?? 1);
        const product = resolveItemToProduct(itemName, sizeToProduct);
        if (!product) continue;

        allocatedMap.set(product.id, (allocatedMap.get(product.id) ?? 0) + quantity);
      }
    }

    return products.map((product) => {
      const totalProduced = producedMap.get(product.id) ?? 0;
      const allocated = allocatedMap.get(product.id) ?? 0;
      const available = Math.max(0, totalProduced - allocated);
      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        size: product.size,
        reorderPoint: product.reorderPoint,
        totalProduced,
        allocated,
        available,
        stockLevel: classifyStockLevel(available, product.reorderPoint),
      };
    });
  } catch (error) {
    console.error('Error fetching inventory aggregation:', error);
    return [];
  }
}

/**
 * Updates Product.reorderPoint for a given product.
 * Requires manager or above. Validates reorderPoint is a non-negative integer.
 */
export async function updateProductThreshold(
  productId: string,
  reorderPoint: number
): Promise<{ success?: boolean; message?: string }> {
  try {
    await verifyManagerOrAbove();

    if (!Number.isInteger(reorderPoint) || reorderPoint < 0) {
      return { message: 'Threshold must be a non-negative integer' };
    }

    await db.product.update({
      where: { id: productId },
      data: { reorderPoint },
    });

    revalidatePath('/dashboard/inventory');

    return { success: true, message: 'Threshold updated' };
  } catch (error) {
    console.error('Error updating product threshold:', error);
    return { message: 'Failed to update threshold' };
  }
}
