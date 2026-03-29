'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { verifyManagerOrAbove } from '@/lib/dal';
import {
  createLocationSchema,
  deleteLocationSchema,
  type CreateLocationFormState,
  type DeleteLocationFormState,
} from '@/lib/validators/locations';

// ============================================================================
// READ ACTIONS
// ============================================================================

export async function getLocations() {
  return await db.location.findMany({
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      type: true,
      address: true,
      description: true,
      isActive: true,
      createdAt: true,
    },
  });
}

// ============================================================================
// WRITE ACTIONS
// ============================================================================

export async function createLocation(
  prevState: CreateLocationFormState,
  formData: FormData
): Promise<CreateLocationFormState> {
  await verifyManagerOrAbove();

  const validatedFields = createLocationSchema.safeParse({
    name: formData.get('name'),
    type: formData.get('type'),
    address: formData.get('address') || undefined,
    description: formData.get('description') || undefined,
    isActive: formData.get('isActive') === 'true',
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>,
      message: 'Validation failed.',
    };
  }

  const data = validatedFields.data;

  try {
    await db.location.create({
      data: {
        name: data.name,
        type: data.type,
        address: data.address || null,
        description: data.description || null,
        isActive: data.isActive,
      },
    });

    revalidatePath('/dashboard/locations');
    revalidatePath('/dashboard/inventory/transfers');
    revalidatePath('/dashboard/inventory/adjustments');

    return { success: true, message: `Location "${data.name}" created.` };
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return {
        errors: { name: ['A location with this name already exists.'] },
        message: 'Duplicate name.',
      };
    }
    console.error('Error creating location:', error);
    return { message: 'Failed to create location.' };
  }
}

export async function deleteLocation(
  prevState: DeleteLocationFormState,
  formData: FormData
): Promise<DeleteLocationFormState> {
  await verifyManagerOrAbove();

  const validatedFields = deleteLocationSchema.safeParse({
    locationId: formData.get('locationId'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>,
      message: 'Validation failed.',
    };
  }

  const { locationId } = validatedFields.data;

  try {
    const location = await db.location.findUnique({
      where: { id: locationId },
      select: { name: true },
    });

    if (!location) {
      return { message: 'Location not found.' };
    }

    // Soft delete — set isActive to false to preserve historical inventory records
    await db.location.update({
      where: { id: locationId },
      data: { isActive: false },
    });

    revalidatePath('/dashboard/locations');
    revalidatePath('/dashboard/inventory/transfers');
    revalidatePath('/dashboard/inventory/adjustments');

    return { success: true, message: `"${location.name}" deactivated.` };
  } catch (error) {
    console.error('Error deactivating location:', error);
    return { message: 'Failed to deactivate location.' };
  }
}

export async function reactivateLocation(
  locationId: string
): Promise<{ success: boolean; message: string }> {
  await verifyManagerOrAbove();

  try {
    const location = await db.location.update({
      where: { id: locationId },
      data: { isActive: true },
    });

    revalidatePath('/dashboard/locations');
    revalidatePath('/dashboard/inventory/transfers');
    revalidatePath('/dashboard/inventory/adjustments');

    return { success: true, message: `"${location.name}" reactivated.` };
  } catch (error) {
    console.error('Error reactivating location:', error);
    return { success: false, message: 'Failed to reactivate location.' };
  }
}
