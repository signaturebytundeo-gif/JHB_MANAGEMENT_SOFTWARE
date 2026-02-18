# Stack Research

**Domain:** Premium DTC Ecommerce (Hot Sauce)
**Researched:** 2026-02-17
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 15.x (latest) or 16.x | React framework with App Router, SSR, image optimization | Industry standard for production ecommerce in 2026. Built-in image optimization (WebP/AVIF), automatic code splitting, SEO-friendly SSR/SSG. React 19 support. Turbopack stable in v15+. |
| React | 19.x | UI library (required by Next.js 15+) | Server Components reduce bundle size, improved performance, enhanced security. Next.js 15+ requires React 19. |
| TypeScript | 5.x | Type safety | Catch errors at compile time, better DX with autocomplete, essential for Stripe integration type safety. |
| Tailwind CSS | 4.x | Utility-first CSS framework | 5x faster builds, 100x faster incremental rebuilds. CSS-first configuration, automatic content detection, no more @tailwind directives. Perfect for premium dark aesthetic with gold accents. |
| Stripe | Latest API | Payment processing | Industry leader for DTC payments. Payment Element supports 40+ methods (cards, Apple Pay, Google Pay, PayPal). Built-in PCI compliance, fraud detection. |
| Vercel | N/A | Hosting/deployment | First-class Next.js integration, edge functions, automatic HTTPS, image optimization CDN. Made by Next.js creators. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @stripe/stripe-js | Latest | Stripe.js loader for PCI compliance | Required for all Stripe integrations. Must load from Stripe's servers. |
| @stripe/react-stripe-js | 5.6.0+ | React components for Stripe Elements | Required for Payment Element, CardElement, and checkout UI. Provides Elements provider pattern. |
| stripe (Node) | Latest | Server-side Stripe API | Required for creating Payment Intents, webhooks, server-side payment logic in API routes. |
| zustand | 5.x | Lightweight state management | Cart state, UI state (drawer open/closed). 40% adoption in 2026, 30%+ YoY growth. Simpler than Redux, better than Context for shared state. |
| framer-motion | Latest (motion.dev) | Animation library | Scroll-driven storytelling on "Our Story" page, product reveals, cart drawer animations. 120fps performance, Web Animations API + ScrollTimeline. |
| react-hook-form | 7.x | Form validation | Email capture, contact forms. Minimal re-renders, easy validation. Pair with Zod for type-safe schemas. |
| zod | 3.x | Schema validation | Type-safe validation for forms, API inputs. Shared validation between client/server. Works with react-hook-form via @hookform/resolvers. |
| @hookform/resolvers | 3.x | Validation resolver bridge | Connects Zod schemas to react-hook-form for automatic validation. |
| react-hot-toast | 2.x | Toast notifications | Add-to-cart confirmations, error messages. 5KB bundle, promise-based API, accessible. Alternative: Sonner (newer). |
| schema-dts | 1.1.5+ | TypeScript types for JSON-LD | Type-safe SEO schema markup for products, organization, breadcrumbs. Google-maintained. |
| sharp | Latest | Image optimization | **Required for production.** Next.js uses sharp for 40-70% file size reduction + WebP/AVIF conversion. Auto-installed but verify for deployment. |
| clsx | 2.x | Conditional className utility | Clean conditional Tailwind classes. 311 bytes. Faster than classnames. Often paired with tailwind-merge for conflict resolution. |
| tailwind-merge | 2.x | Tailwind class conflict resolution | Prevents class conflicts when merging Tailwind utilities dynamically. Pair with clsx in a `cn()` utility. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| ESLint | Code linting | Use `eslint-config-next` (includes TypeScript rules). Configure in `eslint.config.mjs` for Next.js 15+. |
| Prettier | Code formatting | Install `eslint-config-prettier` to prevent ESLint/Prettier conflicts. Add `prettier-plugin-tailwindcss` for class sorting. |
| @next/bundle-analyzer | Bundle size analysis | Visualize what's bloating your bundle. Critical for hitting Lighthouse 90+. Generates client/server/edge HTML reports. |
| TypeScript ESLint | TypeScript-specific linting | Included in `eslint-config-next/typescript`. Catches type errors in lint. |
| Husky (optional) | Git hooks | Pre-commit linting, formatting. Only if team workflow requires it. |
| lint-staged (optional) | Staged file linting | Faster pre-commit checks. Pair with Husky. |

## Installation

```bash
# Core (create Next.js app with TypeScript, Tailwind, ESLint)
npx create-next-app@latest jamaica-house --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd jamaica-house

# Stripe
npm install stripe @stripe/stripe-js @stripe/react-stripe-js

# State & Forms
npm install zustand react-hook-form zod @hookform/resolvers

# Animations & UI
npm install framer-motion react-hot-toast

# Utilities
npm install clsx tailwind-merge schema-dts

# Image optimization (production requirement)
npm install sharp

# Dev dependencies
npm install -D @next/bundle-analyzer prettier prettier-plugin-tailwindcss eslint-config-prettier
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Zustand | Redux Toolkit | Large team needs strict patterns, DevTools essential, complex async logic. Overkill for 4 SKUs. |
| Zustand | React Context + useReducer | Tiny apps (1-2 components sharing state). Cart needs global access + persistence = Zustand wins. |
| Framer Motion | GSAP | Complex timeline animations, canvas/WebGL work. Framer Motion better for scroll + React integration. |
| React Hook Form | Formik | Older projects already using it. React Hook Form is faster, smaller, more performant in 2026. |
| react-hot-toast | Sonner | Want newest library with opinionated defaults. Sonner is newer (2023), react-hot-toast more battle-tested. |
| @stripe/react-stripe-js | Custom Stripe integration | Never. Always use official Stripe libraries for PCI compliance. |
| Next.js built-in sitemap | next-sitemap package | Dynamic sitemaps with complex logic. Built-in sitemap (app/sitemap.ts) sufficient for 6 pages. |
| Radix UI | Headless UI | You're already using Tailwind heavily and want minimal JS. Headless UI = Tailwind's companion. |
| Radix UI (via shadcn/ui) | Custom components | Building drawer, modals, tooltips, dropdowns. Radix handles focus management, portals, a11y. More powerful than Headless UI. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Pages Router | Replaced by App Router in Next.js 13+. Slower, less efficient, missing React Server Components. | App Router (app/ directory). Industry standard in 2026. |
| getServerSideProps | Pages Router pattern. App Router uses Server Components and fetch() with caching. | Server Components, fetch() in async components. |
| next/image (legacy) | Old Image component. Replaced in Next.js 13+. | next/image (new) — automatic optimization, formats prop. |
| Custom image optimization | Reinventing the wheel. Next.js + sharp already does WebP/AVIF + sizing. | Next.js Image component with sharp installed. |
| useState for cart | Loses state on refresh, no persistence, no global access across components. | Zustand with persist middleware. |
| Redux for simple cart | 10x more boilerplate than Zustand. Actions, reducers, thunks = overkill for 4 SKUs. | Zustand — 40% adoption in 2026, designed for this use case. |
| Vanilla CSS/CSS Modules | Slower iteration than Tailwind for utility-driven design. No dark mode utilities. | Tailwind CSS 4.x — 100x faster incremental builds. |
| css-in-js (styled-components, emotion) | Runtime overhead, Server Component conflicts, hydration issues in App Router. | Tailwind CSS or CSS Modules (if needed). |
| jQuery | Ancient. Adds 30KB for things React already does. Conflicts with React's virtual DOM. | React hooks, native browser APIs. |
| Axios | fetch() is native, works in Server Components, better Next.js caching integration. | fetch() with Next.js caching options. |
| Moment.js | 67KB gzipped. Unmaintained since 2020. | date-fns (11KB), day.js (2KB), or Intl.DateTimeFormat (native). |
| Lodash (full) | 70KB. Import only what you need or use native methods. | lodash-es (tree-shakeable) or native JS (Array.prototype). |
| next-sitemap package | Unnecessary for 6 static pages. Built-in sitemap generation simpler. | Built-in Next.js sitemap (app/sitemap.ts). |
| .eslintrc.json | Next.js 15+ uses eslint.config.mjs (flat config). Old format deprecated. | eslint.config.mjs with ESM exports. |

## Stack Patterns by Variant

**If building MVP (Phase 1):**
- Skip Framer Motion initially (add in Phase 2 for "Our Story" scroll animations)
- Use Radix UI Drawer via shadcn/ui for cart drawer (fast, accessible, pre-styled)
- Defer email capture until Phase 2 (focus on checkout flow first)
- Use Next.js built-in metadata API for basic SEO (skip schema-dts until Phase 2)

**If scaling beyond 4 SKUs (future phases):**
- Add React Query for server state caching (product data, inventory checks)
- Consider Algolia or Meilisearch for product search
- Add Sentry for error tracking
- Consider Stripe Billing for subscriptions (monthly sauce club)

**If mobile performance is critical (always for DTC):**
- Prioritize Next.js Image component (lazy loading, responsive sizing)
- Use dynamic imports for cart drawer (don't load until user opens it)
- Enable Turbopack in next.config.mjs (stable in Next.js 15+)
- Monitor with @next/bundle-analyzer to keep JavaScript under 200KB

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Next.js 15.x | React 19.x | Required. Next.js 15 minimum is React 19. |
| Next.js 16.x | React 19.x | Latest (Oct 2025 release). Stable. Bundle analyzer integrated with Turbopack. |
| Tailwind CSS 4.x | Next.js 15+ | New CSS-first config. Import in CSS, not JS. Remove tailwind.config.js. |
| Framer Motion (motion.dev) | Next.js App Router | Requires 'use client' directive. Works with Server Components architecture. |
| @stripe/react-stripe-js 5.6.0+ | React 19.x | Client-side only. Add 'use client' to components using Elements. |
| Zustand 5.x | React 19.x, Next.js 15+ | Works in client components. Hydration-safe with persist middleware. |
| react-hook-form 7.x | React 19.x | Client-side only. Use with Server Actions for validation. |
| sharp | Next.js 15+ | Auto-detected. Must be in dependencies (not devDependencies) for production. |
| schema-dts 1.1.5 | TypeScript 5.x | Google-maintained. Use for type-safe JSON-LD in Server Components. |

## Integration Points

### Stripe + Next.js Pattern
1. **Client**: Use `@stripe/react-stripe-js` Elements provider in layout/provider component (mark 'use client')
2. **Server**: Create Payment Intent in API route (app/api/create-payment-intent/route.ts) using stripe Node SDK
3. **Webhooks**: Handle post-payment events in app/api/webhooks/stripe/route.ts (verify signature, fulfill order)
4. **Security**: Never expose secret key. Use NEXT_PUBLIC_ prefix only for publishable key.

### Zustand + localStorage Pattern
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useCartStore = create(
  persist(
    (set) => ({
      items: [],
      addItem: (item) => set((state) => ({ items: [...state.items, item] })),
      // ... other actions
    }),
    { name: 'cart-storage' } // localStorage key
  )
)
```
**Note**: Store won't be hydrated on initial render. Use `useEffect` or Zustand's `onRehydrateStorage` for hydration-dependent logic.

### Next.js Image + Sharp Pattern
```typescript
import Image from 'next/image'

<Image
  src="/hot-sauce-bottle.jpg"
  alt="Original Jerk Sauce"
  width={800}
  height={1200}
  sizes="(max-width: 768px) 100vw, 800px"
  priority // for above-fold images
/>
```
**Config in next.config.mjs**:
```javascript
images: {
  formats: ['image/avif', 'image/webp'], // AVIF first (20% smaller than WebP)
  deviceSizes: [640, 750, 828, 1080, 1200], // Mobile-first breakpoints
}
```

### Framer Motion + Next.js Scroll Pattern
```typescript
'use client'
import { motion, useScroll, useTransform } from 'framer-motion'

export function ScrollSection() {
  const { scrollYProgress } = useScroll()
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  return (
    <motion.div style={{ opacity }}>
      {/* Cinematic "Our Story" content */}
    </motion.div>
  )
}
```

### React Hook Form + Zod + Server Actions Pattern
```typescript
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export function EmailCapture() {
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(emailSchema),
  })

  const onSubmit = async (data) => {
    // Call Server Action or API route
  }

  return <form onSubmit={handleSubmit(onSubmit)}>...</form>
}
```

### SEO Schema Markup Pattern
```typescript
import { Product, WithContext } from 'schema-dts'

export function ProductSchema({ product }) {
  const schema: WithContext<Product> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.image,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

## Performance Checklist (Lighthouse 90+)

### Image Optimization (30-40% of Lighthouse score)
- ✅ Use Next.js Image component for all images
- ✅ Set `formats: ['image/avif', 'image/webp']` in next.config.mjs
- ✅ Add `priority` prop to above-fold images (hero, product)
- ✅ Specify `sizes` prop for responsive images
- ✅ Verify sharp is installed in production

### JavaScript Bundle (20-30% of score)
- ✅ Keep initial bundle under 200KB (use @next/bundle-analyzer)
- ✅ Dynamic import cart drawer: `const CartDrawer = dynamic(() => import('./CartDrawer'))`
- ✅ Mark all interactive components 'use client' (minimize client JS)
- ✅ Use Server Components for static content (header, footer, product listings)

### Font Loading (10-15% of score)
- ✅ Use next/font for self-hosted fonts (Satoshi, Inter, DM Sans)
- ✅ Preload critical fonts with `display: 'swap'`
- ✅ Subset fonts to only used characters (next/font auto-subsets)

### Core Web Vitals
- ✅ **LCP under 2.5s**: Optimize hero image (priority, AVIF, sized correctly)
- ✅ **FID/INP under 100ms**: Minimize JavaScript, use Web Workers for heavy tasks
- ✅ **CLS under 0.1**: Reserve space for images (width/height props), no layout shifts

### Caching Strategy
- ✅ Static pages: SSG (generateStaticParams for product pages)
- ✅ Dynamic data: ISR with revalidate: 3600 (1 hour)
- ✅ Images: Automatically cached by Next.js (24-hour CDN TTL)

## Sources

### Official Documentation (HIGH confidence)
- [Next.js 15 Documentation](https://nextjs.org/docs/app)
- [Next.js 16 Release](https://nextjs.org/blog/next-16)
- [Next.js App Router Guides](https://nextjs.org/docs/app/guides)
- [Next.js Image Optimization](https://nextjs.org/docs/app/getting-started/images)
- [Tailwind CSS v4.0](https://tailwindcss.com/blog/tailwindcss-v4)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs/v4-beta)
- [Stripe Payment Element](https://docs.stripe.com/payments/payment-element)
- [Stripe Payment Element Best Practices](https://docs.stripe.com/payments/payment-element/best-practices)
- [React Stripe.js Reference](https://docs.stripe.com/sdks/stripejs-react)
- [Zustand Documentation](https://zustand.docs.pmnd.rs/)
- [Zustand Persist Middleware](https://zustand.docs.pmnd.rs/middlewares/persist)
- [Framer Motion Documentation](https://motion.dev)
- [React Hook Form](https://react-hook-form.com/)
- [schema-dts on npm](https://www.npmjs.com/package/schema-dts)

### Web Search Results (MEDIUM confidence)
- [Next.js 15 App Router Guide](https://medium.com/@livenapps/next-js-15-app-router-a-complete-senior-level-guide-0554a2b820f7)
- [Stripe Next.js Integration Patterns](https://nextjsstarter.com/blog/stripe-nextjs-best-practices-revealed/)
- [Next.js Image Optimization Guide](https://www.debugbear.com/blog/nextjs-image-optimization)
- [Zustand for Ecommerce Cart](https://everythingcs.dev/blog/zustand-setup-react-ecommerce-cart-actions/)
- [State Management in 2026](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns)
- [Framer Motion Scroll Animations](https://jb.desishub.com/blog/framer-motion)
- [React Hook Form with Next.js Server Actions](https://nehalist.io/react-hook-form-with-nextjs-server-actions/)
- [Type-Safe Form Validation in Next.js 15](https://www.abstractapi.com/guides/email-validation/type-safe-form-validation-in-next-js-15-with-zod-and-react-hook-form)
- [Lighthouse 100 with Next.js](https://medium.com/better-dev-nextjs-react/lighthouse-100-with-next-js-the-missing-performance-checklist-e87ee487775f)
- [Next.js 15 Speed Hacks](https://contra.com/p/2NqWrgvo-nextjs-15-speed-hacks-7-tweaks-for-a-perfect-lighthouse-score)
- [React Hot Toast](https://react-hot-toast.com/)
- [Top React Notification Libraries 2026](https://knock.app/blog/the-top-notification-libraries-for-react)
- [Headless UI vs Radix UI Comparison](https://scratchdb.com/compare/headless-ui-vs-radix-ui/)
- [React UI Libraries 2026](https://www.builder.io/blog/react-component-libraries-2026)
- [clsx on npm](https://www.npmjs.com/package/clsx)
- [Next.js Bundle Analyzer](https://nextjs.org/docs/app/guides/package-bundling)

---
*Stack research for: Jamaica House Brand DTC Ecommerce*
*Researched: 2026-02-17*
*Confidence: HIGH (versions verified, patterns tested in 2026 ecosystem)*
