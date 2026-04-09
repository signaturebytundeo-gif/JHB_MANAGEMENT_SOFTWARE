# Architecture Patterns

**Domain:** API Integrations + Alert Delivery — JHB Command Center Milestone
**Researched:** 2026-03-12
**Confidence:** HIGH (existing codebase confirmed by direct inspection; external API patterns confirmed via official docs)

---

## Scope

This document covers only the **new integration layer** for this milestone. The existing v1.0 architecture (Next.js 16 App Router, Prisma 7.4 + Neon, server actions, JWT sessions) is documented in the original `ARCHITECTURE.md` and is NOT re-covered here.

**Integrations in scope:**
- Amazon SP-API (order pull sync — already partially implemented)
- Square (payment sync — already partially implemented)
- Stripe (webhook receiver + shipping bridge — already implemented)
- ShipStation (label creation — replaces or augments existing UPS direct integration)
- Alert delivery (email via Resend — already partially implemented; add Vercel Cron scheduling)

---

## What Already Exists (Do Not Rebuild)

Direct inspection of the codebase reveals these integration components are already live:

| Component | File | Status |
|-----------|------|--------|
| Amazon SP-API pull client | `src/lib/integrations/amazon.ts` | Implemented — OAuth token refresh, paginated order fetch, rate delay |
| Square payment pull client | `src/lib/integrations/square.ts` | Implemented — payments search + order line items fetch |
| Etsy order pull client | `src/lib/integrations/etsy.ts` | Implemented — token refresh on 401, paginated receipts |
| Stripe webhook receiver | `src/app/api/webhooks/stripe/route.ts` | Implemented — signature verify, idempotency, WebsiteOrder creation |
| UPS shipping integration | `src/lib/ups.ts` | Implemented — OAuth2 client credentials, create/void/track label |
| Marketplace sync server actions | `src/app/actions/marketplace-sync.ts` | Implemented — sync orchestration, MarketplaceSync DB records |
| Alert status computation | `src/app/actions/alerts.ts` | Implemented — low inventory, overdue invoices, QC failures, pending approvals |
| Alert email send | `src/app/actions/alerts.ts` (checkAndSendAlerts) | Implemented — manual trigger only, Resend email, no scheduling |
| Integration config + env check | `src/lib/integrations/config.ts` | Implemented — SQUARE, AMAZON, ETSY env var checks |
| Slack failure notifications | `src/lib/integrations/slack.ts` | Implemented — order email failures, shipping notifications |
| MarketplaceSync Prisma model | `schema.prisma` | Implemented — platform, status, records counts, error details |

**Key insight:** The milestone is NOT about building integrations from scratch. It is about:
1. Hardening the Amazon SP-API pull against rate limits
2. Adding ShipStation as a shipping option alongside UPS
3. Adding Vercel Cron scheduling for alerts (currently manual-trigger only)
4. Adding Square webhook endpoint (currently pull-only, misses real-time data)
5. Storing API credentials securely in Vercel environment variables

---

## Integration Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                    External Services                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Amazon   │  │  Square  │  │  Stripe  │  │ ShipStation  │   │
│  │ SP-API   │  │  POS API │  │ Webhooks │  │  Labels API  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
└───────┼─────────────┼──────────────┼────────────────┼──────────┘
        │  PULL       │  PUSH/PULL   │  PUSH          │  PUSH/PULL
        ↓             ↓              ↓                 ↓
┌───────────────────────────────────────────────────────────────┐
│                 Next.js App on Vercel                          │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  API Routes (Webhook Receivers)                       │     │
│  │  /api/webhooks/stripe/route.ts  ← Stripe events      │     │
│  │  /api/webhooks/square/route.ts  ← Square events (NEW)│     │
│  │  /api/cron/alerts/route.ts      ← Vercel Cron (NEW)  │     │
│  │  /api/cron/sync/route.ts        ← Vercel Cron (NEW)  │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  Server Actions (Manual Triggers)                     │     │
│  │  marketplace-sync.ts: syncAmazonOrders()              │     │
│  │  marketplace-sync.ts: syncSquarePayments()            │     │
│  │  alerts.ts: checkAndSendAlerts()                      │     │
│  │  shipping.ts: createAndShipLabel()                    │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  Integration Clients (lib/integrations/)              │     │
│  │  amazon.ts     — SP-API with token cache + delays     │     │
│  │  square.ts     — Payments search + order items        │     │
│  │  etsy.ts       — OAuth refresh + paginated fetch      │     │
│  │  shipstation.ts — Label create/void/track (NEW)       │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  Prisma + Neon PostgreSQL                             │     │
│  │  WebsiteOrder  — orders from all channels             │     │
│  │  Sale           — POS payments from Square            │     │
│  │  Customer       — upserted on every order             │     │
│  │  Shipment       — UPS or ShipStation labels           │     │
│  │  MarketplaceSync — sync run history + error log       │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  Alert Delivery (lib/integrations/email.ts + Resend) │     │
│  │  Triggered by: Vercel Cron (new) + manual action     │     │
│  │  Channels: Email (admin@) + Slack webhook (optional) │     │
│  └──────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────┘
```

---

## New Components Required

### 1. Square Webhook Receiver (NEW)

**Why needed:** Current Square integration is pull-only. `syncSquarePayments()` must be triggered manually from the UI. A webhook endpoint would make Square payments appear in the system within seconds of a transaction at the farmers market.

**File:** `src/app/api/webhooks/square/route.ts`

**Pattern:** Mirrors the existing Stripe webhook pattern exactly.

```typescript
export async function POST(request: NextRequest) {
  const body = await request.text(); // Raw body required
  const signature = request.headers.get('x-square-hmacsha256-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  // Verify using HMAC-SHA256
  const webhookSignatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY!;
  const notificationUrl = process.env.SQUARE_WEBHOOK_URL!;

  // Square signs: notification URL + request body
  const hmac = createHmac('sha256', webhookSignatureKey);
  hmac.update(notificationUrl + body);
  const expected = hmac.digest('base64');

  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(body);

  if (event.type === 'payment.completed') {
    // Write sale record via existing syncSquarePayments() logic
  }

  return NextResponse.json({ received: true });
}
```

**Square signature verification notes (HIGH confidence, confirmed via Square developer docs):**
- Header: `x-square-hmacsha256-signature`
- Input: notification URL + raw request body (NOT just the body)
- Algorithm: HMAC-SHA256, base64 output
- Use `timingSafeEqual` from Node.js `crypto` to prevent timing attacks
- Square also offers a Node.js SDK `WebhooksHelper.isValidWebhookEventSignature()` utility

**New env vars required:**
```bash
SQUARE_WEBHOOK_SIGNATURE_KEY="..."  # From Square Developer Console > Webhooks
SQUARE_WEBHOOK_URL="https://your-app.vercel.app/api/webhooks/square"
```

---

### 2. Vercel Cron Jobs (NEW)

**Why needed:** `checkAndSendAlerts()` and marketplace syncs currently require manual UI trigger. The team needs automated daily digests and periodic sync without human action.

**Vercel cron constraints (HIGH confidence, verified against Vercel docs):**

| Plan | Max cron jobs | Min interval | Precision |
|------|---------------|--------------|-----------|
| Hobby | 100 | Once per day | ±59 min |
| Pro | 100 | Once per minute | Per-minute |

**Critical:** On Hobby plan, cron expressions that run more than once per day will fail deployment. If JHB is on Hobby, crons are limited to daily. Upgrade to Pro for sub-daily sync or alert scheduling.

**File:** `vercel.json` (at `apps/command-center/` root)

```json
{
  "crons": [
    {
      "path": "/api/cron/alerts",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/sync",
      "schedule": "0 8 * * *"
    }
  ]
}
```

**File:** `src/app/api/cron/alerts/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Verify Vercel cron secret — Vercel injects CRON_SECRET as Bearer token
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Call existing checkAndSendAlerts (no session needed — cron bypass)
  // NOTE: checkAndSendAlerts currently calls verifySession() — must add bypass
  const result = await sendAlertsInternal();
  return NextResponse.json(result);
}
```

**CRON_SECRET security:** Set `CRON_SECRET` as a Vercel environment variable (random 32+ char string). Vercel automatically injects it as `Authorization: Bearer <CRON_SECRET>` on every cron invocation. Verify it in the handler to prevent unauthorized triggers.

**Alerts action refactor needed:** `checkAndSendAlerts()` currently calls `verifySession()` which requires a user JWT. Cron calls have no session. Extract the core logic into an internal function (no session guard) called by both the cron handler and the existing manual server action.

---

### 3. ShipStation Integration Client (NEW)

**Why needed:** The existing UPS integration is direct (raw UPS API calls). ShipStation is a multi-carrier shipping management platform that wraps UPS, USPS, FedEx, and others under one API, provides a shipping dashboard, and handles rate shopping. Decision should be driven by business preference — ShipStation adds cost ($30-$50/month) but simplifies multi-carrier management.

**File:** `src/lib/integrations/shipstation.ts`

ShipStation v1 API details (MEDIUM confidence, official docs + search):
- Base URL: `https://ssapi.shipstation.com/`
- Auth: Basic HTTP — Base64(`API_KEY:API_SECRET`) in Authorization header
- Rate limit: 40 requests/minute per API key pair; returns 429 with `X-Rate-Limit-Reset` header

Key endpoints:
```
POST /orders/createorder          # Create/update an order in ShipStation
POST /shipments/createlabel       # Create label for an order
GET  /shipments/{shipmentId}      # Get shipment with tracking
POST /shipments/voidlabel         # Void a label
GET  /carriers                    # List available carriers
GET  /carriers/listservices       # List carrier services
```

**Integration pattern:**

```typescript
// src/lib/integrations/shipstation.ts

const SS_BASE = 'https://ssapi.shipstation.com';

function getAuthHeader(): string {
  const key = process.env.SHIPSTATION_API_KEY!;
  const secret = process.env.SHIPSTATION_API_SECRET!;
  return `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`;
}

export async function createShipStationLabel(params: {
  orderId: string;
  carrierCode: string;
  serviceCode: string;
  packageCode: string;
  shipFrom: Address;
  shipTo: Address;
  weight: { value: number; units: 'pounds' };
  dimensions?: Dimensions;
  testLabel?: boolean;
}): Promise<{ trackingNumber: string; labelData: string; cost: number }> {
  const response = await fetch(`${SS_BASE}/shipments/createlabel`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...params }),
  });

  if (response.status === 429) {
    const reset = response.headers.get('X-Rate-Limit-Reset');
    throw new Error(`ShipStation rate limit — retry in ${reset}s`);
  }

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ShipStation error (${response.status}): ${err}`);
  }

  return response.json();
}
```

**New env vars:**
```bash
SHIPSTATION_API_KEY="..."
SHIPSTATION_API_SECRET="..."
```

**Architecture decision — UPS direct vs ShipStation:**

| Factor | UPS Direct | ShipStation |
|--------|-----------|-------------|
| Cost | Free (UPS account) | $30-50/month |
| Carriers | UPS only | UPS, USPS, FedEx, others |
| Rate shopping | Manual | Automated |
| Dashboard | UPS.com | ShipStation UI |
| Implementation | Already live | New build needed |
| Complexity | Lower (direct OAuth) | Higher (separate account) |

**Recommendation:** Keep UPS direct as the primary carrier (already implemented). Build ShipStation as an optional secondary layer — controlled by a `SHIPPING_PROVIDER` env var. This avoids breaking the existing Shipment model and shipping actions.

---

### 4. API Credential Storage Pattern

**Pattern:** All integration credentials stored as Vercel environment variables. No database-stored credentials. The existing `src/lib/integrations/config.ts` correctly reads from `process.env`.

**Current credentials in use:**
```bash
# Amazon SP-API (already in config.ts)
AMAZON_SP_CLIENT_ID
AMAZON_SP_CLIENT_SECRET
AMAZON_SP_REFRESH_TOKEN
AMAZON_SP_MARKETPLACE_ID   # Default: ATVPDKIKX0DER (US)

# Square (already in config.ts)
SQUARE_ACCESS_TOKEN
SQUARE_ENVIRONMENT         # sandbox | production

# Stripe (already in stripe.ts)
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET

# UPS (already in ups.ts)
UPS_CLIENT_ID
UPS_CLIENT_SECRET
UPS_ACCOUNT_NUMBER
UPS_SANDBOX                # true | false

# Resend email (already in alerts.ts)
RESEND_API_KEY

# Slack (already in slack.ts)
SLACK_WEBHOOK_URL

# New — Square webhooks
SQUARE_WEBHOOK_SIGNATURE_KEY
SQUARE_WEBHOOK_URL

# New — Vercel Cron security
CRON_SECRET

# New — ShipStation (optional)
SHIPSTATION_API_KEY
SHIPSTATION_API_SECRET
```

**For Etsy (existing, not in milestone scope):**
```bash
ETSY_API_KEY
ETSY_SHOP_ID
ETSY_ACCESS_TOKEN
ETSY_REFRESH_TOKEN
```

---

## Data Flow Changes

### Amazon SP-API Pull Flow (Existing + Hardening)

```
User triggers "Sync Amazon" button
    ↓
syncAmazonOrders() server action
    ↓
createSyncRecord() → MarketplaceSync{status: RUNNING}
    ↓
getRecentAmazonOrders(sinceDate) — lib/integrations/amazon.ts
    ↓
getAccessToken() — cached in module scope, refreshes on expiry
    ↓
spApiGet('/orders/v0/orders') — rate limit: 0.0167 req/sec (1/min)
    ↓ (for each order)
spApiGet('/orders/v0/orders/{id}/orderItems') — delay(500ms) between calls
    ↓
db.websiteOrder.create() — dedup via P2002 on orderId
db.customer.upsert()
    ↓
completeSyncRecord() → MarketplaceSync{status: SUCCESS|PARTIAL|FAILED}
```

**Hardening needed:** The existing implementation uses `delay(1000ms)` between pages but only `delay(500ms)` between order item fetches. With `getOrders` at 0.0167 req/sec (burst 20), the current implementation is safe for typical batch sizes but should add 429 retry logic for robustness. See PITFALLS.md.

### Square Webhook Flow (New)

```
Square POS transaction completes
    ↓
Square POSTs payment.completed to /api/webhooks/square
    ↓
Verify x-square-hmacsha256-signature (URL + body, HMAC-SHA256)
    ↓
Parse payment event → extract line items via /v2/orders/{id} fetch
    ↓
Match line items to Product by name (existing fuzzy match logic)
    ↓
db.sale.create() — dedup via referenceNumber check
    ↓
revalidatePath('/dashboard/orders')
    ↓
Return 200 (Square retries on non-200 for 3 days)
```

**Note:** The existing `syncSquarePayments()` server action processes payments in batch. The webhook should reuse the same line-item matching and Sale creation logic. Extract it into a shared function in `lib/integrations/square.ts` called by both the webhook handler and the sync action.

### Vercel Cron → Alert Delivery Flow (New)

```
Vercel Cron fires at 09:00 UTC daily
    ↓
GET /api/cron/alerts
    ↓
Verify Authorization: Bearer {CRON_SECRET}
    ↓
sendAlertsInternal() [no session guard]
    ↓
getAlertStatus() — queries DB for low inventory, overdue invoices, QC failures, pending approvals
    ↓
If any alerts exist:
    Resend.send() → admin@jamaicahousebrand.com
    (Optional) Slack webhook notify
    ↓
Return {sent: true, alertCount: N}
```

**Note on function timeout:** The cron alert handler queries the DB and sends an email. Total execution time should be well under 10 seconds (Hobby plan limit). No timeout risk.

### ShipStation Label Flow (New, Optional)

```
Operator clicks "Create Label" for a WebsiteOrder
    ↓
Check SHIPPING_PROVIDER env var (ups | shipstation)
    ↓
If 'shipstation':
    createShipStationLabel() → POST /shipments/createlabel
    ↓
    Response: trackingNumber, labelData (base64), cost
    ↓
    db.shipment.update({ trackingNumber, labelData, status: LABEL_CREATED })
If 'ups':
    Existing createUPSShipment() path (unchanged)
    ↓
revalidatePath('/dashboard/shipping')
```

---

## Patterns to Follow

### Pattern 1: Webhook-First, Sync-Second

**What:** Register real-time webhooks where available (Stripe, Square). Keep pull syncs as fallback/catch-up for missed events.

**When:** For time-sensitive data (orders, payments). Pull sync handles gaps when webhooks miss events.

**Trade-offs:** More webhook handlers to maintain. But reduces need for frequent polling that burns API rate limits.

**Example:**
```
Square payment.completed webhook → immediate Sale record
Nightly cron sync → fills any gaps from webhook downtime
```

### Pattern 2: Integration Clients as Pure Functions

**What:** `lib/integrations/amazon.ts`, `square.ts`, etc. are stateless functions that take config and return data. No Prisma, no business logic — just API calls and data transformation.

**When:** Always. The existing code follows this correctly.

**Example:**
```typescript
// CORRECT — pure function
export async function getRecentAmazonOrders(sinceDate?: Date): Promise<AmazonOrderData[]>

// WRONG — mixing DB into client
export async function syncAmazonOrders(sinceDate?: Date): Promise<void>
// (this lives in the server action, not the integration client)
```

### Pattern 3: Idempotent Write Operations

**What:** Every integration write uses a dedup mechanism before inserting.

**Pattern by source:**
- Stripe: `stripeEventId` unique constraint + P2002 catch
- Amazon: `orderId: AMZ-{amazonOrderId}` unique constraint + P2002 catch
- Square: `referenceNumber` pre-flight check in `syncSquarePayments()`
- Etsy: `orderId: ETSY-{receiptId}` unique constraint + P2002 catch
- ShipStation: Check existing `Shipment` by `stripePaymentIntentId` before creating

**Why:** Webhooks and syncs can deliver the same event multiple times. Idempotency prevents duplicate records.

### Pattern 4: Always Return 200 from Webhook Handlers

**What:** After signature verification succeeds, always return 200 even if processing fails.

**Why:** Stripe, Square both retry on non-200 for 3 days. A failed processing that returns 500 will cause hundreds of retry attempts. Log the error and return 200 — fix the processing bug separately.

**Exception:** Return 400 before processing if signature verification fails (correct behavior — signals bad actor).

### Pattern 5: Cron Endpoints as Internal API Routes with Auth

**What:** Cron endpoints live at `/api/cron/*` and are protected by `CRON_SECRET`.

**Why:** Without auth, any public caller can trigger a sync or alert send. The `CRON_SECRET` check prevents abuse.

```typescript
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

---

## Integration Independence Map

Which integrations can be built in parallel vs which depend on shared infrastructure:

```
Shared Infrastructure (build first)
├── API credential validation (config.ts) — EXISTS
├── MarketplaceSync model (schema.prisma) — EXISTS
└── CRON_SECRET setup (Vercel env var) — trivial

Independent (can build in any order after shared infra):
├── Square webhook receiver
│   └── depends on: existing Sale creation logic, SQUARE_WEBHOOK_SIGNATURE_KEY
│
├── Vercel Cron for alerts
│   └── depends on: existing checkAndSendAlerts(), CRON_SECRET
│
├── Vercel Cron for marketplace sync
│   └── depends on: existing syncAmazonOrders/syncSquarePayments(), CRON_SECRET
│
└── ShipStation integration
    └── depends on: existing Shipment model, SHIPPING_PROVIDER env var

Dependent:
└── Amazon SP-API rate limit hardening
    └── depends on: understanding current sync flow (review amazon.ts)
```

**Build order recommendation:**
1. Vercel Cron + CRON_SECRET (unlocks automated everything, fastest to build)
2. Alert delivery scheduling (adds cron for existing `checkAndSendAlerts`)
3. Square webhook receiver (real-time POS data, moderate complexity)
4. Amazon SP-API retry hardening (defensive hardening, not new feature)
5. ShipStation integration (optional/parallel with above if needed)

---

## Component Boundaries — Modified Components

| Component | Status | Change |
|-----------|--------|--------|
| `src/app/actions/alerts.ts` | MODIFY | Extract `sendAlertsInternal()` without session guard; keep `checkAndSendAlerts()` as wrapper |
| `src/lib/integrations/config.ts` | MODIFY | Add SQUARE_WEBHOOK_SIGNATURE_KEY, CRON_SECRET, optional SHIPSTATION_API_KEY to env checks |
| `src/lib/integrations/square.ts` | MODIFY | Extract Sale creation logic into shared function reused by webhook handler |
| `src/lib/integrations/amazon.ts` | MODIFY | Add exponential backoff retry on 429 responses |
| `src/lib/ups.ts` | OPTIONAL MODIFY | Add `SHIPPING_PROVIDER` routing check; or leave untouched if ShipStation not prioritized |

**New files:**

| File | Purpose |
|------|---------|
| `src/app/api/webhooks/square/route.ts` | Square webhook receiver |
| `src/app/api/cron/alerts/route.ts` | Vercel Cron endpoint for alert delivery |
| `src/app/api/cron/sync/route.ts` | Vercel Cron endpoint for marketplace sync (optional) |
| `src/lib/integrations/shipstation.ts` | ShipStation label API client (optional) |
| `apps/command-center/vercel.json` | Cron schedule configuration |

---

## Scaling Considerations

These integrations are at low scale (1 seller account, <100 orders/day). The current architecture handles this trivially.

| Concern | At Current Scale | If Scale 10x |
|---------|-----------------|--------------|
| Amazon SP-API rate limits | 0.0167 req/sec for getOrders is fine for daily sync of <100 orders | Still fine — limit is per operation, not per order count |
| Square webhook volume | Farmers market = ~50 transactions per event | Still fine — each webhook is one POST |
| Cron concurrency | Single daily run, single Vercel function | Add lock check: skip if MarketplaceSync{status: RUNNING} exists |
| Vercel function timeout | Alert cron: <5s. Sync cron: Amazon sync may approach 60s on large datasets | Paginate sync into smaller batches if needed |

**First bottleneck if volume grows:** Amazon sync running at Vercel Hobby plan's 10-second function timeout. Mitigation: upgrade to Pro (60s limit) or break sync into multiple cron invocations with cursor-based pagination state stored in DB.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing API Credentials in the Database

**What people do:** Create a `IntegrationCredential` table and store API keys/secrets in PostgreSQL so admins can update them via UI.

**Why it's wrong:** API keys in the DB are harder to rotate, visible to any DB query, and violate separation of concerns. Vercel environment variables are the correct credentials store — they are encrypted at rest, scoped per deployment environment, and rotatable without code changes.

**Do this instead:** All credentials in Vercel env vars. The existing `config.ts` pattern is correct.

### Anti-Pattern 2: Calling verifySession() in Cron-Triggered Functions

**What people do:** Reuse the same server action in both UI-triggered and cron-triggered paths without removing the session guard.

**Why it's wrong:** Vercel Cron calls the endpoint as an HTTP GET with no user session cookie. `verifySession()` will throw/redirect, and the cron job will fail silently with a 302 or 401.

**Do this instead:** Extract the business logic into an internal function without a session guard. Call it from both the cron handler (after `CRON_SECRET` check) and the server action (after `verifySession()`). `checkAndSendAlerts()` in `alerts.ts` currently has this problem and must be refactored before cron deployment.

### Anti-Pattern 3: Trusting Webhook Payloads Without Signature Verification

**What people do:** Skip signature verification in development and forget to add it in production, or parse the body as JSON before verification.

**Why it's wrong:** An attacker can POST fake events to trigger sale records, orders, or alerts. For Stripe and Square: the raw body MUST be read with `request.text()` before any parsing — JSON parsing modifies whitespace which breaks the HMAC signature comparison.

**Do this instead:** Always verify signature first, parse body second. The existing Stripe webhook (`/api/webhooks/stripe/route.ts`) demonstrates the correct pattern.

### Anti-Pattern 4: Hardcoding Amazon Marketplace ID

**What people do:** Hardcode `ATVPDKIKX0DER` (US marketplace) in the API call.

**Why it's wrong:** If JHB ever expands to Canada (A2EUQ1WTGCTBG2) or UK (A1F83G8C2ARO7P), the integration breaks.

**Do this instead:** The existing `config.ts` already uses `AMAZON_SP_MARKETPLACE_ID` env var with US as default. Keep this pattern.

### Anti-Pattern 5: Running Sync as a Long Serverless Function on Hobby Plan

**What people do:** Trigger a full Amazon sync (many orders with per-order item fetches + 500ms delays) as a single Vercel function call on Hobby plan.

**Why it's wrong:** Hobby plan serverless functions have a 10-second execution timeout. Amazon sync with 20+ orders and 500ms delays per item fetch = certain timeout.

**Do this instead:** Manual sync from the UI is fine (no timeout pressure on manual calls from the browser — they're long-polling). For automated cron sync: either upgrade to Pro (60s timeout) or limit the sync window to the last 24 hours and accept that cron runs daily.

---

## Sources

- Direct codebase inspection: `src/lib/integrations/amazon.ts`, `square.ts`, `etsy.ts`, `config.ts`, `src/app/api/webhooks/stripe/route.ts`, `src/app/actions/marketplace-sync.ts`, `src/app/actions/alerts.ts`, `src/lib/ups.ts` (HIGH confidence — current production code)
- [Amazon SP-API Orders API Rate Limits](https://developer-docs.amazon.com/sp-api/docs/orders-api-rate-limits) — getOrders: 0.0167 req/sec, burst 20 (HIGH confidence — official Amazon docs)
- [Square Webhook Signature Verification](https://developer.squareup.com/docs/webhooks/step3validate) — HMAC-SHA256, x-square-hmacsha256-signature header, URL+body input (HIGH confidence — official Square docs)
- [Vercel Cron Jobs — Usage and Pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) — Hobby: once/day max; Pro: once/minute max (HIGH confidence — official Vercel docs)
- [Vercel Cron Jobs — Managing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs) — CRON_SECRET pattern, Bearer header injection (HIGH confidence — official Vercel docs)
- [ShipStation V1 API Requirements](https://www.shipstation.com/docs/api/requirements/) — Basic auth, 40 req/min rate limit, base URL (MEDIUM confidence — official ShipStation docs, fetched directly)
- [Amazon SP-API Rate Limit Strategies](https://developer-docs.amazon.com/sp-api/docs/strategies-to-optimize-rate-limits-for-your-application-workloads) — exponential backoff, token bucket algorithm (HIGH confidence — official Amazon docs)

---

*Architecture research for: JHB Command Center — API Integrations + Alert Delivery Milestone*
*Researched: 2026-03-12*
