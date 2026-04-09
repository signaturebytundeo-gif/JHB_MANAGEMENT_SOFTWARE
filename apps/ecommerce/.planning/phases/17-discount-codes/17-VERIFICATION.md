---
phase: 17-discount-codes
verified: 2026-03-18T16:21:15Z
status: passed
score: 6/6 must-haves verified
---

# Phase 17: Discount Codes Verification Report

**Phase Goal:** Customers can enter discount codes at Stripe checkout, and hardcoded promo codes (WELCOME10, FREESHIP50) are recognized and applied
**Verified:** 2026-03-18T16:21:15Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A discount code field is visible at Stripe checkout when no build-your-own bundle discount applies | VERIFIED | `allow_promotion_codes: true` in conditional spread at route.ts:117-119 |
| 2 | Entering WELCOME10 applies a 10% discount to the order total | VERIFIED | Seed script creates coupon with `percent_off: 10, duration: 'forever'` and promotion code `WELCOME10` |
| 3 | Entering FREESHIP50 applies free shipping ($12.99 off) to the order | VERIFIED | Seed script creates coupon with `amount_off: 1299` matching standard shipping cost, `minimum_amount: 5000` ($50 minimum) |
| 4 | An invalid or expired code is rejected with a clear error message at checkout | VERIFIED | Delegated to Stripe hosted checkout — `allow_promotion_codes: true` gives Stripe full validation responsibility, including rejection UI |
| 5 | Discount codes work with both individual product and bundle purchases | VERIFIED | Pre-defined bundles (`isBundle: true`) are excluded from `calculateBundleDiscount`, so `serverDiscount === 0` and `allow_promotion_codes: true` is active for those sessions |
| 6 | Build-your-own bundle discount still works correctly (applied via discounts array) | VERIFIED | `serverDiscount > 0` branch creates ephemeral coupon and sets `discounts` array; mutual exclusivity with `allow_promotion_codes` enforced in conditional spread |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/seed-promo-codes.ts` | Idempotent script to create Stripe coupons and promotion codes | VERIFIED | 149 lines, substantive — contains WELCOME10 and FREESHIP50 creation logic, idempotency check via `promotionCodes.list`, exit codes, v20 API shape |
| `src/app/api/checkout/route.ts` | Checkout session with allow_promotion_codes enabled | VERIFIED | Contains conditional spread at lines 117-119: `...(discounts ? { discounts } : { allow_promotion_codes: true })` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `scripts/seed-promo-codes.ts` | Stripe API | `stripe.promotionCodes.create` | WIRED | Lines 67-76 (WELCOME10) and 112-125 (FREESHIP50) call `promotionCodes.create` with correct v20 `promotion: { type: 'coupon', coupon: id }` shape |
| `src/app/api/checkout/route.ts` | Stripe Checkout | `allow_promotion_codes` on session | WIRED | Lines 117-119 — conditional spread sets `allow_promotion_codes: true` when `discounts` is undefined |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| DISC-01: WELCOME10 (10% off) available at checkout | SATISFIED | Seed script creates code; checkout enables promo code field |
| DISC-02: FREESHIP50 (free shipping on $50+ orders) available at checkout | SATISFIED | Seed script creates $12.99 fixed-amount coupon with $50 minimum; checkout enables promo code field |

### Anti-Patterns Found

None. No TODOs, FIXMEs, placeholders, empty returns, or stub implementations in either modified file.

### Human Verification Required

The following items require a live Stripe environment to confirm end-to-end behavior:

#### 1. WELCOME10 promo code field appears and applies discount

**Test:** Add a single product to cart, proceed to Stripe checkout, click "Add promotion code", enter WELCOME10
**Expected:** Stripe shows 10% discount applied to the order total in the checkout summary
**Why human:** Requires Stripe test credentials and a running checkout session — cannot verify Stripe's hosted UI behavior statically

#### 2. FREESHIP50 applies free shipping on qualifying order

**Test:** Add items totaling $50+ to cart, proceed to Stripe checkout, enter FREESHIP50
**Expected:** $12.99 shipping line item is offset; order summary shows reduced total
**Why human:** Requires Stripe test credentials and order meeting minimum threshold

#### 3. FREESHIP50 rejected on order below $50

**Test:** Add a single small item to cart, proceed to checkout, enter FREESHIP50
**Expected:** Stripe shows an error (minimum order not met) — code is rejected
**Why human:** Requires live Stripe checkout session to trigger minimum_amount restriction

#### 4. Invalid code rejected gracefully

**Test:** Enter a nonexistent code (e.g., BOGUS99) at checkout
**Expected:** Stripe shows "Invalid code" or similar error inline — customer stays at checkout
**Why human:** Stripe's error UI is hosted-side and cannot be verified statically

#### 5. Promo code field absent when bundle discount applies

**Test:** Add 3+ individual sauce items to cart (triggers build-your-own bundle discount), proceed to checkout
**Expected:** No promo code input field visible — only the bundle discount is shown
**Why human:** Requires live checkout session to confirm Stripe does not display the promo field when `discounts` array is used

#### 6. Seed script runs successfully

**Test:** Run `npx tsx -r dotenv/config scripts/seed-promo-codes.ts dotenv_config_path=.env.local` with valid Stripe test key
**Expected:** Script logs creation of WELCOME10 and FREESHIP50, exits 0; re-run shows "already exists, skipping"
**Why human:** Requires STRIPE_SECRET_KEY — cannot run against live Stripe API in verification

### Gaps Summary

No gaps. All automated verification points pass:

- `scripts/seed-promo-codes.ts` exists, is substantive (149 lines), contains correct Stripe v20 API calls for both promo codes with proper coupon parameters and idempotency logic
- `src/app/api/checkout/route.ts` implements the mutually exclusive conditional spread correctly — `allow_promotion_codes: true` is set when no bundle discount applies, `discounts` array is used when bundle discount applies
- TypeScript compiles with zero errors (`npx tsc --noEmit` — no output)
- Production build passes (build output shows all routes compiled)
- Both task commits verified in git history: `9bcb552` (seed script) and `6ff3a6b` (checkout route)
- Pre-defined bundle purchases correctly get `allow_promotion_codes: true` because `isBundle: true` items are excluded from `calculateBundleDiscount`, keeping `serverDiscount === 0`

The only items requiring human verification are live Stripe session behaviors that cannot be confirmed statically.

---

_Verified: 2026-03-18T16:21:15Z_
_Verifier: Claude (gsd-verifier)_
