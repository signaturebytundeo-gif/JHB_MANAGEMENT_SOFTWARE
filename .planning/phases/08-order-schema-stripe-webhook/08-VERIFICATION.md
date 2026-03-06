---
phase: 08-order-schema-stripe-webhook
verified: 2026-03-03T00:00:00Z
status: gaps_found
score: 4/5 success criteria verified
re_verification: false
gaps:
  - truth: "A completed order creates exactly one Order record and correct OrderItem records in the database"
    status: partial
    reason: "There is no OrderItem model. Line items are stored as a JSON string in WebsiteOrder.items. The phase goal references 'Order and OrderItem records' but the schema implements a denormalized design (single table with JSON blob). Depending on intent, this is either a schema deviation or a naming mismatch. The webhook does correctly write one WebsiteOrder row per event."
    artifacts:
      - path: "apps/command-center/prisma/schema.prisma"
        issue: "No OrderItem model exists. Items are stored as JSON string in WebsiteOrder.items column."
      - path: "apps/command-center/src/app/api/webhooks/stripe/route.ts"
        issue: "Creates one WebsiteOrder with items as JSON, not separate OrderItem rows."
    missing:
      - "Clarify whether OrderItem as a separate relational table is required. If yes, add OrderItem model to schema, migration, and update webhook handler to create child rows. If the JSON approach is the accepted design, update the phase goal wording to match."
  - truth: "STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET env vars are configured for the runtime environment"
    status: failed
    reason: "The .env.local file (the actual runtime config) does not contain STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET. Only WEBHOOK_API_KEY and Etsy vars are present. The .env.example documents these keys but they are absent from .env.local, meaning the webhook will throw at stripe.webhooks.constructEvent() due to undefined secret."
    artifacts:
      - path: "apps/command-center/.env.local"
        issue: "Missing STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET. Without these, stripe client instantiation returns undefined key and signature verification fails with runtime error, not a clean 400."
    missing:
      - "Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to .env.local (test/sandbox values are sufficient for local development)."
human_verification:
  - test: "Send a real Stripe test webhook event to /api/webhooks/stripe using the Stripe CLI: stripe trigger checkout.session.completed"
    expected: "Endpoint returns HTTP 200, one WebsiteOrder row is created in the database with source=WEBSITE and stripeEventId populated."
    why_human: "Cannot invoke live HTTP endpoint or verify Stripe CLI integration programmatically from this context."
  - test: "Replay the same event a second time using the Stripe CLI or by resending the same event ID"
    expected: "HTTP 200 returned, zero additional WebsiteOrder rows created. Pre-flight check log message visible."
    why_human: "Idempotency requires two sequential requests against a live server."
  - test: "Send a POST to /api/webhooks/stripe with no stripe-signature header"
    expected: "HTTP 400 with body {error: 'Missing stripe-signature header'}."
    why_human: "Requires live HTTP call."
  - test: "Send a POST to /api/webhooks/stripe with a malformed signature header"
    expected: "HTTP 400 with body {error: 'Invalid signature'}."
    why_human: "Requires live HTTP call with crafted header."
---

# Phase 08: Order Schema & Stripe Webhook Verification Report

**Phase Goal:** Stripe checkout completion events flow into the command-center database, creating Order and OrderItem records with idempotency guarantees and sales channel tracking.
**Verified:** 2026-03-03T00:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Context Note

Phase 08 does not exist in the project ROADMAP.md. The roadmap's Phase 8 is "Document Management". This appears to be a feature increment that was implemented outside the planned phase sequence, targeting Stripe webhook integration. The implementation exists in the codebase under `apps/command-center/src/app/api/webhooks/stripe/`. Verification proceeds against the stated goal and five success criteria provided.

---

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Stripe checkout completion event triggers /api/webhooks/stripe and returns HTTP 200 | ? HUMAN | Route exists and is substantive. Returns 200 after sig verification. Needs live test. |
| 2 | Completed order creates exactly one Order record and correct OrderItem records | PARTIAL | One WebsiteOrder is created. No separate OrderItem table — items stored as JSON blob. |
| 3 | Re-sending same Stripe event ID creates no duplicate records | VERIFIED (code) / ? HUMAN (live) | Pre-flight findUnique + P2002 catch pattern implemented correctly. Needs live test. |
| 4 | Each Order record has a source field populated (e.g., "website") | VERIFIED | source: 'WEBSITE' hardcoded in webhook handler. OrderSource enum and DB column confirmed in migrations. |
| 5 | Webhook signature verification rejects requests with invalid or missing signature | VERIFIED (code) | Missing header → 400. constructEvent failure → 400. Both implemented before any DB writes. |

**Automated score:** 3/5 fully verified in code (SC4, SC5, partial SC3), 1 partial (SC2), 1 env gap, 4 need human testing

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/command-center/src/app/api/webhooks/stripe/route.ts` | Stripe webhook handler with signature verification | VERIFIED | 186 lines. Signature check, checkout.session.completed handler, idempotency. Fully substantive. |
| `apps/command-center/src/lib/stripe.ts` | Stripe client singleton | VERIFIED | Instantiates Stripe with STRIPE_SECRET_KEY. Used by webhook route. |
| `apps/command-center/prisma/schema.prisma` | WebsiteOrder model with stripeEventId and source | VERIFIED | WebsiteOrder has stripeEventId (unique, nullable), source (OrderSource enum), status (OrderStatus enum). |
| `apps/command-center/prisma/migrations/20260303000000_add_stripe_event_id/` | Migration adding stripeEventId unique column | VERIFIED | Adds column + unique index to WebsiteOrder. Applied. |
| `apps/command-center/prisma/migrations/20260302141710_add_marketplace_sync/` | Migration adding OrderSource enum and source column | VERIFIED | Creates OrderSource enum (WEBSITE, AMAZON, ETSY), adds source column with DEFAULT 'WEBSITE'. |
| OrderItem model in schema | Separate child table for line items | MISSING | Does not exist. Items stored as JSON string in WebsiteOrder.items. |
| `STRIPE_SECRET_KEY` in .env.local | Live/test Stripe secret key for runtime | MISSING | Not present in .env.local. Only in .env.example as placeholder. |
| `STRIPE_WEBHOOK_SECRET` in .env.local | Webhook signing secret for signature verification | MISSING | Not present in .env.local. Without this, constructEvent() throws. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `route.ts` | `@/lib/stripe` | import + `stripe.webhooks.constructEvent()` | WIRED | Imported and called at line 36. |
| `route.ts` | `@/lib/db` | import + `db.websiteOrder.*` | WIRED | Imported and called at lines 86, 133, 149, 164. |
| `route.ts` | `stripe.checkout.sessions.listLineItems()` | Stripe API call | WIRED | Called at line 99 to fetch line items for the session. |
| `stripe.ts` | `STRIPE_SECRET_KEY` env var | `process.env.STRIPE_SECRET_KEY!` | PARTIAL | Code is correct but env var absent from .env.local. |
| `route.ts` | `STRIPE_WEBHOOK_SECRET` env var | `process.env.STRIPE_WEBHOOK_SECRET!` | PARTIAL | Code is correct but env var absent from .env.local. |
| `WebsiteOrderList.tsx` | `getWebsiteOrders` server action | import + call | WIRED | Orders page renders orders from DB including source field. |
| `orders/page.tsx` | `WebsiteOrderList` component | import + JSX | WIRED | Page renders WebsiteOrderList inside Suspense boundary. |

---

### Requirements Coverage

Requirements ORD-01, ORD-02, ORD-07 are listed as Phase 4 in REQUIREMENTS.md (not mapped to this phase). The phase goal is a narrower slice — Stripe-specific order ingestion.

| Requirement | Relevance to This Phase | Status | Notes |
|-------------|------------------------|--------|-------|
| ORD-01: Create orders from any channel with customer linkage | Partial | PARTIAL | Stripe webhook creates WebsiteOrder with Customer upsert. Manual channel orders not in scope here. |
| ORD-02: Order follows status workflow | Partial | VERIFIED | OrderStatus enum (NEW, PROCESSING, SHIPPED, DELIVERED, CANCELLED) in schema. Webhook sets NEW. |
| ORD-07: Track orders across all 9 sales channels | Partial | PARTIAL | OrderSource enum only has WEBSITE, AMAZON, ETSY. 9-channel tracking is broader scope not addressed here. |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `route.ts` | 39 | `process.env.STRIPE_WEBHOOK_SECRET!` with `!` non-null assertion | Warning | If env var is undefined at runtime, constructEvent throws an unhelpful error instead of a clear startup failure. |
| `stripe.ts` | 4 | `process.env.STRIPE_SECRET_KEY!` with `!` non-null assertion | Warning | Same — if missing, Stripe SDK may silently accept undefined and fail only on first API call. |
| `.env.local` | — | Missing STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET | Blocker | Webhook endpoint cannot function locally without these values. The stripe SDK will instantiate with `undefined` key, and constructEvent will throw because the secret is undefined. |

---

### Detailed Gap Analysis

**Gap 1: OrderItem vs. JSON items blob**

The phase goal states "creating Order and OrderItem records." The implementation creates one `WebsiteOrder` row with line items stored as a JSON string in the `items` column (`TEXT NOT NULL`). There is no `OrderItem` model in the Prisma schema and no migration that creates one.

This is either:
- A deliberate design choice (denormalized, simpler, acceptable for the use case)
- A deviation from the specified requirement

The JSON approach works fine for displaying orders but prevents SQL queries on individual line item data (e.g., "how many units of Product X were sold via Stripe?"). The phase success criterion SC2 as written requires "correct OrderItem records" which implies relational rows.

**Gap 2: Missing Stripe env vars in .env.local**

The `.env.local` file (lines as read):
- Has `WEBHOOK_API_KEY` (for the `/api/incoming-order` route)
- Has Etsy API keys
- Does NOT have `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET`

The `stripe.ts` lib initializes with `process.env.STRIPE_SECRET_KEY!`. The non-null assertion means TypeScript won't catch the absence. At runtime, Stripe SDK version 20.x accepts `undefined` as the API key and will fail on the first API call (in this case, `stripe.checkout.sessions.listLineItems()`). The `constructEvent()` call uses `process.env.STRIPE_WEBHOOK_SECRET!` — if this is `undefined`, it throws `Error: No webhook secret provided`.

The `.env.example` file documents both keys correctly as placeholders. They need actual test/sandbox values in `.env.local`.

---

### Human Verification Required

**1. Live Webhook End-to-End Test**

Test: Use `stripe listen --forward-to localhost:3000/api/webhooks/stripe` then `stripe trigger checkout.session.completed`
Expected: HTTP 200 response; one WebsiteOrder row in DB with source='WEBSITE', stripeEventId populated, customer upserted
Why human: Requires Stripe CLI + running Next.js dev server + live database connection

**2. Idempotency Live Test**

Test: After the above test, replay the same event from Stripe Dashboard or CLI using the same event ID
Expected: HTTP 200; zero new WebsiteOrder rows; server log shows "already processed — skipping"
Why human: Requires two sequential live requests against running server

**3. Missing Signature Rejection**

Test: `curl -X POST http://localhost:3000/api/webhooks/stripe -H "Content-Type: application/json" -d '{}'`
Expected: HTTP 400, body `{"error":"Missing stripe-signature header"}`
Why human: Requires live HTTP call

**4. Invalid Signature Rejection**

Test: `curl -X POST http://localhost:3000/api/webhooks/stripe -H "stripe-signature: t=bad,v1=fake" -d '{}'`
Expected: HTTP 400, body `{"error":"Invalid signature"}`
Why human: Requires live HTTP call with crafted headers

---

## Gaps Summary

Two gaps block full goal achievement:

**Gap 1 (schema design question):** The success criterion specifies "OrderItem records" as separate DB rows. The implementation stores items as a JSON string column on WebsiteOrder. This is a deliberate denormalization but diverges from the stated goal. Clarification is needed: accept the JSON approach and update the goal, or add an OrderItem model.

**Gap 2 (env configuration, blocker):** STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are absent from .env.local. The webhook endpoint cannot be exercised locally without them. The Stripe SDK will fail on API calls (listLineItems) and constructEvent will throw for undefined secret.

Three of the five success criteria (SC3 idempotency, SC4 source field, SC5 signature rejection) are fully implemented in code and will pass once the env vars are populated. SC1 (HTTP 200 on valid event) will also pass once env vars are set. SC2 (OrderItem records) requires design decision.

---

*Verified: 2026-03-03*
*Verifier: Claude (gsd-verifier)*
