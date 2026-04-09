# Feature Research

**Domain:** Food Product E-Commerce Operations — API Integrations + Alert Delivery (v2.0 milestone)
**Researched:** 2026-03-12
**Confidence:** HIGH for Stripe/Square/ShipStation; MEDIUM for Amazon SP-API (registration timeline uncertainty)

---

## Scope: This Document Covers v2.0 Only

v1.0 features (auth, production, inventory, orders, CRM, finance, dashboards, documents) are already built and are NOT reassessed here. This document covers only the NEW features required for:

1. Amazon Seller Central sync (SP-API)
2. Square POS sync (3 restaurant locations)
3. Stripe full integration (beyond existing `checkout.session.completed`)
4. ShipStation shipping labels + tracking
5. Proactive alert delivery (email + SMS)

---

## What Already Exists (Do Not Rebuild)

These v1.0 pieces are already in production and must be extended, not replaced:

| Existing Asset | Relevant to v2.0 |
|----------------|-----------------|
| `app/api/webhooks/stripe/route.ts` | Handles `checkout.session.completed` with full idempotency pattern (pre-flight check + P2002 guard). Extend, don't rewrite. |
| `app/actions/alerts.ts` | `getAlertStatus()` queries low inventory, overdue invoices, QC failures, pending approvals. `checkAndSendAlerts()` sends manual HTML digest via Resend. Foundation for automated delivery. |
| `WebsiteOrder` schema + `stripeEventId` unique constraint | Stripe dedup is in place. New events (subscriptions, refunds) need their own idempotency tables. |
| Resend already installed | `RESEND_API_KEY` in env. Used for invite emails, magic links, and manual alert digest. Extend for automated delivery. |
| In-app alert status panel | Already on reports page. v2.0 adds proactive delivery on top — does not replace in-app panel. |
| `api/incoming-order/route.ts` | Existing pattern for external order ingestion. Amazon + Square sync follows this pattern. |

---

## Feature Landscape

### Table Stakes (Every Integration Needs These)

These are not optional for any external API integration. Missing any of them means the integration is not production-ready.

| Feature | Why Required | Complexity | Notes |
|---------|--------------|------------|-------|
| Webhook signature verification | Security — reject forged payloads | LOW | Stripe: `constructEvent` + raw body. Square: HMAC-SHA256 via `x-square-hmacsha256-signature`. ShipStation: API key header. Already done for Stripe. |
| Idempotency (event dedup) | Webhooks are delivered at-least-once — same event can arrive 2-3x | MEDIUM | Store processed event IDs with unique DB constraint. Pre-flight check + P2002 catch pattern (already proven in Stripe route). |
| Always return 200 after verification | Non-200 causes Stripe/Square/ShipStation to retry for hours/days | LOW | Log processing errors, return 200 anyway. Retries only for network failures, not business logic errors. |
| Sync status tracking table | Operations team needs to know "when did we last sync?" and "did it error?" | MEDIUM | Per-integration table: `lastSyncAt`, `lastEventId`, `errorCount`, `status`. Admin visibility required. |
| Error logging with context | Silent failures are the worst kind | LOW | `console.error` + DB error log. Surface in admin alert panel. |
| Retry logic for outbound API calls | External APIs return 429 and 500 — must handle gracefully | MEDIUM | Exponential backoff with jitter. Amazon SP-API: `amazon-sp-api` package has auto-retry. Others: implement manually or use a fetch wrapper. |
| Webhook endpoint registration | Each service needs a URL configured in its dashboard | LOW | Stripe: second endpoint (not shared with ecommerce). Square: Developer Console. ShipStation: API or UI. |
| Test mode / sandbox before live | Never develop against live production data | LOW | Stripe: test mode keys. Square: sandbox environment. ShipStation: sandbox account. Amazon: SP-API sandbox with static mock responses. |
| Environment variable management | Secrets must not be in code | LOW | Per-integration: `AMAZON_CLIENT_ID`, `AMAZON_CLIENT_SECRET`, `AMAZON_REFRESH_TOKEN`, `SQUARE_WEBHOOK_SIGNATURE_KEY`, `SQUARE_ACCESS_TOKEN`, `SHIPSTATION_API_KEY`. |

---

### Amazon Seller Central (SP-API) Features

**Context:** JHB is the seller building for their own account — this is a private seller application, which self-authorizes without Amazon review. One Amazon FBA Warehouse location already in the system.

**CRITICAL NOTE — 2026 Fee Change (HIGH confidence, official Amazon announcement):**
As of January 31, 2026, all third-party SP-API developers incur a $1,400/year annual subscription fee. However, "sellers and vendors using SP-API directly for only their business will NOT incur additional SP-API fees." JHB building for their own account is explicitly exempt. This is confirmed — no fee concern for this project.

#### Table Stakes (Amazon)

| Feature | Why Required | Complexity | Notes |
|---------|--------------|------------|-------|
| LWA (Login with Amazon) token exchange | All SP-API calls require a valid access token | MEDIUM | Refresh token stored encrypted in DB. Exchange for 1-hour access token before each API call. `amazon-sp-api` npm package handles this automatically with `auto_request_tokens: true`. |
| Orders sync — pull pending/shipped orders | Core business data — replaces CSV export from Seller Central | HIGH | `getOrders` rate limit: 0.0167 req/s (1 request per 60 seconds) with burst of 20. Paginate with `NextToken`. Filter by `OrderStatus: ['Unshipped', 'PartiallyShipped']`. |
| FBA inventory level sync | Amazon FBA Warehouse location needs real stock count | MEDIUM | FBA Inventory API: `getInventorySummaries`. Rate limit: separate from Orders. Run on a schedule (not real-time). |
| Map Amazon orders to `WebsiteOrder` or new `AmazonOrder` schema | Orders must land in the Command Center database | HIGH | Amazon order IDs are stable. Use `amazonOrderId` as unique constraint for idempotency. Link to existing product SKUs by ASIN. |
| Sales data pull | Revenue needs to aggregate across channels | MEDIUM | Reports API: `GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL` report type. Schedule weekly. Write to existing revenue tracking tables. |

#### Differentiators (Amazon)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Returns tracking | Amazon FBA handles returns — data currently invisible to JHB | HIGH | Reports API: `GET_FBA_FULFILLMENT_CUSTOMER_RETURNS_DATA`. Returns affect inventory levels and potentially trigger QC re-check workflow. |
| Fee tracking | Amazon FBA fees (storage, fulfillment) are hidden COGS | HIGH | Reports API: `GET_FBA_ESTIMATED_FBA_FEES_TXT_DATA`. Write fees into COGS/expense tracking. Currently 40% wholesale proxy — this replaces it with real data for the Amazon channel. |
| Low FBA stock alert | Amazon will suppress listings if FBA stock runs low | MEDIUM | Check FBA inventory vs reorder point during sync. Trigger alert if below threshold. Feeds into existing alert system. |

#### Anti-Features (Amazon)

| Anti-Feature | Why Avoid | Alternative |
|--------------|-----------|-------------|
| Real-time order polling | `getOrders` rate limit is 0.0167/s — 1 request per minute maximum. Polling faster will result in 429s | Schedule sync every 15-30 minutes using a cron job or Vercel Cron |
| Building your own retry/throttle logic from scratch | `amazon-sp-api` npm package already implements token bucket auto-retry | Use `amazon-sp-api` with `auto_request_throttled: true` |
| Restricted data role (PII) | Accessing customer PII (names, addresses) requires an architecture review with Amazon's SP-API team — weeks of process | Use order ID, ASIN, quantity, price. Do not request PII roles unless shipping label generation requires it. |
| Full catalog management (add/edit listings) | Catalog/listing writes require additional SP-API roles and complexity | Read-only sync first: orders, inventory, reports |

---

### Square POS Features

**Context:** 3 restaurant locations (Miami Gardens, Broward Blvd, Miramar) use Square POS. Square handles restaurant retail sales and farmers market sales. Currently manual CSV export.

#### Table Stakes (Square)

| Feature | Why Required | Complexity | Notes |
|---------|--------------|------------|-------|
| Transaction sync via webhooks | Replace CSV export with live data | MEDIUM | Subscribe to `payment.created` and `payment.updated` events. Square pushes JSON payload to webhook URL. HMAC-SHA256 verification via `x-square-hmacsha256-signature` header. |
| Map Square transactions to existing `Order` schema | Revenue must aggregate correctly by location/channel | MEDIUM | Each Square payment = one order record. Location mapped via Square `location_id` → JHB location. 3 location IDs must be configured. |
| Customer upsert from Square payments | Square has its own customer IDs — must merge with JHB CRM | MEDIUM | Match on email first. If no email (cash sale), create anonymous customer. Square `customer_id` stored on JHB customer record. |
| Inventory count sync (periodic) | Square tracks item counts at restaurant locations | MEDIUM | Square Inventory API: `BatchRetrieveInventoryCounts`. Pull counts on schedule, compare to JHB stock levels, flag discrepancies. Do NOT auto-adjust — human review required. |

#### Differentiators (Square)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Catalog item sync | Ensures Square item prices match JHB pricing engine | MEDIUM | Subscribe to `catalog.version.updated` webhook. Pull full catalog on first sync, then delta updates. Flag price mismatches for admin review. |
| Per-location revenue reconciliation | Miami Gardens vs Broward vs Miramar sales breakdown | LOW | Square `location_id` on every payment maps directly to JHB location. Existing `Revenue by Channel` dashboard extends naturally. |
| Farmers market session tracking | Square is used at farmers market events — revenue currently invisible | MEDIUM | Farmers Markets is an existing location in JHB. Tag transactions by Square location. Same sync path as restaurant. |

#### Anti-Features (Square)

| Anti-Feature | Why Avoid | Alternative |
|--------------|-----------|-------------|
| Two-way inventory sync (write Square counts from JHB) | Square is the source of truth at restaurant POS — JHB reads from it, never writes to it | One-direction only: Square → JHB |
| Pulling full transaction history on every sync | Square's Transactions API has rate limits and pagination overhead | Use webhooks for new transactions; pull history only once during initial backfill |
| Square Appointments / Payroll APIs | Not relevant to food product operations | Ignore these API categories entirely |

---

### Stripe Features

**Context:** Ecommerce site uses Stripe for website sales. `checkout.session.completed` webhook already handles new orders with idempotency. Resend already sends order confirmation emails. v2.0 extends to subscriptions and refunds.

#### Table Stakes (Stripe Extension)

| Feature | Why Required | Complexity | Notes |
|---------|--------------|------------|-------|
| Subscription lifecycle events | JHB has a subscription program — subscription status must stay in sync | HIGH | Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. Each needs its own handler in the existing webhook route. |
| Refund tracking | Refunds affect revenue reporting — currently invisible | MEDIUM | Event: `charge.refunded`. Reverse revenue entry. Update order status to `REFUNDED`. |
| `invoice.payment_failed` alert | Failed subscription payments need human follow-up | LOW | Trigger alert delivery (email to admin + customer notification). Existing alert infrastructure handles admin side. |
| Sync subscription status to JHB `Subscription` model | JHB has subscription management in CRM — Stripe is the billing source of truth | MEDIUM | `stripeSubscriptionId` stored on JHB `Subscription` record. Status synced on every `customer.subscription.*` event. |

#### Differentiators (Stripe Extension)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Revenue reconciliation (Stripe → JHB) | Stripe payouts vs JHB recorded revenue — surfacing discrepancies | HIGH | Reports API or Stripe Dashboard export. Schedule weekly reconciliation run. Flag any order in JHB without corresponding Stripe payment. |
| Dunning management alerts | Subscription revenue churn prevention | MEDIUM | On `invoice.payment_failed`, send customer email (via Resend) with payment update link. Track retry count. After 3 failures, flag for admin review. |

#### Anti-Features (Stripe Extension)

| Anti-Feature | Why Avoid | Alternative |
|--------------|-----------|-------------|
| Installing `@stripe/stripe-js` or `@stripe/react-stripe-js` in command-center | These are frontend payment form libraries — command-center has no payment UI | Server-only `stripe` SDK already installed in command-center |
| Creating a new webhook endpoint from scratch | Existing `app/api/webhooks/stripe/route.ts` has proven idempotency pattern | Extend the existing switch statement — add new `case` blocks |
| Polling Stripe for subscription status | Polling is fragile and burns API quota | Use webhooks for all state changes; only poll Stripe as a fallback audit |

---

### ShipStation Features

**Context:** JHB uses ShipStation for shipping labels. Website orders (Stripe) and Amazon orders both need labels. Multi-carrier: USPS, UPS, FedEx.

**CRITICAL NOTE — Plan Requirement (HIGH confidence):**
As of May 19, 2025, ShipStation API access requires the Gold plan ($99/month) or higher. Starter and Accelerate plans no longer include API access. JHB must be on Gold plan to use the API. Verify current plan before building.

#### Table Stakes (ShipStation)

| Feature | Why Required | Complexity | Notes |
|---------|--------------|------------|-------|
| Create shipment / buy label | Core function — generate label for website and order fulfillment | HIGH | ShipStation V2 API: `POST /v2/shipments`. Requires: ship-from address, ship-to address, package dimensions/weight, carrier preference. Returns label PDF URL + tracking number. |
| Write tracking number back to order | Customer-facing tracking; inventory audit trail | LOW | On label creation response, write `trackingNumber` and `carrier` to the `Order` or `WebsiteOrder` record. |
| Receive `fulfillment_shipped_v2` webhook | ShipStation pushes shipping status updates | MEDIUM | Subscribe to V2 webhook. On event, update order status to `SHIPPED`, record actual ship date, trigger customer notification email. |
| Multi-carrier rate shopping | USPS vs UPS vs FedEx — cheapest option for each package | MEDIUM | ShipStation V2: `POST /v2/rates`. Pass package details, get rate matrix. JHB business rule: use cheapest unless customer paid for expedited. |
| Return label generation | Amazon and website both have return programs | MEDIUM | ShipStation V2 includes return label endpoint. Generate on-demand when return is requested. |

#### Differentiators (ShipStation)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Batch label printing | Multiple website orders at once | MEDIUM | ShipStation V2: batch endpoints. Useful for Mondays when a weekend's worth of website orders need labels. |
| Delivery confirmation tracking | "Where is my order?" without opening ShipStation | LOW | Poll ShipStation tracking endpoint (V2 tracking endpoint noted as coming in 2025 — verify availability before building). Alternatively use carrier tracking APIs directly. |
| Shipment cost tracking | Actual shipping cost vs collected shipping charge = profit/loss | LOW | ShipStation returns `shipmentCost`. Write to `WebsiteOrder.actualShippingCost`. Compare to `shippingCost` (collected from customer). |

#### Anti-Features (ShipStation)

| Anti-Feature | Why Avoid | Alternative |
|--------------|-----------|-------------|
| Using ShipStation V1 API | V1 API lacks return labels, batch labels, and multi-package labels that V2 supports. V1 keys are not interchangeable with V2. | Build on V2 API from the start |
| Auto-creating ShipStation orders from webhook | V2 does not support order export from external systems (V1 did). ShipStation V2 is label-focused. | Create labels directly without creating ShipStation "orders" — pass ship-from/to/package at label creation time |
| Storing label PDFs in JHB database | Unnecessary storage cost and complexity | Store label URL (ShipStation CDN link) and tracking number only. Link to ShipStation UI for full label management. |

---

### Alert Delivery Features

**Context:** `getAlertStatus()` already computes alert data for 4 categories (low inventory, overdue invoices, QC failures, pending approvals). `checkAndSendAlerts()` sends a manual digest via Resend to `admin@jamaicahousebrand.com`. v2.0 adds automated delivery (no human trigger required) and SMS for critical alerts.

#### Table Stakes (Alert Delivery)

| Feature | Why Required | Complexity | Notes |
|---------|--------------|------------|-------|
| Automated alert delivery (scheduled) | Manual trigger defeats the purpose of alerts | MEDIUM | Vercel Cron (`vercel.json` `crons` config). Run `checkAndSendAlerts()` on schedule. Daily digest for non-critical; immediate for critical. |
| Per-alert-type delivery control | Not every alert needs the same frequency | LOW | Configuration in DB or env: `LOW_INVENTORY_ALERT_EMAIL=true`, `LOW_INVENTORY_ALERT_SMS=false`. Prevents alert fatigue. |
| Deduplication — don't resend same alert | Low inventory fires every run unless stock changes | MEDIUM | Track last-sent state per alert condition. Only send when condition first becomes true (rising edge), not on every check. Use `AlertSentLog` table: `alertType`, `entityId`, `sentAt`, `resolvedAt`. |
| Email delivery to multiple recipients | Both Anthony and Tunde need alerts, not just `admin@` | LOW | Array of recipients from DB `UserAlert` preferences. Resend supports array `to`. Already installed — extend existing `checkAndSendAlerts()`. |
| Integration failure alerts | If Amazon SP-API or Square sync fails, someone must know | LOW | On sync error, write to `SyncError` table and trigger an alert email. Surface in admin panel. |

#### Differentiators (Alert Delivery)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| SMS for critical alerts | Phone buzzes at 2am for out-of-stock or QC failure — email doesn't | MEDIUM | Twilio `twilio` npm package. $0.0083/SMS in US. Phone numbers stored on `User` model. Critical-only: CRITICAL inventory (zero stock), QC failure on fresh batch, expense approval >$2,500. Not for WARNING-level alerts. |
| Per-user alert preferences | Anthony (production/QC focus) vs Tunde (sales/finance focus) | MEDIUM | `UserAlertPreference` table: `userId`, `alertType`, `emailEnabled`, `smsEnabled`. UI to manage preferences (Admin only). |
| Alert history log | "Was Anthony notified about the QC failure on 030926A?" | LOW | `AlertLog` table: `alertType`, `recipients`, `channel` (email/SMS), `sentAt`, `content`. Queryable from admin panel. |

#### Anti-Features (Alert Delivery)

| Anti-Feature | Why Avoid | Alternative |
|--------------|-----------|-------------|
| SMS for all alert types | $0.0083/SMS adds up; SMS fatigue causes recipients to ignore alerts | SMS only for CRITICAL severity. Email for WARNING and INFO. |
| Alert polling on every page load | Expensive query run is triggered by every user action | Cron-based delivery; in-app panel already queries on page load separately |
| External notification service (Knock, Novu, OneSignal) | Adds a paid external dependency for a 2-person team | Resend (already installed) + Twilio is sufficient. Both are pay-as-you-go with minimal fixed cost. |
| Push notifications (browser/native) | Web push requires service workers; mobile native is a separate app | Email and SMS cover the real-time need. Web push adds complexity with minimal benefit. |
| Webhook delivery retries queue (BullMQ, Redis) | Overkill for 2-5 users; Vercel has no persistent server | Accept at-least-once delivery from Stripe/Square. Handle in-process. Add BullMQ only if queue processing exceeds Vercel timeout. |

---

## Feature Dependencies

```
Amazon SP-API Sync
    └── requires → LWA token exchange (OAuth setup, one-time)
    └── requires → AmazonOrder schema (new table or extend WebsiteOrder)
    └── requires → Existing Product catalog (ASIN-to-SKU mapping table needed)
    └── enables  → FBA inventory level in existing inventory system
    └── enables  → Amazon revenue in existing revenue tracking

Square POS Sync
    └── requires → Square webhook endpoint registration
    └── requires → Location mapping (Square location_id → JHB location_id)
    └── enhances → Existing Order schema (new source type: SQUARE_POS)
    └── enhances → Existing Customer CRM (upsert from Square customer data)

Stripe Extension
    └── requires → Existing stripe webhook route (extend, not replace)
    └── requires → Existing Subscription model (add stripeSubscriptionId)
    └── enhances → Existing revenue tracking (refunds, subscription payments)

ShipStation
    └── requires → Existing WebsiteOrder / Order records (need ship-to address)
    └── requires → ShipStation Gold plan ($99/month minimum)
    └── enables  → Tracking number on Order records
    └── enables  → Actual shipping cost tracking

Alert Delivery (Automated)
    └── requires → Existing getAlertStatus() (already queries all 4 alert types)
    └── requires → Existing checkAndSendAlerts() via Resend (extend, don't rewrite)
    └── requires → Vercel Cron (free on all Vercel plans)
    └── enhances → Integration failure alerts (requires Amazon + Square sync to exist)
    └── optional → Twilio for SMS (independent of email delivery)

Alert Delivery (SMS)
    └── requires → Alert Delivery (Automated) (SMS is an add-on channel, not standalone)
    └── requires → Twilio account + phone number ($1.15/month + $0.0083/SMS)
    └── requires → Phone numbers on User records (schema addition)
```

### Dependency Notes

- **Amazon sync requires ASIN-to-SKU mapping:** Amazon products are identified by ASIN. JHB products are identified by internal ID. A mapping table or field on `Product` (`asin`) must be seeded before sync will work.
- **ShipStation requires ship-to address on orders:** `WebsiteOrder` currently stores customer name and email but not shipping address. Stripe checkout session includes `shipping_details` — this data must be captured at checkout (ecommerce app change) or fetched from Stripe at label creation time.
- **Alert deduplication requires new schema:** Current `checkAndSendAlerts()` sends every time it's called with no memory of previous sends. `AlertSentLog` table is required before automated scheduling — otherwise every cron run sends a new email.
- **Square sync and Amazon sync are independent:** Either can be built without the other. ShipStation is also independent. Alert delivery depends on sync only for the "integration failure" alert type.

---

## MVP Definition for v2.0

### Launch With (v2.0 core — highest value, proven patterns)

- [ ] **Alert delivery automation** — Vercel Cron + dedup table + `AlertSentLog`. Highest ROI: existing `getAlertStatus()` + `checkAndSendAlerts()` are done; this adds the scheduler and dedup. No new external services required.
- [ ] **Stripe subscription webhooks** — Extend existing webhook route. `customer.subscription.*` + `invoice.paid` + `invoice.payment_failed`. Pattern already proven. Critical for subscription program accuracy.
- [ ] **Stripe refund tracking** — `charge.refunded` handler. Small addition; fixes revenue reporting hole.
- [ ] **ShipStation label creation** — V2 API. Label from website orders. Gold plan required. Tracking number written to order.
- [ ] **ShipStation `fulfillment_shipped_v2` webhook** — Order status update to SHIPPED + customer notification email.
- [ ] **Square webhook sync** — `payment.created` for 3 restaurant locations. Maps to existing Order schema. Replaces manual CSV.
- [ ] **Amazon SP-API orders sync** — `getOrders` polling via Vercel Cron. `AmazonOrder` schema. LWA self-authorization. Replaces manual CSV.
- [ ] **Amazon FBA inventory sync** — `getInventorySummaries`. Write to existing inventory system for Amazon FBA Warehouse location.

### Add After Validation (v2.1 — once core sync is stable)

- [ ] **SMS critical alerts (Twilio)** — Add after email automation is proven working. Low complexity once email dedup pattern is established.
- [ ] **Per-user alert preferences** — After both Anthony and Tunde are using alerts; validate what each person actually wants.
- [ ] **Amazon sales reports sync** — Revenue/fee data via Reports API. Add after orders sync is running cleanly.
- [ ] **Square inventory count reconciliation** — After payment sync is running. Periodic count comparison, not auto-adjust.
- [ ] **Amazon returns tracking** — After orders sync. Reports API addition.

### Future Consideration (v2.2+ — deferred)

- [ ] **Amazon fee tracking** — COGS improvement; deferred until basic sync is stable and team validates the data quality.
- [ ] **Stripe-to-JHB revenue reconciliation** — High complexity audit feature; needs stable sync first.
- [ ] **Square catalog sync** — Price mismatch detection; useful but not blocking operations.
- [ ] **ShipStation batch label printing** — Operational efficiency; manual label creation is fine initially.
- [ ] **Dunning management (customer payment failure emails)** — Requires customer-facing email infrastructure separate from admin alerts.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Alert delivery automation + dedup | HIGH | LOW | P1 |
| Stripe subscription webhooks | HIGH | LOW | P1 |
| Stripe refund tracking | MEDIUM | LOW | P1 |
| Square payment webhook sync | HIGH | MEDIUM | P1 |
| Amazon SP-API orders sync | HIGH | HIGH | P1 |
| ShipStation label creation | HIGH | MEDIUM | P1 |
| ShipStation shipped webhook | MEDIUM | LOW | P1 |
| Amazon FBA inventory sync | MEDIUM | MEDIUM | P2 |
| SMS critical alerts (Twilio) | MEDIUM | LOW | P2 |
| Per-user alert preferences | LOW | MEDIUM | P2 |
| Amazon sales reports (fees, returns) | MEDIUM | HIGH | P2 |
| Square inventory reconciliation | LOW | MEDIUM | P3 |
| ShipStation rate shopping | LOW | MEDIUM | P3 |
| Stripe revenue reconciliation | LOW | HIGH | P3 |
| Square catalog sync | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Required for v2.0 launch — replaces CSV workflows
- P2: Meaningful improvement — add in v2.1 after core is stable
- P3: Nice to have — v2.2 or later

---

## Sources

- [Amazon SP-API Developer Documentation](https://developer-docs.amazon.com/sp-api/docs/what-is-the-selling-partner-api) — SP-API overview, LWA auth model (HIGH confidence — official Amazon docs)
- [Amazon SP-API Self-Authorization](https://developer-docs.amazon.com/sp-api/docs/self-authorization) — Private seller app self-auth flow (HIGH confidence — official Amazon docs)
- [Amazon Orders API Rate Limits](https://developer-docs.amazon.com/sp-api/docs/orders-api-rate-limits) — `getOrders`: 0.0167 req/s, burst 20; `getOrder`: 0.5 req/s, burst 30 (HIGH confidence — official Amazon docs)
- [Amazon SP-API 2026 Fee Update](https://www.novadata.io/resources/news/amazon-sp-api-subscription-fees-2026) — $1,400/year fee for third-party developers; sellers using for own business exempt (HIGH confidence — official Amazon announcement confirmed by multiple sources)
- [Square Webhooks Overview](https://developer.squareup.com/docs/webhooks/overview) — Event types, retry behavior (11 retries over 24 hours), idempotency via `event_id` (HIGH confidence — official Square docs)
- [Square Webhook Signature Verification](https://developer.squareup.com/docs/webhooks/step3validate) — HMAC-SHA256 via `x-square-hmacsha256-signature` header (HIGH confidence — official Square docs)
- [Stripe Webhooks Documentation](https://docs.stripe.com/webhooks) — `constructEvent`, raw body requirement, retry behavior (3 days, exponential backoff) (HIGH confidence — official Stripe docs)
- [Stripe Subscription Webhooks](https://docs.stripe.com/billing/subscriptions/webhooks) — Required events for subscription lifecycle (HIGH confidence — official Stripe docs)
- [ShipStation API Access Plan Change (May 2025)](https://1teamsoftware.com/documentation/shipstation-shipping/using/shipstation-api-access-limited-to-gold-amp-scale-plans-effective-may-2025/) — Gold plan ($99/month) required for API access effective May 19, 2025 (HIGH confidence — official ShipStation announcement)
- [ShipStation API V2 Documentation](https://docs.shipstation.com/getting-started) — V2 features: batch labels, return labels, multi-package; V2 does not support order export (MEDIUM confidence — official docs, some endpoints noted as "coming soon")
- [amazon-sp-api npm package](https://www.npmjs.com/package/amazon-sp-api) — Node.js SDK with auto-retry and LWA token exchange (MEDIUM confidence — npm registry + community usage)
- [Twilio SMS Pricing](https://www.twilio.com/en-us/use-cases/alerts-and-notifications) — $0.0083/SMS in US, $1.15/month per phone number (MEDIUM confidence — pricing page, subject to change)
- Existing codebase: `app/api/webhooks/stripe/route.ts`, `app/actions/alerts.ts` — confirmed existing patterns and data structures (HIGH confidence — direct code review)

---

*Feature research for: JHB Command Center v2.0 — API Integrations + Alert Delivery*
*Researched: 2026-03-12*
