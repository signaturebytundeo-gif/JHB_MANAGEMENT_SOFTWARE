---
phase: 22-shipping-integration
verified: 2026-04-01T00:00:00Z
status: gaps_found
score: 3/4 success criteria verified
re_verification: false
gaps:
  - truth: "Shipping page Pending Orders tab shows marketplace (Amazon/Etsy) orders alongside Stripe orders"
    status: failed
    reason: "The shipping page loads pending orders exclusively via getRecentStripeOrders(), which queries the Stripe API directly for payment intents. It does not query WebsiteOrder records. Amazon and Etsy orders land in WebsiteOrder with source=AMAZON or source=ETSY but are never surfaced on the shipping page pending tab — only accessible via /dashboard/orders/[id]."
    artifacts:
      - path: "apps/command-center/src/app/(dashboard)/dashboard/shipping/page.tsx"
        issue: "Only calls getRecentStripeOrders() — no getWebsiteOrders() call for marketplace sources"
      - path: "apps/command-center/src/app/(dashboard)/dashboard/shipping/client.tsx"
        issue: "ShippingPageClient props accept only stripeOrders — no websiteOrder prop or marketplace order list"
      - path: "apps/command-center/src/app/actions/shipping.ts"
        issue: "getRecentStripeOrders() queries Stripe API directly; marketplace WebsiteOrders are never fetched here"
    missing:
      - "Call getWebsiteOrders({ source: 'AMAZON' }) and getWebsiteOrders({ source: 'ETSY' }) (or a combined unshipped query) in the shipping page server component"
      - "Pass marketplace WebsiteOrder rows to ShippingPageClient and render them in the Pending Orders tab alongside Stripe orders"
      - "Wire 'Ship Order' button on marketplace rows to open ShipmentForm with websiteOrder pre-fill (the infrastructure already exists in ShipmentForm via the websiteOrder prop)"
human_verification:
  - test: "Navigate to /dashboard/orders/[id] for an Amazon or Etsy WebsiteOrder, confirm the 'Create Shipping Label' section renders with the customer address pre-filled"
    expected: "ShipmentForm visible below Order Actions card with recipient name and shipping address pre-populated from the order record"
    why_human: "Requires a real Amazon/Etsy WebsiteOrder record in the database to exercise the path"
  - test: "Generate a label for a WebsiteOrder, then re-open the order detail — confirm the order status shows SHIPPED and tracking number appears in the Payment & Shipping card"
    expected: "status badge changes to Shipped, trackingNumber and carrier fields display, shippedAt date shown"
    why_human: "Requires live EasyPost API key and an actual shipment purchase"
---

# Phase 22: Shipping Integration Verification Report

**Phase Goal:** Operators can generate shipping labels for any order (website or marketplace) directly from the command center
**Verified:** 2026-04-01
**Status:** gaps_found — 3/4 success criteria verified; marketplace orders not surfaced on the shipping page pending tab
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Derived from Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Operator can generate a UPS or USPS shipping label via EasyPost from the command center | VERIFIED | `lib/easypost.ts` implements full `createEasyPostShipment()` with UPS/USPS carrier filtering; wired into `createAndShipLabel` server action; `ShipmentForm` submits to it; `@easypost/api@^8.8.0` declared in package.json |
| 2 | Shipping form pre-fills customer address from marketplace WebsiteOrder records | VERIFIED (partial path) | `ShipmentForm` accepts `websiteOrder` prop with all address fields; `/orders/[id]` page passes Amazon/Etsy WebsiteOrder address data when navigated to directly; BUT the shipping page's own Pending Orders tab never loads marketplace orders |
| 3 | Shipment record is linked to WebsiteOrder via websiteOrderId FK | VERIFIED | Schema has `websiteOrderId String?` on Shipment with `@@index([websiteOrderId])` and `websiteOrder WebsiteOrder? @relation(...)` FK; `createAndShipLabel` writes `websiteOrderId: data.websiteOrderId ?? null`; WebsiteOrder model has `shipments Shipment[]` back-relation |
| 4 | Generated label tracking number flows into existing shipment notification emails | VERIFIED | `sendShippingConfirmationEmail` in `customer-emails.ts` accepts `trackingNumber` and `carrier`; called from `createAndShipLabel` after EasyPost purchase with `easypostResult.trackingNumber` and `easypostResult.carrier`; also updates WebsiteOrder.trackingNumber and WebsiteOrder.carrier in DB |

**Score:** 3/4 truths verified (Truth 2 is partial — the path works for orders navigated via /orders/[id] but fails for the shipping page's own pending orders tab which is the primary operator workflow for marketplace orders)

---

## Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `apps/command-center/src/lib/easypost.ts` | VERIFIED | 162 lines; full implementation — creates shipment, buys label, fetches label URL, converts to base64, returns trackingNumber |
| `apps/command-center/src/app/actions/shipping.ts` | VERIFIED | 473 lines; `createAndShipLabel` calls EasyPost, persists Shipment, updates WebsiteOrder status, sends email |
| `apps/command-center/src/lib/validators/shipping.ts` | VERIFIED | Zod schema includes `websiteOrderId`, `carrier` enum (UPS/USPS), all address fields |
| `apps/command-center/src/components/shipping/ShipmentForm.tsx` | VERIFIED | Accepts `websiteOrder` prop; pre-fills name, email, addressLine1/2, city, state, zip, country from it; passes hidden `websiteOrderId` input |
| `apps/command-center/src/components/shipping/ShipmentList.tsx` | VERIFIED | Renders tracking number as clickable link; supports download, void, and refresh-tracking |
| `apps/command-center/src/app/(dashboard)/dashboard/shipping/page.tsx` | PARTIAL | Loads Stripe orders only — no marketplace WebsiteOrder query |
| `apps/command-center/src/app/(dashboard)/dashboard/orders/[id]/page.tsx` | VERIFIED | Imports ShipmentForm; passes websiteOrder pre-fill with all address fields; guards with `order.status !== 'SHIPPED' && order.status !== 'DELIVERED'` |
| `apps/command-center/prisma/schema.prisma` | VERIFIED | Shipment.websiteOrderId FK to WebsiteOrder; WebsiteOrder has shippingAddressLine1/2, City, State, Zip, Country fields; WebsiteOrder.shipments back-relation |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ShipmentForm` → `createAndShipLabel` | server action | `useActionState(createAndShipLabel, ...)` in ShipmentForm | WIRED | Form action wired, response handled with toast |
| `createAndShipLabel` → EasyPost API | `createEasyPostShipment()` | Called with carrier, addresses, weight | WIRED | Full call chain verified in shipping.ts L253-278 |
| EasyPost result → `Shipment` DB record | `db.shipment.create()` | `easypostShipmentId`, `trackingNumber`, `labelData`, `labelFormat`, `shippingCost` written | WIRED | L281-310 |
| `Shipment.websiteOrderId` → `WebsiteOrder` | Prisma FK | `websiteOrderId: data.websiteOrderId ?? null` on create | WIRED | FK present in schema and populated in action |
| Label created → `WebsiteOrder.status = SHIPPED` | `db.websiteOrder.update()` | L313-323 in shipping.ts | WIRED | Also writes trackingNumber, carrier, shippedAt |
| Label created → shipping email | `sendShippingConfirmationEmail()` | Called L326-339 with trackingNumber and carrier | WIRED | Non-critical path; error logged but does not block label creation |
| Shipping page → marketplace orders | `getWebsiteOrders()` | **NOT WIRED** | NOT WIRED | Shipping page only calls `getRecentStripeOrders()` — no marketplace order fetch |

---

## Requirements Coverage

| Requirement | Status | Blocking Issue |
|------------|--------|---------------|
| Generate UPS label via EasyPost | SATISFIED | Full EasyPost create + buy flow implemented |
| Generate USPS label via EasyPost | SATISFIED | `carrier: 'UPS' \| 'USPS'` in schema and EasyPost call |
| Pre-fill address from marketplace orders | PARTIAL | Works if operator navigates to /orders/[id] but marketplace orders not shown on shipping pending tab |
| websiteOrderId FK on Shipment (not just stripePaymentIntentId) | SATISFIED | FK exists in schema, populated in action |
| Tracking number flows to notification emails | SATISFIED | sendShippingConfirmationEmail called with easypostResult.trackingNumber |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `shipping/page.tsx` | ~7 | Page description says "from jamaicahousebrand.com" — only handles website orders | Warning | Misleading but not blocking |
| `ShipmentList.tsx` | 177 | UPS tracking link hardcoded: `ups.com/track?tracknum=` — USPS labels get a UPS tracking URL | Warning | Incorrect tracking link for USPS shipments |

---

## Human Verification Required

### 1. Order Detail Page Label Creation for Marketplace Order

**Test:** Sync an Amazon or Etsy order, navigate to `/dashboard/orders/[orderId]`, confirm the "Create Shipping Label" card renders below Order Actions with the customer address pre-populated.
**Expected:** ShipmentForm visible with recipient name, address fields pre-filled from the marketplace order record.
**Why human:** Requires an actual Amazon/Etsy WebsiteOrder in the database.

### 2. End-to-End Label Purchase and Status Propagation

**Test:** With EASYPOST_API_KEY set (test mode), generate a label for a WebsiteOrder, then re-open the order detail.
**Expected:** WebsiteOrder status = SHIPPED, trackingNumber and carrier visible in Payment & Shipping card, label PNG downloadable.
**Why human:** Requires live EasyPost test credentials and a purchasable test shipment.

---

## Gaps Summary

**One gap blocks the stated goal.** The phase goal specifies "any order (website or marketplace)." The gap is on the shipping page's own Pending Orders tab: it exclusively fetches unshipped orders from the Stripe API via `getRecentStripeOrders()`. Amazon and Etsy orders (source=AMAZON, source=ETSY on WebsiteOrder) are never loaded here.

The infrastructure to fix this is completely built:
- `ShipmentForm` already handles the `websiteOrder` prop with pre-fill
- `getWebsiteOrders()` already supports `source` filtering
- The FK chain (Shipment → WebsiteOrder) is in the schema

The fix requires one change: add `getWebsiteOrders({ status: 'NEW' | 'PROCESSING', source: 'AMAZON' | 'ETSY' })` (or a combined unshipped marketplace query) to the shipping page server component, and render those orders in the ShippingPageClient pending tab with the same "Create Label" button pattern, passing `websiteOrder` instead of `prefillOrder` to ShipmentForm.

**Secondary finding:** The ShipmentList tracking link is hardcoded to UPS (`ups.com/track`). USPS labels will get an incorrect carrier link. This is a warning-level issue — labels work, but operators tracking a USPS shipment via the history tab will land on the wrong carrier page.

---

_Verified: 2026-04-01_
_Verifier: Claude (gsd-verifier)_
