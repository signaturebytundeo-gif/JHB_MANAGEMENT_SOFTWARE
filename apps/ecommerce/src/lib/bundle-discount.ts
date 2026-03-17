import { CartItem } from '@/lib/cart-store'

export const BUNDLE_DISCOUNT_PERCENT = 10
export const BUNDLE_MIN_ITEMS = 3

export interface BundleDiscountResult {
  discountAmount: number // in cents, 0 if not eligible
  eligibleItemCount: number
  discountPercent: number
}

/**
 * Calculates the build-your-own bundle discount for a set of cart items.
 *
 * Eligible items are individual products only — excludes:
 *   - Pre-defined bundle items (isBundle === true)
 *   - Free sample items (isFreeSample === true)
 *
 * When total eligible item quantity >= BUNDLE_MIN_ITEMS (3), a BUNDLE_DISCOUNT_PERCENT (10%)
 * discount is applied to the combined subtotal of all eligible items.
 *
 * @param items - CartItem array from cart store
 * @returns BundleDiscountResult with discountAmount in cents, eligibleItemCount, discountPercent
 */
export function calculateBundleDiscount(items: CartItem[]): BundleDiscountResult {
  const eligibleItems = items.filter(
    (item) => item.isBundle !== true && item.isFreeSample !== true
  )

  const eligibleItemCount = eligibleItems.reduce((sum, item) => sum + item.quantity, 0)

  if (eligibleItemCount < BUNDLE_MIN_ITEMS) {
    return {
      discountAmount: 0,
      eligibleItemCount,
      discountPercent: BUNDLE_DISCOUNT_PERCENT,
    }
  }

  const eligibleSubtotal = eligibleItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  const discountAmount = Math.round((eligibleSubtotal * BUNDLE_DISCOUNT_PERCENT) / 100)

  return {
    discountAmount,
    eligibleItemCount,
    discountPercent: BUNDLE_DISCOUNT_PERCENT,
  }
}
