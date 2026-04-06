'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { verifyManagerOrAbove } from '@/lib/dal';
import {
  createBundleSchema,
  updateBundleSchema,
  type BundleFormState,
} from '@/lib/validators/bundles';

// ============================================================================
// READ
// ============================================================================

export async function getBundles() {
  try {
    return await db.productBundle.findMany({
      include: {
        parentProduct: { select: { id: true, name: true, sku: true, size: true } },
        components: {
          include: {
            product: { select: { id: true, name: true, sku: true, size: true } },
          },
        },
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  } catch (err) {
    console.error('[bundles] getBundles error:', err);
    return [];
  }
}

export async function getBundleForProduct(parentProductId: string) {
  try {
    return await db.productBundle.findUnique({
      where: { parentProductId },
      include: {
        components: {
          include: { product: { select: { id: true, name: true, sku: true, size: true } } },
        },
      },
    });
  } catch {
    return null;
  }
}

// ============================================================================
// WRITE
// ============================================================================

export async function createBundle(
  prevState: BundleFormState | undefined,
  formData: FormData
): Promise<BundleFormState> {
  try {
    await verifyManagerOrAbove();

    // Parse components from JSON string (sent by client form)
    let components: Array<{ productId: string; quantity: number }> = [];
    try {
      components = JSON.parse((formData.get('components') as string) || '[]');
    } catch {
      return { message: 'Invalid components data' };
    }

    const validated = createBundleSchema.safeParse({
      parentProductId: formData.get('parentProductId'),
      name: formData.get('name'),
      description: formData.get('description') || undefined,
      components,
    });

    if (!validated.success) {
      return { errors: validated.error.flatten().fieldErrors };
    }

    const data = validated.data;

    // Check: parent must not be a component of itself
    if (data.components.some((c) => c.productId === data.parentProductId)) {
      return { message: 'Bundle parent cannot be one of its own components' };
    }

    // Check: no existing bundle for this parent product
    const existing = await db.productBundle.findUnique({
      where: { parentProductId: data.parentProductId },
    });
    if (existing) {
      return { message: 'This product is already a bundle. Edit the existing bundle instead.' };
    }

    await db.productBundle.create({
      data: {
        parentProductId: data.parentProductId,
        name: data.name,
        description: data.description,
        components: {
          create: data.components.map((c) => ({
            productId: c.productId,
            quantity: c.quantity,
          })),
        },
      },
    });

    revalidatePath('/dashboard/products/bundles');
    return { success: true, message: 'Bundle created' };
  } catch (err) {
    console.error('[bundles] createBundle error:', err);
    return { message: 'Failed to create bundle' };
  }
}

export async function updateBundle(
  prevState: BundleFormState | undefined,
  formData: FormData
): Promise<BundleFormState> {
  try {
    await verifyManagerOrAbove();

    let components: Array<{ productId: string; quantity: number }> = [];
    try {
      components = JSON.parse((formData.get('components') as string) || '[]');
    } catch {
      return { message: 'Invalid components data' };
    }

    const validated = updateBundleSchema.safeParse({
      bundleId: formData.get('bundleId'),
      parentProductId: formData.get('parentProductId'),
      name: formData.get('name'),
      description: formData.get('description') || undefined,
      components,
    });

    if (!validated.success) {
      return { errors: validated.error.flatten().fieldErrors };
    }

    const data = validated.data;

    // Replace all components: delete old, create new
    await db.$transaction([
      db.productBundleComponent.deleteMany({
        where: { bundleId: data.bundleId },
      }),
      db.productBundle.update({
        where: { id: data.bundleId },
        data: {
          name: data.name,
          description: data.description,
          components: {
            create: data.components.map((c) => ({
              productId: c.productId,
              quantity: c.quantity,
            })),
          },
        },
      }),
    ]);

    revalidatePath('/dashboard/products/bundles');
    return { success: true, message: 'Bundle updated' };
  } catch (err) {
    console.error('[bundles] updateBundle error:', err);
    return { message: 'Failed to update bundle' };
  }
}

export async function deleteBundle(
  bundleId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await verifyManagerOrAbove();
    await db.productBundle.delete({ where: { id: bundleId } });
    revalidatePath('/dashboard/products/bundles');
    return { success: true, message: 'Bundle deleted' };
  } catch (err) {
    console.error('[bundles] deleteBundle error:', err);
    return { success: false, message: 'Failed to delete bundle' };
  }
}

export async function toggleBundleActive(
  bundleId: string,
  isActive: boolean
): Promise<{ success: boolean; message: string }> {
  try {
    await verifyManagerOrAbove();
    await db.productBundle.update({ where: { id: bundleId }, data: { isActive } });
    revalidatePath('/dashboard/products/bundles');
    return { success: true, message: isActive ? 'Bundle activated' : 'Bundle deactivated' };
  } catch (err) {
    console.error('[bundles] toggleBundleActive error:', err);
    return { success: false, message: 'Failed to toggle bundle' };
  }
}
