# Pitfalls Research

**Domain:** DTC Ecommerce with Next.js 14+ App Router + Stripe + Vercel
**Researched:** 2026-02-17
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Hydration Mismatch from Cart State in localStorage

**What goes wrong:**
Server renders empty cart HTML, client hydrates with localStorage cart data, causing React hydration error that breaks interactivity. Error: "Text content does not match server-rendered HTML."

**Why it happens:**
Server-side rendering happens before browser loads — `window`, `document`, and `localStorage` don't exist on server. Developers access localStorage in component body or during render, creating server/client mismatch. Most cart state libraries (Zustand, etc.) use localStorage for persistence, which is client-only.

**How to avoid:**
- Use `useEffect` to access localStorage only after client hydration
- Check if `window` is defined before accessing localStorage
- Initialize cart state as empty on server, hydrate from localStorage in useEffect
- With Zustand persist middleware, wrap store creation to handle SSR: `const useStore = typeof window !== 'undefined' ? createStore() : () => initialState`

```typescript
// BAD - causes hydration mismatch
const CartBadge = () => {
  const cart = JSON.parse(localStorage.getItem('cart')) || []
  return <span>{cart.length}</span>
}

// GOOD - hydrates correctly
const CartBadge = () => {
  const [itemCount, setItemCount] = useState(0)

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]')
    setItemCount(cart.length)
  }, [])

  return <span>{itemCount}</span>
}
```

**Warning signs:**
- Console errors: "Hydration failed because the initial UI does not match"
- Cart badge shows 0 items initially, then flashes to correct count
- Interactive elements (buttons) don't respond on first click

**Phase to address:**
Phase 1 (Foundation) — must be correct from day one. Cart state architecture is foundational.

---

### Pitfall 2: Stripe Webhook Signature Verification Failure

**What goes wrong:**
Webhook events fail verification with "No signatures found matching the expected signature" error. Orders paid but never fulfilled because webhook never processes. Customers charged but receive no confirmation.

**Why it happens:**
Four common causes:
1. **Body parsing interference**: Framework parses request body before signature verification (Next.js bodyParser, Express json middleware)
2. **Wrong webhook secret**: Using test mode secret with live mode webhooks (or vice versa)
3. **Body manipulation**: Framework adds/removes whitespace, reorders JSON keys, changes encoding
4. **HTTPS configuration**: Stripe requires TLS 1.2+ in production

**How to avoid:**

For Next.js App Router (Route Handlers):
```typescript
// app/api/webhooks/stripe/route.ts
export async function POST(request: Request) {
  // GOOD - access raw body as text
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
    // Process event...
    return Response.json({ received: true })
  } catch (err) {
    return Response.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }
}
```

For Next.js Pages Router (API Routes):
```typescript
// pages/api/webhooks/stripe.ts
export const config = {
  api: { bodyParser: false } // CRITICAL - disable bodyParser
}

export default async function handler(req, res) {
  const body = await getRawBody(req)
  // Verify signature...
}
```

**Important**: In Next.js 14+, the `export const config` for bodyParser has been deprecated in App Router. Use Route Handlers instead.

**Environment-specific secrets:**
- Test webhook secret: `whsec_test_...`
- Live webhook secret: `whsec_...` (different value)
- Store both in environment variables, use correct one per environment

**Warning signs:**
- 400 errors in Stripe webhook logs
- "signature verification failed" in application logs
- Stripe dashboard shows webhook attempts failing
- Orders paid but not marked as fulfilled in your system

**Phase to address:**
Phase 2 (Payments) — verify immediately when implementing Stripe integration. Test with Stripe CLI before production.

---

### Pitfall 3: Not Fulfilling Orders Based on Webhooks (Relying on Client-Side Redirect)

**What goes wrong:**
Order fulfillment triggered from Stripe Checkout success page redirect. Customer closes browser before redirect completes — order paid but never fulfilled. Customer never receives confirmation email.

**Why it happens:**
Developers assume customer always reaches success page after payment. Reality: customers aren't guaranteed to visit success page (browser crash, close tab, network interruption). Checkout page redirect is not reliable for critical fulfillment logic.

**How to avoid:**
- **ALWAYS trigger fulfillment from webhooks**, never from client-side redirects
- Listen for `checkout.session.completed` event for immediate payment methods
- Listen for `checkout.session.async_payment_succeeded` for delayed payment methods (ACH, bank transfers)
- Implement idempotency: check if order already fulfilled before processing
- Use success page ONLY for displaying confirmation to customer (not for triggering fulfillment)

```typescript
// BAD - fulfillment on success page
// app/checkout/success/page.tsx
export default function SuccessPage({ searchParams }) {
  useEffect(() => {
    // DON'T DO THIS - customer may never reach this page
    createOrder(searchParams.session_id)
  }, [])
}

// GOOD - fulfillment in webhook
// app/api/webhooks/stripe/route.ts
export async function POST(request: Request) {
  const event = stripe.webhooks.constructEvent(...)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object

    // Check idempotency
    const existingOrder = await db.order.findUnique({
      where: { stripeSessionId: session.id }
    })
    if (existingOrder) {
      return Response.json({ received: true }) // Already processed
    }

    // Fulfill order
    await createOrder(session)
    await sendConfirmationEmail(session.customer_email)
  }

  return Response.json({ received: true })
}
```

**Warning signs:**
- Customer complaints: "I paid but didn't get confirmation"
- Orders in Stripe dashboard but not in your database
- Success page is critical path for order creation

**Phase to address:**
Phase 2 (Payments) — architect correctly from the start. Refactoring fulfillment logic later is painful.

---

### Pitfall 4: Forgetting to Handle Delayed Payment Methods

**What goes wrong:**
Checkout completes successfully but payment still pending (ACH, bank transfer). Order marked as "paid" immediately but funds haven't cleared. Days later payment fails but order already shipped.

**Why it happens:**
Not all payment methods are instant. ACH direct debit and bank transfers take days to clear. `checkout.session.completed` fires when checkout flow finishes, NOT when payment succeeds for delayed methods.

**How to avoid:**
- Handle BOTH webhook events:
  - `checkout.session.completed`: Instant payment methods (cards, Apple Pay, etc.)
  - `checkout.session.async_payment_succeeded`: Delayed payment methods succeed later
  - `checkout.session.async_payment_failed`: Delayed payment methods fail
- Check `payment_status` field in session object:
  - `paid`: Payment succeeded (fulfill order)
  - `unpaid`: Payment pending (hold fulfillment)
  - `no_payment_required`: Free order (fulfill)
- For async payments, mark order as "pending" initially, only fulfill when payment succeeds

```typescript
// Handle both immediate and delayed payment methods
if (event.type === 'checkout.session.completed') {
  const session = event.data.object

  if (session.payment_status === 'paid') {
    // Immediate payment - fulfill now
    await fulfillOrder(session)
  } else if (session.payment_status === 'unpaid') {
    // Delayed payment - create order but mark as pending
    await createPendingOrder(session)
  }
}

if (event.type === 'checkout.session.async_payment_succeeded') {
  // Delayed payment succeeded - now fulfill
  const session = event.data.object
  await fulfillOrder(session)
}

if (event.type === 'checkout.session.async_payment_failed') {
  // Delayed payment failed - notify customer
  const session = event.data.object
  await cancelPendingOrder(session)
  await notifyPaymentFailed(session.customer_email)
}
```

**Warning signs:**
- Orders shipped before payment clears
- No handling for async payment events in webhook handler
- Only listening to `checkout.session.completed`

**Phase to address:**
Phase 2 (Payments) — during initial Stripe integration. Document which payment methods are enabled.

---

### Pitfall 5: Missing `priority` on Above-the-Fold Images (Kills LCP)

**What goes wrong:**
Product hero image is Largest Contentful Paint (LCP) element but loads slowly. Lighthouse mobile score below 90, LCP above 2.5 seconds. Google search ranking suffers due to poor Core Web Vitals.

**Why it happens:**
Next.js Image component lazy loads by default. Above-the-fold images (hero, product images) wait until after JavaScript loads to start fetching. Browser doesn't prioritize these images without explicit hints.

**How to avoid:**
- Add `priority` prop to hero images and first product image (Next.js 15 and earlier)
- For Next.js 16+, use `loading="eager"` and `fetchPriority="high"`
- Always specify `width` and `height` to prevent Cumulative Layout Shift (CLS)
- Use `sizes` attribute to tell browser how much space image occupies at different viewports

```typescript
// BAD - hero image lazy loads, killing LCP
<Image
  src="/hot-sauce-hero.jpg"
  alt="Jamaica House Hot Sauce"
  width={800}
  height={600}
/>

// GOOD - hero image prioritized (Next.js 15)
<Image
  src="/hot-sauce-hero.jpg"
  alt="Jamaica House Hot Sauce"
  width={800}
  height={600}
  priority // Preload this image
  sizes="(max-width: 768px) 100vw, 50vw"
/>

// GOOD - hero image prioritized (Next.js 16+)
<Image
  src="/hot-sauce-hero.jpg"
  alt="Jamaica House Hot Sauce"
  width={800}
  height={600}
  loading="eager"
  fetchPriority="high"
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

**Impact:**
- Without optimization: 2MB hero image → 4.2s load on mobile (fails Google's 2.5s threshold)
- With priority + Next.js optimization: 180KB WebP → 1.8s load on mobile
- Lighthouse reports show 60-80% file size reduction, LCP under 2.5s

**Warning signs:**
- Lighthouse mobile LCP above 2.5 seconds
- Hero image appears late on page load
- No `priority` prop on above-the-fold images

**Phase to address:**
Phase 1 (Foundation) — implement during initial component build. Fixing later requires auditing all images.

---

### Pitfall 6: Client Component Metadata Breaks SEO

**What goes wrong:**
Product pages use `'use client'` directive. Meta tags (title, description, OG images) not rendered in HTML. Search engines see generic fallback metadata. Social media shares show wrong image/description.

**Why it happens:**
Next.js App Router's `metadata` export and `generateMetadata` function only work in Server Components. Adding `'use client'` disables server-side metadata rendering. Meta tags injected client-side (after HTML loads) aren't reliably seen by bots.

**How to avoid:**
- Keep page components as Server Components (no `'use client'`)
- Move interactivity to child client components
- Export metadata from page.tsx or layout.tsx (server component)
- Use `generateMetadata` for dynamic product pages

```typescript
// BAD - client component with no server metadata
'use client'

export default function ProductPage({ params }) {
  // metadata export doesn't work here
  return <ProductDetails productId={params.id} />
}

// GOOD - server component with metadata, client interactivity in children
import { Metadata } from 'next'

export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await getProduct(params.id)

  return {
    title: `${product.name} | Jamaica House`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [product.image],
    },
  }
}

export default async function ProductPage({ params }) {
  const product = await getProduct(params.id)

  return (
    <>
      <ProductDetails product={product} />
      <AddToCartButton product={product} /> {/* This can be client component */}
    </>
  )
}
```

**Warning signs:**
- `'use client'` at top of page.tsx files
- Social media shares show generic site image, not product image
- Google Search Console shows missing meta descriptions
- Metadata exports trigger errors

**Phase to address:**
Phase 1 (Foundation) — architect component structure correctly from start. Refactoring server/client boundary later is painful.

---

### Pitfall 7: Webhook Endpoint Returns Slowly (Stripe Retries, Creates Duplicates)

**What goes wrong:**
Webhook handler does expensive operations (send email, generate PDF, external API calls) before returning 200. Takes 5+ seconds to respond. Stripe times out and retries webhook. Order fulfilled multiple times, customer receives duplicate emails.

**Why it happens:**
Stripe expects webhook response within seconds. Long processing causes timeout. Stripe interprets timeout as failure and retries (up to 3 days). Webhook handler runs same logic again, creating duplicates.

**How to avoid:**
- **Return 200 immediately** after validating signature
- Process events asynchronously (queue, background job)
- Implement idempotency checks before processing
- Store processed event IDs to prevent duplicate processing

```typescript
// BAD - slow webhook response
export async function POST(request: Request) {
  const event = stripe.webhooks.constructEvent(...)

  if (event.type === 'checkout.session.completed') {
    await createOrder(event.data.object) // slow database write
    await sendEmail(event.data.object.customer_email) // slow external API call
    await updateInventory(event.data.object) // another slow operation
    await notifyWarehouse(event.data.object) // yet another slow call
  }

  return Response.json({ received: true }) // Stripe times out before this
}

// GOOD - fast webhook response with async processing
export async function POST(request: Request) {
  const event = stripe.webhooks.constructEvent(...)

  // Check idempotency immediately
  const processed = await redis.get(`webhook:${event.id}`)
  if (processed) {
    return Response.json({ received: true }) // Already processed
  }

  // Mark as processing
  await redis.set(`webhook:${event.id}`, 'processing', { ex: 86400 })

  // Queue for async processing
  await queue.add('process-stripe-webhook', {
    eventId: event.id,
    eventType: event.type,
    eventData: event.data.object,
  })

  // Return immediately
  return Response.json({ received: true })
}

// Separate queue worker processes events
async function processWebhook(job) {
  const { eventId, eventType, eventData } = job.data

  // Double-check idempotency
  const order = await db.order.findUnique({ where: { stripeEventId: eventId } })
  if (order) return // Already processed

  // Now do expensive operations
  await createOrder(eventData)
  await sendEmail(eventData.customer_email)
  await updateInventory(eventData)

  // Mark as complete
  await redis.set(`webhook:${eventId}`, 'complete', { ex: 604800 })
}
```

**Warning signs:**
- Webhook endpoint response times above 3 seconds
- Stripe dashboard shows repeated webhook deliveries
- Duplicate orders in database
- Multiple confirmation emails sent to same customer

**Phase to address:**
Phase 2 (Payments) — during initial webhook implementation. Add monitoring to track response times.

---

### Pitfall 8: Test Mode vs Live Mode Environment Variable Mix-up

**What goes wrong:**
Production deployment uses test mode API keys. Real customers attempt checkout but see test payment methods. No actual payments processed. Or worse: development uses live keys, test purchases charge real cards.

**Why it happens:**
- Forgetting to update environment variables when deploying to production
- Copy/paste error when setting Vercel environment variables
- Using same `.env` file for development and production
- Not understanding Stripe has completely separate test/live environments

**How to avoid:**
- Use clear naming convention for environment variables:
  - `STRIPE_SECRET_KEY_TEST` and `STRIPE_SECRET_KEY_LIVE`
  - `STRIPE_PUBLISHABLE_KEY_TEST` and `STRIPE_PUBLISHABLE_KEY_LIVE`
  - `STRIPE_WEBHOOK_SECRET_TEST` and `STRIPE_WEBHOOK_SECRET_LIVE`
- Set environment-specific variables in Vercel:
  - Development: test keys
  - Preview: test keys
  - Production: live keys
- Verify key format before using:
  - Test keys: `sk_test_...` and `pk_test_...`
  - Live keys: `sk_live_...` and `pk_live_...`
- Add startup check to validate correct keys per environment

```typescript
// Runtime validation
const isProduction = process.env.NODE_ENV === 'production'
const secretKey = process.env.STRIPE_SECRET_KEY

if (isProduction && secretKey?.startsWith('sk_test_')) {
  throw new Error('FATAL: Production environment using Stripe test key!')
}

if (!isProduction && secretKey?.startsWith('sk_live_')) {
  console.warn('WARNING: Development environment using Stripe live key!')
}
```

**Deployment checklist:**
- [ ] Activate Stripe account (can't use live keys until activated)
- [ ] Create live webhook endpoint (separate from test endpoint)
- [ ] Update Vercel production environment variables with live keys
- [ ] Test checkout in production with real card (then refund)
- [ ] Verify webhook events arrive at live endpoint
- [ ] Recreate test data objects (products, SKUs) in live mode with same IDs

**Warning signs:**
- Production checkout shows "Test mode" indicator
- Stripe dashboard shows test transactions in production
- Development accidentally charges real cards
- Webhook signature verification fails after deployment

**Phase to address:**
Phase 2 (Payments) → Phase 3 (Launch Prep) — validate during Stripe setup, re-verify before production launch.

---

### Pitfall 9: Not Calculating Tax with Stripe Tax (Manual Tax Breaks at Scale)

**What goes wrong:**
Hard-coded tax rates for specific states. New customer from different state — wrong tax charged. Nexus laws change — tax logic outdated. Spend hours debugging tax edge cases.

**Why it happens:**
Sales tax is complex: 11,000+ tax jurisdictions in US, different rates for physical goods vs digital goods vs shipping, economic nexus laws vary by state. Developers underestimate complexity and build manual tax logic.

**How to avoid:**
- Use Stripe Tax API for automatic tax calculation
- Enable tax collection in Stripe Checkout (automatic_tax: { enabled: true })
- Stripe handles: determining tax jurisdictions, applying correct rates, taxing shipping appropriately, updating rates when laws change
- Cost: 0.5% of transaction + $0.02 per transaction with Stripe Tax enabled

```typescript
// BAD - manual tax calculation
const session = await stripe.checkout.sessions.create({
  line_items: [{
    price_data: {
      currency: 'usd',
      product_data: { name: 'Hot Sauce' },
      unit_amount: 1200 + calculateTax(1200, customerState), // Manual tax
    },
    quantity: 1,
  }],
  mode: 'payment',
  success_url: `${origin}/success`,
  cancel_url: `${origin}/cancel`,
})

// GOOD - Stripe Tax handles complexity
const session = await stripe.checkout.sessions.create({
  line_items: [{
    price: 'price_xxx', // Price created in Stripe Dashboard with tax code
    quantity: 1,
  }],
  mode: 'payment',
  automatic_tax: { enabled: true }, // Stripe calculates tax
  success_url: `${origin}/success`,
  cancel_url: `${origin}/cancel`,
})
```

**Shipping tax handling:**
- Use preset "txcd_92010001" tax code for shipping
- Stripe automatically determines if shipping is taxable in jurisdiction
- Applies correct tax rate (may differ from product tax rate)

**Warning signs:**
- Hard-coded tax rates in codebase
- Tax calculation logic longer than 5 lines
- Customer complaints about incorrect tax amounts
- No plan for handling multi-state nexus

**Phase to address:**
Phase 2 (Payments) — enable during initial Stripe Checkout implementation. Retrofitting tax logic is expensive.

---

### Pitfall 10: Exit Intent Popup Doesn't Work on Mobile (70%+ of Traffic)

**What goes wrong:**
Exit intent popup implemented with mouse movement detection. Works perfectly on desktop. Mobile users (70% of DTC traffic) never see popup. Email capture rate tanks.

**Why it happens:**
Traditional exit intent relies on cursor movement toward browser chrome. Mobile devices have no cursor. Browser security restrictions prevent tracking back button or tab switching on mobile.

**How to avoid:**
- Don't use mouse-based exit intent for mobile
- Use alternative triggers for mobile:
  - **Scroll up detection**: Trigger when user scrolls up (to access URL bar)
  - **Scroll depth**: Show after user scrolls 50-70% down page
  - **Time on page**: Display after 45-60 seconds of engagement
  - **Rage clicks**: Detect frustration behaviors
- Use non-intrusive formats for mobile:
  - Bottom slide-in bar (doesn't block content)
  - Floating sticky bar
  - Inline email capture (no popup)
- Avoid full-screen overlays on mobile (terrible UX)

```typescript
// BAD - only works on desktop
useEffect(() => {
  const handleMouseLeave = (e) => {
    if (e.clientY < 10) { // Mouse near top of viewport
      showExitPopup()
    }
  }

  document.addEventListener('mouseleave', handleMouseLeave)
  return () => document.removeEventListener('mouseleave', handleMouseLeave)
}, [])

// GOOD - works on mobile with scroll-up detection
useEffect(() => {
  let lastScrollY = window.scrollY

  const handleScroll = () => {
    const currentScrollY = window.scrollY

    // User scrolling up (toward URL bar)
    if (currentScrollY < lastScrollY && currentScrollY < 100) {
      showExitIntent()
    }

    lastScrollY = currentScrollY
  }

  window.addEventListener('scroll', handleScroll, { passive: true })
  return () => window.removeEventListener('scroll', handleScroll)
}, [])

// BETTER - use time + scroll depth for mobile
useEffect(() => {
  const isMobile = window.innerWidth < 768

  if (isMobile) {
    // Show after 45 seconds on page
    const timer = setTimeout(showEmailCapture, 45000)
    return () => clearTimeout(timer)
  } else {
    // Desktop: use mouse-based exit intent
    document.addEventListener('mouseleave', handleMouseLeave)
    return () => document.removeEventListener('mouseleave', handleMouseLeave)
  }
}, [])
```

**Mobile-specific best practices:**
- Use sticky bottom bar instead of full-screen overlay
- Delay popup until user shows engagement (scroll, time on site)
- Make dismissal obvious and easy (large X button)
- Never show popup on first page load on mobile
- Respect user dismissal (don't show again for 7 days)

**Warning signs:**
- Exit intent only tested on desktop
- No mobile-specific trigger logic
- Full-screen popups on mobile
- Email capture rate much lower on mobile vs desktop

**Phase to address:**
Phase 3 (Launch Prep) — during email capture implementation. Test on actual mobile devices.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip webhook signature verification | Faster development | Security vulnerability, fraudulent orders | Never — always verify |
| Hard-code product prices in code | Avoid Stripe Dashboard setup | Price changes require code deployment | Never — use Stripe Products/Prices |
| Store cart in React state only | Simple implementation | Lost cart on refresh, can't recover abandoned carts | Only for POC/demo |
| Use client components for everything | Simpler mental model | Breaks SEO, larger bundles, worse performance | Never with ecommerce |
| Skip image optimization | Faster development | Poor Lighthouse scores, slow load times, lower conversions | Never — use Next.js Image |
| Manual tax calculation | No Stripe Tax fee (0.5%) | Bugs, compliance risk, maintenance burden | Only if selling in single state with no nexus expansion plans |
| Require account creation | Capture user data | 24% cart abandonment increase | Only for subscription products |
| Handle fulfillment on success page | Simpler code flow | Missed orders when customer doesn't reach page | Never — always use webhooks |
| Single webhook endpoint for all events | Less code | Slow responses, timeout issues, hard to debug | Only for MVP with <10 orders/day |

## Integration Gotchas

Common mistakes when connecting Next.js + Stripe + Vercel.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Stripe Webhook → Next.js | Using `app.use(express.json())` or middleware that parses body before webhook handler | Access raw body with `await request.text()` in Route Handlers, or disable bodyParser in API Routes |
| Stripe Checkout redirect | Relative URLs like `/success` fail in production | Use absolute URLs with domain: `${process.env.NEXT_PUBLIC_URL}/success` |
| Environment variables | Using client-side `NEXT_PUBLIC_` prefix for secret keys | Never expose secret keys — use server-only vars (no prefix), access in Server Components/Route Handlers |
| Stripe Checkout Session | Passing sensitive data in metadata that appears in URLs | Store order details server-side, only pass session ID to client |
| Zustand + localStorage | Accessing store during SSR causes hydration mismatch | Use persist middleware with SSR check: `typeof window !== 'undefined'` |
| Next.js Image + Stripe | Loading product images from Stripe CDN without domain config | Add `images: { domains: ['files.stripe.com'] }` to next.config.js |
| Vercel deployment | Environment variables set globally instead of per-environment | Set test keys for Preview, live keys for Production only |
| Stripe webhook secret | Using same secret for test and live modes | Each mode has different webhook secret — store both, use environment-appropriate one |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all products client-side | Initial page load fetches 100+ product JSON | Use Server Components to fetch data, stream with Suspense | >50 products or >2MB product data |
| No image optimization | 5MB hero image, 2MB product photos | Use Next.js Image with priority for hero, lazy load for below fold | First user visit — immediate LCP failure |
| Inline webhook processing | Webhook times out, Stripe retries, creates duplicates | Queue events for async processing, return 200 immediately | >10 orders/hour or any slow external API calls |
| Client-side cart recalculation | Cart totals calculated in browser, mismatch with Stripe amount | Validate cart server-side before creating Checkout Session | First malicious user or first complex discount |
| No CDN for images | Images served from Vercel serverless functions | Use Vercel Edge Network or separate CDN (Cloudinary, Imgix) | >1000 visitors/day or international traffic |
| Synchronous order creation | Webhook waits for database, email, inventory update before returning | Use transaction queue, return 200 to Stripe first | >50 orders/day or database latency >100ms |
| localStorage cart without compression | 100-item cart exceeds 5MB localStorage limit | Compress cart data or use IndexedDB for large carts | >50 items in cart or complex product data |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing Stripe secret key in client bundle | Anyone can charge cards, refund orders, access customer data | Never use `NEXT_PUBLIC_` prefix for secret keys, only access in Server Components/Route Handlers |
| Not verifying webhook signatures | Attacker sends fake "payment succeeded" webhooks, free products | Always verify signature with `stripe.webhooks.constructEvent()` |
| Trusting client-side cart total | User manipulates cart total in DevTools, pays $1 for $100 order | Recalculate cart total server-side before creating Checkout Session |
| Storing customer emails in localStorage | XSS attack steals customer email list | Store in server-side database only, never in client storage |
| No rate limiting on checkout endpoint | Attacker creates thousands of Checkout Sessions, exhausts Stripe rate limits | Implement rate limiting (10 requests/minute per IP) |
| Hardcoding webhook endpoint | Attacker finds endpoint, spams with fake events | Use long random path (`/api/webhooks/stripe-${RANDOM}`), verify signature |
| Returning detailed error messages | Webhook handler returns "Database connection failed" → attacker learns infrastructure | Return generic "Webhook processing failed" message, log details server-side |
| No HTTPS in production | Stripe webhook requests fail (Stripe requires TLS 1.2+) | Vercel provides HTTPS by default, but verify custom domains have valid certificates |

## UX Pitfalls

Common user experience mistakes in DTC ecommerce.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Requiring account creation | 24% cart abandonment, 34% cite "forced account creation" as reason | Guest checkout by default, offer account creation after purchase |
| Form with 15+ fields | 26% abandon due to "too complicated checkout" | Minimize to: email, card, shipping address (8 fields max) |
| Hiding shipping cost until final step | 48% abandon due to "unexpected costs" (top reason) | Show shipping cost early, display total before checkout button |
| No mobile-optimized checkout | 85% mobile cart abandonment (20% higher than desktop) | Single-page checkout, large touch targets, auto-fill support |
| Full-screen exit popup on mobile | User frustration, accidental closes, can't dismiss easily | Use bottom slide-in bar or scroll-based inline capture |
| Slow page load (>3s) | 53% mobile users abandon if load takes >3s | Optimize images with priority, aim for LCP <2.5s |
| No loading state on "Add to Cart" | User clicks multiple times, adds duplicate items | Show spinner/check mark, disable button during request |
| Cart drawer doesn't show on add | User unsure if item was added, navigates to cart page to check | Auto-open cart drawer on successful add |
| No error recovery on payment failure | User sees generic "error occurred", doesn't know what to do | Show specific error ("Card declined - try different card"), allow retry |
| Product images not zoomable | User can't see product details, especially on mobile | Enable image zoom/gallery, high-res images |
| No social proof | User doubts product quality, hesitates to buy | Show reviews, ratings, "X people bought this today" |
| No clear return policy | User fears commitment, doesn't complete purchase | Display return policy on product page, link in footer |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Stripe integration:** Works with test cards — verify webhook signature verification is enabled (not just working)
- [ ] **Webhook handling:** Receives events — verify idempotency checks prevent duplicate processing
- [ ] **Order fulfillment:** Creates orders — verify handles both instant and delayed payment methods
- [ ] **Cart persistence:** Cart saves on refresh — verify no hydration mismatch errors in console
- [ ] **Image optimization:** Images load — verify hero image has `priority` prop and LCP <2.5s
- [ ] **SEO metadata:** Pages have titles — verify social media share preview shows correct image/description
- [ ] **Mobile checkout:** Works on simulator — verify tested on real mobile devices (iOS Safari, Android Chrome)
- [ ] **Error handling:** Shows errors — verify Stripe errors displayed to user with actionable messages
- [ ] **Environment variables:** App runs — verify test keys in dev, live keys in production, not mixed
- [ ] **Tax calculation:** Checkout shows tax — verify uses Stripe Tax API, not hard-coded rates
- [ ] **Exit intent:** Popup shows — verify works on mobile with scroll/time triggers, not just desktop mouse
- [ ] **Loading states:** Buttons work — verify show spinner during async actions, disable to prevent double-submit
- [ ] **Webhook response time:** Webhooks succeed — verify returns 200 in <3 seconds, processes async
- [ ] **Guest checkout:** Can purchase — verify doesn't require account creation (24% abandonment risk)
- [ ] **Shipping costs:** Shown to user — verify displayed before checkout, not surprise at end

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Hydration mismatch from cart | MEDIUM | Wrap cart components in Suspense, use useEffect for localStorage access, add loading state |
| Webhook signature verification failure | LOW | Check environment variables (test vs live secret), verify raw body not parsed, test with Stripe CLI |
| Missed orders (fulfillment on client) | HIGH | Audit Stripe Checkout Sessions vs database orders, manually fulfill missing orders, refactor to webhook-based fulfillment |
| Delayed payment not handled | MEDIUM | Search for async_payment_succeeded events in Stripe, manually fulfill those orders, add event handler |
| Poor LCP from missing priority | LOW | Add priority to hero image, redeploy, verify with Lighthouse |
| Client component breaks SEO | MEDIUM | Refactor to Server Component + Client child components, test with social media debuggers |
| Slow webhook causes duplicates | HIGH | Add idempotency checks immediately, identify duplicate orders, refund/cancel duplicates, implement queue |
| Test keys in production | CRITICAL | Update Vercel environment variables to live keys immediately, verify no test transactions in live mode, test live checkout |
| Manual tax calculation wrong | HIGH | Enable Stripe Tax, recalculate all past orders, issue refunds for overcharged tax, notify undercharged customers |
| Exit intent doesn't work on mobile | LOW | Add scroll-up or time-based trigger, use bottom bar instead of popup, test on real devices |
| No guest checkout | MEDIUM | Make account creation optional, allow guest checkout, measure impact on conversion rate |
| Webhook timeout/duplicates | MEDIUM | Implement queue (BullMQ, Inngest), return 200 immediately, add idempotency checks, deduplicate existing orders |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Hydration mismatch from cart | Phase 1: Foundation | Console shows no hydration errors, cart badge shows correct count immediately |
| Webhook signature verification | Phase 2: Payments | Stripe CLI `trigger payment_intent.succeeded` passes verification |
| Fulfillment on client vs webhook | Phase 2: Payments | Close browser before success page — order still created via webhook |
| Delayed payment methods | Phase 2: Payments | Test with ACH payment method, verify order pending until payment succeeds |
| Missing image priority | Phase 1: Foundation | Lighthouse mobile LCP <2.5s, hero image preloaded |
| Client component SEO | Phase 1: Foundation | Social media debugger shows correct OG image/description |
| Slow webhook response | Phase 2: Payments | Webhook responds <1s, New Relic/Sentry shows no timeouts |
| Test vs live key mix-up | Phase 3: Launch Prep | Production uses `sk_live_`, staging uses `sk_test_` |
| Manual tax calculation | Phase 2: Payments | Stripe Tax enabled, no hard-coded rates in codebase |
| Exit intent on mobile | Phase 3: Launch Prep | Test on iPhone/Android, popup shows with scroll trigger |
| Forced account creation | Phase 1: Foundation | Can complete checkout without creating account |
| Webhook timeout/duplicates | Phase 2: Payments | Webhook processing time <3s, queue handles async work |

## Phase-Specific Deep Dive Flags

Areas likely to need additional research during execution.

| Phase | Area | Why It May Need Research |
|-------|------|-------------------------|
| Phase 1 | Cart state with Zustand + Next.js SSR | Persist middleware setup, hydration prevention patterns not well documented |
| Phase 2 | Stripe webhook idempotency | Implementation varies by database (Postgres vs Redis), concurrency handling complex |
| Phase 2 | Stripe Tax API setup | Tax code assignment per product, shipping tax treatment, testing in different jurisdictions |
| Phase 3 | Email capture popup on mobile | Scroll detection on iOS Safari vs Android Chrome behavior differs |
| Phase 3 | Lighthouse optimization | App Router caching strategies interact with performance metrics in unexpected ways |

## Sources

**Next.js App Router Pitfalls:**
- [Common mistakes with the Next.js App Router (Vercel Official)](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them)
- [App Router pitfalls: common mistakes and practical ways to avoid them](https://imidef.com/en/2026-02-11-app-router-pitfalls)
- [Text content does not match server-rendered HTML (Next.js Docs)](https://nextjs.org/docs/messages/react-hydration-error)
- [Resolving hydration mismatch errors in Next.js (LogRocket)](https://blog.logrocket.com/resolving-hydration-mismatch-errors-next-js/)

**Stripe Webhooks:**
- [Receive Stripe events in your webhook endpoint (Stripe Docs)](https://docs.stripe.com/webhooks)
- [Resolve webhook signature verification errors (Stripe Docs)](https://docs.stripe.com/webhooks/signature)
- [Fulfill orders (Stripe Docs)](https://docs.stripe.com/checkout/fulfillment)
- [Stripe Webhooks: Complete Guide with Event Examples](https://www.magicbell.com/blog/stripe-webhooks-guide)

**Stripe Tax:**
- [Set up Stripe Tax (Stripe Docs)](https://docs.stripe.com/tax/set-up)
- [Automatically collect tax on Checkout sessions (Stripe Docs)](https://docs.stripe.com/tax/checkout)
- [Specify product tax codes and tax behavior (Stripe Docs)](https://docs.stripe.com/tax/products-prices-tax-codes-tax-behavior)

**Next.js Image Optimization:**
- [Optimizing: Images (Next.js Docs)](https://nextjs.org/docs/14/app/building-your-application/optimizing/images)
- [Components: Image Component (Next.js Docs)](https://nextjs.org/docs/app/api-reference/components/image)
- [Next.js Image Optimization Techniques 2026](https://webpeak.org/blog/nextjs-image-optimization-techniques/)
- [Next.js performance tuning: practical fixes for better Lighthouse scores](https://www.qed42.com/insights/next-js-performance-tuning-practical-fixes-for-better-lighthouse-scores)

**Next.js SEO & Metadata:**
- [Functions: generateMetadata (Next.js Docs)](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Getting Started: Metadata and OG images (Next.js Docs)](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)

**Mobile Checkout UX:**
- [50 Cart Abandonment Rate Statistics 2026 (Baymard Institute)](https://baymard.com/lists/cart-abandonment-rate)
- [Optimizing the Checkout Process to Reduce Abandoned Carts](https://www.mobiloud.com/blog/optimizing-checkout-to-reduce-abandoned-carts)
- [15 Ecommerce Checkout & Cart UX Best Practices for 2026](https://www.designstudiouiux.com/blog/ecommerce-checkout-ux-best-practices/)

**Exit Intent on Mobile:**
- [Everything You Need to Know about Mobile Exit Intent](https://wisepops.com/blog/mobile-exit-intent)
- [Exit Intent Popups vs Scroll Based Popups: 2026 Guide](https://www.hellobar.com/blog/exit-intent-popups-vs-scroll-based-popups/)
- [How To Create Mobile Exit-Intent Popups That Convert](https://optinmonster.com/how-to-create-a-mobile-exit-intent-popup/)

**DTC Food Ecommerce:**
- [How To Sell Food DTC: Proven Trends and Strategies for 2026 (Shopify)](https://www.shopify.com/enterprise/blog/dtc-food)
- [Guest Checkout: Simplify Purchases and Boost Sales (Shopify)](https://www.shopify.com/enterprise/blog/guest-checkout)

**Stripe Mode Switching:**
- [Go-live checklist (Stripe Docs)](https://docs.stripe.com/get-started/checklist/go-live)
- [Handle different modes (Stripe Docs)](https://docs.stripe.com/stripe-apps/handling-modes)

**Next.js Route Handlers & Webhooks:**
- [STRIPE WEBHOOK - Cannot access request raw body (GitHub Issue)](https://github.com/vercel/next.js/issues/60002)
- [How To Add Stripe Webhook Using NextJS 13 App Router (GeeksforGeeks)](https://www.geeksforgeeks.org/reactjs/how-to-add-stripe-webhook-using-nextjs-13-app-router/)
- [Complete Stripe Webhook Guide for Next.js](https://www.hookrelay.io/guides/nextjs-webhook-stripe)

**Vercel + Stripe Security:**
- [Securing Your Secrets: How to Deploy Environment Variables to Vercel](https://llamazookeeper.medium.com/securing-your-secrets-how-to-deploy-environment-variables-to-vercel-without-committing-your-env-c1ca47b35832)
- [Getting started with Next.js, TypeScript, and Stripe Checkout (Vercel KB)](https://vercel.com/kb/guide/getting-started-with-nextjs-typescript-stripe)

**Cart State Management:**
- [How to Build a Shopping Cart with Next.js and Zustand](https://hackernoon.com/how-to-build-a-shopping-cart-with-nextjs-and-zustand-state-management-with-typescript)
- [Managing persistent States in Nextjs with Zustand](https://blog.devgenius.io/managing-persistent-states-in-nextjs-with-zustand-e6feea1a2d36)

**Stripe Payment Methods:**
- [Compare the Checkout Sessions and Payment Intents APIs (Stripe Docs)](https://docs.stripe.com/payments/checkout-sessions-and-payment-intents-comparison)

---
*Pitfalls research for: Jamaica House Brand DTC Ecommerce (Next.js 14 + Stripe + Vercel)*
*Researched: 2026-02-17*
*Confidence: HIGH (verified with official documentation and current 2026 resources)*
