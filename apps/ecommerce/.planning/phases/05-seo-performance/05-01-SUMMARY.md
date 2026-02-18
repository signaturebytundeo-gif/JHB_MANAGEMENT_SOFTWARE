---
phase: 05-seo-performance
plan: 01
subsystem: seo
tags: [nextjs, seo, metadata, sitemap, robots.txt, image-optimization]

# Dependency graph
requires:
  - phase: 01-foundation-design-system
    provides: Next.js App Router structure and layout system
  - phase: 02-core-commerce-pages
    provides: Product data structure and pages for sitemap generation
  - phase: 04-content-storytelling
    provides: Recipe data structure and pages for sitemap generation
provides:
  - SEO foundation with metadataBase for absolute OG URLs
  - Title template for consistent brand suffix across all pages
  - Dynamic sitemap.xml with all products and recipes
  - Robots.txt with proper disallow rules
  - Next.js image optimization config for WebP/AVIF
affects: [all-future-pages, 05-02-structured-data, 05-03-performance]

# Tech tracking
tech-stack:
  added: []
  patterns: [dynamic-sitemap-generation, metadata-route-api]

key-files:
  created:
    - src/app/sitemap.ts
    - src/app/robots.ts
  modified:
    - src/app/layout.tsx
    - next.config.ts
    - src/app/shop/page.tsx
    - src/app/our-story/page.tsx
    - src/app/recipes/page.tsx
    - src/app/success/page.tsx

key-decisions:
  - "metadataBase set to https://jamaicahousebrand.com for absolute OG image URLs"
  - "Title template '%s | Jamaica House Brand' for consistent branding across all pages"
  - "Success page marked noindex/nofollow to prevent search engine indexing"
  - "Sitemap includes 4 static pages + 4 products + 6 recipes = 14 total URLs"
  - "Robots.txt disallows /api/ routes and /success page"
  - "Image optimization configured for AVIF/WebP with quality whitelist [75, 90, 100]"

patterns-established:
  - "MetadataRoute.Sitemap pattern for dynamic sitemap generation from data files"
  - "Per-page titles use short form, template adds brand suffix automatically"

# Metrics
duration: 1min
completed: 2026-02-18
---

# Phase 05 Plan 01: SEO Foundation Summary

**Next.js SEO infrastructure with metadataBase, dynamic sitemap for 14 pages, robots.txt, and AVIF/WebP image optimization**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-18T11:15:08Z
- **Completed:** 2026-02-18T11:15:46Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Root layout configured with comprehensive SEO metadata (metadataBase, title template, keywords, OG base, robots config)
- Dynamic sitemap.xml auto-generated from product and recipe data (14 total URLs)
- Robots.txt configured to allow crawlers while protecting /api/ routes and /success page
- Next.js image optimization enabled for modern formats (AVIF/WebP) with quality control
- Per-page titles cleaned up to leverage template system (removed redundant brand suffixes)
- Success page marked noindex to prevent search engine crawling

## Task Commits

Each task was committed atomically:

1. **Task 1: Root metadata, image config, and per-page title cleanup** - `b7fff62` (feat)
2. **Task 2: Dynamic sitemap.ts and robots.ts** - `fac8b8d` (feat)

## Files Created/Modified
- `src/app/layout.tsx` - Added metadataBase, title template, keywords, authors, OG base config, twitter card, robots metadata
- `next.config.ts` - Added image optimization with AVIF/WebP formats and quality whitelist
- `src/app/sitemap.ts` - Dynamic sitemap generation importing products and recipes data
- `src/app/robots.ts` - Robots.txt with sitemap reference and disallow rules
- `src/app/shop/page.tsx` - Title changed from 'Shop Authentic Jamaican Sauces | Jamaica House Brand' to 'Shop Authentic Jamaican Sauces'
- `src/app/our-story/page.tsx` - Title changed from 'Our Story - Jamaica House Brand' to 'Our Story'
- `src/app/recipes/page.tsx` - Title changed from 'Recipes - Jamaica House Brand' to 'Recipes'
- `src/app/success/page.tsx` - Title changed to 'Order Confirmed', added description and robots noindex

## Decisions Made

1. **metadataBase as absolute URL** - Set to https://jamaicahousebrand.com to ensure Open Graph images use absolute URLs (social media requires full URLs)
2. **Template-based title system** - Using '%s | Jamaica House Brand' template to automatically append brand suffix to all child pages, ensuring consistency
3. **Success page noindex** - Marked /success with robots noindex/nofollow to prevent search engines from crawling order confirmation pages
4. **Sitemap priority hierarchy** - Homepage (1.0), Shop (0.9), Products (0.8), Recipes listing (0.7), Recipe pages (0.7), Our Story (0.6)
5. **API route protection** - Robots.txt disallows /api/ to prevent crawlers from hitting API endpoints
6. **Image quality tiers** - Configured [75, 90, 100] quality levels for Next.js to serve different quality based on viewport/device

## Deviations from Plan

None - plan executed exactly as written. All code changes were anticipated in the plan tasks.

## Issues Encountered

None - both tasks completed without errors. Next.js build verified successful generation of /sitemap.xml and /robots.txt routes.

## User Setup Required

None - no external service configuration required. SEO metadata is self-contained within the Next.js application.

## Next Phase Readiness

- SEO foundation complete - all pages now have proper metadata structure
- Ready for Phase 05-02 (Structured Data / JSON-LD) to add rich snippets
- metadataBase enables relative OG image paths in future pages
- Sitemap will auto-update when new products or recipes are added to data files
- Image optimization configured for performance improvements in Phase 05-03

## Self-Check: PASSED

All claimed files exist:
```
FOUND: src/app/layout.tsx
FOUND: next.config.ts
FOUND: src/app/sitemap.ts
FOUND: src/app/robots.ts
FOUND: src/app/shop/page.tsx
FOUND: src/app/our-story/page.tsx
FOUND: src/app/recipes/page.tsx
FOUND: src/app/success/page.tsx
```

All claimed commits exist:
```
FOUND: b7fff62
FOUND: fac8b8d
```

---
*Phase: 05-seo-performance*
*Completed: 2026-02-18*
