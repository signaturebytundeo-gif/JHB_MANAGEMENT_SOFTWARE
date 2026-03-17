---
phase: 16-product-bundles
plan: 03
subsystem: api
tags: [bundles, stripe, checkout, discount, coupon, typescript]

requires:
  - phase: 16-01
    provides: isBundle on CartItem, bundle data with correct prices
  - phase: 16-02
    provides: calculateBundleDiscount function, bundleDiscount in checkout POST body

provides:
  - Checkout API accepts bundleDiscount in request body (server ignores client value, recalculates)
  - Server-side discount validation via calculateBundleDiscount prevents client-side tampering
  - Build-your-own discount applied as Stripe coupon (amount_off, duration: once)
  - Pre-defined bundles produce single Stripe line item with bundle name and price
  - hasBundles and bundleDiscount metadata fields on checkout session
  - Command-center webhook receives accurate per-item totals via Stripe coupon distribution on listLineItems

affects:
  - command-center webhook (reads listLineItems — Stripe auto-adjusts amount_total for coupon; no changes needed)

tech-stack:
  added: []
  patterns:
    - Server-side discount recalculation — calculateBundleDiscount called on CheckoutItem[] cast as CartItem[] (same shape)
    - Stripe coupons for proportional discount distribution across line items via listLineItems
    - void bundleDiscount pattern to explicitly document that client-sent value is discarded

key-files:
  created: []
  modified:
    - src/app/api/checkout/route.ts

key-decisions:
  - "Server recalculates bundleDiscount from items array — client-sent bundleDiscount is voided to prevent manipulation"
  - "Stripe coupon (amount_off, duration: once) used for build-your-own discount — Stripe distributes proportionally across listLineItems so command-center per-item amounts are accurate"
  - "No command-center changes needed — session.amount_total and listLineItems amount_total already reflect coupon adjustments"
  - "CheckoutItem cast to CartItem[] for calculateBundleDiscount — interfaces are structurally identical so cast is safe"

patterns-established:
  - "Stripe coupon for order-level discounts — creates clean audit trail, distributes discount across line items automatically"
  - "Server recalculate pattern — API never trusts client-computed discounts, always re-derives from authoritative item data"

duration: 2min
completed: 2026-03-17
---

# Phase 16 Plan 03: Stripe Checkout Bundle Integration Summary

**Stripe checkout API updated to apply build-your-own bundle discounts as server-validated Stripe coupons, with pre-defined bundles appearing as correctly-named single line items and command-center order records accurate via Stripe coupon distribution on listLineItems**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-17T15:36:00Z
- **Completed:** 2026-03-17T15:38:24Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Checkout API accepts `bundleDiscount` in POST body but discards it — server re-calculates using `calculateBundleDiscount` to prevent client-side tamper
- When server discount > 0, creates a one-time Stripe coupon (`amount_off`, `duration: 'once'`) and applies it via `discounts: [{ coupon: coupon.id }]` on the session
- Pre-defined bundles (`isBundle: true`) require zero special handling — the existing `${item.name} (${item.size})` pattern already produces clean line item names like "The Starter Bundle (2oz + 5oz + 12oz)"
- Added `hasBundles` and `bundleDiscount` fields to session metadata for audit visibility
- TypeScript check passes, production build passes (26 static pages)

## Task Commits

1. **Task 1: Update checkout API to handle bundles and build-your-own discount** - `c8fec55` (feat)

## Files Created/Modified

- `src/app/api/checkout/route.ts` — Added `isBundle` to `CheckoutItem`; accept `bundleDiscount` param; server-side recalculation via `calculateBundleDiscount`; Stripe coupon creation and session `discounts[]` when discount > 0; `hasBundles`/`bundleDiscount` metadata

## Decisions Made

- **Server recalculates discount:** The client-sent `bundleDiscount` value is explicitly voided (`void bundleDiscount`) and the server re-derives it from the items array. This prevents a malicious client from sending an inflated discount amount.
- **Stripe coupon over negative line item:** Stripe prohibits negative `unit_amount` values. Stripe's `discounts` + coupon API is the correct approach — it also provides the proportional distribution behavior needed for accurate command-center per-item amounts.
- **Cast CheckoutItem to CartItem:** Both interfaces are structurally identical (same fields, same types). The cast is safe and avoids duplicating the discount calculation logic.
- **No command-center changes:** Stripe's coupon system automatically adjusts `amount_total` on each `listLineItems` result proportionally, and `session.amount_total` reflects the post-discount total. The existing webhook reads both correctly.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no new environment variables required. The Stripe coupon is created via the existing `STRIPE_SECRET_KEY`.

## Next Phase Readiness

- BNDL-04 fulfilled: bundle orders create correct Stripe line items with accurate names and prices
- Build-your-own discount is validated server-side and applied as a Stripe coupon
- Command-center will record accurate order totals and per-item amounts without code changes
- Phase 16 (Product Bundles) is complete — all 3 plans executed

---
*Phase: 16-product-bundles*
*Completed: 2026-03-17*

## Self-Check: PASSED

- src/app/api/checkout/route.ts confirmed present on disk
- .planning/phases/16-product-bundles/16-03-SUMMARY.md confirmed present on disk
- Task commit c8fec55 confirmed in git log
