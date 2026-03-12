'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/dal';
import { createPromotionalPricingSchema } from '@/lib/validators/pricing';
import { calculateLineItemPrice, type PriceCalculation } from '@/lib/utils/pricing';

// ─── Form state types ─────────────────────────────────────────────────────────

export type PromotionalPricingFormState = {
  errors?: Record<string, string[]>;
  success?: boolean;
  message?: string;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getPromotionalPricings() {
  try {
    await verifySession();

    const now = new Date();

    const pricings = await db.promotionalPricing.findMany({
      include: {
        product: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    return pricings.map((p) => ({
      ...p,
      discountPercent: p.discountPercent !== null ? Number(p.discountPercent) : null,
      fixedPrice: p.fixedPrice !== null ? Number(p.fixedPrice) : null,
      // Computed: active AND within date range right now
      isCurrentlyActive:
        p.isActive && p.startDate <= now && p.endDate >= now,
    }));
  } catch (error) {
    console.error('Error fetching promotional pricings:', error);
    return [];
  }
}

export async function getActivePricingForProduct(productId: string) {
  try {
    await verifySession();

    const now = new Date();

    const promo = await db.promotionalPricing.findFirst({
      where: {
        productId,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        product: { select: { id: true, name: true } },
      },
    });

    if (!promo) return null;

    return {
      ...promo,
      discountPercent: promo.discountPercent !== null ? Number(promo.discountPercent) : null,
      fixedPrice: promo.fixedPrice !== null ? Number(promo.fixedPrice) : null,
    };
  } catch (error) {
    console.error('Error fetching active pricing for product:', error);
    return null;
  }
}

export async function getCalculatedPrice(
  productId: string,
  tierName: string,
  unitQuantity: number,
  frequencyDiscount: 'quarterly' | 'annual' | null
): Promise<PriceCalculation | null> {
  try {
    await verifySession();

    const result = await calculateLineItemPrice(
      productId,
      tierName,
      unitQuantity,
      frequencyDiscount,
      db as Parameters<typeof calculateLineItemPrice>[4]
    );

    return result;
  } catch (error) {
    console.error('Error calculating price:', error);
    return null;
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createPromotionalPricing(
  prevState: PromotionalPricingFormState,
  formData: FormData
): Promise<PromotionalPricingFormState> {
  try {
    await verifySession();

    const discountType = formData.get('discountType') as string;
    const raw = {
      productId: formData.get('productId'),
      name: formData.get('name'),
      discountPercent:
        discountType === 'percent' ? formData.get('discountPercent') : undefined,
      fixedPrice:
        discountType === 'fixed' ? formData.get('fixedPrice') : undefined,
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
    };

    const validated = createPromotionalPricingSchema.safeParse(raw);

    if (!validated.success) {
      return {
        errors: validated.error.flatten().fieldErrors as Record<string, string[]>,
        message: validated.error.flatten().formErrors?.[0],
      };
    }

    const data = validated.data;

    await db.promotionalPricing.create({
      data: {
        productId: data.productId,
        name: data.name,
        discountPercent: data.discountPercent ?? null,
        fixedPrice: data.fixedPrice ?? null,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: true,
      },
    });

    revalidatePath('/dashboard/customers');
    return { success: true };
  } catch (error) {
    console.error('Error creating promotional pricing:', error);
    return { message: 'Failed to create promotion. Please try again.' };
  }
}

export async function deactivatePromotionalPricing(
  id: string
): Promise<PromotionalPricingFormState> {
  try {
    await verifySession();

    await db.promotionalPricing.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath('/dashboard/customers');
    return { success: true };
  } catch (error) {
    console.error('Error deactivating promotional pricing:', error);
    return { message: 'Failed to deactivate promotion. Please try again.' };
  }
}
