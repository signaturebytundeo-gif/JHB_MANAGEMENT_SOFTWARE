---
phase: 05-seo-performance
plan: 02
subsystem: seo
tags: [json-ld, schema.org, structured-data, xss-prevention]

# Dependency graph
requires:
  - phase: 02-core-commerce-pages
    provides: Product detail pages with product data rendering
  - phase: 04-content-storytelling
    provides: Recipe detail pages with recipe JSON-LD
provides:
  - Product schema.org JSON-LD on all product detail pages
  - XSS-safe JSON-LD sanitization helper for all structured data
  - Recipe JSON-LD now XSS-protected
affects: [google-shopping, search-visibility, seo-tools]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Manual schema.org JSON-LD generation without schema-dts dependency
    - XSS prevention via Unicode escape of < characters in JSON-LD output
    - Price conversion pattern (cents to dollars) for schema.org compliance

key-files:
  created: []
  modified:
    - src/lib/seo.ts
    - src/app/products/[slug]/page.tsx
    - src/app/recipes/[slug]/page.tsx

key-decisions:
  - "sanitizeJsonLd accepts unknown type to work with both Product and Recipe schema objects"
  - "Price converted from cents to dollars using (price / 100).toFixed(2) for schema.org format"
  - "Product name includes size in JSON-LD (e.g., 'Jerk Sauce - 5oz') for clarity in search results"
  - "Absolute image URLs generated with jamaicahousebrand.com domain for schema.org compliance"
  - "Optional aggregateRating field only included when product has rating data"

patterns-established:
  - "XSS prevention: all JSON-LD output must use sanitizeJsonLd helper before dangerouslySetInnerHTML"
  - "Schema generation: plain Record<string, unknown> objects instead of typed interfaces for flexible schema building"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 05 Plan 02: Product JSON-LD Summary

**Product schema.org structured data with XSS-safe sanitization for Google Shopping rich results**

## Performance

- **Duration:** 2 minutes
- **Started:** 2026-02-18T11:14:02Z
- **Completed:** 2026-02-18T11:16:06Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- All 4 product detail pages now render Product schema JSON-LD for Google Shopping eligibility
- XSS vulnerability in Recipe JSON-LD fixed via sanitizeJsonLd helper
- Product schema includes name+size, absolute image URL, price in dollars, availability, brand, seller, and aggregateRating

## Task Commits

Each task was committed atomically:

1. **Task 1: Add generateProductJsonLd and sanitizeJsonLd to seo.ts** - `ad4daf7` (feat)
2. **Task 2: Inject Product JSON-LD in product pages and fix Recipe XSS vulnerability** - `a64a698` (feat)

## Files Created/Modified
- `src/lib/seo.ts` - Added sanitizeJsonLd helper and generateProductJsonLd function alongside existing generateRecipeJsonLd
- `src/app/products/[slug]/page.tsx` - Inject Product schema JSON-LD script tag with sanitized output
- `src/app/recipes/[slug]/page.tsx` - Replace raw JSON.stringify with sanitizeJsonLd to prevent XSS

## Decisions Made
- **sanitizeJsonLd signature:** Changed from `Record<string, unknown>` to `unknown` to handle both Product and Recipe schema objects without casting
- **Price format:** Converted from cents to dollars using `(price / 100).toFixed(2)` for schema.org compliance
- **Name format:** Included size in product name (`${name} - ${size}`) for clearer search result display
- **Image URLs:** Made absolute with domain prefix for schema.org compliance
- **aggregateRating:** Conditionally included only when product has rating data to avoid empty/invalid schema

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - build succeeded on first attempt for both tasks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Product and Recipe JSON-LD now complete and XSS-safe. Ready for:
- Plan 03: sitemap.xml and robots.txt generation
- Google Search Console verification
- Google Merchant Center product feed integration (future phase)

## Self-Check: PASSED

All claimed files and commits verified:
- src/lib/seo.ts: FOUND
- src/app/products/[slug]/page.tsx: FOUND
- src/app/recipes/[slug]/page.tsx: FOUND
- Commit ad4daf7: FOUND
- Commit a64a698: FOUND

---
*Phase: 05-seo-performance*
*Completed: 2026-02-18*
