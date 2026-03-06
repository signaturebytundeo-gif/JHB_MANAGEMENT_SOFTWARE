'use server';

import { db } from '@/lib/db';
import { verifyManagerOrAbove, verifyAdmin, verifySession } from '@/lib/dal';
import { revalidatePath } from 'next/cache';
import {
  packagingMaterialSchema,
  type PackagingFormState,
} from '@/lib/validators/inventory';
import { differenceInDays } from 'date-fns';

// ============================================================================
// READ ACTIONS
// ============================================================================

export async function getPackagingMaterials() {
  try {
    const materials = await db.packagingMaterial.findMany({
      where: { isActive: true },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    return materials;
  } catch (error) {
    console.error('Error fetching packaging materials:', error);
    return [];
  }
}

// ============================================================================
// WRITE ACTIONS
// ============================================================================

export async function createPackagingMaterial(
  prevState: PackagingFormState,
  formData: FormData
): Promise<PackagingFormState> {
  try {
    await verifyManagerOrAbove();

    const validatedFields = packagingMaterialSchema.safeParse({
      name: formData.get('name'),
      type: formData.get('type'),
      supplier: formData.get('supplier'),
      currentQuantity: formData.get('currentQuantity'),
      unit: formData.get('unit'),
      reorderPoint: formData.get('reorderPoint'),
      leadTimeDays: formData.get('leadTimeDays'),
      costPerUnit: formData.get('costPerUnit') || undefined,
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { name, type, supplier, currentQuantity, unit, reorderPoint, leadTimeDays, costPerUnit } =
      validatedFields.data;

    // Check for duplicate name (case-sensitive)
    const existing = await db.packagingMaterial.findFirst({
      where: { name, isActive: true },
    });

    if (existing) {
      return {
        errors: { name: ['A packaging material with this name already exists'] },
      };
    }

    await db.packagingMaterial.create({
      data: {
        name,
        type,
        supplier,
        currentQuantity,
        unit,
        reorderPoint,
        leadTimeDays,
        costPerUnit: costPerUnit ?? null,
      },
    });

    revalidatePath('/dashboard/inventory/packaging');

    return {
      success: true,
      message: 'Packaging material added',
    };
  } catch (error) {
    console.error('Error creating packaging material:', error);
    return {
      message: 'Failed to add packaging material',
    };
  }
}

export async function updatePackagingMaterial(
  id: string,
  prevState: PackagingFormState,
  formData: FormData
): Promise<PackagingFormState> {
  try {
    await verifyManagerOrAbove();

    const validatedFields = packagingMaterialSchema.safeParse({
      name: formData.get('name'),
      type: formData.get('type'),
      supplier: formData.get('supplier'),
      currentQuantity: formData.get('currentQuantity'),
      unit: formData.get('unit'),
      reorderPoint: formData.get('reorderPoint'),
      leadTimeDays: formData.get('leadTimeDays'),
      costPerUnit: formData.get('costPerUnit') || undefined,
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { name, type, supplier, currentQuantity, unit, reorderPoint, leadTimeDays, costPerUnit } =
      validatedFields.data;

    // Check for duplicate name excluding current record
    const existing = await db.packagingMaterial.findFirst({
      where: { name, isActive: true, NOT: { id } },
    });

    if (existing) {
      return {
        errors: { name: ['A packaging material with this name already exists'] },
      };
    }

    await db.packagingMaterial.update({
      where: { id },
      data: {
        name,
        type,
        supplier,
        currentQuantity,
        unit,
        reorderPoint,
        leadTimeDays,
        costPerUnit: costPerUnit ?? null,
      },
    });

    revalidatePath('/dashboard/inventory/packaging');

    return {
      success: true,
      message: 'Packaging material updated',
    };
  } catch (error) {
    console.error('Error updating packaging material:', error);
    return {
      message: 'Failed to update packaging material',
    };
  }
}

export async function deactivatePackagingMaterial(
  id: string
): Promise<{ success: boolean; message: string }> {
  try {
    await verifyAdmin();

    await db.packagingMaterial.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath('/dashboard/inventory/packaging');

    return {
      success: true,
      message: 'Packaging material deactivated',
    };
  } catch (error) {
    console.error('Error deactivating packaging material:', error);
    return {
      success: false,
      message: 'Failed to deactivate packaging material',
    };
  }
}

// ============================================================================
// ALERT ACTIONS
// ============================================================================

export type PackagingAlert = {
  id: string;
  name: string;
  type: string;
  currentQuantity: number;
  reorderPoint: number;
  leadTimeDays: number;
  level: 'CRITICAL' | 'WARNING';
};

export type RawMaterialAlert = {
  id: string;
  name: string;
  supplier: string;
  lotNumber: string;
  expirationDate: Date;
  daysUntilExpiration: number;
  level: 'CRITICAL' | 'WARNING';
};

export async function getReorderAlerts(): Promise<{
  packagingAlerts: PackagingAlert[];
  rawMaterialAlerts: RawMaterialAlert[];
}> {
  try {
    // Fetch all active packaging materials, filter in JS (PostgreSQL-compatible field comparison)
    const allPackaging = await db.packagingMaterial.findMany({
      where: { isActive: true },
    });

    // Flag materials at or within 20% above their reorder point
    const packagingAlerts: PackagingAlert[] = allPackaging
      .filter((m) => m.currentQuantity < m.reorderPoint * 1.2)
      .map((m) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        currentQuantity: m.currentQuantity,
        reorderPoint: m.reorderPoint,
        leadTimeDays: m.leadTimeDays,
        level: m.currentQuantity < m.reorderPoint ? ('CRITICAL' as const) : ('WARNING' as const),
      }));

    // Fetch raw materials expiring within 28 days (4-week lead time window)
    const today = new Date();
    const fourWeeksFromNow = new Date(today);
    fourWeeksFromNow.setDate(fourWeeksFromNow.getDate() + 28);

    const expiringRawMaterials = await db.rawMaterial.findMany({
      where: {
        isActive: true,
        expirationDate: { lte: fourWeeksFromNow },
      },
      orderBy: { expirationDate: 'asc' },
    });

    const rawMaterialAlerts: RawMaterialAlert[] = expiringRawMaterials.map((m) => {
      const daysUntilExpiration = differenceInDays(m.expirationDate, today);
      return {
        id: m.id,
        name: m.name,
        supplier: m.supplier,
        lotNumber: m.lotNumber,
        expirationDate: m.expirationDate,
        daysUntilExpiration,
        level: daysUntilExpiration <= 14 ? 'CRITICAL' : 'WARNING',
      };
    });

    return { packagingAlerts, rawMaterialAlerts };
  } catch (error) {
    console.error('Error fetching reorder alerts:', error);
    return { packagingAlerts: [], rawMaterialAlerts: [] };
  }
}

// ============================================================================
// VALUATION ACTIONS
// ============================================================================

export type ValuationRow = {
  productId: string;
  productName: string;
  productSku: string;
  locationId: string;
  locationName: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
};

export type InventoryValuationResult = {
  rows: ValuationRow[];
  grandTotalValue: number;
  grandTotalUnits: number;
  totalProducts: number;
  totalLocations: number;
};

export async function getInventoryValuation(): Promise<InventoryValuationResult> {
  try {
    await verifyManagerOrAbove();

    const products = await db.product.findMany({
      where: { isActive: true },
      include: {
        pricingTiers: true,
      },
      orderBy: { name: 'asc' },
    });

    const locations = await db.location.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    const rows: ValuationRow[] = [];

    for (const product of products) {
      // Estimate unit cost from wholesale cash pricing tier (proxy for COGS)
      const wholesaleTier = product.pricingTiers.find(
        (t) => t.tierName.toLowerCase().includes('wholesale') && t.tierName.toLowerCase().includes('cash')
      );
      const anyTier = product.pricingTiers[0];
      const rawUnitCost = wholesaleTier?.unitPrice ?? anyTier?.unitPrice ?? null;

      // If no pricing data, use 0 as cost (will show in disclaimer)
      const unitCostDecimal = rawUnitCost ? Number(rawUnitCost) : 0;
      // Apply 40% cost ratio as conservative COGS estimate (60% gross margin typical for sauce)
      const unitCost = unitCostDecimal * 0.4;

      for (const location of locations) {
        // Use the same FIFO logic to compute available stock at each location
        const batches = await db.batch.findMany({
          where: {
            productId: product.id,
            status: 'RELEASED',
            allocations: { some: { locationId: location.id } },
          },
          include: {
            allocations: { where: { locationId: location.id } },
          },
        });

        let quantity = 0;

        for (const batch of batches) {
          const initialAllocation = batch.allocations[0]?.quantity ?? 0;

          const inbound = await db.inventoryMovement.aggregate({
            where: { batchId: batch.id, toLocationId: location.id },
            _sum: { quantity: true },
          });

          const outbound = await db.inventoryMovement.aggregate({
            where: { batchId: batch.id, fromLocationId: location.id },
            _sum: { quantity: true },
          });

          const available =
            initialAllocation +
            (inbound._sum.quantity ?? 0) -
            (outbound._sum.quantity ?? 0);

          quantity += Math.max(0, available);
        }

        if (quantity > 0) {
          rows.push({
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            locationId: location.id,
            locationName: location.name,
            quantity,
            unitCost,
            totalValue: quantity * unitCost,
          });
        }
      }
    }

    const grandTotalValue = rows.reduce((sum, r) => sum + r.totalValue, 0);
    const grandTotalUnits = rows.reduce((sum, r) => sum + r.quantity, 0);
    const uniqueProducts = new Set(rows.map((r) => r.productId)).size;
    const uniqueLocations = new Set(rows.map((r) => r.locationId)).size;

    return {
      rows,
      grandTotalValue,
      grandTotalUnits,
      totalProducts: uniqueProducts,
      totalLocations: uniqueLocations,
    };
  } catch (error) {
    console.error('Error computing inventory valuation:', error);
    return {
      rows: [],
      grandTotalValue: 0,
      grandTotalUnits: 0,
      totalProducts: 0,
      totalLocations: 0,
    };
  }
}
