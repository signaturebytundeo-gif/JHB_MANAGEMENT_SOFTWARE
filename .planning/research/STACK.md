# Technology Stack

**Project:** JHB Command Center — Integration Milestone
**Domain:** Stripe Webhook Bridge + PostgreSQL Migration + Vercel Deployment
**Researched:** 2026-02-24
**Confidence:** HIGH (all critical findings verified against official docs and current package versions)

---

## Scope: What This Document Covers

This is a **subsequent milestone** stack document. The core stack (Next.js 16.1.6, Prisma 7.4, shadcn/ui, React Hook Form + Zod, JWT/Jose, Resend, Tailwind v4, TypeScript 5.9) is already in production and is NOT re-researched here.

This document covers only the **new additions** required for:
1. Migrating Prisma from SQLite to PostgreSQL (Neon)
2. Receiving and verifying Stripe webhooks in the command-center
3. Deploying Next.js + Prisma to Vercel with serverless functions
4. Near-real-time dashboard KPI updates

---

## What's Already Installed (No Action Needed)

A review of `apps/command-center/package.json` shows several relevant packages already present:

| Package | Version Installed | Status |
|---------|------------------|--------|
| `@neondatabase/serverless` | `^1.0.2` | Already installed — no new install needed |
| `@prisma/adapter-libsql` | `^7.4.0` | Can be removed after PostgreSQL migration |
| `@prisma/adapter-better-sqlite3` | `^7.4.0` | Can be removed after PostgreSQL migration |
| `@libsql/client` | `^0.17.0` | Can be removed after PostgreSQL migration |
| `better-sqlite3` | `^12.6.2` | Can be removed after PostgreSQL migration |
| `stripe` | `^20.3.1` (ecommerce) | In ecommerce app — must also install in command-center |

The ecommerce app (`apps/ecommerce/package.json`) uses `stripe ^20.3.1`. This is the correct version. The command-center does not yet have `stripe` installed directly.

---

## New Stack Additions Required

### 1. PostgreSQL via Neon — Database Provider Change

**What changes:** Prisma datasource provider switches from `sqlite` to `postgresql`. The existing `@neondatabase/serverless` package (already installed) provides the HTTP-based connection for Vercel's serverless environment. Add `@prisma/adapter-neon` to bridge Prisma Client to the Neon driver.

| Package | Version | Purpose | Action |
|---------|---------|---------|--------|
| `@neondatabase/serverless` | `^1.0.2` (already installed) | HTTP-based PostgreSQL driver for serverless | Already present — no install needed |
| `@prisma/adapter-neon` | `^7.4.0` | Prisma driver adapter for Neon serverless driver | Install — must match Prisma major version |

**Why Neon over Supabase/PlanetScale/Railway for this project:**
- Vercel and Neon have a first-party integration — database provisioning flows directly from Vercel dashboard
- Neon provides preview database branching that aligns with Vercel preview deployments (each PR gets its own database branch)
- HTTP transport (not TCP) works in Vercel's serverless function timeout constraints
- `@neondatabase/serverless` is already in `package.json` — switching to Supabase would require replacing an installed package with a different driver
- Free tier is sufficient for JHB's current scale; Neon's scale-to-zero matches infrequent command-center usage patterns

**Why NOT Prisma Accelerate:** Prisma Accelerate adds latency (edge proxy) and cost for a single-app internal tool. Direct Neon with the adapter is simpler and free.

**Why NOT @prisma/adapter-libsql for PostgreSQL:** libsql is SQLite-compatible only. It is already installed but serves the SQLite adapter role. After migration, it becomes dead weight.

#### Schema Changes (prisma/schema.prisma)

The SQLite datasource block must change:

```prisma
// BEFORE (SQLite)
datasource db {
  provider = "sqlite"
}

// AFTER (PostgreSQL — Prisma 7 style)
datasource db {
  provider = "postgresql"
}
```

In Prisma 7+, the `url` property is no longer set in `schema.prisma`. The connection URL is configured in `prisma.config.ts` (CLI operations use `DIRECT_URL`, application runtime uses `DATABASE_URL` through the adapter).

#### New File: prisma.config.ts (project root of command-center)

```typescript
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DIRECT_URL'),  // Direct (non-pooled) URL for migrations
  },
})
```

#### PrismaClient Instantiation (lib/prisma.ts — updated)

```typescript
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

// Required for local development (Node.js doesn't have native WebSockets for Neon)
if (process.env.NODE_ENV !== 'production') {
  neonConfig.webSocketConstructor = ws
}

const adapter = new PrismaNeon(process.env.DATABASE_URL!)

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Note on `ws` package:** Neon's serverless driver uses WebSockets in non-Edge environments. In local Node.js dev, a `ws` polyfill is needed. In Vercel's serverless runtime, the native WebSocket API is available. Install `ws` as a dev dependency: `yarn workspace jhb-command-center add -D ws @types/ws`.

#### Environment Variables Required

```bash
# .env (local development)
DATABASE_URL="postgresql://[user]:[pass]@[endpoint]-pooler.[region].aws.neon.tech/[dbname]?sslmode=require"
DIRECT_URL="postgresql://[user]:[pass]@[endpoint].[region].aws.neon.tech/[dbname]?sslmode=require"
```

Two URLs are required:
- `DATABASE_URL` — pooled connection string (hostname contains `-pooler`). Used by the application at runtime through the Neon adapter. Neon uses PgBouncer in transaction mode — safe for serverless's many short-lived connections.
- `DIRECT_URL` — direct (non-pooled) connection string (no `-pooler` in hostname). Used only by Prisma CLI (`migrate dev`, `migrate deploy`). Migrations require a direct connection; pooled connections in transaction mode cannot run DDL reliably.

**In Vercel dashboard:** Set both `DATABASE_URL` and `DIRECT_URL` in project environment variables. The Vercel-Neon integration can auto-populate these.

---

### 2. Stripe Webhooks — Receiving Events in Command-Center

**What changes:** The ecommerce site at `jamaicahousebrand.com` already processes Stripe webhooks for payment confirmation. The command-center needs its own webhook endpoint to receive the same (or forwarded) events and write them to the command-center PostgreSQL database.

**Decision — Two webhook endpoints vs. forwarding:**
Register the command-center API route as a second webhook endpoint directly in Stripe dashboard. Do NOT create a forwarding proxy from ecommerce → command-center. Two independent endpoints is simpler, more reliable, and Stripe supports multiple endpoints per account at no extra cost.

| Package | Version | Purpose | Action |
|---------|---------|---------|--------|
| `stripe` | `^20.3.1` | Stripe Node SDK — webhook verification, event typing | Install in command-center workspace |

**Version rationale:** 20.3.1 is the current latest (confirmed February 2026). Ecommerce already uses this version. Using the same version across both apps eliminates type incompatibilities when sharing event type definitions.

**Do NOT install:** `@stripe/stripe-js` or `@stripe/react-stripe-js` in the command-center. Those packages are for frontend Stripe Elements (payment forms). The command-center only receives webhooks server-side — no payment collection UI needed.

#### Webhook Route Handler (App Router pattern)

Stripe requires the **raw request body** for signature verification. The Next.js App Router provides `request.text()` to access the raw body. The App Router does NOT need `bodyParser: false` config (that was Pages Router).

```typescript
// apps/command-center/app/api/webhooks/stripe/route.ts

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
})

export async function POST(request: Request) {
  const body = await request.text()  // Raw body — required for signature verification
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    return new Response(`Webhook signature verification failed`, { status: 400 })
  }

  // Route to event handlers
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object)
      break
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object)
      break
    // Add events as needed
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 })
}
```

#### Idempotency (critical for webhooks)

Stripe may send the same event multiple times. The command-center must record the `event.id` (a Stripe-provided unique ID like `evt_xxx`) and check for duplicates before processing. Store processed event IDs in a `StripeEvent` table in PostgreSQL with a unique constraint on `stripeEventId`.

#### Environment Variables for Stripe

```bash
# .env (command-center)
STRIPE_SECRET_KEY="sk_live_..."       # Or sk_test_ for development
STRIPE_WEBHOOK_SECRET="whsec_..."      # From Stripe dashboard for this specific endpoint
```

**Critical:** The `STRIPE_WEBHOOK_SECRET` is endpoint-specific. When you add a new webhook endpoint in the Stripe dashboard pointing to the command-center URL, Stripe generates a new signing secret for that endpoint. It is NOT the same secret used by the ecommerce app's webhook endpoint.

#### Local Development Testing

Use the Stripe CLI to forward events to localhost:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This avoids exposing localhost publicly and provides the correct test `STRIPE_WEBHOOK_SECRET` for local development.

---

### 3. Vercel Deployment — Next.js + Prisma in Monorepo

**What changes:** The command-center deploys to Vercel as a separate project within the monorepo. Vercel needs to be configured with the correct Root Directory (`apps/command-center`) and a build command that generates the Prisma Client and runs migrations.

#### Vercel Project Configuration

| Setting | Value | Why |
|---------|-------|-----|
| Root Directory | `apps/command-center` | Points Vercel to the correct workspace in the monorepo |
| Build Command | `yarn build` or `prisma generate && prisma migrate deploy && next build` | Must generate Prisma Client before Next.js build |
| Install Command | `yarn install` (from root) | Yarn workspaces requires install from monorepo root |
| Framework Preset | Next.js | Auto-detected |

**Recommended: Add `postinstall` script to command-center's package.json:**

```json
{
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "postinstall": "prisma generate"
  }
}
```

Vercel runs `postinstall` after `yarn install` automatically. This ensures the Prisma Client is generated from the schema every deployment. For migrations, use a separate build command override in Vercel settings:

```
npx prisma migrate deploy && next build
```

**Why `migrate deploy` not `migrate dev`:** `migrate deploy` applies existing migration files without creating new ones. It is safe for CI/CD. `migrate dev` creates migration files interactively and should never run in production.

**Why NOT to run migrations automatically on every deploy (alternative view):** For teams with careful change management, running `prisma migrate deploy` on every deploy is acceptable since it's idempotent for already-applied migrations. Given JHB's small team size, automatic migration on deploy is recommended — it eliminates a manual step.

#### No Additional Vercel Packages Needed

Vercel's serverless runtime supports Next.js natively. No `@vercel/node`, `@vercel/postgres`, or special adapters are needed beyond what's already configured. The Neon adapter handles the PostgreSQL connection correctly within Vercel's function environment.

**Note on Vercel Fluid Compute:** Vercel is rolling out Fluid Compute (persistent connections between requests). For now, the stateless serverless approach with Neon's connection pooler is the safer, more established pattern.

#### Monorepo Deployment — Key Points

- Create **one Vercel project** for the command-center. Do not create a second project for the ecommerce app unless that app also needs Vercel deployment.
- Vercel automatically detects Yarn Workspaces and will only rebuild the command-center when `apps/command-center/**` files change (skips-unaffected-projects feature).
- Both `DATABASE_URL` and `DIRECT_URL` must be set in Vercel's environment variables (Settings > Environment Variables). The Vercel-Neon integration can inject these automatically when linking.

---

### 4. Dashboard KPI Updates — Near-Real-Time

**Decision: SWR polling over SSE or WebSockets.**

For a command-center dashboard used by 2-5 internal users, SWR's `refreshInterval` polling is the correct choice. SSE and WebSockets add infrastructure complexity (long-lived connections conflict with Vercel's serverless timeout model) with no meaningful advantage at this user count.

| Package | Version | Purpose | Action |
|---------|---------|---------|--------|
| `swr` | `^2.3.6` | Client-side data fetching with polling | Install in command-center |

**Why SWR over React Query:** The project already uses no global state library. SWR is lighter and well-integrated with Next.js (made by Vercel). React Query is equally valid but heavier — SWR is sufficient for dashboard polling.

**Why NOT SSE for this project:** Vercel serverless functions have a maximum execution time (10s on Hobby, 60s on Pro). SSE requires a persistent open connection — incompatible with this model unless using Vercel's streaming response API, which adds complexity. SWR polling at 30-60 second intervals is indistinguishable from SSE at the usage frequency of an internal ops dashboard.

**Why NOT WebSockets:** Same serverless timeout problem as SSE. Requires a separate WebSocket server or Pusher/Ably, neither of which is warranted for 2-5 internal users checking a dashboard.

#### KPI Polling Pattern

```typescript
// 'use client' component
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function KPIDashboard() {
  const { data, error, isLoading } = useSWR(
    '/api/dashboard/kpis',
    fetcher,
    {
      refreshInterval: 60_000,     // Refresh every 60 seconds
      revalidateOnFocus: true,     // Refresh when tab regains focus
      revalidateOnReconnect: true, // Refresh after network reconnects
    }
  )
  // render KPI cards from data
}
```

**Recommended refresh intervals:**
- Revenue and order KPIs: 60 seconds (webhook-driven updates, no need for < 60s)
- Inventory levels: 120 seconds (changes less frequently)
- Active alerts: 30 seconds (time-sensitive)

---

## Complete Installation Commands

Run from the monorepo root:

```bash
# Add @prisma/adapter-neon to command-center (must match Prisma version 7.x)
yarn workspace jhb-command-center add @prisma/adapter-neon@^7.4.0

# Add stripe to command-center (match ecommerce version)
yarn workspace jhb-command-center add stripe@^20.3.1

# Add SWR for dashboard polling
yarn workspace jhb-command-center add swr@^2.3.6

# Add ws for local development with Neon (dev dependency only)
yarn workspace jhb-command-center add -D ws @types/ws

# Remove SQLite-specific packages after PostgreSQL migration is validated
yarn workspace jhb-command-center remove @prisma/adapter-better-sqlite3 @prisma/adapter-libsql @libsql/client better-sqlite3
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Neon PostgreSQL | Supabase PostgreSQL | Supabase is valid but `@neondatabase/serverless` is already installed; Neon-Vercel integration is first-party; no reason to change |
| Neon PostgreSQL | PlanetScale | PlanetScale uses Vitess (MySQL-compatible), incompatible with existing Prisma schema which has SQLite/PostgreSQL semantics |
| Neon direct + adapter | Prisma Accelerate | Accelerate adds edge proxy latency and cost for an internal tool; direct Neon with adapter is simpler |
| Stripe (server-side) | — | No alternative — Stripe is already the payment processor on ecommerce; must use same SDK |
| SWR polling | Server-Sent Events | SSE incompatible with Vercel serverless timeout model; overkill for 2-5 internal users |
| SWR polling | WebSockets / Pusher | Same serverless constraint; adds external service cost |
| SWR polling | React Query | SWR is lighter; made by Vercel; sufficient for dashboard polling |
| Two Stripe webhook endpoints | Forwarding proxy (ecommerce → command-center) | Forwarding proxy is a single point of failure; two independent endpoints is more reliable |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@stripe/stripe-js` in command-center | Client-side Stripe Elements library — for payment forms, not webhook processing | `stripe` (server-only Node SDK) |
| `@stripe/react-stripe-js` in command-center | React components for Stripe Elements — not needed; command-center has no payment UI | Nothing — command-center receives webhooks only |
| `@vercel/postgres` | Vercel's wrapper around Neon — adds a layer of abstraction with no benefit when using Prisma. `@neondatabase/serverless` already installed | `@neondatabase/serverless` + `@prisma/adapter-neon` |
| Supabase Realtime / Pusher / Ably | Real-time services add external dependencies, monthly cost, and infrastructure for 2-5 internal users | SWR polling |
| `prisma migrate dev` in Vercel build | Creates migration files interactively — will fail in CI; unsafe for production | `prisma migrate deploy` |
| `DATABASE_URL` for Prisma CLI migrations | Pooled connections (PgBouncer transaction mode) cannot reliably run DDL statements | `DIRECT_URL` (non-pooled) for CLI, `DATABASE_URL` (pooled) for app runtime |
| Pages Router body parser config for Stripe webhooks | App Router doesn't use body parser config — `export const config = { api: { bodyParser: false } }` is Pages Router only | `const body = await request.text()` in App Router route handler |

---

## Schema Migration Checklist

When migrating from SQLite to PostgreSQL, the following Prisma schema items require attention:

| Issue | SQLite Behavior | PostgreSQL Fix |
|-------|----------------|----------------|
| `Decimal` type | Stored as TEXT in SQLite | Native DECIMAL in PostgreSQL — no change to schema, behavior improves |
| `DateTime` | ISO string in SQLite | Native TIMESTAMP in PostgreSQL — no change to schema |
| Enums (`Role`, `BatchStatus`, etc.) | Not natively supported in SQLite — Prisma emulates them | Native PostgreSQL enums — no schema change needed, performance improves |
| Case sensitivity | SQLite string comparisons are case-insensitive by default | PostgreSQL is case-sensitive — check any `contains` or `equals` queries on string fields |
| `@@unique` constraints | Supported | Supported — no change |
| `@default(cuid())` | Supported via Prisma | Supported via Prisma — no change |
| Migration files | Existing SQLite migrations are NOT compatible | Run `prisma migrate dev --name postgres-migration` on fresh PostgreSQL database to create new baseline |

**Migration strategy:** Do not attempt to replay SQLite migration files against PostgreSQL. Create a fresh baseline migration against the PostgreSQL database. The production command-center has no live data yet (pre-deployment), so there is no data to migrate.

---

## Version Compatibility Matrix

| Package | Version | Compatible With | Notes |
|---------|---------|----------------|-------|
| `@prisma/adapter-neon` | `^7.4.0` | Prisma `^7.4.0`, `@neondatabase/serverless ^1.0.2` | Must match Prisma major.minor version |
| `@neondatabase/serverless` | `^1.0.2` | `@prisma/adapter-neon ^7.4.0` | Already installed |
| `stripe` | `^20.3.1` | TypeScript 5.9 (types bundled) | No separate `@types/stripe` needed — types are bundled |
| `swr` | `^2.3.6` | React 19, Next.js 16 App Router | Mark SWR components `'use client'` — SWR hooks cannot run in Server Components |

---

## Sources

- [Neon Docs: Connect from Prisma to Neon](https://neon.com/docs/guides/prisma) — Prisma 7+ datasource config, two-URL pattern (HIGH confidence — official Neon docs, last updated February 15, 2026)
- [Neon Docs: Schema Migrations with Prisma](https://neon.com/docs/guides/prisma-migrations) — `prisma.config.ts` pattern, migration workflow (HIGH confidence — official Neon docs)
- [Prisma Docs: Deploy to Vercel](https://www.prisma.io/docs/orm/prisma-client/deployment/serverless/deploy-to-vercel) — postinstall script, `migrate deploy` pattern (HIGH confidence — official Prisma docs)
- [Stripe Docs: Receive Stripe events](https://docs.stripe.com/webhooks) — `constructEvent`, raw body requirement (HIGH confidence — official Stripe docs)
- [Vercel Docs: Using Monorepos](https://vercel.com/docs/monorepos) — Root Directory setting, yarn workspaces deployment (HIGH confidence — official Vercel docs)
- [SWR Docs: Usage with Next.js](https://swr.vercel.app/docs/with-nextjs) — App Router compatibility, `'use client'` requirement (HIGH confidence — official SWR/Vercel docs)
- `apps/command-center/package.json` — Confirmed `@neondatabase/serverless ^1.0.2` already installed, `stripe` not yet in command-center
- `apps/ecommerce/package.json` — Confirmed `stripe ^20.3.1` is the project's current Stripe version
- npm search results (February 2026) — `stripe` latest: 20.3.1, `swr` latest: 2.3.6 (MEDIUM confidence — search-derived, consistent with ecommerce package.json)

---

*Stack research for: JHB Command Center — Stripe Webhook Bridge, PostgreSQL Migration, Vercel Deployment*
*Researched: 2026-02-24*
