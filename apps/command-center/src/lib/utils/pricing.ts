import { PrismaClient } from "@prisma/client";

export type PriceCalculation = {
  basePrice: number;
  discountPercent: number;
  discountReason: string | null;
  finalPrice: number;
};

/**
 * Calculate the final price for an order line item.
 *
 * Discount priority (highest wins, no stacking):
 *   1. Promotional pricing (supersedes volume + frequency)
 *   2. max(volumeDiscount, frequencyDiscount)
 *
 * @param productId - The product being ordered
 * @param tierName - The pricing tier (e.g. "Wholesale Cash", "Retail")
 * @param unitQuantity - Number of individual units ordered
 * @param frequencyDiscount - Subscription frequency if applicable, else null
 * @param tx - Prisma client or transaction client
 */
export async function calculateLineItemPrice(
  productId: string,
  tierName: string,
  unitQuantity: number,
  frequencyDiscount: "quarterly" | "annual" | null,
  tx: PrismaClient
): Promise<PriceCalculation> {
  // Step 1: Fetch base price from pricing tier
  const pricingTier = await tx.pricingTier.findFirst({
    where: { productId, tierName },
  });

  if (!pricingTier) {
    throw new Error(
      `Pricing tier "${tierName}" not found for product ${productId}`
    );
  }

  const basePrice = Number(pricingTier.unitPrice);

  // Step 2: Fetch product to determine units per case for volume discount
  const product = await tx.product.findFirst({
    where: { id: productId },
    select: { unitsPerCase: true },
  });

  const unitsPerCase = product?.unitsPerCase ?? null;

  // Step 3: Check for active promotional pricing (supersedes everything)
  const now = new Date();
  const promotion = await tx.promotionalPricing.findFirst({
    where: {
      productId,
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
  });

  if (promotion) {
    let promoDiscount: number;

    if (promotion.discountPercent !== null) {
      promoDiscount = Number(promotion.discountPercent);
    } else if (promotion.fixedPrice !== null) {
      // Convert fixed price to an equivalent discount percent
      const fixedPrice = Number(promotion.fixedPrice);
      promoDiscount =
        basePrice > 0 ? ((basePrice - fixedPrice) / basePrice) * 100 : 0;
    } else {
      promoDiscount = 0;
    }

    const finalPrice = basePrice * (1 - promoDiscount / 100);

    return {
      basePrice,
      discountPercent: promoDiscount,
      discountReason: "promotional",
      finalPrice,
    };
  }

  // Step 4: Calculate volume discount (skip if unitsPerCase is null)
  let volumePercent = 0;
  let volumeReason: string | null = null;

  if (unitsPerCase !== null && unitsPerCase > 0) {
    const caseQuantity = Math.floor(unitQuantity / unitsPerCase);

    if (caseQuantity > 0) {
      const volumeDiscount = await tx.volumeDiscount.findFirst({
        where: {
          minCases: { lte: caseQuantity },
          OR: [
            { maxCases: { gte: caseQuantity } },
            { maxCases: null },
          ],
        },
        orderBy: { minCases: "desc" }, // Most specific bracket wins
      });

      if (volumeDiscount && Number(volumeDiscount.discountPercent) > 0) {
        volumePercent = Number(volumeDiscount.discountPercent);
        volumeReason = "volume";
      }
    }
  }

  // Step 5: Calculate frequency discount
  let freqPercent = 0;
  let freqReason: string | null = null;

  if (frequencyDiscount !== null) {
    const freqDiscount = await tx.frequencyDiscount.findFirst({
      where: { frequency: frequencyDiscount },
    });

    if (freqDiscount && Number(freqDiscount.discountPercent) > 0) {
      freqPercent = Number(freqDiscount.discountPercent);
      freqReason = "frequency";
    }
  }

  // Step 6: Apply the higher of the two discounts (no stacking)
  let discountPercent = 0;
  let discountReason: string | null = null;

  if (volumePercent >= freqPercent) {
    discountPercent = volumePercent;
    discountReason = volumeReason;
  } else {
    discountPercent = freqPercent;
    discountReason = freqReason;
  }

  const finalPrice = basePrice * (1 - discountPercent / 100);

  return {
    basePrice,
    discountPercent,
    discountReason,
    finalPrice,
  };
}
