# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-12)

**Core value:** Production tracking is the foundation — every unit traceable from batch creation (with QC sign-off) through inventory location to sale.

**Current focus:** v2.0 Connected — API integrations (Amazon, Square, Stripe), ShipStation shipping, email/SMS alerts.

## Current Position

Phase: 23-unified-dashboard-automation
Plan: 03
Status: Active
Last activity: 2026-04-05 — Completed 23-02 (checkpoint approved): Vercel Cron daily sync pipeline — cursorData migration, sync-internal.ts, three cron routes, vercel.json cron declarations

Progress: [█████░░░░░] 50%

## Accumulated Context

### Decisions

- **13-01:** Tracking number and carrier are optional in FulfillmentModal — operator can ship without them; email + Slack notifications only fire when both are present
- **13-01:** Button label is context-aware: "Mark as Shipped" with no tracking, "Ship & Notify Customer" when tracking entered
- **13-01:** DB update uses conditional spread (`...(field && { field })`) to avoid overwriting existing tracking values with undefined
- **14-01:** carrier and trackingNumber are optional on DeliveryConfirmationEmail — CTA button only renders when both present
- **14-01:** getTrackingUrl helper copied into DeliveryConfirmation.tsx (not imported) to keep each template file self-contained
- **14-02:** Delivery email block placed after status update write — status persisted even if email fails
- **14-02:** Idempotency guard via !order.deliveryEmailSentAt prevents duplicate delivery emails on repeated "Mark as Delivered" clicks
- **23-01:** WebsiteOrder source enum (WEBSITE/AMAZON/ETSY) mapped to display names in sourceNames constant in channel-stats.ts
- **23-01:** Channel Performance (MTD) section gated to ADMIN/MANAGER via role check in dashboard page
- **23-01:** statMap upsert pattern merges Sale + Order + WebsiteOrder rows by display name key
- **23-02:** Amazon cron uses cursor-based micro-batching — one SP-API page per invocation, NextToken stored in MarketplaceSync.cursorData
- **23-02:** Cron routes return HTTP 200 on errors (never 5xx) — Vercel doesn't retry failed cron invocations
- **23-02:** Sale.createdById FK resolved via admin user lookup when cron runs with userId=null (Square sync only)
- **23-02:** spApiGet implemented locally in sync-internal.ts (private/unexported in amazon.ts)
- **23-02:** Migration applied via db execute + migrate resolve due to production DB drift from migration history
- **23-02 checkpoint:** CRON_SECRET confirmed set, endpoints verified — 401 on wrong secret, 200 on correct secret

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-04-05
Stopped at: Completed 23-02-PLAN.md — checkpoint approved, ready for 23-03
Resume file: 23-03-PLAN.md
