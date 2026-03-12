import { db } from '@/lib/db';

type PrismaClient = typeof db;

export type FIFOAllocation = {
  batchId: string;
  batchCode: string;
  productionDate: Date;
  quantity: number;
};

/**
 * FIFO inventory allocation algorithm.
 *
 * Selects the oldest RELEASED batches first for a given product at a location,
 * calculating available quantity by summing: initial allocation + inbound movements
 * - outbound movements.
 *
 * @param productId - The product to allocate inventory for
 * @param locationId - The location to pull inventory from
 * @param quantityNeeded - Total units required
 * @param tx - Prisma client (supports transaction context)
 * @returns Array of batch-quantity pairs, ordered oldest first
 * @throws Error if insufficient inventory is available
 */
export async function allocateInventoryFIFO(
  productId: string,
  locationId: string,
  quantityNeeded: number,
  tx: PrismaClient = db
): Promise<FIFOAllocation[]> {
  // 1. Get all RELEASED batches for this product that have stock at this location
  //    via initial allocation OR via inbound movements (transfers/adjustments)
  const batches = await tx.batch.findMany({
    where: {
      productId,
      status: 'RELEASED',
      isActive: true,
      OR: [
        { allocations: { some: { locationId } } },
        { inventoryMovements: { some: { toLocationId: locationId, approvedAt: { not: null } } } },
      ],
    },
    include: {
      allocations: { where: { locationId } },
    },
    orderBy: { productionDate: 'asc' },
  });

  // 2. For each batch, calculate available = initial allocation + approved inbound - approved outbound
  const batchesWithAvailable = await Promise.all(
    batches.map(async (batch) => {
      const initialAllocation = batch.allocations[0]?.quantity ?? 0;

      // Sum approved inbound movements (toLocationId = this location, for this batch)
      const inbound = await tx.inventoryMovement.aggregate({
        where: { batchId: batch.id, toLocationId: locationId, approvedAt: { not: null } },
        _sum: { quantity: true },
      });

      // Sum approved outbound movements (fromLocationId = this location, for this batch)
      const outbound = await tx.inventoryMovement.aggregate({
        where: { batchId: batch.id, fromLocationId: locationId, approvedAt: { not: null } },
        _sum: { quantity: true },
      });

      const available =
        initialAllocation +
        (inbound._sum.quantity ?? 0) -
        (outbound._sum.quantity ?? 0);

      return {
        batchId: batch.id,
        batchCode: batch.batchCode,
        productionDate: batch.productionDate,
        available: Math.max(0, available),
      };
    })
  );

  // 3. Allocate from oldest first (FIFO)
  const allocations: FIFOAllocation[] = [];
  let remaining = quantityNeeded;

  for (const batch of batchesWithAvailable) {
    if (remaining <= 0) break;
    if (batch.available <= 0) continue;

    const toAllocate = Math.min(batch.available, remaining);
    allocations.push({
      batchId: batch.batchId,
      batchCode: batch.batchCode,
      productionDate: batch.productionDate,
      quantity: toAllocate,
    });
    remaining -= toAllocate;
  }

  if (remaining > 0) {
    throw new Error(
      `Insufficient inventory: need ${quantityNeeded} units, only ${quantityNeeded - remaining} available`
    );
  }

  return allocations;
}

/**
 * Returns total available units for a product at a location.
 *
 * Uses the same calculation as FIFO: sum of (initial allocation + inbound
 * movements - outbound movements) across all RELEASED batches at the location.
 *
 * @param productId - The product to check
 * @param locationId - The location to check at
 * @param tx - Prisma client (supports transaction context)
 * @returns Total available units
 */
export async function getAvailableStock(
  productId: string,
  locationId: string,
  tx: PrismaClient = db
): Promise<number> {
  const batches = await tx.batch.findMany({
    where: {
      productId,
      status: 'RELEASED',
      isActive: true,
      OR: [
        { allocations: { some: { locationId } } },
        { inventoryMovements: { some: { toLocationId: locationId, approvedAt: { not: null } } } },
      ],
    },
    include: {
      allocations: { where: { locationId } },
    },
  });

  let total = 0;

  for (const batch of batches) {
    const initialAllocation = batch.allocations[0]?.quantity ?? 0;

    const inbound = await tx.inventoryMovement.aggregate({
      where: { batchId: batch.id, toLocationId: locationId, approvedAt: { not: null } },
      _sum: { quantity: true },
    });

    const outbound = await tx.inventoryMovement.aggregate({
      where: { batchId: batch.id, fromLocationId: locationId, approvedAt: { not: null } },
      _sum: { quantity: true },
    });

    const available =
      initialAllocation +
      (inbound._sum.quantity ?? 0) -
      (outbound._sum.quantity ?? 0);

    total += Math.max(0, available);
  }

  return total;
}
