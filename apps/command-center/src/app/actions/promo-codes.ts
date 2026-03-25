'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/dal';

export type PromoCode = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  is_active: boolean;
  assigned_to: string;
  usage_count: number;
  max_uses: number | null;
  created_at: Date;
  expires_at: Date | null;
};

export async function getPromoCodes(): Promise<PromoCode[]> {
  await verifySession();

  const codes = await db.$queryRaw<PromoCode[]>`
    SELECT id, code, discount_type, discount_value, is_active,
           assigned_to, usage_count, max_uses, created_at, expires_at
    FROM promo_codes
    ORDER BY created_at DESC
  `;

  return codes.map((c) => ({
    ...c,
    discount_value: Number(c.discount_value),
    usage_count: Number(c.usage_count),
    max_uses: c.max_uses ? Number(c.max_uses) : null,
  }));
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

  // Check uniqueness
  const existing = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM promo_codes WHERE UPPER(code) = ${code} LIMIT 1
  `;

  if (existing.length > 0) {
    return { success: false, error: `Code "${code}" already exists.` };
  }

  const maxUses = maxUsesRaw ? parseInt(maxUsesRaw, 10) : null;
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;

  if (maxUses !== null) {
    await db.$queryRaw`
      INSERT INTO promo_codes (code, discount_type, discount_value, is_active, assigned_to, usage_count, max_uses, expires_at)
      VALUES (${code}, ${discountType}, ${discountValue}, true, ${assignedTo}, 0, ${maxUses}, ${expiresAt})
    `;
  } else {
    await db.$queryRaw`
      INSERT INTO promo_codes (code, discount_type, discount_value, is_active, assigned_to, usage_count, expires_at)
      VALUES (${code}, ${discountType}, ${discountValue}, true, ${assignedTo}, 0, ${expiresAt})
    `;
  }

  revalidatePath('/dashboard/promo-codes');
  return { success: true };
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

  const maxUses = maxUsesRaw ? parseInt(maxUsesRaw, 10) : null;
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;

  await db.$queryRaw`
    UPDATE promo_codes
    SET code = ${code}, assigned_to = ${assignedTo}, discount_type = ${discountType},
        discount_value = ${discountValue}, max_uses = ${maxUses}, expires_at = ${expiresAt}
    WHERE id = ${id}
  `;

  revalidatePath('/dashboard/promo-codes');
  return { success: true };
}

export async function deletePromoCode(id: string): Promise<{ success: boolean; error?: string }> {
  await verifySession();
  await db.$queryRaw`DELETE FROM promo_codes WHERE id = ${id}`;
  revalidatePath('/dashboard/promo-codes');
  return { success: true };
}

export async function togglePromoCodeStatus(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
  await verifySession();

  await db.$queryRaw`
    UPDATE promo_codes SET is_active = ${isActive} WHERE id = ${id}
  `;

  revalidatePath('/dashboard/promo-codes');
  return { success: true };
}
