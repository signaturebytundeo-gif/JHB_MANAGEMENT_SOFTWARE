'use server';

import { db } from '@/lib/db';
import { verifyAdmin } from '@/lib/dal';
import { revalidatePath } from 'next/cache';
import {
  coPackerPartnerSchema,
  type CoPackerPartnerFormState,
} from '@/lib/validators/production';

export async function createCoPackerPartner(
  prevState: CoPackerPartnerFormState,
  formData: FormData
): Promise<CoPackerPartnerFormState> {
  try {
    // Verify admin role
    await verifyAdmin();

    // Validate input
    const validatedFields = coPackerPartnerSchema.safeParse({
      name: formData.get('name'),
      contactName: formData.get('contactName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      address: formData.get('address'),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { name, contactName, email, phone, address } = validatedFields.data;

    // Check for duplicate name
    const existingPartner = await db.coPackerPartner.findFirst({
      where: {
        name: name,
      },
    });

    if (existingPartner) {
      return {
        message: 'A partner with this name already exists',
      };
    }

    // Create co-packer partner
    await db.coPackerPartner.create({
      data: {
        name,
        contactName: contactName || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
      },
    });

    revalidatePath('/dashboard/settings/co-packers');

    return {
      success: true,
      message: 'Partner added successfully',
    };
  } catch (error) {
    console.error('Error creating co-packer partner:', error);
    return {
      message: 'Failed to add partner',
    };
  }
}

export async function updateCoPackerPartner(
  prevState: CoPackerPartnerFormState,
  formData: FormData
): Promise<CoPackerPartnerFormState> {
  try {
    // Verify admin role
    await verifyAdmin();

    const partnerId = formData.get('partnerId') as string;

    if (!partnerId) {
      return {
        message: 'Partner ID is required',
      };
    }

    // Validate input
    const validatedFields = coPackerPartnerSchema.safeParse({
      name: formData.get('name'),
      contactName: formData.get('contactName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      address: formData.get('address'),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { name, contactName, email, phone, address } = validatedFields.data;

    // Check for duplicate name (excluding current partner)
    const existingPartner = await db.coPackerPartner.findFirst({
      where: {
        name: name,
        NOT: {
          id: partnerId,
        },
      },
    });

    if (existingPartner) {
      return {
        message: 'A partner with this name already exists',
      };
    }

    // Update record
    await db.coPackerPartner.update({
      where: { id: partnerId },
      data: {
        name,
        contactName: contactName || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
      },
    });

    revalidatePath('/dashboard/settings/co-packers');

    return {
      success: true,
      message: 'Partner updated',
    };
  } catch (error) {
    console.error('Error updating co-packer partner:', error);
    return {
      message: 'Failed to update partner',
    };
  }
}

export async function toggleCoPackerPartner(
  partnerId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Verify admin role
    await verifyAdmin();

    // Find partner
    const partner = await db.coPackerPartner.findUnique({
      where: { id: partnerId },
    });

    if (!partner) {
      return {
        success: false,
        message: 'Partner not found',
      };
    }

    // Toggle isActive
    await db.coPackerPartner.update({
      where: { id: partnerId },
      data: {
        isActive: !partner.isActive,
      },
    });

    revalidatePath('/dashboard/settings/co-packers');

    return {
      success: true,
      message: partner.isActive
        ? 'Partner deactivated'
        : 'Partner activated',
    };
  } catch (error) {
    console.error('Error toggling co-packer partner:', error);
    return {
      success: false,
      message: 'Failed to toggle partner status',
    };
  }
}
