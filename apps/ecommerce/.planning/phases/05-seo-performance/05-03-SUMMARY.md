---
phase: 05-seo-performance
plan: 03
subsystem: analytics
tags: [google-analytics, meta-pixel, tracking, nextjs, third-parties]

# Dependency graph
requires:
  - phase: 05-seo-performance
    plan: 01
    provides: Root layout structure and metadata base
  - phase: 03-cart-checkout
    provides: Success page and order session data for purchase tracking
provides:
  - Google Analytics 4 page view tracking via @next/third-parties
  - Meta Pixel page view tracking on all pages
  - Meta Pixel Purchase event tracking on success page
  - Graceful fallback when analytics env vars are not configured
affects: [all-pages, order-success-tracking]

# Tech tracking
tech-stack:
  added: ["@next/third-parties"]
  patterns: [analytics-tracking, third-party-scripts, event-deduplication]

key-files:
  created:
    - src/components/analytics/GoogleAnalytics.tsx
    - src/components/analytics/MetaPixel.tsx
    - src/components/analytics/TrackPurchase.tsx
  modified:
    - src/app/layout.tsx
    - src/app/success/page.tsx
    - package.json

key-decisions:
  - "@next/third-parties used for GA4 instead of manual script injection"
  - "Meta Pixel implemented with inline script (no react-facebook-pixel dependency)"
  - "MetaPixel wrapped in Suspense boundary due to useSearchParams requirement"
  - "GoogleAnalytics rendered after body closing tag per @next/third-parties docs"
  - "TrackPurchase uses useRef to prevent duplicate Purchase events on page refresh"
  - "All analytics components gracefully return null when env vars are missing"

patterns-established:
  - "Analytics components check for env vars and gracefully skip when missing"
  - "Purchase tracking uses ref guard to fire event exactly once per session"
  - "Client components for analytics wrapped in Suspense for Next.js App Router compatibility"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 05 Plan 03: Analytics Integration Summary

**GA4 and Meta Pixel tracking on all pages with purchase event tracking via @next/third-parties and inline script implementation**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-18T11:45:33Z
- **Completed:** 2026-02-18T11:54:42Z
- **Tasks:** 2 auto tasks completed, 1 checkpoint (human-verify) reached
- **Files modified:** 5

## Accomplishments

- Installed @next/third-parties package for optimized Google Analytics integration
- Created GoogleAnalytics.tsx wrapper that conditionally renders GA4 when NEXT_PUBLIC_GA_MEASUREMENT_ID is set
- Created MetaPixel.tsx client component with inline script initialization and route-based page view tracking
- Created TrackPurchase.tsx component with ref-based deduplication to fire Purchase event exactly once
- Integrated GoogleAnalytics into root layout after body closing tag (recommended placement)
- Integrated MetaPixel into root layout in Suspense boundary (required for useSearchParams)
- Wired TrackPurchase to success page with session amount_total and order ID
- All analytics gracefully skip when environment variables are not configured

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Dependencies and Create Analytics Components** - `8e6d0fb` (feat)
   - Installed @next/third-parties
   - Created GoogleAnalytics.tsx, MetaPixel.tsx, TrackPurchase.tsx
   - 5 files changed, 125 insertions

2. **Task 2: Wire Analytics into Layout and Add Purchase Tracking to Success Page** - `3c86f79` (feat)
   - Added GoogleAnalytics and MetaPixel to layout
   - Added TrackPurchase to success page
   - 2 files changed, 9 insertions

3. **Task 3: Verify Complete SEO and Analytics Implementation** - CHECKPOINT REACHED
   - Type: human-verify
   - Status: Ready for verification
   - Awaiting: User to verify sitemap, robots.txt, JSON-LD schemas, and analytics integration

## Files Created/Modified

**Created:**
- `src/components/analytics/GoogleAnalytics.tsx` - Server component wrapper for GA4 using @next/third-parties, returns null when env var missing
- `src/components/analytics/MetaPixel.tsx` - Client component with Meta Pixel script initialization and page view tracking on pathname/searchParams changes
- `src/components/analytics/TrackPurchase.tsx` - Client component that fires Meta Pixel Purchase event once with ref guard

**Modified:**
- `package.json` - Added @next/third-parties dependency
- `src/app/layout.tsx` - Added GoogleAnalytics after body closing tag and MetaPixel in Suspense boundary inside body
- `src/app/success/page.tsx` - Added TrackPurchase component with session.amount_total and session.id

## Decisions Made

1. **@next/third-parties for GA4** - Used official Next.js package instead of manual gtag script injection for better optimization and automatic App Router page view tracking
2. **Inline Meta Pixel script** - Implemented Meta Pixel with inline script approach instead of react-facebook-pixel (which has CommonJS issues and is unmaintained)
3. **Suspense boundary for MetaPixel** - Required because MetaPixel uses useSearchParams, which needs Suspense in Next.js App Router
4. **GoogleAnalytics placement** - Rendered after body closing tag but before html closing tag per @next/third-parties documentation
5. **Purchase event deduplication** - Used useRef in TrackPurchase to prevent duplicate events if user refreshes success page
6. **Graceful env var handling** - All analytics components check for env vars and return null when missing (no errors, no warnings)

## Deviations from Plan

None - plan executed exactly as written. All components created match the planned implementation. @next/third-parties was installed as specified. Layout and success page were updated as directed.

## Issues Encountered

None - both tasks completed successfully with no errors. Build verification passed with 22 pages generated.

## User Setup Required

### Google Analytics 4 (TECH-08)

**Why:** Track page views and user behavior across all pages

**Setup Steps:**
1. Go to https://analytics.google.com
2. Admin → Create Property
3. Set property name: "Jamaica House Brand"
4. Create GA4 property for jamaicahousebrand.com
5. Admin → Data Streams → Create Web Stream
6. Copy Measurement ID (starts with G-)
7. Add to `.env.local`:
   ```
   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```

**Dashboard Config:**
- Property: Jamaica House Brand
- Stream: jamaicahousebrand.com
- Measurement ID: Available in Data Streams section

### Meta Pixel (TECH-09)

**Why:** Track page views and purchase conversions for Facebook/Instagram ads

**Setup Steps:**
1. Go to https://business.facebook.com
2. Events Manager → Connect Data Sources → Web → Meta Pixel
3. Name pixel: "Jamaica House Brand"
4. Copy Pixel ID
5. Add to `.env.local`:
   ```
   NEXT_PUBLIC_META_PIXEL_ID=XXXXXXXXXXXXXXXX
   ```

**Dashboard Config:**
- Pixel Name: Jamaica House Brand
- Pixel ID: Available in Events Manager → Data Sources
- Events to track: PageView (automatic), Purchase (on success page)

**Note:** Analytics will not send data until these env vars are configured. This is expected and correct behavior - components gracefully skip when env vars are missing.

## Next Phase Readiness

- Analytics infrastructure complete - ready for production deployment with env vars
- GA4 will auto-track page views on all pages when NEXT_PUBLIC_GA_MEASUREMENT_ID is set
- Meta Pixel will track page views and purchase events when NEXT_PUBLIC_META_PIXEL_ID is set
- Purchase tracking fires exactly once per order with value in dollars (converted from cents)
- All Phase 5 (SEO & Performance) plans complete - ready for Phase 6
- Phase 5 deliverables: root metadata, sitemap.xml, robots.txt, Product JSON-LD, Recipe JSON-LD, GA4, Meta Pixel, image optimization

## Checkpoint Status

**CHECKPOINT REACHED: Task 3 - Human Verification Required**

**Type:** checkpoint:human-verify (blocking)

**Status:** Auto tasks (1-2) complete, awaiting human verification of complete Phase 5 implementation

**What was built:**
- Root metadata with metadataBase, title template, keywords, robots config (Plan 01)
- Dynamic sitemap.xml and robots.txt generation (Plan 01)
- Product JSON-LD schema on all product detail pages (Plan 02)
- XSS-sanitized Recipe JSON-LD on all recipe detail pages (Plan 02)
- Next.js image optimization (WebP/AVIF, quality whitelist) (Plan 01)
- Google Analytics 4 via @next/third-parties (Plan 03)
- Meta Pixel with page view and purchase event tracking (Plan 03)

**Verification steps:**
1. Start dev server: `cd /Users/rfmstaff/Desktop/jamaica-house-brand && npm run dev`
2. Visit http://localhost:3000/sitemap.xml - should show XML listing home, shop, our-story, recipes, all 4 product URLs, and all 6 recipe URLs
3. Visit http://localhost:3000/robots.txt - should show allow all, disallow /api/ and /success, with sitemap reference
4. Visit http://localhost:3000/products/jerk-sauce-5oz - View Page Source, search for "application/ld+json" - should find Product schema with price "7.99" and brand "Jamaica House Brand"
5. Visit http://localhost:3000/recipes/authentic-jerk-chicken - View Page Source, search for "application/ld+json" - should find Recipe schema (verify no raw less-than characters in JSON-LD)
6. Check the browser tab title - should follow "Page Title | Jamaica House Brand" pattern
7. View Page Source on homepage - verify meta description, keywords, og:site_name present
8. Confirm site still works: navigation, cart, product pages all functional
9. Note: GA4 and Meta Pixel will not send data until env vars are configured with real IDs (this is expected and correct)

**Awaiting:** User to verify all SEO and analytics implementation is correct and functional

## Self-Check: PASSED

All claimed files exist:
```
FOUND: src/components/analytics/GoogleAnalytics.tsx
FOUND: src/components/analytics/MetaPixel.tsx
FOUND: src/components/analytics/TrackPurchase.tsx
FOUND: src/app/layout.tsx
FOUND: src/app/success/page.tsx
FOUND: package.json
```

All claimed commits exist:
```
FOUND: 8e6d0fb
FOUND: 3c86f79
```

Build verification:
```
✓ Compiled successfully in 1598.8ms
✓ Generating static pages using 9 workers (22/22) in 243.7ms
```

---
*Phase: 05-seo-performance*
*Completed: 2026-02-18*
*Checkpoint: Awaiting human verification (Task 3)*
