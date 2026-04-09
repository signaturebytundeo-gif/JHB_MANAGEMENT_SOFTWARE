# Pitfalls Research

**Domain:** API Integrations — Amazon SP-API, Square POS, Stripe, ShipStation, SMS Alert Delivery on Next.js/Prisma
**Researched:** 2026-03-12
**Confidence:** HIGH (all critical claims verified against official docs and recent community post-mortems)

---

> This document supersedes the v1.0 pitfalls file (food manufacturing operational pitfalls).
> v1.0 pitfalls remain valid for the core system — they are archived in `milestones/v1.0-REQUIREMENTS.md`.
> This file covers the **v2.0 Connected** milestone: adding external integrations to an existing, working system.

---

## Critical Pitfalls

### Pitfall 1: Using `request.json()` Instead of `request.text()` in Webhook Handlers

**What goes wrong:**
Stripe, Square, and ShipStation all require the **raw, unmodified request body** to verify webhook signatures. Calling `request.json()` parses the body as JSON before signature verification, which alters the string representation and causes every signature check to fail with a 400 or verification error. This means all incoming webhooks are silently rejected and no events are processed.

**Why it happens:**
Next.js App Router Route Handlers are so clean and ergonomic that developers instinctively write `const data = await request.json()` — the same pattern used everywhere else. The raw body requirement is a non-obvious exception, and the error message ("Webhook signature verification failed") doesn't tell you why.

**How to avoid:**
Use `await request.text()` as the first and only body read in every webhook route handler. Never call `request.json()` before signature verification.

```typescript
// apps/command-center/app/api/webhooks/stripe/route.ts
export async function POST(request: Request) {
  const body = await request.text()   // RAW — required for signature check
  const sig = request.headers.get('stripe-signature')!
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return new Response('Signature verification failed', { status: 400 })
  }
  // Now safe to parse: const data = JSON.parse(body)
}
```

The same pattern applies to Square webhook signature verification using `crypto.createHmac`.

**Warning signs:**
- Every incoming webhook returns 400 immediately
- Stripe Dashboard / Square Developer Console shows all webhook deliveries as "failed"
- No records are being created in the database despite confirmed external events

**Phase to address:** Amazon + Square Integration phase, Stripe Integration phase — this must be the first thing verified in any webhook handler before writing any business logic.

---

### Pitfall 2: Webhook Handlers Are Not Idempotent

**What goes wrong:**
Stripe, Square, and ShipStation all retry webhook deliveries when your endpoint returns a non-2xx response — or even when it times out. Stripe retries for up to 3 days. If your handler creates a new `Sale`, `WebsiteOrder`, or `InventoryTransaction` record on each delivery, duplicate records accumulate silently. A single Stripe payment can generate 2-10 duplicate Order + Invoice records before the retries stop.

**Why it happens:**
Developers write handler logic assuming each webhook fires exactly once. The retry behavior is documented but easy to ignore during development when the Stripe CLI sends one event cleanly. Production surfaces retries immediately.

**How to avoid:**
Store the external event ID in the database before processing. On every incoming webhook, check whether the event ID already exists before creating any records.

The current schema already has `stripeEventId String? @unique` on `WebsiteOrder` — this pattern must extend to every integration:

```typescript
// Check idempotency FIRST, before any DB writes
const existing = await prisma.sale.findUnique({
  where: { squareTransactionId: squarePaymentId }
})
if (existing) {
  return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 })
}
// Proceed with record creation
```

Required schema additions:
- `Sale.squareTransactionId String? @unique` — Square POS transactions
- `Sale.amazonOrderId String? @unique` — Amazon SP-API orders
- `WebsiteOrder.shipstationOrderId String? @unique` — ShipStation order IDs

**Warning signs:**
- Duplicate `Sale` or `Order` records with the same date/amount
- `totalSpent` on `Customer` higher than expected
- Inventory deducted multiple times for a single shipment
- Financial totals inflating over time without matching actual revenue

**Phase to address:** Must be addressed in the data model migration before any webhook handler is written. Add unique constraints to schema first, then write handlers.

---

### Pitfall 3: Amazon SP-API Auth Confusion (IAM Is No Longer Required)

**What goes wrong:**
Developers follow outdated tutorials that include AWS IAM role creation, STS AssumeRole, and AWS Signature Version 4 signing. They spend days setting up IAM infrastructure that Amazon deprecated in October 2023. Meanwhile, the actual flow — Login with Amazon (LWA) OAuth 2.0 + refresh token exchange — is simpler but poorly documented in most third-party guides. Result: wasted time and a complex auth layer that Amazon ignores.

**Why it happens:**
Most Stack Overflow answers, Medium articles, and GitHub repos predating October 2023 include the IAM flow. The LWA-only simplification is relatively new and not reflected in the majority of existing tutorials.

**How to avoid:**
Current auth flow (HIGH confidence — verified against official Amazon SP-API docs, October 2023):

1. Register a private application in Seller Central Developer Console
2. In Seller Central, authorize the app — receive one refresh token per seller account
3. At runtime, exchange the refresh token for a 1-hour access token via POST to `https://api.amazon.com/auth/o2/token`
4. Include the access token as `x-amz-access-token` header on every SP-API call
5. Refresh the access token before it expires (check `expires_in` from response)

No AWS account, no IAM role, no STS, no Signature V4. If a guide tells you to create an IAM role, it is outdated.

Critical caveats:
- The **refresh token does not expire** (no TTL), but the **access token expires in 3600 seconds**. Cache the access token and refresh before expiry.
- The **authorization itself expires after 365 days**. Build a calendar reminder or monitoring alert — when it expires, the sync silently stops returning data and you get 403 errors.
- Each SP-API role (Orders, Inventory, Reports, Finances) must be explicitly requested in your developer profile. Missing a role = 403 on those endpoints.

**Warning signs:**
- Build time spent on IAM consoles and trust policies
- 403 errors on SP-API calls despite having a valid access token (usually missing role)
- Sync suddenly stops working after ~12 months with no code changes (expired authorization)

**Phase to address:** Amazon SP-API Integration phase — before any code is written, verify current auth requirements against official docs (not tutorials).

---

### Pitfall 4: Vercel Hobby Plan 10-Second Timeout Kills Long-Running Syncs

**What goes wrong:**
Amazon SP-API syncs (fetching orders + FBA inventory), Square catalog syncs, and ShipStation order imports can take 15-90 seconds for a full historical pull. On Vercel Hobby plan, the hard limit is 10 seconds. The function silently terminates mid-sync — some records are created, others are not, leaving the database in a partial state. The Vercel dashboard logs show "Function execution timed out" but the UI may show nothing.

**Why it happens:**
Developers test on localhost (no timeout) and assume the sync will work in production. The timeout is a Vercel hosting constraint, not a code bug, so it passes all local tests.

**How to avoid:**
Three-pronged strategy:

1. **Upgrade to Vercel Pro** — raises timeout from 10s to 60s, and with `maxDuration` config to 300s. For a 2-person operations app at JHB's scale, 60s covers most syncs.

2. **Design all syncs as paginated, resumable operations** — never fetch everything in one function call. Each invocation fetches one page, writes records, stores a cursor/page token, and returns. A cron job or manual trigger advances the cursor.

3. **Never run full historical syncs in API routes** — initial bulk imports should be scripted locally (`npx ts-node scripts/seed-amazon-orders.ts`) and only incremental syncs run via API routes.

```typescript
// next.config.ts — extend timeout for sync routes (requires Pro plan)
export const maxDuration = 60  // seconds — in the route file, not next.config
```

Route-level timeout config (Next.js App Router):
```typescript
// apps/command-center/app/api/sync/amazon/route.ts
export const maxDuration = 60  // Vercel Pro: up to 300
```

**Warning signs:**
- Sync shows partial records but no completion log
- Vercel function logs show "FUNCTION_INVOCATION_TIMEOUT"
- `MarketplaceSync` records stuck in `RUNNING` status with no `completedAt`

**Phase to address:** Every integration phase. Establish timeout-safe sync patterns before building the first sync. The `MarketplaceSync` model already exists and logs sync status — ensure it always records partial progress and `errorMessage` on timeout.

---

### Pitfall 5: Adding External ID Fields Breaks Existing Unique Constraints and Queries

**What goes wrong:**
Adding `squareTransactionId`, `amazonOrderId`, and `shipstationOrderId` as nullable fields on `Sale`, `Order`, and `Customer` seems harmless. But if added as `@unique`, PostgreSQL creates a constraint that treats `NULL` differently: **multiple NULL values are allowed** in a `@unique` column in PostgreSQL. This is actually correct behavior (not a bug), but it surprises developers who expect "unique means only one null." This is fine.

The real break happens when adding new `NOT NULL` fields to existing tables with data. Prisma will generate a migration that adds the column as NOT NULL with no default, which fails on `prisma migrate deploy` because existing rows cannot satisfy the constraint.

**Why it happens:**
`prisma db push` (used during development) handles nullable additions seamlessly. But when moving to `prisma migrate deploy` (the production workflow), NOT NULL columns without defaults fail on tables with existing data. The v1.0 codebase uses `prisma db push` (noted in PROJECT.md as a known issue to revisit).

**How to avoid:**
For every new external ID field on existing models:

1. Add the field as **nullable** (`String?`) first, never NOT NULL
2. Generate and review the migration SQL before applying
3. For external ID fields that must be unique (idempotency keys), use nullable `@unique` — PostgreSQL correctly allows multiple NULLs, so existing rows are unaffected
4. Do NOT add `@unique` to fields that could have duplicates across integration events (use `@@unique` with a compound key if needed)

Schema additions checklist:
```prisma
model Sale {
  // Add as nullable — existing rows get NULL, which is correct
  squareTransactionId String? @unique
  amazonOrderId       String? @unique
}

model Customer {
  squareCustomerId  String? @unique
  amazonCustomerId  String? @unique
}

model Product {
  squareItemVariationId String? @unique
  amazonASIN            String? @unique
}
```

**Warning signs:**
- `prisma migrate deploy` fails in Vercel build with constraint violation error
- NOT NULL columns added to tables with existing data
- Migration SQL contains `ALTER TABLE ... ADD COLUMN ... NOT NULL` without a `DEFAULT`

**Phase to address:** Data model migration phase — must be the first step before any integration code is written.

---

### Pitfall 6: ShipStation Now Requires Gold Plan for API Access

**What goes wrong:**
JHB implements the ShipStation integration, deploys it, and after a billing cycle discovers their ShipStation plan does not include API access. As of May 19, 2025, ShipStation restricted API access (including webhooks and bulk operations) to Gold-tier accounts and above. Standard-tier accounts get 429 or "API access not permitted" errors.

**Why it happens:**
Most ShipStation integration guides predate May 2025 and assume API access is included in all plans. The restriction is relatively new.

**How to avoid:**
Before writing any ShipStation integration code, verify that the JHB ShipStation account is on the Gold plan or above. If on a lower tier, either upgrade or evaluate ShipEngine (the underlying API service) directly, which has its own pricing model.

Rate limits on Gold plan: 40 requests/minute (some sources cite 200/min for newer tiers — verify against account dashboard). Implement a 429 retry with `Retry-After` header respect:

```typescript
async function shipstationRequest(url: string, options: RequestInit) {
  const res = await fetch(url, options)
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') ?? '60', 10)
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
    return shipstationRequest(url, options)  // one retry
  }
  return res
}
```

**Warning signs:**
- ShipStation API calls return 401 or 403 immediately (not 429)
- "API access restricted" error messages
- All integration tests pass locally but fail when pointed at production ShipStation account

**Phase to address:** ShipStation Integration phase — verify plan tier and API access before writing any integration code.

---

### Pitfall 7: SMS Alert Delivery Without A2P 10DLC Registration Is Blocked by Carriers

**What goes wrong:**
You implement Twilio/Resend SMS delivery for low-inventory alerts and expense approval notifications, test it locally with your own number (it works), deploy to production, and find that messages to business contacts are silently dropped or blocked with carrier filtering. As of February 1, 2025, all US carriers enforce A2P 10DLC registration — unregistered numbers are blocked.

**Why it happens:**
A2P 10DLC registration is a carrier-level requirement (not a Twilio restriction) that became universally enforced in early 2025. It was phased in slowly enough that many developers have older working implementations that predate enforcement.

**How to avoid:**
Before sending a single production SMS, complete these registrations:

1. **Brand Registration** — register Jamaica House Brand LLC as a business entity with The Campaign Registry (TCR) through Twilio console. Takes 1-2 days.
2. **Campaign Registration** — register the specific use case: "Transactional notifications — operational alerts for internal staff (inventory, approvals, QC)." Takes 3-7 business days.
3. **Phone Number Assignment** — assign the 10DLC number to the registered campaign.

Key compliance rules:
- Recipients must have explicitly opted in (even for internal staff alerts — get written consent during onboarding)
- Every SMS must include opt-out instructions ("Reply STOP to unsubscribe")
- TCPA quiet hours: no non-emergency SMS between 9 PM and 8 AM in recipient's local timezone
- Store opt-in/opt-out status per phone number in the database — never send to opted-out numbers

Registration timeline is 1-3 weeks. Build time buffer before the alert delivery phase is scheduled to launch.

**Warning signs:**
- SMS delivery to your own number (during testing) works but delivery to colleagues' numbers fails
- Twilio dashboard shows "carrier filtering" or "blocked" status on message logs
- Zero delivery errors but recipients report never receiving messages

**Phase to address:** Alert Delivery phase — start the 10DLC registration process the same week the phase is planned, not after the code is written.

---

### Pitfall 8: Square v1 vs v2 API Confusion — Using v1 Items API Is a Dead End

**What goes wrong:**
Some Square documentation pages, community forum answers, and older blog posts reference the v1 Items API for inventory. Implementing inventory sync against the v1 Items API requires significant rework when you discover it is deprecated and that the v2 Catalog API + v2 Inventory API have fundamentally different data models. v1 has no concept of item variations at the correct granularity, and its webhook format differs from v2.

**Why it happens:**
Square's developer portal has deprecated docs that are still indexed and returned in searches. The v1 Items API worked for years and has substantial community coverage.

**How to avoid:**
Use exclusively the Square v2 APIs (HIGH confidence — verified against current Square developer docs):
- **Catalog API** — product items, item variations, custom attributes
- **Inventory API** — stock counts, inventory adjustments, inventory states
- **Transactions/Payments API** (v2) — payment records, not v1 Transactions
- **Webhooks v2** — `catalog.version.updated`, `inventory.count.updated`, `payment.created`

The JHB schema maps to Square's model as:
- `Product` ↔ Square `CatalogItem` → `CatalogItemVariation` (variations map to SKUs)
- `Sale` ↔ Square `Payment` (tied to `Order`)
- `InventoryTransaction` ↔ Square `InventoryAdjustment`

Store the Square `CatalogItemVariation.id` on each `Product` record as `squareItemVariationId` — this is the granularity at which Square tracks inventory counts per location.

**Warning signs:**
- Documentation refers to "Connect V1" or `/v1/items` endpoints
- Webhook events contain `item_id` without `variation_id` (v1 format)
- Inventory counts returned as simple integers without state (v1) rather than state objects (v2)

**Phase to address:** Square POS Integration phase — verify every Square API endpoint used is v2 before writing any integration code.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store raw webhook payloads as JSON strings in a `notes` field | Fast to ship | Impossible to query; sync failures are invisible; no idempotency | Never — use structured fields with proper unique constraints |
| Poll Square/Amazon on every page load | Simple, no background jobs | Hits rate limits immediately; adds 2-5s to every page render | Never — use scheduled cron syncs or webhook triggers |
| Hardcode 1-hour token expiry for SP-API access tokens | One less thing to parse | Tokens can expire slightly early; adds unnecessary 403 errors | Use `expires_in` from the LWA token response + 60s buffer |
| Build sync as a one-shot bulk import | Easier to reason about | Breaks on Vercel timeout; partial state on failure | Acceptable for local one-time seed scripts only, never for production API routes |
| Skip A2P 10DLC registration to test SMS quickly | Can send to your own number immediately | All production messages to business contacts are blocked by carriers | Never — budget 2-3 weeks for registration before SMS delivery launch |
| Single webhook endpoint for all Stripe events | Fewer routes | No separation of concerns; one slow event handler blocks all events | Acceptable for MVP if handlers are fast and idempotent |
| Write `squareCustomerId` on Customer without deduplication logic | Fast to store | Two Customer records for the same person (different email vs Square profile); CRM pollution | Never — implement email-first deduplication before writing external IDs |

## Integration Gotchas

Common mistakes when connecting to these specific external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Amazon SP-API | Following tutorials that include IAM role setup | IAM deprecated Oct 2023 — use LWA OAuth only (refresh token → access token) |
| Amazon SP-API | Not caching the 1-hour access token | Every API call triggers a new LWA token exchange; rate-limited by Amazon's auth server |
| Amazon SP-API | Forgetting the 365-day authorization expiry | Set a calendar alert; build monitoring that detects 403s and alerts before expiry |
| Square v2 Catalog | Calling `ListCatalog` on a timer without filtering | Returns entire catalog every call; triggers rate limits; use `SearchCatalogObjects` with `begin_time` |
| Square v2 Catalog | Not storing `CatalogItemVariation.id` per Product | Cannot match Square inventory counts to JHB products without variation-level IDs |
| Square bidirectional sync | Allowing both systems to be the source of truth | Price conflicts, inventory count divergence; establish Square as read-only source for POS data |
| Stripe webhooks | Using `request.json()` before `constructEvent` | Alters raw body; signature verification always fails |
| Stripe webhooks | One `STRIPE_WEBHOOK_SECRET` for all environments | Each Stripe endpoint registration (prod, staging, local CLI) generates a unique secret |
| ShipStation | Assuming API is available on current plan | API requires Gold plan or above as of May 2025; verify before writing code |
| ShipStation | Retrying 429s without respecting `Retry-After` header | Thundering herd — all retries fire at once and all get 429 again |
| SMS / Twilio | Sending without A2P 10DLC registration | Carrier-blocked from Feb 2025; messages silently dropped in production |
| SMS / Twilio | Missing STOP/opt-out mechanism | TCPA violation — each unsolicited message is a potential $1,500 fine |
| Prisma migrations | Adding NOT NULL column to existing table without default | `migrate deploy` fails in Vercel build; always add new integration columns as nullable |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching all Amazon orders on every sync | Sync takes 30-120 seconds for historical data | Use `LastUpdatedAfter` parameter — only fetch orders updated since last sync timestamp | Immediately on first production sync if history > 30 days |
| Square full catalog reload on every sync | Rate limit 429s; high latency | Use `catalog.version.updated` webhook + `SearchCatalogObjects` with `begin_time` | When catalog has more than ~50 items |
| Synchronous label creation in webhook handler | Shipstation label request blocks webhook response > 10s; Vercel timeout | Create label asynchronously — return 200 immediately, create label in background or next cron | On any plan with 10s timeout |
| Querying `Sale` by `referenceNumber` string search for deduplication | Full table scan; slow as Sale table grows | Add indexed `squareTransactionId`, `amazonOrderId` columns with `@unique` constraints | When Sale table exceeds ~5,000 records |
| Loading customer alert preferences on every alert evaluation | N+1 query pattern across Customer table | Cache alert preferences in-memory or load once per cron job run | When Customer table exceeds ~500 records |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing Amazon LWA refresh token in `.env` without access restrictions | If env file leaks, attacker has indefinite SP-API access to seller account | Store in Vercel environment variables (encrypted at rest); never commit to git |
| Using the same `STRIPE_WEBHOOK_SECRET` for production and local development | Local CLI secret in production means any CLI listener can forge production events | Stripe CLI generates a separate test secret — use distinct env var per environment |
| Not verifying Square webhook signatures | Any HTTP request to your webhook endpoint is processed as a valid Square event | Verify HMAC-SHA1 signature from `X-Square-Hmacsha1-Signature` header on every request |
| Logging full webhook payloads to console | Customer PII (names, emails, addresses) in Vercel function logs | Log only event type, event ID, and timestamp; never log full payload |
| Phone numbers stored without opt-in consent record | TCPA liability — no proof of consent if audited | Store `smsOptInAt DateTime?` and `smsOptInMethod String?` on User/Customer before sending any SMS |
| ShipStation API key in client-side code | Key exposed in browser; attacker can create labels at your expense | ShipStation API calls must only ever be made from server-side API routes |

## UX Pitfalls

Common user experience mistakes specific to sync and alert features.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No sync status visibility | Anthony/Tunde don't know if Amazon data is fresh or stale | Show "Last synced: X minutes ago" on any page displaying synced data; link to `MarketplaceSync` log |
| Sync errors shown as generic "sync failed" | No way to diagnose without Vercel logs access | Display `errorMessage` from `MarketplaceSync` record; link to a sync history page |
| Alert SMS sent for every inventory check (no cooldown) | Anthony gets 30 SMS per day for the same low-stock product | Implement per-SKU alert cooldown (e.g., max 1 SMS per 24 hours per alert type per SKU) |
| Shipping label creation with no confirmation step | Accidental label creation charges real money | Require explicit "Create Label" button confirmation; show estimated cost before creation |
| Square sync overwrites manually-corrected inventory counts | Operators correct a count, sync immediately reverts it | Track "last edited by" source; only allow sync to overwrite if Square timestamp is newer AND source is SQUARE |

## "Looks Done But Isn't" Checklist

Things that appear complete but have critical missing pieces.

- [ ] **Amazon sync:** Verify 365-day auth expiry monitoring — can the system detect and alert when SP-API returns 403 due to expired authorization?
- [ ] **Amazon sync:** Verify access token is cached and reused within its 1-hour window — not fetched on every API call
- [ ] **Square webhook handler:** Verify HMAC-SHA1 signature verification is implemented — not just accepting all POST requests
- [ ] **Square sync:** Verify `squareItemVariationId` is stored per `Product` — not just the parent item ID
- [ ] **Stripe webhook:** Verify `constructEvent` is called with raw body from `request.text()` — not parsed JSON
- [ ] **Stripe webhook:** Verify `stripeEventId` unique check runs before any DB write in every handler
- [ ] **ShipStation:** Verify JHB account is on Gold plan or above before any integration code is written
- [ ] **ShipStation:** Verify 429 handling with `Retry-After` header — not blind sleep retry
- [ ] **SMS:** Verify A2P 10DLC registration is complete (brand + campaign) before any production sends
- [ ] **SMS:** Verify opt-out handling — STOP keyword response disables future alerts for that number
- [ ] **SMS:** Verify TCPA quiet hours enforced — no non-emergency messages 9 PM – 8 AM recipient local time
- [ ] **Schema migrations:** Verify all new integration columns are nullable — no NOT NULL columns added to tables with existing data
- [ ] **Idempotency:** Verify every webhook handler queries for existing record by external ID before creating new record
- [ ] **Vercel timeout:** Verify all sync routes have `export const maxDuration = 60` and use paginated/resumable logic

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Duplicate records from non-idempotent webhook | MEDIUM | Write a deduplication script: find Sale/Order records with same external ID, compare timestamps, delete newer duplicate, verify inventory impact was not doubled |
| Amazon 365-day auth expiry | LOW | Re-authorize in Seller Central > Developer Console > Manage Apps; refresh token remains valid; new authorization issued immediately |
| Partial sync state from Vercel timeout | LOW | Set `MarketplaceSync.status = FAILED`, record cursor position in `errorDetails`, trigger new sync from cursor — all syncs must be resumable by design |
| Square sync overwrites correct inventory | MEDIUM | Check `InventoryTransaction` audit trail, identify which sync created the bad record, restore from last known-good movement, add source-awareness to sync logic |
| SMS sent to opted-out number | HIGH | Stop all sends immediately, check Twilio delivery logs for carrier complaints, update opt-out records retroactively, consult TCPA counsel if volume is significant |
| ShipStation label created accidentally | LOW | Void the label in ShipStation dashboard immediately (before carrier scan); carrier refund is automatic for voided pre-shipment labels |
| `migrate deploy` fails on NOT NULL column | LOW | Roll back migration, change column to nullable in schema, regenerate migration, redeploy |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Wrong body parsing in webhook handlers | Amazon + Square Integration, Stripe Integration | Test: send a test webhook event and verify it is processed without 400 errors |
| Non-idempotent webhook handlers | Data model migration (first step) | Test: deliver the same webhook event twice, verify only one record is created |
| Amazon IAM complexity / outdated auth | Amazon SP-API Integration | Verify: no IAM resources created; auth uses only LWA token exchange |
| Vercel 10s timeout | Every integration phase | Verify: all sync routes have `maxDuration` config and paginated logic before deployment |
| External ID fields break schema | Data model migration (first step) | Verify: all new columns are nullable; `migrate deploy` succeeds on fresh Neon branch |
| ShipStation plan restriction | ShipStation Integration (planning step) | Verify: account plan before writing code |
| SMS A2P 10DLC missing | Alert Delivery phase (planning step) | Verify: Twilio console shows approved campaign before writing any SMS send code |
| Square v1 API confusion | Square POS Integration | Verify: all Square API calls use `/v2/` path prefix; no v1 endpoints referenced |
| Customer deduplication on sync | Amazon + Square Integration | Verify: sync uses email-first lookup, not new record creation, when customer already exists |
| TCPA quiet hours not enforced | Alert Delivery phase | Verify: SMS send function checks recipient local timezone before sending |

## Sources

- [Amazon SP-API: IAM No Longer Required (official changelog, October 2023)](https://developer-docs.amazon.com/sp-api/changelog/sp-api-will-no-longer-require-aws-iam-or-aws-signature-version-4) — HIGH confidence
- [Amazon SP-API: Self-Authorization Flow (official docs)](https://developer-docs.amazon.com/sp-api/docs/self-authorization) — HIGH confidence
- [Amazon SP-API: Renew Authorizations (365-day expiry)](https://developer-docs.amazon.com/sp-api/docs/renew-authorizations) — HIGH confidence
- [Square Developer Docs: Sync Catalog with External System](https://developer.squareup.com/docs/catalog-api/sync-with-external-system) — HIGH confidence
- [Square Developer Docs: Inventory API](https://developer.squareup.com/docs/inventory-api/what-it-does) — HIGH confidence
- [Square Developer Docs: Migrate from Connect V1](https://developer.squareup.com/docs/migrate-from-v1) — HIGH confidence
- [Stripe Docs: Webhook Idempotency and Retry Behavior](https://docs.stripe.com/api/idempotent_requests) — HIGH confidence
- [Stripe Best Practices: Handling Duplicate Events (Stigg)](https://www.stigg.io/blog-posts/best-practices-i-wish-we-knew-when-integrating-stripe-webhooks) — MEDIUM confidence (multiple sources agree)
- [ShipStation: API Access Limited to Gold Plan effective May 2025](https://1teamsoftware.com/documentation/shipstation-shipping/using/shipstation-api-access-limited-to-gold-amp-scale-plans-effective-may-2025/) — MEDIUM confidence (official ShipStation change, third-party coverage)
- [ShipStation: Rate Limits documentation](https://docs.shipstation.com/rate-limits) — MEDIUM confidence
- [Twilio: A2P 10DLC Registration required, enforced Feb 2025](https://support.twilio.com/hc/en-us/articles/4408675845019-SMS-Compliance-and-A2P-10DLC-in-the-US) — HIGH confidence
- [A2P 10DLC 2025: All organization types must register](https://callhub.io/blog/compliance/10dlc-2025-registration-callhub/) — MEDIUM confidence
- [Twilio: TCPA Quiet Hours and Opt-Out Compliance](https://www.twilio.com/en-us/resource-center/sms-guide-compliance) — HIGH confidence
- [Vercel: Serverless Function Timeout Solutions](https://vercel.com/kb/guide/what-can-i-do-about-vercel-serverless-functions-timing-out) — HIGH confidence
- [Next.js: raw body access with `request.text()` for webhooks](https://github.com/vercel/next.js/discussions/48885) — HIGH confidence
- `apps/command-center/prisma/schema.prisma` — existing `stripeEventId @unique` on `WebsiteOrder` confirms idempotency pattern is already established for Stripe; same must extend to Square and Amazon

---
*Pitfalls research for: JHB Command Center — v2.0 Connected (API Integrations Milestone)*
*Researched: 2026-03-12*
