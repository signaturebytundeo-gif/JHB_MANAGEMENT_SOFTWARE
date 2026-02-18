# Roadmap: Jamaica House Brand — DTC Ecommerce Website

## Overview

Build a high-converting direct-to-consumer ecommerce site for Jamaica House Brand's Original Jerk Sauce in 6 phases: establish design foundation and project scaffolding, build core commerce pages for product discovery, implement cart and Stripe checkout, add content storytelling pages, optimize for SEO and performance, and deploy to production with final testing.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Design System** - Project scaffolding, design tokens, and base UI components ✓ 2026-02-17
- [x] **Phase 2: Core Commerce Pages** - Homepage, shop page, and product detail pages ✓ 2026-02-17
- [x] **Phase 3: Cart & Checkout** - Shopping cart functionality and Stripe payment integration ✓ 2026-02-17
- [x] **Phase 4: Content & Storytelling** - Our Story page and recipes section ✓ 2026-02-17
- [x] **Phase 5: SEO & Performance** - Technical optimization, analytics, and schema markup ✓ 2026-02-18
- [ ] **Phase 6: Production Launch** - Domain configuration, production deployment, and go-live testing

## Phase Details

### Phase 1: Foundation & Design System
**Goal**: Developers can build pages using the Jamaica House Brand design system in a production-ready Next.js environment
**Depends on**: Nothing (first phase)
**Requirements**: DSGN-01, DSGN-02, DSGN-03, DSGN-04, DSGN-05
**Success Criteria** (what must be TRUE):
  1. Next.js 14+ App Router project exists with Tailwind CSS configured
  2. Design tokens (colors, typography, spacing) are available as Tailwind config
  3. Navigation component renders with logo, 5 nav items (Shop, Our Story, Recipes, Subscribe, Cart), and works on mobile + desktop
  4. Dark theme (#1A1A1A background + #D4A843 gold accents) applies consistently across all components
  5. Product data file exists with all 4 SKUs (Jerk Sauce 2oz/5oz/10oz, Escovitch Pikliz 12oz) as TypeScript objects
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Initialize Next.js 16 with Tailwind v4 design system and dark theme
- [x] 01-02-PLAN.md — Create accessible navigation with mobile hamburger menu
- [x] 01-03-PLAN.md — Define product types and 4-SKU catalog with verification checkpoint

### Phase 2: Core Commerce Pages
**Goal**: Users can discover products, view details, and understand what they're buying
**Depends on**: Phase 1
**Requirements**: HOME-01, HOME-02, HOME-03, HOME-04, HOME-05, SHOP-01, SHOP-02, SHOP-03, PROD-01, PROD-02, PROD-03, PROD-04, PROD-05
**Success Criteria** (what must be TRUE):
  1. Homepage displays hero section with headline, shoppable product grid, brand story preview, social proof, and footer
  2. Shop page shows all 4 products in responsive grid with images, prices, and quick-add buttons
  3. Product detail pages render with image gallery, product info (name/size/price/rating), callouts (Zero Calories, All Natural), quantity selector, and description
  4. All pages are mobile-responsive and use the dark premium aesthetic
  5. Navigation works between all pages (Home, Shop, Product Details)
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md — Shared data extensions (rating, callouts, images) and reusable UI components (StarRating, ProductCard, Footer)
- [x] 02-02-PLAN.md — Homepage with hero section, product grid, brand story, and social proof
- [x] 02-03-PLAN.md — Shop page with product grid and Product Detail pages with gallery, info, callouts, and quantity selector

### Phase 3: Cart & Checkout
**Goal**: Users can add products to cart, see their order, and complete payment
**Depends on**: Phase 2
**Requirements**: CART-01, CART-02, CART-03, CART-04, CART-05, CART-06, CART-07, CART-08
**Success Criteria** (what must be TRUE):
  1. User can add items to cart from shop grid and product detail pages
  2. Cart drawer slides in from right showing items, quantities, prices, and subtotal
  3. User can update quantities or remove items from cart drawer
  4. Cart state persists across page refreshes and browser sessions
  5. Clicking checkout redirects to Stripe Checkout with correct items
  6. User can pay with credit card, Apple Pay, or Google Pay
  7. After successful payment, order confirmation page displays
  8. Stripe webhook confirms payment on backend (verifies signature, logs order)
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — Cart state (Zustand + localStorage), CartDrawer UI (Headless UI Dialog), wire all add-to-cart touchpoints
- [x] 03-02-PLAN.md — Stripe checkout session, webhook handler, order confirmation success page

### Phase 4: Content & Storytelling
**Goal**: Users understand the brand heritage and discover recipes that feature the products
**Depends on**: Phase 3
**Requirements**: STORY-01, STORY-02, STORY-03, STORY-04, STORY-05, STORY-06, RCPE-01, RCPE-02, RCPE-03, RCPE-04
**Success Criteria** (what must be TRUE):
  1. Our Story page renders with cinematic scroll layout, Chef Anthony's origin story, the sauce story, team bios, and 3 restaurant locations
  2. Recipes page displays grid of 6-8 recipe cards with food photography
  3. Each recipe detail page shows hero image, ingredient list, step-by-step instructions, and "Shop the sauce" CTA
  4. All recipes feature Jamaica House Brand products as key ingredients
  5. Story page ends with CTA linking to Shop page
**Plans**: 3 plans

Plans:
- [x] 04-01-PLAN.md — Data layer: TypeScript interfaces, 6 recipes, story content, team bios, restaurant locations, schema.org SEO utility
- [x] 04-02-PLAN.md — Our Story page with cinematic scroll layout, origin story, sauce story, team section, restaurants, Shop CTA
- [x] 04-03-PLAN.md — Recipes grid page and recipe detail pages with hero image, ingredients, instructions, and Shop the sauce CTA

### Phase 5: SEO & Performance
**Goal**: Site is discoverable by search engines, loads fast on mobile, and tracks user behavior
**Depends on**: Phase 4
**Requirements**: TECH-01, TECH-02, TECH-03, TECH-04, TECH-05, TECH-06, TECH-07, TECH-08, TECH-09
**Success Criteria** (what must be TRUE):
  1. Lighthouse mobile score is 90+ (Performance, Accessibility, Best Practices, SEO)
  2. All pages have semantic HTML with proper heading hierarchy and meta titles/descriptions
  3. Product pages include Product schema (JSON-LD) with name, image, price, availability
  4. Recipe pages include Recipe schema (JSON-LD) with ingredients, instructions, cook time
  5. Sitemap.xml and robots.txt are generated and accessible
  6. All images are optimized (WebP/AVIF, lazy loaded, responsive srcsets)
  7. Google Analytics 4 tracks page views across all pages
  8. Meta Pixel tracks page views and purchase events
**Plans**: 3 plans

Plans:
- [x] 05-01-PLAN.md — Root metadata (metadataBase, title template, keywords), sitemap.xml, robots.txt, and image optimization config
- [x] 05-02-PLAN.md — Product JSON-LD schema on product pages and XSS-sanitized Recipe JSON-LD
- [x] 05-03-PLAN.md — Google Analytics 4 and Meta Pixel integration with purchase event tracking

### Phase 6: Production Launch
**Goal**: Site is live at jamaicahousebrand.com with production payment processing
**Depends on**: Phase 5
**Requirements**: (No new feature requirements — this phase is deployment and validation)
**Success Criteria** (what must be TRUE):
  1. Domain jamaicahousebrand.com points to Vercel deployment
  2. Stripe is configured with production API keys (not test mode)
  3. Test order completes end-to-end (add to cart, checkout, payment, webhook confirmation)
  4. SSL certificate is active (HTTPS working)
  5. All 6 pages are accessible at production domain (Home, Shop, Product Details, Our Story, Recipes, Order Confirmation)
  6. Analytics and Meta Pixel are tracking in production environment
**Plans**: TBD

Plans:
- [ ] 06-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Design System | 3/3 | ✓ Complete | 2026-02-17 |
| 2. Core Commerce Pages | 3/3 | ✓ Complete | 2026-02-17 |
| 3. Cart & Checkout | 2/2 | ✓ Complete | 2026-02-17 |
| 4. Content & Storytelling | 3/3 | ✓ Complete | 2026-02-17 |
| 5. SEO & Performance | 3/3 | ✓ Complete | 2026-02-18 |
| 6. Production Launch | 0/0 | Not started | - |
