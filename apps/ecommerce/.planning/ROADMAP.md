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
- [ ] **Phase 15: Free Shipping Threshold** - Persistent free shipping bar and automatic free shipping at checkout for $50+ orders
- [ ] **Phase 16: Product Bundles** - Pre-defined bundles and build-your-own bundle with automatic discount
- [ ] **Phase 17: Discount Codes** - Stripe promotion codes (WELCOME10, FREESHIP50) at hosted checkout
- [ ] **Phase 18: Email Capture + Welcome Flow** - Footer and exit-intent email capture with branded welcome email

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

### Phase 15: Free Shipping Threshold
**Goal**: Customers see a persistent free shipping bar and qualifying orders automatically receive free shipping at Stripe checkout
**Depends on**: Phase 14 (existing Stripe checkout flow)
**Requirements**: SHIP-01, SHIP-02
**Success Criteria** (what must be TRUE):
  1. A "Free shipping on orders $50+" bar is visible on every page of the ecommerce site
  2. The bar dynamically reflects how much more the customer needs to spend to qualify (or confirms they qualify)
  3. An order totaling $50+ reaches Stripe checkout with $0 shipping applied automatically
  4. An order under $50 is not granted free shipping at checkout
**Plans**: 1 plan

Plans:
- [ ] 15-01-PLAN.md — Free shipping progress bar component, root layout integration, and CartDrawer shipping indicator

### Phase 16: Product Bundles
**Goal**: Customers can browse and purchase pre-defined bundles and build their own bundle on the ecommerce site, with correct pricing flowing into Stripe and command-center
**Depends on**: Phase 15
**Requirements**: BNDL-01, BNDL-02, BNDL-03, BNDL-04
**Success Criteria** (what must be TRUE):
  1. Starter Bundle, Heat Pack, and Gift Set are visible on the shop page with bundle pricing (lower than individual sum)
  2. A pre-defined bundle can be added to cart as a single item with the correct discounted total
  3. Customer can select 3 or more individual items and receive an automatic percentage discount (build-your-own bundle)
  4. Bundle orders create correct line items in Stripe checkout with bundle name and price
  5. Bundle orders appear in the command-center with accurate line item records
**Plans**: 3 plans

Plans:
- [ ] 16-01-PLAN.md — Bundle data model, 3 pre-defined bundles, bundle cards on shop page, bundle detail pages
- [ ] 16-02-PLAN.md — Build-your-own bundle discount logic and CartDrawer discount display
- [ ] 16-03-PLAN.md — Stripe checkout API updates for bundle line items and build-your-own discount

### Phase 17: Discount Codes
**Goal**: Customers can enter discount codes at Stripe checkout, and hardcoded promo codes (WELCOME10, FREESHIP50) are recognized and applied
**Depends on**: Phase 15
**Requirements**: DISC-01, DISC-02
**Success Criteria** (what must be TRUE):
  1. A discount code field is available at Stripe checkout
  2. Entering WELCOME10 applies a 10% discount to the order total
  3. Entering FREESHIP50 applies free shipping to the order
  4. An invalid or expired code is rejected with a clear error message at checkout
  5. Discount codes work with both individual product and bundle purchases
**Plans**: 1 plan

Plans:
- [ ] 17-01-PLAN.md — Stripe promo code seed script and checkout session promotion code support

### Phase 18: Email Capture + Welcome Flow
**Goal**: Customers can subscribe via footer and exit-intent popup, and new subscribers automatically receive a branded welcome email with a unique discount code
**Depends on**: Phase 17 (discount code system must exist to generate welcome codes)
**Requirements**: EMAIL-03, EMAIL-04, EMAIL-05, DISC-03
**Success Criteria** (what must be TRUE):
  1. Customer can enter email in the site footer and receive confirmation of subscription
  2. An exit-intent popup appears when the customer moves to leave the page, offering a discount for subscribing
  3. New subscriber receives a branded JHB welcome email (dark + gold aesthetic) via Resend within 60 seconds
  4. The welcome email contains a unique, working discount code (e.g., WELCOME10) the customer can use at checkout
  5. Subscribing via footer or popup both trigger the welcome email flow
**Plans**: 2 plans

Plans:
- [ ] 18-01-PLAN.md — Subscribe API endpoint, Resend integration, and branded welcome email template with WELCOME10 code
- [ ] 18-02-PLAN.md — Footer email form, exit-intent popup, and shared subscription state store

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
| 15. Free Shipping Threshold | 0/1 | Not started | - |
| 16. Product Bundles | 0/3 | Not started | - |
| 17. Discount Codes | 0/1 | Not started | - |
| 18. Email Capture + Welcome Flow | 0/2 | Not started | - |
