# Jamaica House Brand — DTC Ecommerce Website

## What This Is

A modern, high-converting direct-to-consumer ecommerce website for Jamaica House Brand — a Caribbean lifestyle company whose flagship product is Original Jerk Sauce, backed by 30+ years of restaurant heritage across three South Florida locations. The site replaces a cluttered, non-converting GoDaddy Website Builder site with a sleek, conversion-first experience where the primary action is buying sauce.

## Core Value

Every page exists to sell sauce — frictionless discovery, product education, and checkout with zero friction between "I want this" and "I bought this."

## Current Milestone: v1.0 Launch

**Goal:** Ship the full DTC ecommerce site — homepage, shop, product pages, Our Story, recipes, Stripe checkout, and conversion optimization — replacing the current GoDaddy site.

**Target features:**
- Premium dark aesthetic ecommerce storefront
- 4-SKU product catalog with Stripe checkout
- Brand storytelling (Our Story, Recipes)
- Conversion features (cart drawer, sticky add-to-cart, email capture, trust badges)
- SEO foundation and Lighthouse 90+ performance

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Premium dark aesthetic with gold/amber accents (Truff-inspired, culturally authentic)
- [ ] Mobile-first responsive design (70%+ traffic expected on mobile)
- [ ] Homepage with hero, shoppable product grid, brand story, social proof, and email capture
- [ ] Product detail pages with image gallery, heat level indicator, ingredients, and reviews section
- [ ] Shop page with clean product grid for 4 products (Jerk Sauce 2oz/5oz/10oz + Escovitch Pikliz 12oz)
- [ ] Our Story page — cinematic scroll-driven storytelling (Chef Anthony, 30-year heritage, 3 restaurants)
- [ ] Recipes page — grid of 6-8 recipe cards with full recipe detail pages
- [ ] Stripe checkout — direct card payments, Apple Pay, Google Pay
- [ ] Cart drawer (slide-out, no page redirect)
- [ ] Sticky "Add to Cart" bar on product pages (mobile + desktop)
- [ ] Free shipping threshold bar ("You're $X away from free shipping")
- [ ] Exit-intent popup with 10% off email capture
- [ ] Email capture in footer ("Get 10% off + exclusive recipes")
- [ ] Trust badges near checkout (secure payment, money-back guarantee, free shipping over $35)
- [ ] SEO foundation — semantic HTML, meta tags, schema markup (Product, Recipe, LocalBusiness)
- [ ] Performance target — Lighthouse 90+ mobile, FCP under 1.5s
- [ ] Product photo backgrounds edited/cleaned for polished presentation

### Out of Scope

- Shopify integration — deferred to later phase
- Bundles (Starter Bundle, Heat Pack, Gift Set) — later phase
- Subscription / membership model — later phase
- Bundle builder ("Build Your Own Heat Pack") — later phase
- Referral program — later phase
- Abandoned cart email flows (Klaviyo) — later phase (needs Shopify/email platform)
- SMS opt-in — later phase
- Post-purchase upsell — later phase
- Wholesale portal — later phase (footer link to email is sufficient for now)
- Blog/content marketing — architecture should be blog-ready but no blog at launch
- Customer support chat (Gorgias/Tidio) — later phase
- Back-in-stock notifications — later phase
- Countdown timers / seasonal drops — later phase
- Instagram feed embed — later phase (curated testimonials instead)
- Hiring form, audio player, donate page, partner form, entertainment page, catering page — removed permanently from current site

## Context

**Current state:** Jamaica House Brand currently has a GoDaddy Website Builder site at jamaicahousebrand.com. The site is slow, templated, cluttered with non-ecommerce sections (hiring, audio, donate, partner forms), and has no direct checkout — the Shop link redirects to a separate Shopify subdomain. The brand also sells on Amazon with 3,500%+ YoY growth.

**Brand heritage:** Chef Anthony started cooking at age 11 in his family's restaurant. Three decades and three South Florida locations later (Miami Gardens, Lauderhill, Miramar), 92% of restaurant customers asked them to bottle the sauce. The family recipe features allspice, thyme, and Scotch bonnet peppers.

**Team:** Chef Anthony (CEO), Tunde (President), Tomi (Creative Director).

**Assets available:** Product photos exist but need background editing/cleanup. Hummingbird logo files available. Lifestyle and restaurant photography may need supplementing.

**Products at launch (4 SKUs):**

| Product | Size | Price |
|---------|------|-------|
| Original Jerk Sauce | 2oz | $3.99 |
| Original Jerk Sauce | 5oz | $7.99 |
| Original Jerk Sauce | 10oz | $14.99 |
| Escovitch Pikliz | 12oz | $7.99 |

**Design system:**

| Token | Value | Usage |
|-------|-------|-------|
| Primary Black | `#1A1A1A` | Backgrounds, text |
| Warm Gold/Amber | `#D4A843` | Accents, CTAs, highlights |
| Cream White | `#FAF8F5` | Light backgrounds, cards |
| Deep Green | `#2D5016` | Jamaican heritage accent |
| Hot Red/Orange | `#C74B2A` | Urgency, sale tags, heat indicators |
| Pure White | `#FFFFFF` | Text on dark backgrounds |

**Typography:** Bold modern sans-serif for headlines (Satoshi, Plus Jakarta Sans, or Inter Black). Clean sans-serif for body (Inter, DM Sans).

**Competitive references:** Truff (dark premium aesthetic), Fly By Jing (cultural storytelling + recipes), Yellowbird (clean grid + heat indicators), Graza (modern playful design), Heatonist (heat scale + product filtering).

**Key stats for social proof:**
- 30+ years restaurant heritage
- 3 South Florida locations
- 92% customer satisfaction
- 15,000+ Instagram followers
- 3,500%+ YoY Amazon growth
- Zero calories, all natural ingredients

**Copy bank:**
- Primary tagline: "From Our Family to Yours"
- Secondary: "30 Years of Flavor. One Legendary Sauce."
- Product: "Zero Calories. All Heat. All Flavor."
- Heritage: "Born in a Kitchen. Bottled for You."

## Constraints

- **Tech stack**: Next.js 14+ (App Router), Tailwind CSS, Stripe for payments, Vercel for hosting
- **Domain**: jamaicahousebrand.com managed via GoDaddy, pointed to Vercel
- **Products**: 4 SKUs only at launch — no bundles, subscriptions, or memberships
- **Assets**: Product photos require background editing before use
- **Performance**: Lighthouse 90+ mobile, FCP under 1.5s, lazy loading, WebP/AVIF images
- **Navigation**: Max 5 items — Shop, Our Story, Recipes, Subscribe (placeholder/coming soon), Cart
- **Design**: Dark backgrounds + gold/amber accents, photography-driven, mobile-first

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js over Shopify theme | Full design control, custom checkout, headless architecture for future flexibility | — Pending |
| Stripe direct over Shopify checkout | Shopify integration deferred; Stripe provides cards + Apple Pay + Google Pay natively | — Pending |
| Vercel hosting | Natural fit for Next.js, free tier, excellent performance, global CDN | — Pending |
| GoDaddy for domain only | Keep domain registration on GoDaddy, point DNS to Vercel | — Pending |
| 4 SKUs at launch | Focus on core products, add bundles/subscriptions in later phases | — Pending |
| No Klaviyo/email automation at launch | Requires deeper integration; email capture stores addresses for future use | — Pending |

---
*Last updated: 2026-02-17 after v1.0 milestone start*
