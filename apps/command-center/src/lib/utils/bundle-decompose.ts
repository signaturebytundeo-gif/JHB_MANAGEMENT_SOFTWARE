import { db } from '@/lib/db';

type PrismaClient = typeof db;

/**
 * Decompose a bundle sale into component inventory deductions.
 * Call this AFTER creating the Sale record for revenue.
 *
 * @param productId The parent product ID (must be a registered bundle)
 * @param locationId Where to pull the components from
 * @param bundleQuantity How many bundles were sold
 * @param createdById User triggering the sale
 * @param saleReference Optional reference string for the transaction notes
 * @param tx Prisma client (for transaction context)
 *
 * @returns Array of component deductions created, or empty array if not a bundle.
 */
export async function decomposeBundleInventory(
  productId: string,
  locationId: string,
  bundleQuantity: number,
  createdById: string,
  saleReference: string | undefined,
  tx: PrismaClient = db
): Promise<Array<{ productId: string; componentName: string; quantity: number }>> {
  // Check if this product is a bundle
  const bundle = await tx.productBundle.findUnique({
    where: { parentProductId: productId },
    include: {
      components: {
        include: { product: { select: { id: true, name: true, sku: true } } },
      },
    },
  });

  if (!bundle || !bundle.isActive || bundle.components.length === 0) {
    return [];
  }

  const results: Array<{ productId: string; componentName: string; quantity: number }> = [];

  // Deduct each component from inventory
  for (const component of bundle.components) {
    const totalDeduct = component.quantity * bundleQuantity;

    await tx.inventoryTransaction.create({
      data: {
        productId: component.productId,
        locationId,
        quantityChange: -totalDeduct,
        type: 'SALE_DEDUCTION',
        notes: `Bundle: ${bundle.name} × ${bundleQuantity}${saleReference ? ` (${saleReference})` : ''}`,
        createdById,
      },
    });

    results.push({
      productId: component.productId,
      componentName: component.product.name,
      quantity: totalDeduct,
    });
  }

  return results;
}
