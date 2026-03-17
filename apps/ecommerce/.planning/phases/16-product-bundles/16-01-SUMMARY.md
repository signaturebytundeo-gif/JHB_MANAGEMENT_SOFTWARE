---
phase: 16-product-bundles
plan: 01
subsystem: ui
tags: [bundles, typescript, nextjs, cart, static-generation]

requires:
  - phase: 02-core-commerce-pages
    provides: ProductCard pattern, shop page, product detail page, QuickAddButton
  - phase: 03-cart-checkout
    provides: CartItem interface, useCartStore addItem, isFreeSample pattern

provides:
  - Bundle interface in types/product.ts with includedProductIds and savings fields
  - 3 pre-defined bundles (Starter Bundle, Heat Pack, Gift Set) in src/data/bundles.ts
  - BundleCard component with savings badge and crossed-out original price
  - BundleQuickAddButton with isBundle:true on cart add
  - BundleContents component showing included products with thumbnails
  - Shop page Bundle & Save section above individual products
  - Bundle detail pages at /products/starter-bundle, /products/heat-pack, /products/gift-set
  - isBundle field on CartItem for discount exclusion logic in Plan 02

affects:
  - 16-02 (build-your-own bundles — uses getIndividualProducts and CartItem.isBundle)
  - 16-03 (discount exclusion — reads CartItem.isBundle)

tech-stack:
  added: []
  patterns:
    - Separate Bundle type from Product — bundles have includedProductIds/savings, products do not
    - BundleQuickAddButton as separate Client Component to pass isBundle:true without modifying QuickAddButton
    - bundleAsProduct pattern in detail page — construct Product-compatible object from Bundle for AddToCartSection reuse
    - generateStaticParams merges product and bundle slugs for full static generation coverage

key-files:
  created:
    - src/types/product.ts (Bundle interface added)
    - src/data/bundles.ts (3 bundle definitions, getBundleBySlug, getBundleById)
    - src/components/ui/BundleCard.tsx
    - src/components/ui/BundleQuickAddButton.tsx
    - src/components/product/BundleContents.tsx
  modified:
    - src/data/products.ts (removed starter-bundle entry, added getIndividualProducts)
    - src/app/shop/page.tsx (added Bundle & Save section)
    - src/app/products/[slug]/page.tsx (bundle detail page support)
    - src/components/product/AddToCartSection.tsx (added isBundle prop)
    - src/lib/cart-store.ts (added isBundle to CartItem interface)

key-decisions:
  - "Bundle type kept separate from Product — different semantics (includedProductIds, savings) justify distinct types"
  - "starter-bundle removed from products.ts to eliminate duplication — bundles.ts is single source of truth"
  - "BundleQuickAddButton created as separate component rather than extending QuickAddButton — avoids prop complexity on shared component"
  - "isBundle added to CartItem interface for Plan 02 discount exclusion logic"
  - "getIndividualProducts() added to products.ts for Plan 02 build-your-own feature"

patterns-established:
  - "Bundle detail pages reuse AddToCartSection via bundleAsProduct shim object"
  - "isBundle:true flows from BundleCard/BundleQuickAddButton through CartItem to enable downstream discount logic"

duration: 4min
completed: 2026-03-17
---

# Phase 16 Plan 01: Product Bundles — Bundle Data and Shop Display Summary

**3 pre-defined bundles (Starter Bundle, Heat Pack, Gift Set) statically generated with BundleCard savings display and bundle detail pages showing BundleContents, all cart adds tagged isBundle:true**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-17T00:26:24Z
- **Completed:** 2026-03-17T00:29:59Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Bundle type defined and 3 bundles authored with correct prices/savings (Starter $24.99 saves $5.98, Heat Pack $36.99 saves $6.98, Gift Set $42.99 saves $7.97)
- Shop page shows "Bundle & Save" section with BundleCard grid above individual products — savings badge, crossed-out original price, and Bundle tag on image
- Bundle detail pages at /products/starter-bundle, /products/heat-pack, /products/gift-set render included product list with thumbnails and per-item prices
- All bundle cart adds (QuickAdd and detail page) set isBundle:true on CartItem for Plan 02 discount exclusion

## Task Commits

1. **Task 1: Define bundle data model and 3 pre-defined bundles** - `5ef8d75` (feat)
2. **Task 2: Bundle cards on shop page and bundle detail page support** - `020f057` (feat)

## Files Created/Modified

- `src/types/product.ts` — Bundle interface added alongside existing Product interface
- `src/data/bundles.ts` — 3 bundle definitions with prices in cents, getBundleBySlug, getBundleById
- `src/data/products.ts` — Removed starter-bundle entry; added getIndividualProducts() helper
- `src/components/ui/BundleCard.tsx` — Server Component with savings badge, crossed-out price, Bundle image tag
- `src/components/ui/BundleQuickAddButton.tsx` — Client Component, addItem with isBundle:true
- `src/components/product/BundleContents.tsx` — "What's Included" list with 32x32 thumbnails and individual prices
- `src/app/shop/page.tsx` — Bundle & Save section above individual products grid
- `src/app/products/[slug]/page.tsx` — Bundle detail page branch with BundleContents, savings display, and generateStaticParams/generateMetadata coverage
- `src/components/product/AddToCartSection.tsx` — Added optional isBundle prop passed through to addItem
- `src/lib/cart-store.ts` — Added optional isBundle field to CartItem interface

## Decisions Made

- **Bundle type separate from Product:** Plan specified not to merge — bundles have includedProductIds and savings which products don't. Kept as two distinct exported interfaces in types/product.ts.
- **BundleQuickAddButton as new component:** QuickAddButton is used broadly; rather than adding bundle-specific props to it, a dedicated BundleQuickAddButton was created that always sends isBundle:true.
- **starter-bundle removed from products.ts:** Prevented duplication now that bundles.ts is the source of truth. The products array naturally contains only 4 individual products — no filtering needed in shop page.
- **bundleAsProduct shim for AddToCartSection:** Constructed a Product-compatible object from bundle data to reuse AddToCartSection on the bundle detail page without duplicating add-to-cart logic.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added isBundle to CartItem interface**
- **Found during:** Task 2 (BundleQuickAddButton implementation)
- **Issue:** CartItem interface did not have isBundle field — needed for Plan 02 discount exclusion as specified in plan
- **Fix:** Added optional `isBundle?: boolean` to CartItem interface in cart-store.ts
- **Files modified:** src/lib/cart-store.ts
- **Verification:** TypeScript check passes with no errors
- **Committed in:** 020f057 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 - missing critical)
**Impact on plan:** The CartItem isBundle field is explicitly required by the plan for Plan 02 discount logic. No scope creep.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 02 (build-your-own bundles) can now use `getIndividualProducts()` and read `CartItem.isBundle` for discount exclusion
- Plan 03 (discount logic) has CartItem.isBundle available to identify pre-defined bundles vs custom selections
- Build passes with 7 static product pages (4 individual + 3 bundles)

---
*Phase: 16-product-bundles*
*Completed: 2026-03-17*

## Self-Check: PASSED

- All 10 files confirmed present on disk
- Both task commits confirmed in git log: 5ef8d75, 020f057
