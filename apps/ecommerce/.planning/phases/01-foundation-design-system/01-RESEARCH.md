# Phase 1: Foundation & Design System - Research

**Researched:** 2026-02-17
**Domain:** Next.js App Router + Tailwind CSS design system
**Confidence:** HIGH

## Summary

Phase 1 establishes a Next.js 16 production-ready foundation with Tailwind CSS for the Jamaica House Brand e-commerce site. The current Next.js 16.1.6 (released Feb 2026) with App Router is the stable, recommended approach. Tailwind CSS v4 (stable since Jan 2025) introduces CSS-first configuration and dramatic performance improvements. The combination is well-documented and battle-tested for e-commerce applications.

The dark premium aesthetic (#1A1A1A background, #D4A843 gold accents) is straightforward to implement using Tailwind's design token system. Next.js `next/font` provides automatic font optimization for custom fonts (Satoshi/Plus Jakarta Sans/Inter). The mobile-first responsive navigation (70%+ mobile traffic) follows established accessibility patterns with proper ARIA attributes and touch targets.

**Primary recommendation:** Use Next.js 16 App Router with TypeScript, Tailwind CSS v4, and the `src/` directory structure. Load fonts via `next/font/local` or `next/font/google`. Define design tokens in Tailwind's `@theme` directive. Implement navigation as a client component with proper accessibility (aria-expanded, 44px+ touch targets). Store product data as TypeScript const arrays with interfaces for type safety.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6+ | React framework with App Router | Official stable release (Feb 2026), auto-includes TypeScript, ESLint, Turbopack |
| React | 19+ | UI library | Required by Next.js 15+ (min version) |
| Tailwind CSS | 4.x | Utility-first CSS framework | Stable v4 since Jan 2025, 5x faster builds, CSS-first config |
| TypeScript | 5.x+ | Type safety | Default in create-next-app, prevents runtime errors |
| next/font | Built-in | Font optimization | Automatic self-hosting, zero layout shift, no external requests |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tailwindcss/postcss | Latest | PostCSS plugin for Tailwind v4 | Required for Tailwind v4 integration |
| postcss | Latest | CSS transformation | Required by Tailwind |
| eslint | 9.x+ | Code quality | Included by default in create-next-app |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tailwind CSS | CSS Modules / styled-components | More verbose, no utility-first benefits, larger JS bundle |
| next/font | Google Fonts CDN | External requests (privacy/performance), GDPR concerns, layout shift |
| TypeScript const arrays | Database (Postgres/MongoDB) | Over-engineering for 4 SKUs, adds complexity/hosting costs |
| Custom components | Shadcn UI / Radix UI | Good for complex patterns, but overkill for 5 nav items + simple product cards |

**Installation:**
```bash
# Create project with recommended defaults (includes TypeScript, ESLint, Tailwind, App Router, Turbopack)
npx create-next-app@latest jamaica-house-brand --typescript --eslint --app --src-dir

cd jamaica-house-brand

# Tailwind v4 setup
npm install tailwindcss @tailwindcss/postcss postcss
```

## Architecture Patterns

### Recommended Project Structure
```
jamaica-house-brand/
├── src/
│   ├── app/                    # App Router (routing only)
│   │   ├── layout.tsx          # Root layout (fonts, dark theme)
│   │   ├── page.tsx            # Home page
│   │   ├── shop/               # Shop route group
│   │   │   └── page.tsx        # Products listing
│   │   ├── our-story/
│   │   │   └── page.tsx
│   │   ├── recipes/
│   │   │   └── page.tsx
│   │   └── globals.css         # Tailwind imports + design tokens
│   ├── components/             # Shared UI components
│   │   ├── navigation/
│   │   │   ├── Navigation.tsx       # Desktop + mobile nav (client component)
│   │   │   ├── MobileMenu.tsx       # Hamburger menu
│   │   │   └── NavLink.tsx          # Nav item
│   │   ├── products/
│   │   │   ├── ProductCard.tsx      # Product display
│   │   │   └── ProductGrid.tsx      # Products layout
│   │   └── ui/                      # Base components (Button, etc.)
│   ├── data/                   # Static data
│   │   └── products.ts         # Product SKU data (TypeScript const)
│   ├── types/                  # TypeScript definitions
│   │   └── product.ts          # Product interface
│   └── lib/                    # Utilities
│       └── fonts.ts            # Font configuration
├── public/                     # Static assets
│   ├── images/
│   │   ├── hummingbird-logo.svg
│   │   └── products/
│   └── fonts/                  # Local custom fonts (if needed)
├── postcss.config.mjs          # PostCSS configuration
├── tailwind.config.ts          # Tailwind v4 config (minimal, CSS-first)
├── tsconfig.json
└── next.config.js
```

**Why this structure:**
- `src/` separates application code from config files (Next.js official pattern)
- `app/` purely for routing (pages, layouts, route files)
- `components/` organized by feature (navigation, products)
- `data/` for static content (products, until catalog grows)
- Private folders (`_components`, `_lib`) can be used inside `app/` to colocate non-routable files

### Pattern 1: Root Layout with Fonts and Dark Theme
**What:** Load fonts in root layout, apply to `<html>` tag, set dark theme as default
**When to use:** Every Next.js project with custom fonts and theming
**Example:**
```typescript
// src/lib/fonts.ts
import localFont from 'next/font/local'
import { Plus_Jakarta_Sans } from 'next/font/google'

// Option 1: Local custom font (Satoshi)
export const satoshi = localFont({
  src: [
    {
      path: '../public/fonts/Satoshi-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/Satoshi-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-satoshi',
})

// Option 2: Google Font (Plus Jakarta Sans)
export const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
})

// src/app/layout.tsx
import { satoshi, plusJakarta } from '@/lib/fonts'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${satoshi.variable} dark`}>
      <body className="bg-[#1A1A1A] text-white font-sans">
        {children}
      </body>
    </html>
  )
}
```
**Source:** [Next.js Font Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)

### Pattern 2: Design Tokens via Tailwind @theme (v4)
**What:** Define colors, spacing, typography in CSS using `@theme` directive
**When to use:** Tailwind v4 projects requiring brand-specific design system
**Example:**
```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  /* Brand colors */
  --color-brand-dark: #1A1A1A;
  --color-brand-gold: #D4A843;
  --color-brand-gold-light: #E5C26A;
  --color-brand-gold-dark: #B8902F;

  /* Typography */
  --font-family-sans: var(--font-satoshi), system-ui, sans-serif;
  --font-family-display: var(--font-plus-jakarta), system-ui, sans-serif;

  /* Spacing (if custom needed) */
  --spacing-nav-height: 4rem;
}

/* Usage in components: bg-brand-dark text-brand-gold */
```
**Why v4 approach:** CSS-first config eliminates JavaScript config bloat, automatic content detection (no more `content: []` paths), 5x faster builds
**Source:** [Tailwind CSS v4 Complete Guide](https://devtoolbox.dedyn.io/blog/tailwind-css-v4-complete-guide)

### Pattern 3: Accessible Mobile Navigation
**What:** Responsive nav with hamburger menu, proper ARIA, 44px+ touch targets
**When to use:** Every mobile-first site (70%+ mobile traffic)
**Example:**
```typescript
// src/components/navigation/Navigation.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const navItems = [
  { name: 'Shop', href: '/shop' },
  { name: 'Our Story', href: '/our-story' },
  { name: 'Recipes', href: '/recipes' },
  { name: 'Subscribe', href: '/subscribe', comingSoon: true },
  { name: 'Cart', href: '/cart' },
]

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="bg-brand-dark border-b border-brand-gold/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/images/hummingbird-logo.svg"
              alt="Jamaica House Brand"
              width={40}
              height={40}
              priority
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-white hover:text-brand-gold transition-colors"
              >
                {item.name}
                {item.comingSoon && (
                  <span className="ml-1 text-xs text-brand-gold">(Soon)</span>
                )}
              </Link>
            ))}
          </div>

          {/* Mobile menu button - MUST be 44x44px minimum for touch */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
            className="md:hidden w-11 h-11 flex items-center justify-center text-white hover:text-brand-gold"
          >
            <span className="sr-only">
              {mobileMenuOpen ? 'Close menu' : 'Open menu'}
            </span>
            {/* Hamburger icon */}
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block py-3 text-white hover:text-brand-gold transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
                {item.comingSoon && (
                  <span className="ml-1 text-xs text-brand-gold">(Soon)</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
```
**Why client component:** Uses `useState` for menu toggle, requires interactivity
**Sources:**
- [Mobile Navigation Patterns 2026](https://phone-simulator.com/blog/mobile-navigation-patterns-in-2026)
- [Building Accessible Menu Systems](https://www.smashingmagazine.com/2017/11/building-accessible-menu-systems/)

### Pattern 4: TypeScript Product Data Schema
**What:** Define product interface, export const array of products
**When to use:** Small catalogs (< 50 SKUs), no dynamic inventory needed
**Example:**
```typescript
// src/types/product.ts
export interface Product {
  id: string
  name: string
  description: string
  price: number // in cents
  size: string
  image: string
  slug: string
  stripeProductId: string
  stripePriceId: string
  inStock: boolean
}

// src/data/products.ts
import { Product } from '@/types/product'

export const products: Product[] = [
  {
    id: 'jerk-2oz',
    name: 'Jerk Sauce',
    description: 'Authentic Jamaican jerk sauce with scotch bonnet peppers',
    price: 899, // $8.99
    size: '2oz',
    image: '/images/products/jerk-sauce-2oz.jpg',
    slug: 'jerk-sauce-2oz',
    stripeProductId: 'prod_xxx', // Add after Stripe setup
    stripePriceId: 'price_xxx',
    inStock: true,
  },
  {
    id: 'jerk-5oz',
    name: 'Jerk Sauce',
    description: 'Authentic Jamaican jerk sauce with scotch bonnet peppers',
    price: 1499, // $14.99
    size: '5oz',
    image: '/images/products/jerk-sauce-5oz.jpg',
    slug: 'jerk-sauce-5oz',
    stripeProductId: 'prod_yyy',
    stripePriceId: 'price_yyy',
    inStock: true,
  },
  {
    id: 'jerk-10oz',
    name: 'Jerk Sauce',
    description: 'Authentic Jamaican jerk sauce with scotch bonnet peppers',
    price: 2499, // $24.99
    size: '10oz',
    image: '/images/products/jerk-sauce-10oz.jpg',
    slug: 'jerk-sauce-10oz',
    stripeProductId: 'prod_zzz',
    stripePriceId: 'price_zzz',
    inStock: true,
  },
  {
    id: 'pikliz-12oz',
    name: 'Escovitch Pikliz',
    description: 'Spicy Jamaican pickled vegetable relish',
    price: 1299, // $12.99
    size: '12oz',
    image: '/images/products/pikliz-12oz.jpg',
    slug: 'escovitch-pikliz-12oz',
    stripeProductId: 'prod_aaa',
    stripePriceId: 'price_aaa',
    inStock: true,
  },
]

export function getProductBySlug(slug: string): Product | undefined {
  return products.find(p => p.slug === slug)
}
```
**Why this pattern:** Type-safe, no database needed, easy to version control, future migration path to DB if catalog grows
**Sources:**
- [TypeScript Interfaces](https://www.typescriptlang.org/docs/handbook/interfaces.html)
- [E-commerce Schema Patterns](https://koanthic.com/en/e-commerce-schema-markup-complete-guide-examples-2026/)

### Pattern 5: Next.js Image Optimization
**What:** Use `<Image>` component with width/height, priority for above-fold, sizes for responsive
**When to use:** All images (logos, product photos, backgrounds)
**Example:**
```typescript
import Image from 'next/image'

// Logo (above-fold, critical)
<Image
  src="/images/hummingbird-logo.svg"
  alt="Jamaica House Brand"
  width={40}
  height={40}
  priority
/>

// Product image (lazy-loaded, responsive)
<Image
  src={product.image}
  alt={product.name}
  width={400}
  height={400}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
  className="rounded-lg"
/>
```
**Benefits:** Automatic WebP/AVIF conversion, lazy loading, no layout shift, responsive sizing
**Source:** [Next.js Image Optimization 2026](https://webpeak.org/blog/nextjs-image-optimization-techniques/)

### Anti-Patterns to Avoid

- **Don't use Tailwind v3 config patterns in v4:** No `tailwind.config.js` with `content: []` arrays, use CSS `@theme` instead
- **Don't use Pages Router:** App Router is the current standard, Pages Router is legacy
- **Don't load fonts from CDN:** Use `next/font` for privacy, performance, and zero layout shift
- **Don't make hamburger buttons too small:** Minimum 44x44px touch targets (WCAG 2.5.5)
- **Don't change aria-label on menu toggle:** Keep it "Toggle navigation menu", use aria-expanded for state
- **Don't forget to mark nav as 'use client':** Navigation requires useState, must be client component
- **Don't store prices as floats:** Use cents (integers) to avoid floating-point errors

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Font loading optimization | Custom font face declarations, manual preload | `next/font/local` or `next/font/google` | Automatic optimization, self-hosting, zero layout shift, no GDPR issues |
| Image optimization | Manual responsive images, lazy loading scripts | `<Image>` component | Auto WebP/AVIF, lazy load, size optimization, prevents layout shift |
| CSS utilities | Custom utility class system | Tailwind CSS | 10+ years of refinement, tree-shaking, design token system |
| TypeScript config | Manual tsconfig from scratch | `create-next-app` defaults | Pre-configured paths, strict mode, Next.js-specific settings |
| Dark mode toggle | Custom localStorage + CSS classes | Tailwind `dark:` + `class` strategy | Built-in, tested, consistent |
| Responsive breakpoints | Custom media queries | Tailwind breakpoints (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) | Mobile-first, consistent across team |
| Accessibility (ARIA, focus) | Manual ARIA attributes | Follow established patterns (see Pattern 3) | WCAG compliance, screen reader tested |

**Key insight:** Next.js and Tailwind solve complex edge cases (font FOUT/FOIT, image aspect ratios, responsive delivery, accessibility) that seem simple but have years of bug reports and patches. Don't rebuild these.

## Common Pitfalls

### Pitfall 1: Incorrect Tailwind v4 Configuration
**What goes wrong:** Developers use Tailwind v3 config patterns (tailwind.config.js with `content: []`), styles don't apply
**Why it happens:** Tailwind v4 changed to CSS-first config, v3 tutorials are outdated
**How to avoid:**
- Install `@tailwindcss/postcss` not `tailwindcss` plugin
- Use `@import "tailwindcss"` in CSS, not v3 directives
- Define design tokens in `@theme` block, not JavaScript config
- Content detection is automatic in v4 (no `content: []` needed)
**Warning signs:** "My Tailwind classes aren't applying", "purge/content not working"
**Sources:**
- [Tailwind v4 Migration Guide](https://designrevision.com/blog/tailwind-4-migration)
- [Common Tailwind Mistakes](https://heliuswork.com/blogs/tailwind-css-common-mistakes/)

### Pitfall 2: Missing Width/Height on Images
**What goes wrong:** Images load, but layout shifts (CLS score penalty), poor UX
**Why it happens:** Developers forget `width` and `height` props on `<Image>`
**How to avoid:**
- Always specify `width` and `height` (or use `fill` with container)
- Use `priority` for above-fold images (logo, hero)
- Add `sizes` for responsive images
**Warning signs:** Content "jumps" as images load, poor Lighthouse CLS score
**Source:** [Next.js Image Optimization](https://geekyants.com/blog/optimizing-image-performance-in-nextjs-best-practices-for-fast-visual-web-apps)

### Pitfall 3: Client Components Everywhere
**What goes wrong:** JavaScript bundle bloats, slower page loads, poor SEO
**Why it happens:** Adding `'use client'` to every component "just in case"
**How to avoid:**
- Server Components are default (no directive needed)
- Only add `'use client'` when using hooks (useState, useEffect, etc.) or browser APIs
- Push client components to "leaf nodes" (small, specific components)
- Navigation needs `'use client'` (useState), but product cards can be Server Components
**Warning signs:** Large JavaScript bundles, slow Time to Interactive (TTI)
**Source:** [Next.js App Router Best Practices](https://thiraphat-ps-dev.medium.com/mastering-next-js-app-router-best-practices-for-structuring-your-application-3f8cf0c76580)

### Pitfall 4: Forgetting to Set Dark Mode Default
**What goes wrong:** Site loads in light mode briefly, then switches to dark (flash of wrong theme)
**Why it happens:** Not setting `className="dark"` on `<html>` in root layout
**How to avoid:**
- Add `className="dark"` to `<html>` tag in `app/layout.tsx`
- Set default background `bg-[#1A1A1A]` on `<body>`
- Test by disabling JavaScript (should still be dark)
**Warning signs:** White flash on page load, theme flicker
**Source:** [Tailwind Dark Mode](https://tailwindcss.com/docs/dark-mode)

### Pitfall 5: Accessibility Violations in Mobile Nav
**What goes wrong:** Screen readers can't navigate menu, touch targets too small, focus order broken
**Why it happens:** Not following WCAG 2.1 guidelines for mobile navigation
**How to avoid:**
- Use `aria-expanded` on toggle button (not aria-label changes)
- Minimum 44x44px touch targets (use `w-11 h-11` = 44px)
- Add `aria-label="Toggle navigation menu"` to button
- Include `<span className="sr-only">` text for screen readers
- Ensure menu is next in tab order after button
**Warning signs:** Fails accessibility audits, poor screen reader experience
**Source:** [Accessible Menu Systems](https://www.smashingmagazine.com/2017/11/building-accessible-menu-systems/)

### Pitfall 6: Floating-Point Price Errors
**What goes wrong:** `$10.00` becomes `$9.999999999` or rounding errors in calculations
**Why it happens:** JavaScript floating-point arithmetic (`0.1 + 0.2 !== 0.3`)
**How to avoid:**
- Store prices in cents as integers (899 not 8.99)
- Only convert to dollars for display: `(price / 100).toFixed(2)`
- Keep calculations in cents, divide once at end
**Warning signs:** Weird decimals, tax/total calculations off by pennies
**Source:** E-commerce best practices (universal pattern)

### Pitfall 7: Hardcoding Colors Instead of Design Tokens
**What goes wrong:** Inconsistent colors, hard to change theme, maintenance nightmare
**Why it happens:** Using arbitrary values everywhere (`bg-[#D4A843]`) instead of semantic tokens
**How to avoid:**
- Define colors in `@theme` with semantic names (`--color-brand-gold`)
- Use classes (`bg-brand-gold`) not arbitrary values
- Create variants (`brand-gold-light`, `brand-gold-dark`) in theme
- Only use arbitrary values for truly one-off cases
**Warning signs:** Find/replace needed to change brand color, inconsistent shades
**Source:** [Tailwind Best Practices](https://www.frontendtools.tech/blog/tailwind-css-best-practices-design-system-patterns)

## Code Examples

### Complete postcss.config.mjs (Tailwind v4)
```javascript
// postcss.config.mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

### Complete globals.css with Design Tokens
```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  /* Brand Colors */
  --color-brand-dark: #1A1A1A;
  --color-brand-gold: #D4A843;
  --color-brand-gold-light: #E5C26A;
  --color-brand-gold-dark: #B8902F;
  --color-brand-gray: #2A2A2A;
  --color-brand-gray-light: #3A3A3A;

  /* Typography */
  --font-family-sans: var(--font-satoshi), system-ui, -apple-system, sans-serif;
  --font-family-display: var(--font-plus-jakarta), system-ui, sans-serif;

  /* Spacing */
  --spacing-nav-height: 4rem;
}

/* Custom base styles */
body {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### Price Formatting Utility
```typescript
// src/lib/utils.ts
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

// Usage: formatPrice(899) -> "$8.99"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind v3 JS config | Tailwind v4 CSS `@theme` | Jan 2025 | 5x faster builds, auto content detection, cleaner config |
| Pages Router | App Router | Next.js 13 (stable in 14) | Server Components, better data fetching, nested layouts |
| next/font in @next/font | Built-in next/font | Next.js 13 | Simplified imports, better integration |
| Manual font loading | next/font auto-optimization | Next.js 13 | Zero layout shift, automatic self-hosting |
| React 18 | React 19 | Next.js 15+ | Improved Server Components, useActionState |
| WebP images | AVIF + WebP | 2025+ | Better compression, HDR support, Next.js auto-serves best format |
| Turbopack dev only | Turbopack default | Next.js 16 | Faster dev server and builds |

**Deprecated/outdated:**
- **@next/font package:** Removed in Next.js 15, use built-in `next/font`
- **Tailwind JIT mode:** No longer needed, built-in in v3+
- **next/image domains config:** Use `remotePatterns` instead for external images
- **useFormState:** Replaced by `useActionState` in React 19
- **Tailwind v3 safelist:** Not needed in v4, content detection is automatic

## Open Questions

1. **Which custom font should we use: Satoshi, Plus Jakarta Sans, or Inter?**
   - What we know: All three are modern sans-serifs with bold weights, suitable for premium brands
   - What's unclear: User preference, licensing for Satoshi (may be paid), availability of Satoshi font files
   - Recommendation: Plus Jakarta Sans (free, Google Fonts, excellent readability) or Inter (default in many design systems). If Satoshi is already purchased and available, use `next/font/local`. Otherwise, Plus Jakarta Sans via `next/font/google`.

2. **Should we use Tailwind v4 alpha/beta or stick with v3 for now?**
   - What we know: Tailwind v4 is stable production-ready since Jan 2025 (over a year ago)
   - What's unclear: Nothing, v4 is the current stable version
   - Recommendation: Use Tailwind v4. It's battle-tested, faster, and the standard for 2026.

3. **How deep should the mobile menu drawer be (full-screen, slide-in, dropdown)?**
   - What we know: Only 5 nav items, simple hierarchy
   - What's unclear: Brand preference for animation/style
   - Recommendation: Simple dropdown/slide-down below nav bar (see Pattern 3). Full-screen overlay is overkill for 5 items. Keep it lightweight and accessible.

4. **Should we optimize for Progressive Web App (PWA) in this phase?**
   - What we know: Not mentioned in requirements
   - What's unclear: User expectation for offline support, install prompts
   - Recommendation: Defer to Phase 3-4. Focus on core functionality first. PWA can be added later without architectural changes.

## Sources

### Primary (HIGH confidence)
- [Next.js Official Documentation](https://nextjs.org/docs/app) - v16.1.6, last updated Feb 11, 2026
- [Next.js Installation Guide](https://nextjs.org/docs/app/getting-started/installation) - create-next-app defaults
- [Next.js Project Structure](https://nextjs.org/docs/app/getting-started/project-structure) - folder conventions
- [Next.js Font Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) - next/font API
- [Tailwind CSS Official Docs](https://tailwindcss.com/docs/guides/nextjs) - Next.js integration
- [Tailwind CSS v4 Blog Post](https://tailwindcss.com/blog/tailwindcss-v4) - v4 stable release
- [Tailwind CSS Dark Mode Docs](https://tailwindcss.com/docs/dark-mode) - dark mode configuration

### Secondary (MEDIUM confidence)
- [Tailwind CSS v4 Complete Guide](https://devtoolbox.dedyn.io/blog/tailwind-css-v4-complete-guide) - v4 features and migration
- [Tailwind v4 Migration Guide](https://designrevision.com/blog/tailwind-4-migration) - v3 to v4 changes
- [Next.js App Router Best Practices](https://thiraphat-ps-dev.medium.com/mastering-next-js-app-router-best-practices-for-structuring-your-application-3f8cf0c76580) - folder structure
- [Mobile Navigation Patterns 2026](https://phone-simulator.com/blog/mobile-navigation-patterns-in-2026) - mobile UX patterns
- [Building Accessible Menu Systems](https://www.smashingmagazine.com/2017/11/building-accessible-menu-systems/) - ARIA and accessibility
- [Next.js Image Optimization 2026](https://webpeak.org/blog/nextjs-image-optimization-techniques/) - Image component best practices
- [Tailwind Best Practices 2025-2026](https://www.frontendtools.tech/blog/tailwind-css-best-practices-design-system-patterns) - design tokens
- [React Component Libraries 2026](https://www.builder.io/blog/react-component-libraries-2026) - ecosystem overview

### Tertiary (LOW confidence - general knowledge)
- TypeScript Handbook - interfaces and type safety (evergreen content)
- E-commerce schema patterns - product data structures (general patterns)

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - Official Next.js 16 docs, Tailwind v4 stable, documented integration
- Architecture: **HIGH** - Official Next.js folder structure, established patterns in docs
- Design tokens: **HIGH** - Tailwind v4 official approach, multiple verified sources
- Navigation patterns: **MEDIUM** - Accessibility patterns well-documented, but specific implementation varies
- Product data: **MEDIUM** - TypeScript patterns are standard, but ecommerce-specific schema less standardized
- Pitfalls: **HIGH** - Sourced from official migration guides, common GitHub issues, and blog posts

**Research date:** 2026-02-17
**Valid until:** ~March 17, 2026 (30 days) - Next.js and Tailwind are relatively stable, but check for patch releases
**Review if:** Next.js 17 released, Tailwind v5 announced, breaking changes in React 20
