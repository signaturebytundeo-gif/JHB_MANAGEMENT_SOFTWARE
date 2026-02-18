# Architecture Research: Next.js 14+ DTC Ecommerce

**Domain:** DTC Ecommerce (Small Catalog, Stripe Payments)
**Researched:** 2026-02-17
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER (App Router)               │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Pages   │  │  Layouts │  │ Loading  │  │  Error   │        │
│  │ (RSC)    │  │  (RSC)   │  │  (RSC)   │  │  (RSC)   │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │             │             │               │
├───────┴─────────────┴─────────────┴─────────────┴───────────────┤
│                    COMPONENT LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Server          │  │ Client          │  │ Server Actions  │ │
│  │ Components      │  │ Components      │  │ (Mutations)     │ │
│  │ (data fetch,    │  │ (interactivity, │  │ ("use server")  │ │
│  │  no hydration)  │  │  state, events) │  │                 │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                     │          │
├───────────┴────────────────────┴─────────────────────┴──────────┤
│                    STATE MANAGEMENT                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Cart State   │  │  UI State    │  │ Product Data │          │
│  │ (Zustand +   │  │ (useState,   │  │ (Static JSON │          │
│  │  localStorage│  │  drawer open)│  │  or API)     │          │
│  │  persist)    │  │              │  │              │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                  │
├─────────┴─────────────────┴─────────────────┴──────────────────┤
│                    INTEGRATION LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────┐  ┌──────────────────────────┐    │
│  │ Route Handlers           │  │ External Services        │    │
│  │ /api/checkout/route.ts   │  │ - Stripe Checkout API    │    │
│  │ /api/webhooks/route.ts   │  │ - Stripe Webhooks        │    │
│  └──────────────────────────┘  └──────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Pages (RSC)** | Route-specific UI, data fetching, SEO metadata | `app/*/page.tsx` with async data loading, `generateMetadata()` |
| **Layouts (RSC)** | Shared UI (header, footer, nav), nested wrapping | `app/layout.tsx`, `app/(shop)/layout.tsx` |
| **Server Components** | Data-heavy, SEO-critical, static/cacheable content | Product cards, hero sections, recipe lists |
| **Client Components** | Interactivity (cart drawer, forms, animations) | `"use client"` at top, uses hooks, handles events |
| **Server Actions** | Form submissions, mutations, Stripe API calls | `"use server"` functions, called from Client Components |
| **Route Handlers** | Public APIs, webhooks, external integrations | `route.ts` with GET/POST/etc exports, Web APIs |
| **State Management** | Cart state, UI state (drawer open/closed) | Zustand store with localStorage persistence |
| **Static Data** | Product catalog (4 SKUs), recipe content | JSON files in `data/` or exported constants |

## Recommended Project Structure

```
jamaica-house-brand/
├── app/                        # App Router directory (routing + pages)
│   ├── (marketing)/            # Route group: marketing pages (no URL segment)
│   │   ├── layout.tsx          # Marketing-specific layout
│   │   ├── page.tsx            # Homepage (hero, products, social proof)
│   │   ├── our-story/
│   │   │   └── page.tsx        # Cinematic scroll story page
│   │   └── recipes/
│   │       ├── page.tsx        # Recipe grid
│   │       └── [slug]/
│   │           └── page.tsx    # Individual recipe detail
│   │
│   ├── (shop)/                 # Route group: shop pages (no URL segment)
│   │   ├── layout.tsx          # Shop-specific layout (cart context)
│   │   ├── shop/
│   │   │   └── page.tsx        # Product grid page
│   │   └── products/
│   │       └── [slug]/
│   │           └── page.tsx    # Product detail (gallery, add to cart)
│   │
│   ├── api/                    # API Route Handlers
│   │   ├── checkout/
│   │   │   └── route.ts        # POST: Create Stripe Checkout Session
│   │   └── webhooks/
│   │       └── stripe/
│   │           └── route.ts    # POST: Stripe webhook handler
│   │
│   ├── layout.tsx              # Root layout (html, body, providers)
│   ├── globals.css             # Global Tailwind styles
│   ├── not-found.tsx           # 404 page
│   └── error.tsx               # Global error boundary
│
├── components/                 # Shared UI components
│   ├── cart/                   # Cart-related components
│   │   ├── cart-drawer.tsx     # Slide-out cart (Client Component)
│   │   ├── cart-item.tsx       # Individual cart item
│   │   ├── cart-button.tsx     # Header cart icon with item count
│   │   └── checkout-button.tsx # Trigger Stripe Checkout
│   │
│   ├── product/                # Product-related components
│   │   ├── product-card.tsx    # Grid item (Server Component)
│   │   ├── product-gallery.tsx # Image gallery (Client Component)
│   │   ├── add-to-cart.tsx     # Sticky add-to-cart button (Client)
│   │   └── heat-indicator.tsx  # Spice heat level display
│   │
│   ├── layout/                 # Layout components
│   │   ├── header.tsx          # Site header with nav
│   │   ├── footer.tsx          # Site footer with email capture
│   │   └── navigation.tsx      # Main navigation
│   │
│   └── ui/                     # Generic UI components
│       ├── button.tsx          # Reusable button
│       ├── modal.tsx           # Modal wrapper
│       └── exit-intent.tsx     # Exit-intent popup (Client)
│
├── lib/                        # Utilities and helpers
│   ├── stripe.ts               # Stripe SDK initialization
│   ├── utils.ts                # General utilities (classnames, formatters)
│   └── constants.ts            # App-wide constants
│
├── store/                      # State management
│   └── cart-store.ts           # Zustand cart store with persistence
│
├── data/                       # Static data
│   ├── products.ts             # Product catalog (4 SKUs)
│   └── recipes.ts              # Recipe content
│
├── actions/                    # Server Actions
│   └── checkout.ts             # Server action for Stripe checkout
│
├── types/                      # TypeScript types
│   ├── product.ts              # Product type definitions
│   ├── cart.ts                 # Cart type definitions
│   └── recipe.ts               # Recipe type definitions
│
├── public/                     # Static assets
│   ├── images/                 # Product images, hero images
│   ├── favicon.ico             # Favicon
│   └── robots.txt              # SEO robots file
│
├── .env.local                  # Environment variables (not committed)
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies and scripts
```

### Structure Rationale

- **Route Groups `(marketing)` and `(shop)`**: Organize routes by purpose without affecting URLs. Allows different layouts (marketing vs shop with cart context) while keeping URLs clean (`/our-story` not `/marketing/our-story`).

- **Colocated API Routes**: `app/api/` contains Route Handlers for external integrations (Stripe). Keeps API logic separate from UI but within the App Router structure.

- **Component Organization by Feature**: Components grouped by domain (`cart/`, `product/`, `layout/`) not by technical role. Makes related code easier to find and modify.

- **Separate `store/` Directory**: State management isolated from components. For 4 SKUs, Zustand + localStorage is simpler than Context API boilerplate or Redux complexity.

- **Static Data in `data/`**: For small catalogs (4 SKUs), static TypeScript/JSON files are simpler than a CMS. No build pipeline complexity, type-safe, version-controlled. CMS overhead not justified for 4 products.

- **Server Actions in `actions/`**: Mutation logic separated from components. Server Actions simplify Stripe API calls without building custom REST endpoints.

- **Private Folders Avoided**: For a small project, route groups provide enough organization. Private folders (`_folder`) add complexity without clear benefit at this scale.

## Architectural Patterns

### Pattern 1: Server-First Component Composition

**What:** Default to Server Components. Only add `"use client"` at the component boundary where interactivity is needed. Pass Server Components as children to Client Components to avoid unnecessary hydration.

**When to use:** All pages, layouts, and static content. Client Components only for cart drawer, add-to-cart buttons, forms, animations.

**Trade-offs:**
- **Pros:** Smaller JavaScript bundles (60-80% reduction), faster FCP/LCP, better SEO, direct database/API access in Server Components.
- **Cons:** Cannot use hooks or browser APIs in Server Components. Requires understanding RSC/Client boundary.

**Example:**
```typescript
// app/shop/page.tsx (Server Component - default)
import { ProductCard } from '@/components/product/product-card'
import { products } from '@/data/products'

export default async function ShopPage() {
  // Can fetch data directly, no API route needed
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

// components/product/product-card.tsx (Server Component - default)
import { AddToCartButton } from './add-to-cart-button'

export function ProductCard({ product }) {
  // Heavy rendering logic, no JS sent to client
  return (
    <div className="border rounded-lg">
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>{product.price}</p>
      {/* Client Component injected at interaction boundary */}
      <AddToCartButton product={product} />
    </div>
  )
}

// components/product/add-to-cart-button.tsx (Client Component)
'use client'

import { useCartStore } from '@/store/cart-store'

export function AddToCartButton({ product }) {
  const addItem = useCartStore((state) => state.addItem)

  return (
    <button onClick={() => addItem(product)}>
      Add to Cart
    </button>
  )
}
```

### Pattern 2: Server Actions for Mutations

**What:** Use Server Actions (`"use server"`) for form submissions and mutations instead of creating API routes. Call directly from Client Components with automatic serialization.

**When to use:** Stripe Checkout Session creation, email capture, order processing. Internal mutations that don't need public API exposure.

**Trade-offs:**
- **Pros:** No API route boilerplate, automatic type safety, simpler than REST endpoints, progressive enhancement support.
- **Cons:** Less control over HTTP method/headers than Route Handlers. Not suitable for public APIs or webhooks.

**Example:**
```typescript
// actions/checkout.ts
'use server'

import Stripe from 'stripe'
import { CartItem } from '@/types/cart'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function createCheckoutSession(items: CartItem[]) {
  const line_items = items.map((item) => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: item.name,
        images: [item.image],
      },
      unit_amount: item.price * 100,
    },
    quantity: item.quantity,
  }))

  const session = await stripe.checkout.sessions.create({
    line_items,
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/cart`,
  })

  return { sessionId: session.id, url: session.url }
}

// components/cart/checkout-button.tsx (Client Component)
'use client'

import { createCheckoutSession } from '@/actions/checkout'
import { useCartStore } from '@/store/cart-store'

export function CheckoutButton() {
  const items = useCartStore((state) => state.items)
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    setLoading(true)
    const { url } = await createCheckoutSession(items)
    if (url) window.location.href = url
  }

  return (
    <button onClick={handleCheckout} disabled={loading}>
      {loading ? 'Processing...' : 'Checkout'}
    </button>
  )
}
```

### Pattern 3: Zustand + localStorage for Cart State

**What:** Use Zustand for client-side cart state with localStorage persistence. Wrap in Context Provider at root layout to initialize per-request store correctly.

**When to use:** Small catalogs where cart state doesn't need server sync. Simpler than Redux, more flexible than Context API.

**Trade-offs:**
- **Pros:** Simple API, built-in persistence, no boilerplate, works with RSC when wrapped in context.
- **Cons:** Client-only (can't read cart in Server Components). Hydration mismatch if not careful with SSR.

**Example:**
```typescript
// store/cart-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image: string
}

interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  total: number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const items = get().items
        const existing = items.find((i) => i.id === item.id)

        if (existing) {
          set({
            items: items.map((i) =>
              i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
            ),
          })
        } else {
          set({ items: [...items, { ...item, quantity: 1 }] })
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) })
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id)
        } else {
          set({
            items: get().items.map((i) =>
              i.id === id ? { ...i, quantity } : i
            ),
          })
        }
      },

      clearCart: () => set({ items: [] }),

      get total() {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      },
    }),
    {
      name: 'jamaica-house-cart',
    }
  )
)

// app/layout.tsx (wrap in context for SSR compatibility)
'use client'

import { useEffect, useState } from 'react'
import { useCartStore } from '@/store/cart-store'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null // Avoid hydration mismatch

  return children
}
```

### Pattern 4: Static Data with TypeScript for Small Catalogs

**What:** Store product catalog as TypeScript constants with full type safety. No CMS, no database, no API calls. Export directly and import where needed.

**When to use:** 4-10 SKUs that rarely change. Content managed via code/PRs, not admin UI.

**Trade-offs:**
- **Pros:** Zero latency, type-safe, version-controlled, no external dependencies, works offline.
- **Cons:** Requires code deploy to update. Not scalable beyond ~20 products. No admin UI for non-developers.

**Example:**
```typescript
// types/product.ts
export interface Product {
  id: string
  slug: string
  name: string
  description: string
  price: number
  image: string
  images: string[] // Gallery images
  heatLevel: 1 | 2 | 3 | 4 | 5
  ingredients: string[]
  size: string
  inStock: boolean
}

// data/products.ts
import { Product } from '@/types/product'

export const products: Product[] = [
  {
    id: 'classic-hot',
    slug: 'classic-hot-sauce',
    name: 'Classic Jamaican Hot Sauce',
    description: 'Our signature blend of scotch bonnet peppers...',
    price: 12.99,
    image: '/images/products/classic-hot.jpg',
    images: [
      '/images/products/classic-hot-1.jpg',
      '/images/products/classic-hot-2.jpg',
      '/images/products/classic-hot-3.jpg',
    ],
    heatLevel: 3,
    ingredients: ['Scotch Bonnet Peppers', 'Vinegar', 'Garlic', 'Spices'],
    size: '5 oz',
    inStock: true,
  },
  // ... 3 more products
]

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug)
}

// app/products/[slug]/page.tsx (Server Component)
import { notFound } from 'next/navigation'
import { getProductBySlug, products } from '@/data/products'

export async function generateStaticParams() {
  return products.map((product) => ({
    slug: product.slug,
  }))
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = getProductBySlug(params.slug)

  if (!product) notFound()

  return (
    <div>
      <h1>{product.name}</h1>
      {/* Product details */}
    </div>
  )
}
```

### Pattern 5: Route Handlers for Webhooks

**What:** Use Route Handlers (`app/api/*/route.ts`) for external integrations that need public HTTP endpoints. Export HTTP method functions (GET, POST, etc.) using Web Request/Response APIs.

**When to use:** Stripe webhooks, third-party callbacks, public APIs. Anything external systems call.

**Trade-offs:**
- **Pros:** Full control over HTTP method/headers, standard Web APIs, works with external services.
- **Cons:** More boilerplate than Server Actions. Manual request/response handling.

**Example:**
```typescript
// app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: Request) {
  const body = await request.text() // Raw body required for signature verification
  const signature = headers().get('stripe-signature')!

  let event: Stripe.Event

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  // Handle event types
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session
      // Process order, send confirmation email, etc.
      console.log('Payment successful:', session.id)
      break

    case 'payment_intent.payment_failed':
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      // Handle failed payment
      console.log('Payment failed:', paymentIntent.id)
      break
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 })
}
```

## Data Flow

### Request Flow: Product Browsing (Static)

```
[User visits /shop]
    ↓
[Next.js SSG/ISR]
    ↓
[app/shop/page.tsx (Server Component)]
    ↓
[Import products from data/products.ts]
    ↓
[Render ProductCard (Server Component) for each product]
    ↓
[Inject AddToCartButton (Client Component) at interaction boundary]
    ↓
[Send HTML to browser with minimal JS (only for Client Components)]
    ↓
[User sees page < 1.5s FCP]
```

### State Management Flow: Add to Cart

```
[User clicks "Add to Cart" button]
    ↓
[AddToCartButton (Client Component) onClick handler]
    ↓
[useCartStore().addItem(product)]
    ↓
[Zustand updates in-memory state]
    ↓
[Zustand persist middleware saves to localStorage]
    ↓
[Cart count updates in header (subscribed to store)]
    ↓
[Cart drawer auto-opens (UI state)]
```

### Payment Flow: Checkout to Confirmation

```
[User clicks "Checkout" in cart drawer]
    ↓
[CheckoutButton (Client Component) calls Server Action]
    ↓
[createCheckoutSession(items) Server Action]
    ↓
[stripe.checkout.sessions.create() API call]
    ↓
[Return session URL to client]
    ↓
[window.location.href = session.url (redirect to Stripe)]
    ↓
[User completes payment on Stripe-hosted page]
    ↓
[Stripe redirects to success_url: /success?session_id=xxx]
    ↓
[PARALLEL: Stripe webhook POST to /api/webhooks/stripe]
    ↓
[Webhook verifies signature, processes order, clears cart]
    ↓
[Success page queries session status, shows confirmation]
```

### Key Data Flows

1. **Product Data Flow (Static):** Products imported as TypeScript constants → Server Components render → HTML sent to client. No API calls, no loading states, instant.

2. **Cart State Flow (Client-Side):** User action → Zustand store update → localStorage persist → UI re-renders via subscription. Cart state never leaves client until checkout.

3. **Checkout Flow (Hybrid):** Client Component → Server Action → Stripe API → Redirect to Stripe → Webhook confirms → Update order status. Server Action avoids API route boilerplate.

4. **Image Optimization Flow:** `<Image>` component → Next.js Image Optimization API → Sharp compression → WebP/AVIF conversion → CDN cache (Vercel) → Lazy load below fold. 60-80% size reduction automatic.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **0-10K visitors/month** | Current architecture is optimal. Static data, Zustand cart, Stripe Checkout. No changes needed. |
| **10K-100K visitors/month** | Add ISR for product pages (`revalidate: 3600`). Consider moving to Vercel Edge for global latency reduction. Monitor Stripe webhook reliability (add retry logic). |
| **100K-1M visitors/month** | Migrate product data to CMS (Sanity/Contentful) with webhook-based ISR. Add database for order history. Implement Redis cache for cart state across devices. Consider Stripe Tax API for multi-state compliance. |

### Scaling Priorities

1. **First bottleneck (10K visitors):** Stripe webhook failures during traffic spikes. **Fix:** Add idempotency keys, implement retry queue (Vercel Cron + database), log all webhook attempts.

2. **Second bottleneck (50K visitors):** Static site generation becomes slow with growing content. **Fix:** Switch to ISR with on-demand revalidation. Add CMS (Sanity) for content updates without rebuilds.

3. **Third bottleneck (100K+ visitors):** Cart state locked to device (localStorage). **Fix:** Add database-backed cart with user sessions. Sync cart across devices via API.

**For Jamaica House (4 SKUs, DTC launch):** Current architecture handles 100K+ visitors/month without changes. Premature optimization is the real risk.

## Anti-Patterns

### Anti-Pattern 1: Adding `"use client"` Everywhere

**What people do:** Add `"use client"` to every component "just in case" or because they're used to SPA patterns.

**Why it's wrong:** Defeats Next.js 14's main advantage—Server Components. Sends unnecessary JavaScript to client, slows FCP/LCP, increases bundle size. For Jamaica House, this could add 200KB+ of hydration overhead.

**Do this instead:** Start with Server Components (default). Only add `"use client"` at the exact boundary where interactivity is needed (buttons, forms, animations). ProductCard = Server Component. AddToCartButton inside it = Client Component.

### Anti-Pattern 2: Building Custom API Routes for Internal Mutations

**What people do:** Create `/api/checkout/route.ts` with POST handler when a Server Action would work.

**Why it's wrong:** Unnecessary boilerplate. Server Actions provide same functionality with automatic type safety, simpler calling convention, and progressive enhancement support. API routes are for webhooks/public APIs, not internal mutations.

**Do this instead:** Use Server Actions for Stripe Checkout Session creation, email capture, order processing. Reserve Route Handlers for Stripe webhooks and external callbacks.

### Anti-Pattern 3: Using a CMS for 4 Products

**What people do:** Set up Sanity/Contentful/Strapi for product catalog management from day one.

**Why it's wrong:** Massive overhead for 4 SKUs. CMS adds: build complexity, external dependency, potential downtime, API latency, learning curve, ongoing costs. For Jamaica House, product updates are infrequent (quarterly at most).

**Do this instead:** Static TypeScript/JSON files in `data/products.ts`. Type-safe, zero latency, version-controlled. When catalog grows to 20+ SKUs or non-developers need to edit content, then migrate to CMS.

### Anti-Pattern 4: Global Client-Side State Provider at Root

**What people do:** Wrap entire app in `<CartProvider>` that's a massive Context Provider with all state logic in a Client Component.

**Why it's wrong:** Makes root layout a Client Component, breaking Server Component benefits for all child pages. Increases initial bundle size, slows hydration.

**Do this instead:** Use Zustand (doesn't require provider at root) or wrap provider in a separate Client Component that's imported into root layout, keeping layout itself as Server Component.

### Anti-Pattern 5: Fetching Product Data Client-Side

**What people do:** Use `useEffect` + `fetch('/api/products')` in Client Components to load product data.

**Why it's wrong:** Waterfalls (HTML → JS → API → render), loading spinners, SEO problems (bots don't execute JS), unnecessary API routes. Defeats SSR benefits.

**Do this instead:** Import static data directly in Server Components or fetch in Server Components with async/await. Zero loading states, instant render, perfect SEO.

### Anti-Pattern 6: Not Verifying Stripe Webhook Signatures

**What people do:** Accept webhook POST without verifying `stripe-signature` header.

**Why it's wrong:** Security vulnerability. Malicious actors can forge webhook events (fake orders, trigger refunds, manipulate inventory).

**Do this instead:** Always verify signature with `stripe.webhooks.constructEvent(body, signature, webhookSecret)`. Return 400 if verification fails.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Stripe Checkout** | Server Action → `stripe.checkout.sessions.create()` → Redirect | Use Checkout hosted page (not Payment Element) for Apple Pay/Google Pay zero-config support. Simpler than embedded forms. |
| **Stripe Webhooks** | Route Handler at `/api/webhooks/stripe` with signature verification | Handle `checkout.session.completed` for order confirmation. Verify signature with raw request body. Must be idempotent (Stripe retries). |
| **Vercel Deployment** | Git push → automatic deploy, env vars in dashboard | Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Disable deployment protection for webhook endpoint. |
| **Vercel Image Optimization** | `<Image>` component → automatic WebP/AVIF conversion | No configuration needed. Set `priority` on hero images to preload. Use `fill` + `sizes` for responsive images. |
| **Email Capture** | Server Action → Mailchimp/ConvertKit API | Store email in form, call Server Action, POST to email provider API. Handle errors gracefully. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Server Component ↔ Client Component** | Props (serializable data only) | Pass product data down as props. No functions, no complex objects. Client Component can't read Server Component state. |
| **Client Component ↔ Server Action** | Direct function call | `await createCheckoutSession(items)` from Client Component. Automatic serialization. Return JSON-serializable data. |
| **Client Component ↔ Route Handler** | `fetch()` API call | Use for webhooks/public APIs. Server Actions simpler for internal mutations. |
| **Page ↔ Layout** | Nested composition | Layouts wrap pages. Share header/footer/navigation. Avoid passing data up from page to layout (pass down only). |
| **Cart Store ↔ Components** | Zustand hooks (`useCartStore`) | Components subscribe to store. Updates trigger re-renders. Store persists to localStorage automatically. |
| **Static Data ↔ Server Components** | Direct imports | `import { products } from '@/data/products'` in Server Components. Type-safe, zero latency. |

## Build Order & Dependencies

### Phase 1: Foundation (No Dependencies)

**Build in any order:**
1. Project setup (`create-next-app`, Tailwind, TypeScript)
2. Static data models (`types/product.ts`, `data/products.ts`)
3. Basic layouts (`app/layout.tsx`, `app/(marketing)/layout.tsx`)
4. Utility functions (`lib/utils.ts`, `lib/constants.ts`)

**Output:** Project structure, type definitions, data models.

### Phase 2: Core UI (Depends on Phase 1)

**Build Server Components first (no JS dependencies):**
1. Layout components: Header, Footer, Navigation (Server Components)
2. Product Card (Server Component)
3. Homepage hero section (Server Component)
4. Product grid layout (Server Component)

**Then add Client Components:**
5. Cart store (`store/cart-store.ts`) — needed by all interactive components
6. Add to Cart button (Client Component, depends on cart store)
7. Cart drawer (Client Component, depends on cart store)
8. Cart button in header (Client Component, depends on cart store)

**Output:** Static pages load, cart functionality works.

### Phase 3: Product Pages (Depends on Phase 2)

**Build in order:**
1. Product detail page (`app/products/[slug]/page.tsx`) — Server Component
2. Product gallery (Client Component for interactivity)
3. Sticky add-to-cart bar (Client Component)
4. Dynamic metadata (`generateMetadata()`)

**Output:** Individual product pages with images, details, add-to-cart.

### Phase 4: Checkout Flow (Depends on Phase 3)

**Build in order:**
1. Stripe SDK setup (`lib/stripe.ts`)
2. Checkout Server Action (`actions/checkout.ts`)
3. Checkout button (Client Component, calls Server Action)
4. Success page (`app/success/page.tsx`)
5. Stripe webhook handler (`app/api/webhooks/stripe/route.ts`) — **MUST be after Server Action**

**Output:** End-to-end checkout works, webhooks process orders.

### Phase 5: Content Pages (Depends on Phase 2, Parallel with Phase 4)

**Build in any order (no dependencies on each other):**
1. Our Story page (`app/our-story/page.tsx`)
2. Recipe grid page (`app/recipes/page.tsx`)
3. Recipe detail pages (`app/recipes/[slug]/page.tsx`)
4. Static data for recipes (`data/recipes.ts`)

**Output:** Marketing/content pages complete.

### Phase 6: Polish (Depends on All Previous Phases)

**Build in any order:**
1. Exit-intent popup (Client Component)
2. Email capture in footer (Server Action)
3. Image optimization (add `priority`, `sizes` attributes)
4. SEO metadata (sitemaps, Open Graph images)
5. Loading states (`loading.tsx`)
6. Error boundaries (`error.tsx`, `not-found.tsx`)

**Output:** Production-ready site.

### Critical Path Dependencies

```
Phase 1 (Foundation)
    ↓
Phase 2 (Core UI)
    ├─→ Cart Store (required for all cart features)
    │       ↓
    │   Add to Cart Button → Cart Drawer → Cart Button
    │
    └─→ Server Components (independent)
            ↓
Phase 3 (Product Pages) ← depends on Phase 2 cart components
    ↓
Phase 4 (Checkout) ← depends on Phase 3 (cart must work first)
    ├─→ Stripe SDK
    │       ↓
    │   Server Action → Checkout Button → Webhook Handler
    │
Phase 5 (Content Pages) ← depends on Phase 2 layouts only
    (parallel with Phase 4)
```

**Key dependency:** Cart store must be built before any cart-related components. Stripe Server Action must be built before webhook handler (webhook validates against same session creation logic).

## New Components Needed

### High Priority (Core Functionality)

| Component | Type | Purpose | Dependencies |
|-----------|------|---------|--------------|
| `CartDrawer` | Client | Slide-out cart with item list, totals, checkout button | Cart store, CheckoutButton |
| `AddToCartButton` | Client | Product detail "Add to Cart" with loading state | Cart store |
| `CartButton` | Client | Header cart icon with item count badge | Cart store |
| `CheckoutButton` | Client | Trigger Stripe Checkout from cart | Checkout Server Action |
| `ProductGallery` | Client | Image gallery with thumbnails, zoom | None |
| `ProductCard` | Server | Grid item with image, name, price, heat level | Static product data |

### Medium Priority (Enhanced UX)

| Component | Type | Purpose | Dependencies |
|-----------|------|---------|--------------|
| `HeatIndicator` | Server | Visual spice heat level (1-5 peppers) | None |
| `ExitIntentPopup` | Client | Email capture on exit intent | Email Server Action |
| `EmailCaptureForm` | Client | Footer email signup | Email Server Action |
| `FreeShippingBar` | Client | Progress bar toward free shipping threshold | Cart store |
| `StickyAddToCart` | Client | Floating add-to-cart bar on product pages | Cart store, scroll position |

### Low Priority (Polish)

| Component | Type | Purpose | Dependencies |
|-----------|------|---------|--------------|
| `LoadingSkeleton` | Server | Skeleton UI for loading states | None |
| `ErrorBoundary` | Server | Custom error UI | None |
| `NotFound` | Server | Custom 404 page | None |
| `SocialProofBanner` | Server | "X people bought this week" ticker | None |
| `RecipeCard` | Server | Recipe grid item | Static recipe data |

### Reusable UI Primitives (Build Once, Use Everywhere)

| Component | Type | Purpose | Dependencies |
|-----------|------|---------|--------------|
| `Button` | Client/Server | Styled button with variants | None |
| `Modal` | Client | Reusable modal wrapper | None |
| `Badge` | Server | Pill-shaped label (heat level, "New", etc.) | None |
| `Container` | Server | Max-width container with padding | None |

## SSR vs CSR Decisions

### Server-Side Rendering (SSR/SSG)

**Use for:**
- All pages (homepage, shop, product detail, Our Story, recipes)
- Product catalog (static generation with `generateStaticParams()`)
- SEO-critical content (product descriptions, metadata, structured data)
- Layout components (header, footer, navigation)
- Content that doesn't require interactivity

**Why:** Faster FCP/LCP, better SEO, smaller bundle size. For Jamaica House's small catalog, all product pages can be statically generated at build time.

**Implementation:**
```typescript
// app/products/[slug]/page.tsx
export async function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }))
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = getProductBySlug(params.slug)
  return <div>{product.name}</div>
}
```

### Client-Side Rendering (CSR)

**Use for:**
- Interactive components (cart drawer, add-to-cart buttons, forms)
- State-dependent UI (cart count, drawer open/closed)
- Browser API usage (localStorage, window, document)
- Animations and transitions

**Why:** Required for interactivity. Next.js 14 minimizes CSR by default—only components with `"use client"` hydrate.

**Implementation:**
```typescript
// components/cart/cart-drawer.tsx
'use client'

import { useCartStore } from '@/store/cart-store'

export function CartDrawer() {
  const items = useCartStore((state) => state.items)
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={isOpen ? 'translate-x-0' : 'translate-x-full'}>
      {items.map((item) => <CartItem key={item.id} item={item} />)}
    </div>
  )
}
```

### Hybrid Pattern (Recommended)

**Composition:**
- Server Component (ProductCard) wraps Client Component (AddToCartButton)
- Server Component renders static content, Client Component handles interaction
- Minimizes JavaScript sent to browser while maintaining interactivity

**Example:**
```typescript
// Server Component (outer)
export function ProductCard({ product }) {
  return (
    <div>
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <AddToCartButton product={product} /> {/* Client Component injected */}
    </div>
  )
}

// Client Component (inner)
'use client'
export function AddToCartButton({ product }) {
  const addItem = useCartStore((state) => state.addItem)
  return <button onClick={() => addItem(product)}>Add to Cart</button>
}
```

### Decision Matrix

| Feature | Rendering | Reason |
|---------|-----------|--------|
| Homepage hero | SSG | SEO, performance, no interactivity |
| Product grid | SSG | SEO, performance, static product list |
| Product detail | SSG | SEO, performance, pre-render all 4 SKUs |
| Add to cart button | CSR | Requires onClick, state update, cart store |
| Cart drawer | CSR | Interactive, state-dependent, animations |
| Cart count badge | CSR | State-dependent (cart store subscription) |
| Checkout button | CSR | Requires onClick, async Server Action call |
| Success page | SSR/SSG | SEO, static content (session ID from URL param) |
| Our Story page | SSG | SEO, performance, static content |
| Recipe pages | SSG | SEO, performance, static content |
| Navigation | SSR | SEO, no interactivity (links are server-rendered) |
| Footer | SSR | SEO, static content (except email form) |
| Email capture form | CSR | Form submission, validation, loading states |

**Rule of thumb:** If it has `onClick`, `useState`, `useEffect`, or reads from a store → CSR (`"use client"`). Everything else → SSR (default).

## Sources

### Official Documentation (HIGH Confidence)
- [Next.js App Router Project Structure](https://nextjs.org/docs/app/getting-started/project-structure)
- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [Next.js Image Optimization](https://nextjs.org/docs/app/getting-started/images)
- [Next.js Metadata and OG Images](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)

### Architecture Guides (MEDIUM Confidence)
- [Next.js 14 Project Structure: Best Practices](https://nextjsstarter.com/blog/nextjs-14-project-structure-best-practices/)
- [The Ultimate Guide to Organizing Your Next.js 15 Project Structure](https://www.wisp.blog/blog/the-ultimate-guide-to-organizing-your-nextjs-15-project-structure)
- [Next.js Architecture in 2026 — Server-First Patterns](https://www.yogijs.tech/blog/nextjs-project-architecture-app-router)
- [Next.js Best Practices in 2025: Performance & Architecture](https://www.raftlabs.com/blog/building-with-next-js-best-practices-and-benefits-for-performance-first-teams/)

### Stripe Integration (MEDIUM Confidence)
- [Stripe Checkout with Next.js: Complete Integration Guide](https://www.mtechzilla.com/blogs/integrate-stripe-checkout-with-nextjs)
- [Stripe + Next.js 15: The Complete 2025 Guide](https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/)
- [Stripe Checkout and Webhook in Next.js 15 (2025)](https://medium.com/@gragson.john/stripe-checkout-and-webhook-in-a-next-js-15-2025-925d7529855e)
- [Next.js App Router + Stripe Webhook Signature Verification](https://kitson-broadhurst.medium.com/next-js-app-router-stripe-webhook-signature-verification-ea9d59f3593f)

### State Management (MEDIUM Confidence)
- [State Management with Zustand in Next.js](https://www.pronextjs.dev/tutorials/state-management/state-management-with-zustand/solution)
- [How to Build a Shopping Cart with Next.js and Zustand](https://hackernoon.com/how-to-build-a-shopping-cart-with-nextjs-and-zustand-state-management-with-typescript)
- [Setup with Next.js - Zustand Official Docs](https://zustand.docs.pmnd.rs/guides/nextjs)

### Ecommerce Patterns (LOW-MEDIUM Confidence)
- [eCommerce Cart Drawers – Examples & UX Best Practices](https://vervaunt.com/ecommerce-cart-drawers-examples-technologies-ux-best-practices)
- [Next.js Image Optimization Techniques 2026](https://webpeak.org/blog/nextjs-image-optimization-techniques/)
- [Next.js SEO Optimization Guide (2026 Edition)](https://www.djamware.com/post/nextjs-seo-optimization-guide-2026-edition)

---
*Architecture research for: Jamaica House Brand DTC Ecommerce*
*Researched: 2026-02-17*
*Confidence: HIGH (official docs + verified patterns)*
