'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/dal';
import type { PromoCode } from '@prisma/client';

export async function getPromoCodes(): Promise<PromoCode[]> {
  await verifySession();

  const codes = await db.promoCode.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return codes;
}

export async function createPromoCode(formData: FormData): Promise<{ success: boolean; error?: string }> {
  await verifySession();

  const code = (formData.get('code') as string)?.toUpperCase().trim();
  const assignedTo = (formData.get('assignedTo') as string)?.trim();
  const discountType = formData.get('discountType') as string;
  const discountValue = parseFloat(formData.get('discountValue') as string);
  const maxUsesRaw = formData.get('maxUses') as string;
  const expiresAtRaw = formData.get('expiresAt') as string;

  if (!code || !assignedTo || !discountType || isNaN(discountValue) || discountValue <= 0) {
    return { success: false, error: 'All required fields must be filled with valid values.' };
  }

  if (!['percentage', 'fixed'].includes(discountType)) {
    return { success: false, error: 'Invalid discount type. Must be "percentage" or "fixed".' };
  }

  // Check uniqueness
  const existing = await db.promoCode.findFirst({
    where: { code: code.toUpperCase() },
  });

  if (existing) {
    return { success: false, error: `Code "${code}" already exists.` };
  }

  const maxUses = maxUsesRaw ? parseInt(maxUsesRaw, 10) : null;
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;

  try {
    await db.promoCode.create({
      data: {
        code: code.toUpperCase(),
        discountType,
        discountValue,
        assignedTo,
        maxUses,
        expiresAt,
      },
    });

    revalidatePath('/dashboard/promo-codes');
    return { success: true };
  } catch (error) {
    console.error('Error creating promo code:', error);
    return { success: false, error: 'Failed to create promo code. Please try again.' };
  }
}

export async function updatePromoCode(formData: FormData): Promise<{ success: boolean; error?: string }> {
  await verifySession();

  const id = formData.get('id') as string;
  const code = (formData.get('code') as string)?.toUpperCase().trim();
  const assignedTo = (formData.get('assignedTo') as string)?.trim();
  const discountType = formData.get('discountType') as string;
  const discountValue = parseFloat(formData.get('discountValue') as string);
  const maxUsesRaw = formData.get('maxUses') as string;
  const expiresAtRaw = formData.get('expiresAt') as string;

  if (!id || !code || !assignedTo || !discountType || isNaN(discountValue) || discountValue <= 0) {
    return { success: false, error: 'All required fields must be filled with valid values.' };
  }

  if (!['percentage', 'fixed'].includes(discountType)) {
    return { success: false, error: 'Invalid discount type. Must be "percentage" or "fixed".' };
  }

  const maxUses = maxUsesRaw ? parseInt(maxUsesRaw, 10) : null;
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;

  try {
    await db.promoCode.update({
      where: { id },
      data: {
        code: code.toUpperCase(),
        assignedTo,
        discountType,
        discountValue,
        maxUses,
        expiresAt,
      },
    });

    revalidatePath('/dashboard/promo-codes');
    return { success: true };
  } catch (error) {
    console.error('Error updating promo code:', error);
    return { success: false, error: 'Failed to update promo code. Please try again.' };
  }
}

export async function deletePromoCode(id: string): Promise<{ success: boolean; error?: string }> {
  await verifySession();

  try {
    await db.promoCode.delete({
      where: { id },
    });

    revalidatePath('/dashboard/promo-codes');
    return { success: true };
  } catch (error) {
    console.error('Error deleting promo code:', error);
    return { success: false, error: 'Failed to delete promo code. Please try again.' };
  }
}

export async function togglePromoCodeStatus(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
  await verifySession();

  try {
    await db.promoCode.update({
      where: { id },
      data: { isActive },
    });

    revalidatePath('/dashboard/promo-codes');
    return { success: true };
  } catch (error) {
    console.error('Error toggling promo code status:', error);
    return { success: false, error: 'Failed to update promo code status. Please try again.' };
  }
}
