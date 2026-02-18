# Phase 2: Core Commerce Pages - Research

**Researched:** 2026-02-17
**Domain:** Next.js 16 App Router e-commerce with Tailwind CSS v4
**Confidence:** HIGH

## Summary

Phase 2 implements the core commerce pages (Home, Shop, Product Details) using Next.js 16 App Router patterns with React Server Components by default and selective client interactivity. The project already has foundational infrastructure from Phase 1: Next.js 16.1.6, Tailwind CSS v4 with design tokens, Plus Jakarta Sans font, product data structures, and navigation component.

The research reveals modern e-commerce patterns emphasize performance-first approaches: static generation for product pages with `generateStaticParams`, automatic image optimization with `next/image`, responsive layouts with Tailwind's container queries (built into v4), and strategic use of Server vs Client Components. Key architectural decisions involve using Server Components for data display (product grids, details) and Client Components only for interactive elements (quantity selectors, add-to-cart buttons).

**Primary recommendation:** Build pages as Server Components with `generateMetadata` for SEO, use `next/image` with `sizes` attribute for responsive images, implement product grids with Tailwind's responsive grid utilities, and defer client interactivity to leaf components for optimal performance.

## User Constraints

No CONTEXT.md exists for this phase — no locked user decisions to constrain research.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App Router framework | Already installed; React Server Components by default, built-in image optimization, automatic code splitting, SEO-friendly metadata API |
| React | 19.2.3 | UI library | Already installed; required by Next.js, Server Components support |
| Tailwind CSS | 4.x | Utility-first styling | Already installed; v4 has built-in container queries, @theme design tokens configured, optimal for responsive commerce layouts |
| TypeScript | 5.x | Type safety | Already installed; type-safe product data, metadata, and component props |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx | Latest | Conditional class composition | For dynamic className logic (hover states, active products) |
| None required | - | Star ratings | Build simple display component (non-interactive for Phase 2) |
| None required | - | Price formatting | Use native `Intl.NumberFormat` for currency display |
| None required | - | Image gallery | Use state + `next/image` for basic product image switching |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native grid | CSS Grid library | Tailwind's responsive grid utilities are sufficient; no library needed |
| Custom carousel | react-responsive-carousel | Phase 2 only needs simple image switching; save carousels for Phase 5+ |
| Dinero.js | Native Intl.NumberFormat | Product prices stored in cents, simple conversion; library overkill |
| Icon library | Inline SVG | Only need 2-3 icons (star rating, payment icons in footer); inline SVGs keep bundle small |

**Installation:**
```bash
npm install clsx
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── layout.tsx              # Root layout (already exists)
│   ├── page.tsx                # Homepage (HOME-01 to HOME-05)
│   ├── shop/
│   │   └── page.tsx            # Shop page (SHOP-01 to SHOP-03)
│   └── products/
│       └── [slug]/
│           └── page.tsx        # Product detail pages (PROD-01 to PROD-05)
├── components/
│   ├── navigation/             # Already exists
│   ├── home/
│   │   ├── HeroSection.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── BrandStory.tsx
│   │   ├── SocialProof.tsx
│   │   └── Footer.tsx
│   ├── shop/
│   │   ├── ProductCard.tsx
│   │   └── ProductGrid.tsx
│   └── product/
│       ├── ImageGallery.tsx    # Client Component
│       ├── ProductInfo.tsx
│       ├── QuantitySelector.tsx # Client Component
│       └── AddToCartButton.tsx  # Client Component (Phase 3)
├── lib/
│   ├── fonts.ts                # Already exists
│   ├── utils.ts                # Already exists
│   └── formatters.ts           # Price formatting utilities
├── types/
│   └── product.ts              # Already exists
└── data/
    └── products.ts             # Already exists (4 SKUs)
```

### Pattern 1: Server Component Product Pages with Dynamic Metadata

**What:** Product detail pages as Server Components with `generateMetadata` for SEO and `generateStaticParams` for static generation
**When to use:** All product pages, shop page, homepage
**Example:**
```typescript
// app/products/[slug]/page.tsx
import { Metadata } from 'next'
import { getProductBySlug, products } from '@/data/products'
import { notFound } from 'next/navigation'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return products.map((product) => ({
    slug: product.slug,
  }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = getProductBySlug(slug)

  if (!product) return {}

  return {
    title: `${product.name} ${product.size} | Jamaica House Brand`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [{ url: product.image, width: 800, height: 600, alt: product.name }],
      type: 'product',
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = getProductBySlug(slug)

  if (!product) notFound()

  return (
    <div>
      {/* Product detail UI - Server Component */}
    </div>
  )
}
```

### Pattern 2: Responsive Product Grid with Tailwind

**What:** Mobile-first responsive grid using Tailwind's built-in responsive utilities
**When to use:** Shop page product grid, homepage shoppable grid
**Example:**
```typescript
// components/shop/ProductGrid.tsx (Server Component)
import { products } from '@/data/products'
import ProductCard from './ProductCard'

export default function ProductGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

### Pattern 3: Next.js Image with Responsive Sizing

**What:** Use `next/image` with `sizes` attribute for responsive images across breakpoints
**When to use:** All product images, hero images, gallery images
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/api-reference/components/image
import Image from 'next/image'

export default function ProductImage({ src, alt, priority = false }) {
  return (
    <div className="relative aspect-square">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover"
        preload={priority} // Use for hero/LCP images only
      />
    </div>
  )
}
```

### Pattern 4: Server Component Wrapper for Client Components

**What:** Composition pattern - Server Components pass data to Client Components as props
**When to use:** Interactive components (quantity selector, add to cart) that need product data
**Example:**
```typescript
// app/products/[slug]/page.tsx (Server Component)
import QuantitySelector from '@/components/product/QuantitySelector'

export default async function ProductPage({ params }: Props) {
  const product = getProductBySlug(slug) // Server-side data fetch

  return (
    <div>
      {/* Server-rendered product info */}
      <h1>{product.name}</h1>

      {/* Client Component for interactivity */}
      <QuantitySelector productId={product.id} maxQuantity={10} />
    </div>
  )
}

// components/product/QuantitySelector.tsx (Client Component)
'use client'
import { useState } from 'react'

export default function QuantitySelector({ productId, maxQuantity }) {
  const [quantity, setQuantity] = useState(1)
  // Interactive logic here
}
```

### Pattern 5: Price Formatting Utility

**What:** Utility function using native `Intl.NumberFormat` to format cents as currency
**When to use:** All product price displays
**Example:**
```typescript
// lib/formatters.ts
export function formatPrice(priceInCents: number, locale = 'en-US', currency = 'USD'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(priceInCents / 100)
}

// Usage in component
import { formatPrice } from '@/lib/formatters'

export default function ProductPrice({ price }: { price: number }) {
  return <span className="text-2xl font-bold">{formatPrice(price)}</span>
}
```

### Pattern 6: Full-Bleed Hero Section with Image

**What:** Hero section using `next/image` with `fill` prop for full-width background
**When to use:** Homepage hero (HOME-01)
**Example:**
```typescript
// components/home/HeroSection.tsx
import Image from 'next/image'
import Link from 'next/link'

export default function HeroSection() {
  return (
    <section className="relative h-screen min-h-[600px]">
      <Image
        src="/images/hero-jerk-sauce.jpg"
        alt="Jamaica House Original Jerk Sauce"
        fill
        sizes="100vw"
        className="object-cover"
        preload={true} // LCP element
        quality={90}
      />
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
          30 Years of Flavor. One Legendary Sauce.
        </h1>
        <Link
          href="/shop"
          className="bg-brand-gold hover:bg-brand-gold-light text-brand-dark px-8 py-4 rounded-lg font-semibold transition-colors"
        >
          Shop Now
        </Link>
      </div>
    </section>
  )
}
```

### Anti-Patterns to Avoid

- **Marking entire pages as Client Components:** Next.js 16 Server Components are default; only mark interactive leaf components with `'use client'`
- **Missing `sizes` attribute on responsive images:** Without `sizes`, browser assumes 100vw and downloads oversized images
- **Using `priority` on multiple images:** Only set `priority` (now `preload`) on LCP element (hero image); all others should lazy-load
- **Accessing `params` synchronously:** In Next.js 16, params are async - always `await params`
- **Hand-rolling currency formatting:** Use `Intl.NumberFormat` instead of string manipulation
- **Using hover states without mobile fallbacks:** Hover doesn't exist on touch devices; ensure mobile UX doesn't rely on hover

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image optimization | Custom image resizing/CDN integration | `next/image` component | Handles responsive srcset, lazy loading, format detection (WebP/AVIF), blur placeholders, automatic optimization |
| Currency formatting | String concatenation with toFixed() | `Intl.NumberFormat` | Handles locale-specific formatting, thousands separators, decimal rules, currency symbols |
| Metadata/SEO tags | Manual `<Head>` tag management | `generateMetadata` function | Type-safe, automatic merging across layouts, supports dynamic data, Open Graph, Twitter cards |
| Route parameters | Query strings for product IDs | Dynamic route segments `[slug]` | SEO-friendly URLs, automatic static generation, type-safe params |
| Responsive breakpoints | Custom media query hooks | Tailwind responsive utilities | Consistent breakpoints, optimized for performance, no JS needed for layout |

**Key insight:** Next.js 16 and Tailwind CSS v4 have solved most e-commerce infrastructure problems. Custom solutions add bundle size, maintenance burden, and edge cases. Use framework primitives first.

## Common Pitfalls

### Pitfall 1: Cumulative Layout Shift from Missing Image Dimensions

**What goes wrong:** Product images load and cause content below to jump, poor Core Web Vitals
**Why it happens:** Using `fill` prop without parent aspect ratio container, or missing `width`/`height` on static images
**How to avoid:** Wrap `fill` images in containers with `aspect-[ratio]`, provide explicit dimensions for static images
**Warning signs:** Content shifting during page load, low CLS scores in Lighthouse

```typescript
// BAD - causes layout shift
<Image src={product.image} fill />

// GOOD - reserves space
<div className="relative aspect-square">
  <Image src={product.image} fill sizes="..." className="object-cover" />
</div>
```

### Pitfall 2: Accidentally Opting Into Dynamic Rendering

**What goes wrong:** Product pages render on-demand instead of static generation, slower TTFB
**Why it happens:** Accessing `cookies()`, `headers()`, or `searchParams` in page component or `generateMetadata`
**How to avoid:** Check `next build` output for page types; only use dynamic APIs when truly needed
**Warning signs:** Build output shows "ƒ" (dynamic) instead of "○" (static) for product pages

```typescript
// BAD - makes page dynamic
export default async function ProductPage({ searchParams }: Props) {
  const utm = (await searchParams).utm_source // Entire page now dynamic!

// GOOD - keep page static, handle analytics client-side
export default async function ProductPage({ params }: Props) {
  // No searchParams access = stays static
```

### Pitfall 3: Over-Using Client Components

**What goes wrong:** Larger JavaScript bundles, slower hydration, lost Server Component benefits
**Why it happens:** Marking parent components as `'use client'` when only children need interactivity
**How to avoid:** Push `'use client'` to leaf components; use composition pattern to pass Server Components as children
**Warning signs:** Large client bundle size, slow Time to Interactive

```typescript
// BAD - entire ProductPage is client-side
'use client'
export default function ProductPage({ product }) {
  const [quantity, setQuantity] = useState(1)
  return (
    <div>
      <h1>{product.name}</h1> {/* This could be server-rendered */}
      <QuantitySelector quantity={quantity} onChange={setQuantity} />
    </div>
  )
}

// GOOD - only interactive component is client
// app/products/[slug]/page.tsx (Server Component - default)
export default async function ProductPage({ params }) {
  const product = getProductBySlug(slug)
  return (
    <div>
      <h1>{product.name}</h1> {/* Server-rendered */}
      <QuantitySelector productId={product.id} /> {/* Client component */}
    </div>
  )
}
```

### Pitfall 4: Image Performance Regression from Incorrect `preload` Usage

**What goes wrong:** Multiple images marked `preload={true}` compete for network, delay LCP
**Why it happens:** Setting `preload` on product grid images or multiple hero images
**How to avoid:** Only use `preload={true}` for single LCP element (hero image); use `loading="eager"` sparingly
**Warning signs:** Slow LCP times, multiple preload link tags in `<head>`

```typescript
// BAD - all products preload
{products.map(p => <Image src={p.image} preload={true} />)}

// GOOD - only hero image preloads
<Image src="/hero.jpg" preload={true} /> {/* LCP element */}
{products.map(p => <Image src={p.image} />)} {/* Default lazy loading */}
```

### Pitfall 5: Tailwind v4 Container Query Syntax Confusion

**What goes wrong:** Using old `@container` plugin syntax instead of v4 built-in syntax
**Why it happens:** Following outdated tutorials from Tailwind v3 era
**How to avoid:** Use `@sm:`, `@lg:` prefixes (not `@container`); no plugin installation needed in v4
**Warning signs:** Container queries not working, errors about missing plugin

```css
/* BAD - Tailwind v3 plugin syntax */
@container (min-width: 400px) {
  .card { ... }
}

/* GOOD - Tailwind v4 built-in syntax */
<div className="@container">
  <div className="grid @sm:grid-cols-2 @lg:grid-cols-3">
    {/* Responsive to container, not viewport */}
  </div>
</div>
```

### Pitfall 6: Missing Mobile-First Responsive Strategy

**What goes wrong:** Desktop layout breaks on mobile, poor mobile UX
**Why it happens:** Writing desktop styles first, then trying to override for mobile
**How to avoid:** Tailwind is mobile-first; write unprefixed classes for mobile, add `sm:`, `md:`, `lg:` for larger screens
**Warning signs:** Excessive use of `max-width` breakpoints, mobile layouts looking cramped

```typescript
// BAD - desktop-first (not Tailwind philosophy)
<div className="grid-cols-4 sm:grid-cols-1"> {/* Wrong direction */}

// GOOD - mobile-first (Tailwind default)
<div className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"> {/* Scales up */}
```

## Code Examples

Verified patterns from official sources:

### Static Product Page with Metadata
```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/generate-metadata
import { Metadata } from 'next'
import { getProductBySlug } from '@/data/products'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = getProductBySlug(slug)

  if (!product) return { title: 'Product Not Found' }

  return {
    title: `${product.name} ${product.size}`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [product.image],
      type: 'product',
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = getProductBySlug(slug)

  if (!product) notFound()

  return <ProductDetail product={product} />
}
```

### Responsive Image Grid
```typescript
// Pattern from Tailwind CSS responsive grid best practices
export default function ProductGrid({ products }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

### Product Card with Hover State
```typescript
// Mobile-first approach: no hover on touch devices
export default function ProductCard({ product }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block bg-brand-dark border border-brand-gold/20 rounded-lg overflow-hidden transition-all hover:border-brand-gold/60 hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform group-hover:scale-105"
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-white mb-1">{product.name}</h3>
        <p className="text-brand-gold font-bold">{formatPrice(product.price)}</p>
      </div>
    </Link>
  )
}
```

### Star Rating Display Component
```typescript
// Non-interactive star display (Phase 2 - read-only)
export default function StarRating({ rating, maxStars = 5 }) {
  return (
    <div className="flex items-center" role="img" aria-label={`${rating} out of ${maxStars} stars`}>
      {[...Array(maxStars)].map((_, i) => (
        <svg
          key={i}
          className={`w-5 h-5 ${i < rating ? 'text-brand-gold' : 'text-gray-600'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-2 text-sm text-gray-400">({rating})</span>
    </div>
  )
}
```

### Quantity Selector (Client Component)
```typescript
// Source: React accessibility patterns for number inputs
'use client'
import { useState } from 'react'

export default function QuantitySelector({ min = 1, max = 10, onChange }) {
  const [quantity, setQuantity] = useState(min)

  const handleChange = (newQuantity: number) => {
    const clamped = Math.max(min, Math.min(max, newQuantity))
    setQuantity(clamped)
    onChange?.(clamped)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => handleChange(quantity - 1)}
        disabled={quantity <= min}
        className="w-10 h-10 flex items-center justify-center bg-brand-dark border border-brand-gold/40 text-white rounded hover:bg-brand-gold/10 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Decrease quantity"
      >
        −
      </button>
      <input
        type="number"
        value={quantity}
        onChange={(e) => handleChange(parseInt(e.target.value) || min)}
        min={min}
        max={max}
        className="w-16 h-10 text-center bg-brand-dark border border-brand-gold/40 text-white rounded"
        aria-label="Quantity"
      />
      <button
        type="button"
        onClick={() => handleChange(quantity + 1)}
        disabled={quantity >= max}
        className="w-10 h-10 flex items-center justify-center bg-brand-dark border border-brand-gold/40 text-white rounded hover:bg-brand-gold/10 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  )
}
```

### Simple Image Gallery (Client Component)
```typescript
// Basic image switching for product detail (Phase 2)
'use client'
import { useState } from 'react'
import Image from 'next/image'

export default function ImageGallery({ images, productName }) {
  const [activeIndex, setActiveIndex] = useState(0)

  return (
    <div className="space-y-4">
      {/* Main image */}
      <div className="relative aspect-square bg-brand-dark rounded-lg overflow-hidden">
        <Image
          src={images[activeIndex]}
          alt={`${productName} - Image ${activeIndex + 1}`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority={activeIndex === 0}
        />
      </div>

      {/* Thumbnails */}
      <div className="grid grid-cols-4 gap-2">
        {images.map((image, index) => (
          <button
            key={image}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`relative aspect-square rounded overflow-hidden border-2 transition-colors ${
              index === activeIndex ? 'border-brand-gold' : 'border-transparent'
            }`}
            aria-label={`View image ${index + 1}`}
          >
            <Image
              src={image}
              alt={`${productName} thumbnail ${index + 1}`}
              fill
              sizes="(max-width: 768px) 25vw, 15vw"
              className="object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `priority` prop | `preload` prop | Next.js 16.0.0 | More explicit preloading behavior; `priority` deprecated but still works with warning |
| Pages Router | App Router | Next.js 13+ | Server Components by default, better data fetching, nested layouts, streaming |
| `getStaticProps` | Direct async/await in Server Components | Next.js 13+ | Simpler syntax, better composition, automatic request deduplication |
| `next/legacy/image` | `next/image` | Next.js 13+ | Simplified API, better defaults, no wrapper `<span>` |
| Tailwind v3 + container plugin | Tailwind v4 with built-in container queries | Tailwind v4 (2024) | No plugin needed, `@sm:` syntax for container-based breakpoints |
| `image-set()` with `-webkit` prefix | Native `image-set()` support | 2024-2025 | Broader browser support for responsive background images |
| Manual metadata in `<Head>` | `generateMetadata` function | Next.js 13.2+ | Type-safe, automatic merging, supports dynamic data, Open Graph/Twitter cards |

**Deprecated/outdated:**
- `priority` prop on Image: Use `preload` instead (Next.js 16+)
- `onLoadingComplete` on Image: Use `onLoad` instead (Next.js 14+)
- `domains` config for remote images: Use `remotePatterns` for security (Next.js 14+)
- Tailwind `@container` plugin: Built into v4, use `@sm:` syntax
- `getStaticProps`/`getServerSideProps`: Use Server Components with async/await

## Open Questions

1. **Product image assets**
   - What we know: Project has `/public/images/hummingbird-logo.svg`, product data references placeholder image paths
   - What's unclear: Do actual product images exist? Need 3-4 images per product (front, back, lifestyle) for PROD-01
   - Recommendation: Verify image assets exist before building gallery; use placeholder service (unsplash) if needed for development

2. **Star rating data**
   - What we know: Requirements mention star ratings on product cards (SHOP-02) and product pages (PROD-02)
   - What's unclear: Rating values not in product data structure
   - Recommendation: Add `rating: number` field to Product type; use mock data (4.5 stars) for Phase 2

3. **Product callouts/badges**
   - What we know: PROD-03 requires "Zero Calories, All Natural, 30-Year Recipe" callouts
   - What's unclear: Should these be in product data or component constants?
   - Recommendation: Add `callouts: string[]` to Product type for flexibility per-product

4. **Social media links for footer**
   - What we know: HOME-05 requires social media links, brand context mentions "15K Instagram"
   - What's unclear: Actual URLs for social profiles
   - Recommendation: Use placeholder URLs (`#`) for Phase 2; real URLs can be configured in Phase 3

5. **Testimonial quotes**
   - What we know: HOME-04 requires testimonial quotes and star ratings
   - What's unclear: Actual customer testimonials
   - Recommendation: Create mock testimonials file with 3-5 quotes; replace with real data later

## Sources

### Primary (HIGH confidence)
- [Next.js Image Component Official Docs](https://nextjs.org/docs/app/api-reference/components/image) - Image optimization, props, examples
- [Next.js generateMetadata Official Docs](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) - Metadata API, SEO patterns
- [MDN Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) - Currency formatting
- Project package.json - Next.js 16.1.6, React 19.2.3, Tailwind CSS v4 installed
- Project source code - Existing Navigation component, product data structure, design tokens

### Secondary (MEDIUM confidence)
- [Next.js Image Performance Best Practices](https://pagepro.co/blog/nextjs-image-component-performance-cwv/) - CLS prevention, sizing strategies (2026)
- [Tailwind CSS Grid Patterns for 2026](https://thelinuxcode.com/tailwind-css-grid-template-columns-practical-patterns-for-2026-layouts/) - Responsive grid utilities
- [React Server Components Practical Guide](https://inhaq.com/blog/react-server-components-practical-guide-2026.html) - Server vs Client component patterns (2026)
- [Next.js App Router Pitfalls](https://imidef.com/en/2026-02-11-app-router-pitfalls) - Common mistakes, dynamic rendering gotchas (2026)
- [Next.js Static Generation with generateStaticParams](https://nextjs.org/docs/app/api-reference/functions/generate-static-params) - Product page prerendering

### Tertiary (LOW confidence)
- Various WebSearch results on product card hover states, testimonial components, footer patterns - General design patterns verified against multiple sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed, official docs verify compatibility
- Architecture: HIGH - Official Next.js 16 docs, verified with actual project structure
- Pitfalls: MEDIUM-HIGH - Sourced from 2026 articles and official docs, some based on community patterns
- Code examples: HIGH - Derived from official Next.js/Tailwind docs, adapted to project context

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (30 days - Next.js/React/Tailwind are stable ecosystems)

**Key findings:**
- Next.js 16 changed `priority` to `preload` prop - use `preload={true}` for LCP images only
- Tailwind CSS v4 has built-in container queries - no plugin needed, use `@sm:` syntax
- Server Components are default - only mark interactive components with `'use client'`
- Product data structure already exists - add `rating` and `callouts` fields for Phase 2
- All required dependencies installed - only add `clsx` for conditional class logic
