---
phase: 01-foundation-design-system
plan: 03
subsystem: ui
tags: [typescript, product-catalog, data-modeling, price-formatting, ecommerce]

# Dependency graph
requires:
  - phase: 01-foundation-design-system
    plan: 01
    provides: TypeScript environment, Next.js project structure
provides:
  - Product TypeScript interface with type-safe fields
  - Product catalog with 4 Jamaica House Brand SKUs
  - Price formatting utilities (cents to USD)
  - Product lookup helpers (getProductBySlug, getProductById)
  - Foundation for product pages, cart, and checkout
affects: [02-product-pages, 03-cart, 04-checkout, all-commerce-features]

# Tech tracking
tech-stack:
  added: []
  patterns: [Prices in cents to avoid floating-point errors, Intl.NumberFormat for currency formatting, TypeScript interfaces for product data, Helper functions for product lookup]

key-files:
  created: [src/types/product.ts, src/data/products.ts, src/lib/utils.ts]
  modified: []

key-decisions:
  - "Prices stored in cents (integers) to avoid JavaScript floating-point errors"
  - "Intl.NumberFormat for locale-aware currency formatting instead of manual string manipulation"
  - "Optional Stripe fields in Product interface for Phase 3 integration"
  - "Helper functions (getProductBySlug, getProductById) for consistent product lookup"
  - "calculateSubtotal utility for cart total calculations"

patterns-established:
  - "Product pricing: Store prices as integers in cents (399 = $3.99), convert to formatted string on display"
  - "Currency formatting: Use Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}) for consistent formatting"
  - "Type safety: Define TypeScript interfaces for all data structures"
  - "Product lookup: Use find() with slug or id for product retrieval"

# Metrics
duration: 6min
completed: 2026-02-17
---

# Phase 01 Plan 03: Product Data Catalog Summary

**Type-safe product catalog with 4 Jamaica House Brand SKUs (jerk sauce in 3 sizes, pikliz), prices in cents, and Intl.NumberFormat currency utilities**

## Performance

- **Duration:** 6 minutes
- **Started:** 2026-02-17T23:20:38Z
- **Completed:** 2026-02-17T23:26:22Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Product TypeScript interface with 12 fields including optional Stripe integration fields
- Complete catalog of 4 SKUs with accurate pricing ($3.99, $7.99, $14.99, $7.99)
- Price formatting utility using Intl.NumberFormat for correct currency display
- Cart calculation utility (calculateSubtotal) for future checkout flow
- Product lookup helpers (getProductBySlug, getProductById)
- Zero floating-point errors in price calculations via integer cents storage

## Task Commits

Each task was committed atomically:

1. **Task 1: Create product types and data catalog** - `7d1204d` (feat)
   - Created Product interface in src/types/product.ts with id, name, description, price (cents), size, image, slug, category, inStock, optional Stripe fields
   - Created products array with 4 SKUs: Jerk Sauce 2oz/5oz/10oz, Escovitch Pikliz 12oz
   - Added product lookup helpers: getProductBySlug(), getProductById()
   - Created formatPrice() utility using Intl.NumberFormat for USD formatting
   - Created calculateSubtotal() utility for cart total calculations

2. **Task 2: Verify foundation phase completion** - (checkpoint:human-verify)
   - User verified: Development server running, dark theme, navigation, product data
   - All WCAG accessibility checks passed
   - TypeScript compilation successful
   - All 5 Phase 1 success criteria met

## Files Created/Modified
- `src/types/product.ts` - Product interface with 12 fields including price in cents
- `src/data/products.ts` - 4-SKU product catalog with helper functions (57 lines)
- `src/lib/utils.ts` - formatPrice() and calculateSubtotal() utilities (20 lines)

## Decisions Made

**Prices in cents:** Stored all prices as integers in cents (399, 799, 1499) to avoid JavaScript floating-point arithmetic errors (e.g., 0.1 + 0.2 !== 0.3). This ensures accurate calculations for cart totals, tax, and discounts.

**Intl.NumberFormat for formatting:** Used built-in Intl.NumberFormat API instead of manual string manipulation or third-party libraries. This provides correct rounding, locale support, and handles edge cases automatically.

**Optional Stripe fields:** Added optional stripeProductId and stripePriceId fields to Product interface for Phase 3 (payment integration). This avoids breaking changes later while keeping fields optional until Stripe is configured.

**Helper functions for lookup:** Created getProductBySlug() and getProductById() helpers to centralize product retrieval logic. This prevents scattered find() calls across components and enables easy switch to database later.

**calculateSubtotal utility:** Proactively added calculateSubtotal() function for cart calculations. While not strictly required for this phase, it was added as a pure utility function with no additional complexity.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compilation passed, all product data validated against interface, price formatting verified with test values.

## User Setup Required

None - no external service configuration required. Product data is ready for use in components.

## Next Phase Readiness

**Ready for:**
- Product listing pages (use products array)
- Product detail pages (use getProductBySlug)
- Shopping cart (use calculateSubtotal, formatPrice)
- Checkout flow (prices in cents for Stripe API)

**Product catalog provides:**
- Single source of truth for product data
- Type-safe product objects throughout application
- Accurate price formatting without floating-point errors
- Foundation for Stripe integration (optional fields ready)
- Helper functions for consistent product access

**Foundation Phase 1 Complete:**
All 5 success criteria from ROADMAP.md met:
1. ✓ Next.js 16 App Router project with Tailwind CSS
2. ✓ Design tokens (@theme with 6+ brand colors)
3. ✓ Navigation with logo, 5 menu items, mobile/desktop responsive
4. ✓ Dark theme consistent across site
5. ✓ Product data file with 4 SKUs as TypeScript objects

**No blockers or concerns. Ready for Phase 2: Core Commerce Pages.**

## Self-Check: PASSED

All files verified to exist:
- src/types/product.ts (13 lines, exports Product interface)
- src/data/products.ts (57 lines, contains 4 products, getProductBySlug)
- src/lib/utils.ts (20 lines, formatPrice and calculateSubtotal)

All commits verified:
- 7d1204d (Task 1: Product catalog)

All must_haves verified:
- Product interface with all required fields ✓
- 4 products in products array ✓
- Prices in cents: 399, 799, 1499, 799 ✓
- formatPrice() utility exists ✓
- getProductBySlug() returns Product | undefined ✓
- TypeScript types properly imported ✓

Product data accuracy verified:
- Jerk Sauce 2oz: $3.99 (399 cents) ✓
- Jerk Sauce 5oz: $7.99 (799 cents) ✓
- Jerk Sauce 10oz: $14.99 (1499 cents) ✓
- Escovitch Pikliz 12oz: $7.99 (799 cents) ✓

---
*Phase: 01-foundation-design-system*
*Completed: 2026-02-17*
