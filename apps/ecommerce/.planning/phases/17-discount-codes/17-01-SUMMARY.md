---
phase: 17-discount-codes
plan: 01
subsystem: payments
tags: [stripe, promotion-codes, coupons, checkout, discount]

# Dependency graph
requires:
  - phase: 16-product-bundles
    provides: Stripe checkout route with discounts array for bundle discount (mutually exclusive with allow_promotion_codes)
provides:
  - Stripe promo code seed script (WELCOME10, FREESHIP50)
  - Checkout sessions show Stripe promo code input field when no bundle discount applies
affects: [checkout, stripe-integration, order-processing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stripe v20 promotionCodes.create uses promotion: { type: 'coupon', coupon: id } not coupon directly"
    - "discounts array and allow_promotion_codes are mutually exclusive on Stripe checkout sessions"
    - "Seed scripts placed in scripts/ directory, runnable via npx tsx scripts/seed-*.ts"

key-files:
  created:
    - scripts/seed-promo-codes.ts
  modified:
    - src/app/api/checkout/route.ts

key-decisions:
  - "Stripe v20 SDK: promotionCodes.create requires promotion: { type: 'coupon', coupon: id } — not a top-level coupon param"
  - "FREESHIP50 implemented as fixed amount_off: 1299 coupon (matches $12.99 shipping) with $50 minimum — Stripe promo codes apply to order total, not line items"
  - "Seed script uses promotion.coupon reference (Stripe.PromotionCode.promotion.coupon) for idempotency logging"
  - "Bundle discount (discounts array) and promo code field (allow_promotion_codes) are mutually exclusive — customers using build-your-own bundle cannot stack promo codes"

patterns-established:
  - "Idempotent seed scripts: check stripe.promotionCodes.list({ code }) before creating — skip if active, warn if inactive"
  - "Conditional Stripe session param spread: ...(discounts ? { discounts } : { allow_promotion_codes: true })"

# Metrics
duration: 2min
completed: 2026-03-18
---

# Phase 17 Plan 01: Discount Codes Summary

**Stripe WELCOME10 (10% off) and FREESHIP50 ($12.99 off, $50 min) promo codes via idempotent seed script, with checkout sessions conditionally enabling allow_promotion_codes when no bundle discount applies**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-18T16:15:23Z
- **Completed:** 2026-03-18T16:18:18Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Idempotent seed script creates WELCOME10 (10% off) and FREESHIP50 ($12.99 off, $50 minimum) promotion codes in Stripe
- Checkout sessions now show Stripe's built-in promo code input field for all non-bundle orders
- Build-your-own bundle discount continues to work via discounts array — mutually exclusive with allow_promotion_codes per Stripe's API constraint

## Task Commits

Each task was committed atomically:

1. **Task 1: Create idempotent Stripe promo code seed script** - `9bcb552` (feat)
2. **Task 2: Enable promotion codes on Stripe checkout session** - `6ff3a6b` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `scripts/seed-promo-codes.ts` - Idempotent seed script for WELCOME10 and FREESHIP50 Stripe promotion codes
- `src/app/api/checkout/route.ts` - Replaced empty discounts fallback with `allow_promotion_codes: true`

## Decisions Made
- Stripe v20 SDK changed the `promotionCodes.create` API — `coupon` is now nested under `promotion: { type: 'coupon', coupon: id }`. Applied correct v20 API after discovering TypeScript errors during verification.
- FREESHIP50 uses `amount_off: 1299` (matching $12.99 shipping cost) rather than a shipping-specific mechanism — Stripe hosted checkout promo codes apply to order total, this is the correct approach.
- Customers applying a build-your-own bundle discount (10% off) cannot also use a promo code. Stripe enforces this constraint. The conditional spread ensures only one is ever set.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated seed script for Stripe v20 promotionCodes.create API**
- **Found during:** Task 1 (Create seed script)
- **Issue:** Plan specified `coupon: coupon.id` directly in `promotionCodes.create()`, but Stripe v20 SDK requires `promotion: { type: 'coupon', coupon: coupon.id }`. TypeScript check produced 4 errors.
- **Fix:** Updated `promotionCodes.create()` calls to use correct v20 API. Also updated idempotency logging to use `existing.promotion?.coupon` instead of `existing.coupon`.
- **Files modified:** scripts/seed-promo-codes.ts
- **Verification:** `npx tsc --noEmit` passed with 0 errors
- **Committed in:** `9bcb552` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - API version mismatch)
**Impact on plan:** Essential fix — seed script would have failed at runtime with the v20 Stripe SDK. No scope creep.

## Issues Encountered
- Stripe v20 SDK restructured the PromotionCode create params — plan was written for an older API shape. Discovered via TypeScript errors immediately, corrected before commit.

## User Setup Required

**Promotion codes must be created in Stripe before customers can use them at checkout.**

Run the seed script after deploying:
```
STRIPE_SECRET_KEY=sk_live_xxx npx tsx scripts/seed-promo-codes.ts
```

Or for local/test:
```
npx tsx -r dotenv/config scripts/seed-promo-codes.ts dotenv_config_path=.env.local
```

The script is idempotent — safe to run in both test and live environments.

## Next Phase Readiness
- Stripe promo code infrastructure is in place
- `allow_promotion_codes: true` is active on all non-bundle checkout sessions
- WELCOME10 and FREESHIP50 will work immediately after running the seed script
- No blockers for next phase

## Self-Check: PASSED

- scripts/seed-promo-codes.ts: FOUND
- src/app/api/checkout/route.ts: FOUND
- .planning/phases/17-discount-codes/17-01-SUMMARY.md: FOUND
- commit 9bcb552: FOUND
- commit 6ff3a6b: FOUND

---
*Phase: 17-discount-codes*
*Completed: 2026-03-18*
