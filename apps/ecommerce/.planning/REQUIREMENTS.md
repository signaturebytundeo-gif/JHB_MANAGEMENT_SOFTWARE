# Requirements: Jamaica House Brand — DTC Ecommerce Website

**Defined:** 2026-02-17
**Core Value:** Every page exists to sell sauce — frictionless discovery, product education, and checkout with zero friction.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Design & Foundation

- [ ] **DSGN-01**: Site uses dark premium aesthetic with gold/amber (#D4A843) accents on dark (#1A1A1A) backgrounds
- [ ] **DSGN-02**: Site is fully responsive and mobile-first (optimized for 70%+ mobile traffic)
- [ ] **DSGN-03**: Typography uses modern sans-serif (Satoshi, Plus Jakarta Sans, or Inter) with bold headlines
- [ ] **DSGN-04**: Navigation has max 5 items: Shop, Our Story, Recipes, Subscribe (coming soon), Cart
- [ ] **DSGN-05**: Hummingbird logo appears as design anchor (nav, favicon, subtle background elements)

### Homepage

- [ ] **HOME-01**: Hero section with full-bleed product image, headline ("30 Years of Flavor. One Legendary Sauce."), and Shop Now CTA
- [ ] **HOME-02**: Shoppable product grid showing all 4 products with quick-add functionality
- [ ] **HOME-03**: Brand story section (60-second version) with Chef Anthony photo and 3-sentence story
- [ ] **HOME-04**: Social proof section with testimonial quotes and star ratings
- [ ] **HOME-05**: Footer with site links, social media links, payment icons, and company info

### Shop Page

- [ ] **SHOP-01**: Clean product grid layout (2 columns mobile, 3-4 desktop) showing all 4 products
- [ ] **SHOP-02**: Each product card shows image, name, price, star rating, and quick-add button
- [ ] **SHOP-03**: Product cards show hover state with lifestyle/in-use image (desktop)

### Product Detail Pages

- [ ] **PROD-01**: Product image gallery with 3-4 images (bottle front, back/label, lifestyle)
- [ ] **PROD-02**: Product info panel with name, size, price, star rating, and description
- [ ] **PROD-03**: Key product callouts displayed (Zero Calories, All Natural, 30-Year Recipe)
- [ ] **PROD-04**: Quantity selector with Add to Cart button
- [ ] **PROD-05**: Product description text with flavor profile and heritage info

### Cart & Checkout

- [ ] **CART-01**: Cart drawer slides out from right side without page redirect
- [ ] **CART-02**: Cart shows item image, name, quantity, price, and subtotal
- [ ] **CART-03**: User can update quantity or remove items from cart drawer
- [ ] **CART-04**: Cart state persists across page refresh and navigation (localStorage)
- [ ] **CART-05**: Checkout button redirects to Stripe Checkout with correct line items
- [ ] **CART-06**: Stripe Checkout supports credit cards, Apple Pay, and Google Pay
- [ ] **CART-07**: Order confirmation page displays after successful payment
- [ ] **CART-08**: Stripe webhook confirms payment on backend

### Our Story Page

- [ ] **STORY-01**: Cinematic scroll-driven layout with large photography
- [ ] **STORY-02**: Chef Anthony's origin story (starting at age 11, building 3 restaurants)
- [ ] **STORY-03**: The sauce story (92% of restaurant customers asked to bottle it)
- [ ] **STORY-04**: Team section with photos/bios (Chef Anthony, Tunde, Tomi)
- [ ] **STORY-05**: Restaurant locations with addresses for all 3 South Florida locations
- [ ] **STORY-06**: CTA at bottom linking to Shop page

### Recipes Page

- [ ] **RCPE-01**: Grid of 6-8 recipe cards with food photography
- [ ] **RCPE-02**: Each recipe detail page has hero image, ingredient list, and step-by-step instructions
- [ ] **RCPE-03**: Each recipe page includes "Shop the sauce used in this recipe" CTA
- [ ] **RCPE-04**: Recipes feature the sauce products as key ingredients

### SEO & Performance

- [ ] **TECH-01**: Lighthouse score 90+ on mobile
- [ ] **TECH-02**: Semantic HTML with proper heading hierarchy (h1-h6)
- [ ] **TECH-03**: Meta titles and descriptions on every page
- [ ] **TECH-04**: Product schema markup (JSON-LD) on product pages
- [ ] **TECH-05**: Recipe schema markup (JSON-LD) on recipe pages
- [ ] **TECH-06**: Sitemap.xml and robots.txt generated
- [ ] **TECH-07**: All images optimized (WebP/AVIF, lazy loaded, responsive sizes)
- [ ] **TECH-08**: Google Analytics 4 tracking on all pages
- [ ] **TECH-09**: Meta Pixel tracking for page views and purchase events

## v2 Requirements

Deferred to future releases. Tracked but not in current roadmap.

### Conversion Optimization

- **CONV-01**: Sticky "Add to Cart" bar on product pages (appears on scroll)
- **CONV-02**: Free shipping progress bar ("You're $X away from free shipping!")
- **CONV-03**: Exit-intent popup with 10% off email capture
- **CONV-04**: Email capture form in footer
- **CONV-05**: "As Featured In" credibility bar (Amazon, partnerships)
- **CONV-06**: Cross-sell/upsell sections on product pages
- **CONV-07**: Trust badges near checkout (secure payment, money-back guarantee)
- **CONV-08**: Custom 404 page with Shop CTA

### Product Enhancements

- **PRDV2-01**: Heat level indicator (visual flame gauge)
- **PRDV2-02**: Ingredients and nutritional information panel
- **PRDV2-03**: Customer review system with photo uploads and star filtering
- **PRDV2-04**: Product image hover to show lifestyle shot on grid

### Bundles & Subscriptions

- **BNDL-01**: Starter Bundle (one of each product, bundled discount)
- **BNDL-02**: Heat Pack (3x 5oz bottles, volume discount)
- **BNDL-03**: Gift Set (5oz + 10oz in gift box)
- **SUBS-01**: Monthly membership — Standard ($75/year, 5oz monthly + bonus)
- **SUBS-02**: Monthly membership — Premium ($125/year, 10oz monthly + bonus)
- **SUBS-03**: Subscribe & Save toggle on product pages (20% off recurring)

### Shopify Integration

- **SHPF-01**: Migrate checkout to Shopify Storefront API
- **SHPF-02**: Shopify-managed product catalog and inventory
- **SHPF-03**: Recharge or Shopify Subscriptions for memberships

### Email & Marketing

- **MKTG-01**: Klaviyo integration for email automation
- **MKTG-02**: Welcome email series (5 emails)
- **MKTG-03**: Abandoned cart email flow (3 emails)
- **MKTG-04**: Post-purchase flow (recipe + review request + referral)
- **MKTG-05**: SMS opt-in at checkout
- **MKTG-06**: Referral program ("Give $5, Get $5")

### Advanced Features

- **ADV-01**: Instagram feed embed on homepage
- **ADV-02**: Bundle builder ("Build Your Own Heat Pack")
- **ADV-03**: Back-in-stock notifications
- **ADV-04**: Post-purchase upsell
- **ADV-05**: Customer support chat
- **ADV-06**: Wholesale portal (password-protected)
- **ADV-07**: Blog/content marketing pages

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| User accounts / login | Guest checkout converts 25% better; no account needed for 4 SKUs |
| Product filtering / sorting | Only 4 products — navigation handles discovery |
| Search functionality | Unnecessary with 4 products and 5 pages |
| Wishlist | Nothing to wishlist with a small catalog |
| Multi-currency / language | US-only DTC brand |
| Product comparison | Same sauce in different sizes — nothing to compare |
| Hiring form | Not customer-facing, removed from current site |
| Audio player | Not relevant to selling sauce |
| Donate page | Not relevant to DTC ecommerce |
| Entertainment page | Not relevant to DTC ecommerce |
| Catering services page | Can be a footer link for future |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DSGN-01 | Phase 1 | Done |
| DSGN-02 | Phase 1 | Done |
| DSGN-03 | Phase 1 | Done |
| DSGN-04 | Phase 1 | Done |
| DSGN-05 | Phase 1 | Done |
| HOME-01 | Phase 2 | Pending |
| HOME-02 | Phase 2 | Pending |
| HOME-03 | Phase 2 | Pending |
| HOME-04 | Phase 2 | Pending |
| HOME-05 | Phase 2 | Pending |
| SHOP-01 | Phase 2 | Pending |
| SHOP-02 | Phase 2 | Pending |
| SHOP-03 | Phase 2 | Pending |
| PROD-01 | Phase 2 | Pending |
| PROD-02 | Phase 2 | Pending |
| PROD-03 | Phase 2 | Pending |
| PROD-04 | Phase 2 | Pending |
| PROD-05 | Phase 2 | Pending |
| CART-01 | Phase 3 | Pending |
| CART-02 | Phase 3 | Pending |
| CART-03 | Phase 3 | Pending |
| CART-04 | Phase 3 | Pending |
| CART-05 | Phase 3 | Pending |
| CART-06 | Phase 3 | Pending |
| CART-07 | Phase 3 | Pending |
| CART-08 | Phase 3 | Pending |
| STORY-01 | Phase 4 | Pending |
| STORY-02 | Phase 4 | Pending |
| STORY-03 | Phase 4 | Pending |
| STORY-04 | Phase 4 | Pending |
| STORY-05 | Phase 4 | Pending |
| STORY-06 | Phase 4 | Pending |
| RCPE-01 | Phase 4 | Pending |
| RCPE-02 | Phase 4 | Pending |
| RCPE-03 | Phase 4 | Pending |
| RCPE-04 | Phase 4 | Pending |
| TECH-01 | Phase 5 | Pending |
| TECH-02 | Phase 5 | Pending |
| TECH-03 | Phase 5 | Pending |
| TECH-04 | Phase 5 | Pending |
| TECH-05 | Phase 5 | Pending |
| TECH-06 | Phase 5 | Pending |
| TECH-07 | Phase 5 | Pending |
| TECH-08 | Phase 5 | Pending |
| TECH-09 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 37 total
- Mapped to phases: 37
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-17*
*Last updated: 2026-02-17 after roadmap creation*
