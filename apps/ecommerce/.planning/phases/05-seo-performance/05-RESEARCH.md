# Phase 5: SEO & Performance - Research

**Researched:** 2026-02-17
**Domain:** Next.js SEO, Performance Optimization, Analytics Integration
**Confidence:** HIGH

## Summary

Phase 5 focuses on making the Jamaica House Brand e-commerce site discoverable, fast, and measurable. The phase builds on Next.js 16's built-in SEO capabilities (Metadata API, automatic sitemap/robots.txt generation) and leverages native image optimization to achieve Lighthouse scores of 90+. Analytics integration uses `@next/third-parties` for optimal performance.

Next.js 16 provides zero-configuration solutions for most SEO requirements through the App Router's file-based conventions (`sitemap.ts`, `robots.ts`, `metadata` exports). The Image component automatically optimizes images to WebP/AVIF with lazy loading and responsive srcsets. Performance optimization centers on Core Web Vitals: LCP (Largest Contentful Paint), INP (Interaction to Next Paint), and CLS (Cumulative Layout Shift). Google Analytics 4 and Meta Pixel integration is handled via `@next/third-parties/google` for optimal loading performance.

The project already has solid foundations: Recipe schema utility exists (`src/lib/seo.ts`), `generateMetadata` functions are implemented on product and recipe pages, and `next/image` is used throughout. This phase enhances existing infrastructure rather than building from scratch.

**Primary recommendation:** Use Next.js 16's native file conventions for sitemap/robots, extend existing metadata functions to include all required meta tags, add Product schema utility alongside existing Recipe schema, implement `@next/third-parties` for analytics, and audit existing Image components to ensure optimal configuration (sizes prop, preload for LCP images).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 16 | 16.1.6+ | Built-in SEO APIs (Metadata, sitemap, robots) | Zero-config sitemap.ts and robots.ts, automatic metadata optimization |
| @next/third-parties | latest | Analytics integration (GA4, Meta Pixel) | Official Next.js package, optimized loading (post-hydration), zero layout shift |
| next/image | Built-in | Automatic image optimization | Native WebP/AVIF conversion, lazy loading, responsive srcsets, Sharp-based processing |
| schema-dts | 1.1.2+ | TypeScript types for JSON-LD schema | Type-safe schema.org markup, prevents schema errors |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Sharp | Auto-installed | Image processing engine | Automatically installed by Next.js for production image optimization |
| @next/bundle-analyzer | latest | Bundle size visualization | CI/CD integration to monitor bundle size impact on performance |
| @vercel/analytics | 1.3+ | Real User Monitoring (RUM) | Track actual Core Web Vitals from real users (complements Lighthouse lab data) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @next/third-parties | react-ga4 + react-facebook-pixel | Manual script loading leads to layout shift, blocks hydration, no auto pageview tracking |
| next/image | Manual img tags + CDN | Lose automatic format conversion, lazy loading, responsive srcsets; 40% larger payloads |
| Native sitemap.ts | next-sitemap package | Package adds dependency for feature Next.js provides natively; use only if need advanced features (i18n index sitemaps, custom transformers) |
| MetadataRoute types | Hand-written XML | Type safety prevents sitemap syntax errors, automatic lastModified dates |

**Installation:**
```bash
npm install @next/third-parties@latest schema-dts
npm install --save-dev @next/bundle-analyzer
```

Note: Sharp is auto-installed by Next.js. @vercel/analytics is optional but recommended for ongoing monitoring.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── seo.ts              # Existing Recipe schema + new Product schema utilities
│   └── analytics.ts        # GA4/Meta event helpers (optional wrapper)
├── app/
│   ├── layout.tsx          # Root metadata + Analytics components
│   ├── sitemap.ts          # Dynamic sitemap generation
│   ├── robots.ts           # Robots.txt configuration
│   ├── page.tsx            # Homepage metadata
│   ├── products/[slug]/
│   │   └── page.tsx        # Product metadata + Product schema
│   ├── recipes/[slug]/
│   │   └── page.tsx        # Recipe metadata + Recipe schema (already exists)
│   └── our-story/
│       └── page.tsx        # Story page metadata
└── public/
    └── (no sitemap.xml or robots.txt - handled by app/ files)
```

### Pattern 1: Dynamic Sitemap Generation

**What:** Use `app/sitemap.ts` to generate sitemap from data sources (products, recipes)

**When to use:** Always for dynamic content; statically-imported data counts as dynamic in this context

**Example:**
```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
import type { MetadataRoute } from 'next'
import { products } from '@/data/products'
import { recipes } from '@/data/recipes'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://jamaicahousebrand.com'

  // Static pages
  const routes = ['', '/shop', '/our-story', '/recipes'].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  // Product pages
  const productPages = products.map((product) => ({
    url: `${baseUrl}/products/${product.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  // Recipe pages
  const recipePages = recipes.map((recipe) => ({
    url: `${baseUrl}/recipes/${recipe.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...routes, ...productPages, ...recipePages]
}
```

### Pattern 2: Robots.txt Configuration

**What:** Use `app/robots.ts` to generate robots.txt with sitemap reference

**When to use:** Always; ensures crawlers can find sitemap and respects any private routes

**Example:**
```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/', // Block API routes from indexing
    },
    sitemap: 'https://jamaicahousebrand.com/sitemap.xml',
  }
}
```

### Pattern 3: Product Schema Markup

**What:** JSON-LD Product schema with Offer for price/availability

**When to use:** All product detail pages

**Example:**
```typescript
// Add to src/lib/seo.ts alongside existing Recipe schema
import type { Product, WithContext } from 'schema-dts'

export function generateProductJsonLd(product: {
  name: string
  description: string
  image: string
  price: number // in cents
  sku: string
  availability: 'InStock' | 'OutOfStock'
}): WithContext<Product> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    sku: product.sku,
    offers: {
      '@type': 'Offer',
      price: (product.price / 100).toFixed(2),
      priceCurrency: 'USD',
      availability: `https://schema.org/${product.availability}`,
    },
  }
}
```

**Usage in product page:**
```tsx
// In app/products/[slug]/page.tsx
const productJsonLd = generateProductJsonLd({
  name: product.name,
  description: product.description,
  image: product.image,
  price: product.price,
  sku: product.sku,
  availability: 'InStock',
})

return (
  <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
    />
    {/* Product UI */}
  </>
)
```

### Pattern 4: Comprehensive Page Metadata

**What:** Use `generateMetadata` to set title, description, and OpenGraph tags

**When to use:** Every page (already partially implemented, needs enhancement)

**Example:**
```typescript
// Enhanced version for product pages
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = getProductBySlug(slug)

  if (!product) {
    return { title: 'Product Not Found | Jamaica House Brand' }
  }

  return {
    title: `${product.name} ${product.size} | Jamaica House Brand`,
    description: product.description,
    openGraph: {
      title: `${product.name} ${product.size}`,
      description: product.description,
      images: [{ url: product.image, width: 1200, height: 630, alt: product.name }],
      type: 'website',
      siteName: 'Jamaica House Brand',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} ${product.size}`,
      description: product.description,
      images: [product.image],
    },
  }
}
```

### Pattern 5: Analytics Integration with @next/third-parties

**What:** Load GA4 via optimized components

**When to use:** Root layout for site-wide tracking

**Example:**
```tsx
// Source: https://nextjs.org/docs/app/guides/third-party-libraries
import { GoogleAnalytics } from '@next/third-parties/google'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navigation />
        <main>{children}</main>
        <Footer />
      </body>
      {/* Analytics AFTER body for optimal performance */}
      <GoogleAnalytics gaId="G-XXXXXXXXXX" />
    </html>
  )
}
```

**Custom event tracking:**
```tsx
// Client Component for tracking add-to-cart
'use client'
import { sendGAEvent } from '@next/third-parties/google'

export function AddToCartButton({ product }) {
  const handleAddToCart = () => {
    // Track event
    sendGAEvent('event', 'add_to_cart', {
      currency: 'USD',
      value: product.price / 100,
      items: [{
        item_id: product.sku,
        item_name: product.name,
        price: product.price / 100,
      }],
    })
    // ... add to cart logic
  }

  return <button onClick={handleAddToCart}>Add to Cart</button>
}
```

### Pattern 6: Image Optimization Best Practices

**What:** Configure next/image for optimal Core Web Vitals

**When to use:** Every image, especially LCP candidates (hero images)

**Example:**
```tsx
// Hero image (above fold, LCP candidate)
<Image
  src="/hero.jpg"
  alt="Jamaica House Brand Jerk Sauce"
  width={1920}
  height={1080}
  preload // Disables lazy loading, preloads image (new in Next.js 16)
  sizes="100vw" // Full viewport width
  style={{ width: '100%', height: 'auto' }}
/>

// Product grid images (below fold)
<Image
  src={product.image}
  alt={product.name}
  width={600}
  height={600}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  // No preload = lazy loaded by default
/>
```

**Configuration in next.config.ts:**
```typescript
// Source: https://nextjs.org/docs/app/api-reference/components/image
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'], // AVIF first, WebP fallback
    qualities: [75, 90], // Required in Next.js 16+
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 2678400, // 31 days
  },
}
```

### Pattern 7: Meta Pixel Integration (Manual Implementation)

**What:** Track page views and purchase events for Facebook Ads

**When to use:** Root layout for pageviews, checkout success for purchases

**Note:** @next/third-parties doesn't include Meta Pixel yet, manual implementation required

**Example:**
```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', 'YOUR_PIXEL_ID');
              fbq('track', 'PageView');
            `,
          }}
        />
      </head>
      <body>{children}</body>
      <GoogleAnalytics gaId="G-XXXXXXXXXX" />
    </html>
  )
}
```

**Purchase tracking:**
```tsx
// app/success/page.tsx (after Stripe checkout)
'use client'
import { useEffect } from 'react'

export default function SuccessPage() {
  useEffect(() => {
    // Track purchase event
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'Purchase', {
        value: totalAmount,
        currency: 'USD',
      })
    }
  }, [])

  return <div>Thank you for your order!</div>
}
```

### Anti-Patterns to Avoid

- **Loading analytics in `<head>` instead of after `<body>`:** Blocks page rendering, degrades LCP. @next/third-parties loads scripts post-hydration for zero impact.
- **Using `unoptimized` prop on next/image:** Disables WebP/AVIF conversion, lazy loading, responsive srcsets. Only use for SVGs or animated images.
- **Missing `sizes` prop on responsive images:** Browser assumes image is 100vw, downloads unnecessarily large files. Always provide sizes for fill or responsive images.
- **Using `preload` on all images:** Disables lazy loading everywhere, loads all images immediately. Only use for above-fold LCP images (typically 1-2 per page).
- **Hand-writing sitemap.xml in public/ folder:** Gets overridden by app/sitemap.ts; Next.js ignores static sitemaps when dynamic version exists.
- **Setting `loading="eager"` on below-fold images:** Defeats lazy loading optimization. Use `preload` prop for above-fold images instead.
- **Missing width/height on images:** Causes CLS (Cumulative Layout Shift) as browser can't reserve space before image loads. Always set dimensions.
- **Multiple H1 tags per page:** SEO penalty; use one H1, then H2-H6 in hierarchy
- **Skipping heading levels:** Don't go H1 → H3; breaks accessibility and SEO

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sitemap generation | Custom XML builder with file writes | Next.js `app/sitemap.ts` | MetadataRoute types prevent syntax errors, automatic caching, handles 50K+ URLs with generateSitemaps |
| Image optimization | Manual resize/format scripts | next/image component | 40% payload reduction via WebP/AVIF, automatic srcset generation, lazy loading, Sharp processing |
| Schema.org markup | String templates for JSON-LD | schema-dts TypeScript types | Type safety catches schema errors at build time, autocomplete for properties |
| Analytics loading | Custom script injection | @next/third-parties components | Post-hydration loading prevents render blocking, automatic pageview tracking, zero CLS |
| Robots.txt generation | Static file | app/robots.ts | Dynamic environment-based rules (staging vs production), type-safe API |
| Meta tags | Manual HTML meta tags | Next.js Metadata API | Automatic OpenGraph/Twitter card generation, prevents duplicates, type-safe |

**Key insight:** Next.js 16's App Router provides production-ready SEO primitives that handle edge cases (caching, revalidation, type safety) that custom implementations miss. Rolling custom solutions creates maintenance burden and often performs worse.

## Common Pitfalls

### Pitfall 1: Layout Shift from Missing Image Dimensions

**What goes wrong:** Images without width/height cause CLS as page reflows when images load. Scores below 0.1 CLS threshold.

**Why it happens:** Developer uses `fill` prop without parent container dimensions, or forgets width/height on static images.

**How to avoid:**
- Always set `width` and `height` on Image components (inferred from static imports)
- When using `fill`, parent container must have explicit dimensions or aspect-ratio
- Test with throttled network (Fast 3G) to see layout shift

**Warning signs:**
- CLS score > 0.1 in Lighthouse
- Page "jumps" as images load
- Parent container height is 0px in DevTools

### Pitfall 2: Blocking Scripts Degrade LCP

**What goes wrong:** Analytics scripts in `<head>` block page rendering, LCP score > 2.5s.

**Why it happens:** Traditional analytics implementations load synchronously in head, blocking HTML parsing.

**How to avoid:**
- Use @next/third-parties components (load post-hydration)
- Place analytics components AFTER `{children}` in layout
- Never use synchronous scripts in head

**Warning signs:**
- LCP score > 2.5s in Lighthouse
- "Reduce unused JavaScript" opportunity in Lighthouse
- Waterfall shows analytics blocking main thread

### Pitfall 3: Missing `sizes` Prop Downloads Oversized Images

**What goes wrong:** Browser downloads full-width image even when displayed at 33vw, wasting bandwidth.

**Why it happens:** Without `sizes`, browser assumes image is 100vw and selects largest srcset variant.

**How to avoid:**
- Always provide `sizes` prop matching CSS layout
- Use responsive breakpoints: `(max-width: 768px) 100vw, 50vw`
- Audit Network tab to verify correct image size is downloaded

**Warning signs:**
- Network tab shows 2000px image downloaded for 400px display
- Lighthouse "Properly size images" opportunity
- Mobile data usage higher than expected

### Pitfall 4: Lazy Loading Above-Fold Images

**What goes wrong:** Hero image loads late, degrades LCP score.

**Why it happens:** Default `loading="lazy"` defers loading until image enters viewport.

**How to avoid:**
- Use `preload` prop on above-fold images (typically hero, first product grid item)
- Only 1-2 images per page should have `preload`
- Below-fold images should remain lazy

**Warning signs:**
- LCP element loads after 2s
- Lighthouse identifies image as LCP but it's lazy loaded
- Hero image "pops in" late

### Pitfall 5: Duplicate Schema Markup

**What goes wrong:** Multiple Product schemas on same page, confuses search engines.

**Why it happens:** Component renders schema + page also renders schema.

**How to avoid:**
- Single source of truth: page component owns schema markup
- Components should not emit JSON-LD
- Validate with Google Rich Results Test

**Warning signs:**
- Rich Results Test shows duplicate items
- Search Console warnings about multiple schemas
- Two `<script type="application/ld+json">` tags on same page

### Pitfall 6: Not Setting qualities in next.config.js (Next.js 16 Requirement)

**What goes wrong:** Build fails or image optimization returns 400 errors

**Why it happens:** Next.js 16 requires explicit quality whitelist to prevent malicious optimization

**How to avoid:** Add `images: { qualities: [75, 90, 100] }` to next.config.js

**Warning signs:**
- Image optimization 400 errors in production
- Build warnings about missing qualities config

### Pitfall 7: Breaking Heading Hierarchy

**What goes wrong:** Accessibility issues, SEO penalty, AI snippet extraction fails

**Why it happens:** Styling headings visually without semantic structure (H1 → H3)

**How to avoid:** Use one H1, maintain sequential hierarchy (H1 → H2 → H3), style with CSS

**Warning signs:**
- Screen reader users report confusion
- Google doesn't extract featured snippets
- Lighthouse accessibility score < 100

## Code Examples

Verified patterns from official sources:

### Complete Metadata Implementation

```typescript
// app/layout.tsx - Root metadata
import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://jamaicahousebrand.com'),
  title: {
    template: '%s | Jamaica House Brand',
    default: 'Jamaica House Brand - Authentic Jamaican Jerk Sauce',
  },
  description: 'Authentic Jamaican jerk sauce with 30+ years of restaurant heritage',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Jamaica House Brand',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

// app/products/[slug]/page.tsx - Product metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = getProductBySlug(slug)

  return {
    title: `${product.name} ${product.size}`,
    description: product.description,
    openGraph: {
      title: `${product.name} ${product.size}`,
      description: product.description,
      images: [{ url: product.image, width: 1200, height: 630 }],
    },
  }
}
```

### Responsive Image with Correct Sizes

```tsx
// Product grid - 1 column mobile, 2 tablet, 3 desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {products.map((product) => (
    <Image
      key={product.id}
      src={product.image}
      alt={product.name}
      width={600}
      height={600}
      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
      className="w-full h-auto"
    />
  ))}
</div>
```

### Semantic HTML Structure

```tsx
// app/products/[slug]/page.tsx
export default function ProductPage({ product }) {
  return (
    <article>
      <h1>{product.name}</h1> {/* One H1 per page */}

      <section>
        <h2>Description</h2>
        <p>{product.description}</p>
      </section>

      <section>
        <h2>How to Use</h2>
        <h3>Marinade</h3>
        <p>...</p>
        <h3>Dipping Sauce</h3>
        <p>...</p>
      </section>
    </article>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FID (First Input Delay) | INP (Interaction to Next Paint) | March 2024 | More accurate responsiveness measurement; captures full interaction latency, not just input delay |
| Static sitemap.xml in public/ | Dynamic app/sitemap.ts | Next.js 13.3 (May 2023) | Type-safe API, automatic generation, supports 50K+ URLs with generateSitemaps |
| Manual meta tags in Head | Metadata API with generateMetadata | Next.js 13.2 (Feb 2023) | Prevents duplicate tags, type-safe, automatic OG/Twitter cards |
| react-ga4 library | @next/third-parties/google | Next.js 14.0 (Oct 2023) | Post-hydration loading, zero CLS, automatic pageview tracking |
| WebP only | AVIF + WebP fallback | Next.js 12.0 (Oct 2021) | 20% smaller files with AVIF, maintains browser compatibility |
| priority prop | preload prop | Next.js 16.0 (Jan 2025) | Clearer semantics; preload inserts `<link rel="preload">` in head |

**Deprecated/outdated:**
- **priority prop:** Deprecated in Next.js 16, use `preload` instead
- **onLoadingComplete prop:** Deprecated in Next.js 14, use `onLoad` instead
- **domains config:** Deprecated in Next.js 14, use `remotePatterns` instead (more secure)
- **next-sitemap package:** Next.js now provides native sitemap generation; package only needed for advanced features

## Open Questions

1. **Meta Pixel Integration Package**
   - What we know: @next/third-parties only includes Google products (Analytics, Tag Manager, Maps, YouTube)
   - What's unclear: Whether Vercel plans to add Meta Pixel support to @next/third-parties
   - Recommendation: Implement manually via script injection (Pattern 7), monitor @next/third-parties releases for native support

2. **Conversion API vs Browser Pixel**
   - What we know: Meta recommends dual tracking (Pixel + Conversion API) for best accuracy due to ad blockers (31.5% of users)
   - What's unclear: Whether to implement Conversion API in Phase 5 or defer to v2
   - Recommendation: Start with browser Pixel only (simpler, meets requirements), add Conversion API in v2 when backend infrastructure is more robust

3. **AVIF vs WebP Performance Trade-off**
   - What we know: AVIF is 20% smaller but 50% slower to encode on first request
   - What's unclear: Whether cold-start encoding delay impacts UX for low-traffic product pages
   - Recommendation: Enable both formats (AVIF primary, WebP fallback), monitor Core Web Vitals in production; disable AVIF if encoding causes LCP issues

4. **Lighthouse Score Variability**
   - What we know: Lighthouse scores vary based on network conditions, CPU throttling, and caching
   - What's unclear: What "90+ score" means (single run, median of 5, CI environment)
   - Recommendation: Define success criteria as "median of 5 runs >= 90" in CI environment with 4x CPU slowdown and Fast 3G network

## Sources

### Primary (HIGH confidence)
- [Next.js Metadata Files: sitemap.xml](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap) - Sitemap generation API
- [Next.js Metadata Files: robots.txt](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots) - Robots.txt API
- [Next.js Image Component](https://nextjs.org/docs/app/api-reference/components/image) - Image optimization, formats, lazy loading
- [Next.js Third Party Libraries](https://nextjs.org/docs/app/guides/third-party-libraries) - @next/third-parties documentation
- [Next.js Functions: generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) - Metadata API
- [schema.org Product](https://schema.org/Product) - Product schema specification
- [schema.org Offer](https://schema.org/Offer) - Offer schema for price/availability

### Secondary (MEDIUM confidence)
- [JSDevSpace: How to Configure SEO in Next.js 16](https://jsdevspace.substack.com/p/how-to-configure-seo-in-nextjs-16) - Next.js 16 SEO guide
- [Google Analytics GA4 Implementation Guide for Next.js 16](https://medium.com/@aashari/google-analytics-ga4-implementation-guide-for-next-js-16-a7bbf267dbaa) - GA4 integration
- [Core Web Vitals 2026: INP, LCP, CLS Complete Guide](https://senorit.de/en/blog/core-web-vitals-2026) - Current Web Vitals thresholds
- [Meta Pixel Browser Events Vs Server Events: Guide 2026](https://www.cometly.com/post/meta-pixel-browser-events-vs-server-events) - Meta Pixel tracking strategies
- [Lighthouse 100 with Next.js: The Missing Performance Checklist](https://medium.com/better-dev-nextjs-react/lighthouse-100-with-next-js-the-missing-performance-checklist-e87ee487775f) - Performance optimization strategies
- [Achieving 95+ Lighthouse Scores in Next.js 15](https://medium.com/@sureshdotariya/achieving-95-lighthouse-scores-in-next-js-15-modern-web-application-part1-e2183ba25fc1) - Performance tuning guide
- [Next.js Image Optimization Guide](https://strapi.io/blog/nextjs-image-optimization-developers-guide) - Image optimization patterns
- [Optimizing HTML Structure for Search Engines](https://www.javascriptdoctor.blog/2026/02/optimizing-html-structure-for-modern.html) - Semantic HTML best practices

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Next.js documentation, verified API patterns
- Architecture: HIGH - Patterns from Next.js docs and official examples
- Pitfalls: MEDIUM-HIGH - Mix of official warnings and community-verified issues

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (30 days - Next.js stable, SEO standards slow-moving)

**Next.js Version:** 16.1.6 (current as of research date)
**Core Web Vitals Standard:** 2026 (INP replaced FID in March 2024)
