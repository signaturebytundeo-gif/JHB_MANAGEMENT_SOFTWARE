/**
 * Seed script: Create Stripe promotion codes for JHB ecommerce.
 *
 * Usage (with env var set):
 *   STRIPE_SECRET_KEY=sk_test_xxx npx tsx scripts/seed-promo-codes.ts
 *
 * Or if .env.local is loaded:
 *   npx tsx -r dotenv/config scripts/seed-promo-codes.ts dotenv_config_path=.env.local
 *
 * This script is idempotent — safe to run multiple times.
 * It checks for existing promotion codes before creating new ones.
 */

import Stripe from 'stripe'

const stripeKey = process.env.STRIPE_SECRET_KEY
if (!stripeKey) {
  console.error(
    'ERROR: STRIPE_SECRET_KEY environment variable is required.\n' +
      'Run with: STRIPE_SECRET_KEY=sk_test_xxx npx tsx scripts/seed-promo-codes.ts'
  )
  process.exit(1)
}

const stripe = new Stripe(stripeKey)

/**
 * Check if a promotion code with the given code string already exists.
 * Returns the existing promotion code if found, null otherwise.
 */
async function findExistingPromoCode(code: string): Promise<Stripe.PromotionCode | null> {
  const result = await stripe.promotionCodes.list({ code, limit: 10 })
  if (result.data.length === 0) return null
  // Return first match (promotion code list is filtered by exact code match)
  return result.data[0]
}

async function seedWelcome10(): Promise<void> {
  const code = 'WELCOME10'
  console.log(`\n--- ${code} ---`)

  const existing = await findExistingPromoCode(code)
  if (existing) {
    if (existing.active) {
      const couponRef = existing.promotion?.coupon
      const couponId = typeof couponRef === 'string' ? couponRef : (couponRef as Stripe.Coupon | null)?.id
      console.log(`${code} promotion code already exists and is active, skipping.`)
      console.log(`  ID: ${existing.id}, coupon: ${couponId ?? 'unknown'}`)
    } else {
      console.warn(
        `WARNING: ${code} promotion code exists but is INACTIVE. ` +
          'To recreate, deactivate the existing code in Stripe dashboard first.'
      )
    }
    return
  }

  console.log(`Creating ${code} coupon (10% off entire order)...`)
  const coupon = await stripe.coupons.create({
    percent_off: 10,
    duration: 'forever',
    name: 'Welcome 10% Off',
  })
  console.log(`  Coupon created: ${coupon.id}`)

  console.log(`Creating ${code} promotion code...`)
  const promoCode = await stripe.promotionCodes.create({
    promotion: {
      type: 'coupon',
      coupon: coupon.id,
    },
    code: code,
    active: true,
  })
  console.log(`  Promotion code created: ${promoCode.id} (code: ${promoCode.code})`)
  console.log(`${code} setup complete.`)
}

async function seedFreeShip50(): Promise<void> {
  const code = 'FREESHIP50'
  console.log(`\n--- ${code} ---`)

  const existing = await findExistingPromoCode(code)
  if (existing) {
    if (existing.active) {
      const couponRef = existing.promotion?.coupon
      const couponId = typeof couponRef === 'string' ? couponRef : (couponRef as Stripe.Coupon | null)?.id
      console.log(`${code} promotion code already exists and is active, skipping.`)
      console.log(`  ID: ${existing.id}, coupon: ${couponId ?? 'unknown'}`)
    } else {
      console.warn(
        `WARNING: ${code} promotion code exists but is INACTIVE. ` +
          'To recreate, deactivate the existing code in Stripe dashboard first.'
      )
    }
    return
  }

  // $12.99 amount_off matches standard shipping cost — effectively free shipping.
  // Stripe promotion codes on hosted checkout apply to order total, not individual line items.
  // A fixed amount_off coupon offsets the shipping line item cost.
  console.log(`Creating ${code} coupon ($12.99 off, for free shipping on $50+ orders)...`)
  const coupon = await stripe.coupons.create({
    amount_off: 1299, // $12.99 in cents — matches standard shipping cost
    currency: 'usd',
    duration: 'forever',
    name: 'Free Shipping ($50+ orders)',
  })
  console.log(`  Coupon created: ${coupon.id}`)

  console.log(`Creating ${code} promotion code (requires $50 minimum order)...`)
  const promoCode = await stripe.promotionCodes.create({
    promotion: {
      type: 'coupon',
      coupon: coupon.id,
    },
    code: code,
    active: true,
    restrictions: {
      minimum_amount: 5000, // $50.00 in cents
      minimum_amount_currency: 'usd',
    },
  })
  console.log(`  Promotion code created: ${promoCode.id} (code: ${promoCode.code})`)
  console.log(`${code} setup complete.`)
}

async function main(): Promise<void> {
  console.log('JHB Ecommerce — Stripe Promotion Code Seeder')
  console.log('=============================================')
  console.log(`Using Stripe key: ${stripeKey!.substring(0, 12)}...`)

  try {
    await seedWelcome10()
    await seedFreeShip50()

    console.log('\n=============================================')
    console.log('Seeding complete. Promotion codes are ready.')
    console.log('\nCodes available:')
    console.log('  WELCOME10  — 10% off entire order')
    console.log('  FREESHIP50 — Free shipping on orders $50+ ($12.99 off)')
    process.exit(0)
  } catch (error) {
    console.error('\nERROR during seeding:', error)
    process.exit(1)
  }
}

main()
