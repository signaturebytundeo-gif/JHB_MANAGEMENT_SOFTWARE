'use server';

import { db } from '@/lib/db';
import { verifyManagerOrAbove } from '@/lib/dal';
import { revalidatePath } from 'next/cache';
import {
  rawMaterialSchema,
  type RawMaterialFormState,
} from '@/lib/validators/production';

export async function createRawMaterial(
  prevState: RawMaterialFormState,
  formData: FormData
): Promise<RawMaterialFormState> {
  try {
    // Verify manager or admin role
    await verifyManagerOrAbove();

    // Validate input
    const validatedFields = rawMaterialSchema.safeParse({
      name: formData.get('name'),
      supplier: formData.get('supplier'),
      lotNumber: formData.get('lotNumber'),
      receivedDate: formData.get('receivedDate'),
      expirationDate: formData.get('expirationDate'),
      quantity: formData.get('quantity'),
      unit: formData.get('unit'),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const {
      name,
      supplier,
      lotNumber,
      receivedDate,
      expirationDate,
      quantity,
      unit,
    } = validatedFields.data;

    // Create raw material record
    await db.rawMaterial.create({
      data: {
        name,
        supplier,
        lotNumber,
        receivedDate,
        expirationDate,
        quantity,
        unit,
      },
    });

    revalidatePath('/dashboard/production/raw-materials');

    return {
      success: true,
      message: 'Raw material added',
    };
  } catch (error) {
    console.error('Error creating raw material:', error);
    return {
      message: 'Failed to add raw material',
    };
  }
}

export async function getRawMaterials() {
  try {
    const materials = await db.rawMaterial.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        expirationDate: 'asc',
      },
    });

    return materials;
  } catch (error) {
    console.error('Error fetching raw materials:', error);
    return [];
  }
}

export async function deactivateRawMaterial(
  id: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Verify manager or admin role
    await verifyManagerOrAbove();

    // Soft delete: set isActive to false
    await db.rawMaterial.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    revalidatePath('/dashboard/production/raw-materials');

    return {
      success: true,
      message: 'Raw material removed',
    };
  } catch (error) {
    console.error('Error deactivating raw material:', error);
    return {
      success: false,
      message: 'Failed to remove raw material',
    };
  }
}
