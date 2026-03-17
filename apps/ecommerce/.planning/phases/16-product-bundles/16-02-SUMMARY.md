---
phase: 16-product-bundles
plan: 02
subsystem: ui
tags: [bundles, discount, cart, typescript, pure-function]

requires:
  - phase: 16-01
    provides: CartItem.isBundle flag, getIndividualProducts helper, bundle data

provides:
  - Pure calculateBundleDiscount function in src/lib/bundle-discount.ts
  - BUNDLE_DISCOUNT_PERCENT=10 and BUNDLE_MIN_ITEMS=3 exported constants
  - CartDrawer shows "Build Your Own Bundle (-10%)" discount line when 3+ individual items
  - CartDrawer shows nudge message when 1-2 individual items present
  - CartItem shows "Bundle" badge when item.isBundle is true
  - Discount amount flows to /api/checkout in request body as bundleDiscount

affects:
  - 16-03 (checkout API reads bundleDiscount from request body)

tech-stack:
  added: []
  patterns:
    - Pure discount function with no side effects — derives from CartItem[] with no store mutation
    - Discount displayed as derived value in component render (not stored in cart state)
    - Nudge message mirrors free shipping nudge pattern already in CartDrawer

key-files:
  created:
    - src/lib/bundle-discount.ts
  modified:
    - src/components/CartDrawer.tsx
    - src/components/CartItem.tsx

key-decisions:
  - "Discount computed on every CartDrawer render from current items — not stored in cart state, always in sync"
  - "Shipping free threshold uses pre-discount paidItemsTotal — discount does not penalize customer from free shipping eligibility"
  - "Nudge message uses correct pluralization: '1 more item' vs '2 more items'"

duration: 2min
completed: 2026-03-17
---

# Phase 16 Plan 02: Build-Your-Own Bundle Discount Summary

**Pure calculateBundleDiscount function (10% off 3+ individual items) wired to CartDrawer discount line and nudge message, with Bundle badge on pre-defined bundle CartItems**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-17T15:33:06Z
- **Completed:** 2026-03-17T15:35:17Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Pure `calculateBundleDiscount(items)` function created — filters out `isBundle` and `isFreeSample` items, counts eligible item quantities, applies 10% when count >= 3, returns discountAmount in cents
- CartDrawer renders green "Build Your Own Bundle (-10%)" line + discounted Total when discount is active
- CartDrawer renders gold nudge message "Add N more item(s) for a 10% bundle discount!" when 1-2 individual items are present
- CartItem shows compact "Bundle" badge (gold text, gold/20 bg) when `item.isBundle === true`
- `bundleDiscount` amount flows to `/api/checkout` request body for Plan 03 checkout integration

## Task Commits

1. **Task 1: Bundle discount pure function** - `72426b9` (feat)
2. **Task 2: CartDrawer discount display and CartItem bundle badge** - `9edfda1` (feat)

## Files Created/Modified

- `src/lib/bundle-discount.ts` — Pure discount utility: BUNDLE_DISCOUNT_PERCENT, BUNDLE_MIN_ITEMS, calculateBundleDiscount, BundleDiscountResult interface
- `src/components/CartDrawer.tsx` — Imports and calls calculateBundleDiscount; renders discount line, discounted total, nudge message; passes bundleDiscount to checkout API
- `src/components/CartItem.tsx` — Bundle badge rendered inline with item name when item.isBundle is true

## Decisions Made

- **Discount derived, not stored:** calculateBundleDiscount is called directly in CartDrawer on every render. No cart store mutations needed — the discount is always derived from the current items array. This keeps the store simple and avoids stale state.
- **Pre-discount paidItemsTotal for shipping threshold:** The discount reduces the order total displayed to the customer but does not reduce eligibility for free shipping. Using pre-discount total prevents the bundle discount from inadvertently removing free shipping qualification.
- **Nudge pluralization fixed:** "Add 1 more item" (singular) vs "Add 2 more items" (plural) — small UX polish applied inline.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

- Plan 03 (checkout integration) can read `bundleDiscount` from POST body to `/api/checkout` — already wired in this plan
- All 3 bundle success criteria satisfied: BNDL-03 (discount triggers at 3+ individual items), discount excludes bundles/free samples, CartDrawer renders discount prominently

---
*Phase: 16-product-bundles*
*Completed: 2026-03-17*

## Self-Check: PASSED

- All 3 modified/created files confirmed present on disk
- Both task commits confirmed in git log: 72426b9, 9edfda1
- SUMMARY.md present at .planning/phases/16-product-bundles/16-02-SUMMARY.md
