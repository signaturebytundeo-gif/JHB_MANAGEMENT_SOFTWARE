import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getSupabase } from '@/lib/supabase'
import { calculateBundleDiscount, BUNDLE_DISCOUNT_PERCENT } from '@/lib/bundle-discount'
import { CartItem } from '@/lib/cart-store'

// Server-enforced pricing for the 2oz free sample promo:
// 1st unit = $0.00, additional units = 25% off retail ($6.99 × 0.75 = $5.24)
const ADDITIONAL_2OZ_PRICE = 524 // $5.24 in cents

interface CheckoutItem {
  id: string
  name: string
  price: number
  quantity: number
  image: string
  size: string
  isFreeSample?: boolean
  isBundle?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const {
      items,
      bundleDiscount = 0,
      promoCode,
    }: {
      items: CheckoutItem[]
      bundleDiscount?: number
      promoCode?: string
    } = await request.json()

    // Validate items array is non-empty
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      )
    }

    // =========================================================================
    // SERVER-SIDE 2OZ PRICING ENFORCEMENT
    // Consolidate all 2oz jerk sauce items (free sample + regular shop adds).
    // Rule: 1st unit is always free ($0.00), all additional units are $5.24.
    // Client prices are IGNORED for these items — server is authoritative.
    // =========================================================================
    const freeSampleItems = items.filter(
      (item) => item.isFreeSample || item.id === 'free-sample-2oz'
    )
    const regular2ozItems = items.filter(
      (item) => !item.isFreeSample && item.id === 'jerk-sauce-2oz'
    )
    const total2ozQty =
      freeSampleItems.reduce((sum, item) => sum + item.quantity, 0) +
      regular2ozItems.reduce((sum, item) => sum + item.quantity, 0)
    const has2oz = total2ozQty > 0

    // All non-2oz items pass through unchanged
    const otherItems = items.filter(
      (item) => !item.isFreeSample && item.id !== 'free-sample-2oz' && item.id !== 'jerk-sauce-2oz'
    )

    // Rebuild the normalized items array for discount calculation and metadata.
    // The free sample gets price=0 qty=1, additional 2oz get price=524.
    const normalizedItems: CheckoutItem[] = [...otherItems]
    if (has2oz) {
      // Always 1 free unit
      normalizedItems.push({
        id: 'free-sample-2oz',
        name: 'Free 2oz Jerk Sauce Sample',
        price: 0,
        quantity: 1,
        image: freeSampleItems[0]?.image || regular2ozItems[0]?.image || '',
        size: '2oz',
        isFreeSample: true,
      })
      // Additional units at discounted price
      const additionalQty = total2ozQty - 1
      if (additionalQty > 0) {
        normalizedItems.push({
          id: 'jerk-sauce-2oz-additional',
          name: 'Original Jerk Sauce (2oz) — 25% off',
          price: ADDITIONAL_2OZ_PRICE,
          quantity: additionalQty,
          image: freeSampleItems[0]?.image || regular2ozItems[0]?.image || '',
          size: '2oz',
        })
      }
    }

    const hasFreeSample = has2oz

    // Server-side discount validation — re-calculate from items to prevent client-side tampering.
    // CheckoutItem is structurally compatible with CartItem, so we can cast directly.
    const { discountAmount: serverBundleDiscount } = calculateBundleDiscount(normalizedItems as CartItem[])

    // Suppress the bundleDiscount param if server calculation disagrees
    void bundleDiscount

    // =========================================================================
    // PROMO CODE VALIDATION (server-side re-validation)
    // The client may have validated via /api/validate-promo, but we re-check here
    // to prevent replay attacks or race conditions with usage limits.
    // =========================================================================
    let promoDiscount = 0
    let validatedPromoCode: string | null = null
    let promoDiscountType: string | null = null
    let promoDiscountValue: number | null = null

    if (promoCode) {
      const normalizedCode = promoCode.trim().toUpperCase()
      const supabase = getSupabase()
      const { data: promo } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', normalizedCode)
        .single()

      if (
        promo &&
        promo.is_active &&
        (!promo.expires_at || new Date(promo.expires_at) >= new Date()) &&
        (promo.max_uses === null || promo.usage_count < promo.max_uses)
      ) {
        validatedPromoCode = normalizedCode
        promoDiscountType = promo.discount_type
        promoDiscountValue = Number(promo.discount_value)

        // Calculate paid items subtotal (after 2oz enforcement, before bundle discount)
        const paidSubtotal = normalizedItems.reduce(
          (sum, item) => sum + (item.isFreeSample ? 0 : item.price * item.quantity),
          0
        )

        if (promo.discount_type === 'percentage') {
          promoDiscount = Math.round((paidSubtotal * promoDiscountValue) / 100)
        } else {
          // Fixed amount discount (stored as dollars, convert to cents)
          promoDiscount = Math.round(promoDiscountValue * 100)
        }

        // Clamp: discount cannot exceed the paid subtotal
        if (promoDiscount > paidSubtotal) {
          promoDiscount = paidSubtotal
        }
      }
      // If promo is invalid at checkout time, silently skip (don't block the order)
    }

    // =========================================================================
    // COMBINE DISCOUNTS
    // Bundle discount + promo code discount are additive, applied as a single Stripe coupon.
    // Promo applies to the order subtotal AFTER 2oz pricing but before bundle discount math.
    // =========================================================================
    const totalDiscount = serverBundleDiscount + promoDiscount

    // Build line items from server-enforced prices
    const line_items = normalizedItems.map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.isFreeSample
            ? 'Free 2oz Jerk Sauce Sample'
            : `${item.name} (${item.size})`,
          // Only include absolute URLs for images — relative paths won't work in Stripe
          images: item.image.startsWith('http') ? [item.image] : [],
        },
        unit_amount: item.isFreeSample ? 0 : item.price,
      },
      quantity: item.quantity,
    }))

    // Add shipping line item
    // Free sample only: $5.99 | Regular orders under $50: $12.99 | Over $50: free
    const paidItemsTotal = normalizedItems.reduce(
      (sum, item) => sum + (item.isFreeSample ? 0 : item.price * item.quantity),
      0
    )
    const hasPaidItems = paidItemsTotal > 0

    let shippingAmount = 0
    if (hasFreeSample && !hasPaidItems) {
      shippingAmount = 599 // $5.99 for free sample only
    } else if (paidItemsTotal < 5000) {
      shippingAmount = 1299 // $12.99 for orders under $50
    }
    // else: free shipping for orders $50+

    if (shippingAmount > 0) {
      line_items.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Shipping & Handling',
            images: [],
          },
          unit_amount: shippingAmount,
        },
        quantity: 1,
      })
    }

    // Apply combined discount as a single Stripe coupon
    let discounts: { coupon: string }[] | undefined
    if (totalDiscount > 0) {
      const discountParts: string[] = []
      if (serverBundleDiscount > 0) {
        discountParts.push(`Build Your Own Bundle (${BUNDLE_DISCOUNT_PERCENT}% off)`)
      }
      if (promoDiscount > 0 && validatedPromoCode) {
        const promoLabel =
          promoDiscountType === 'percentage'
            ? `${promoDiscountValue}% off`
            : `$${(promoDiscount / 100).toFixed(2)} off`
        discountParts.push(`Promo ${validatedPromoCode} (${promoLabel})`)
      }

      const coupon = await stripe.coupons.create({
        amount_off: totalDiscount,
        currency: 'usd',
        name: discountParts.join(' + '),
        duration: 'once',
      })
      discounts = [{ coupon: coupon.id }]
    }

    // Serialize cart items into metadata for webhook order processing
    const itemsSummary = normalizedItems.map((item) => ({
      name: item.isFreeSample ? 'Free 2oz Jerk Sauce Sample' : `${item.name} (${item.size})`,
      quantity: item.quantity,
      price: item.isFreeSample ? 0 : item.price,
    }))

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      phone_number_collection: { enabled: true },
      success_url: `${request.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/shop`,
      // Promotion codes and discounts are mutually exclusive in Stripe.
      // When any discount applies (bundle or promo), use the discounts array.
      // Otherwise, enable Stripe's built-in promo code field (allow_promotion_codes).
      ...(discounts
        ? { discounts }
        : { allow_promotion_codes: true }),
      metadata: {
        source: 'jamaica-house-brand-web',
        hasFreeSample: hasFreeSample ? 'true' : 'false',
        hasBundles: normalizedItems.some((i) => i.isBundle) ? 'true' : 'false',
        bundleDiscount: serverBundleDiscount > 0 ? serverBundleDiscount.toString() : '0',
        promoCode: validatedPromoCode || '',
        promoDiscount: promoDiscount > 0 ? promoDiscount.toString() : '0',
        items_json: JSON.stringify(itemsSummary),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
