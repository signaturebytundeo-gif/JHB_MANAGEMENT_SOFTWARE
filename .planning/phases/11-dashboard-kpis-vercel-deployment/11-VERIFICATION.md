---
phase: 11-dashboard-kpis-vercel-deployment
verified: 2026-03-16T19:45:00Z
status: passed
score: 5/5 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 3/5
  gaps_closed:
    - "Dashboard shows Today's Revenue combining B2B Sale + WebsiteOrder totals (DASH-01)"
    - "Dashboard shows MTD Revenue combining B2B Sale + WebsiteOrder totals (DASH-02)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Log into https://command-center-psi-nine.vercel.app with admin credentials. Check the dashboard page loads and all KPI cards render non-empty values."
    expected: "Today's Revenue shows a dollar figure, MTD Revenue shows a progress bar vs target, Open Orders shows a count, Inventory Status shows a per-SKU table with color badges."
    why_human: "Vercel URL redirects to /login. Automated checks cannot authenticate and confirm rendered data."
  - test: "From a machine with Vercel CLI authenticated, run `vercel env ls production` in the command-center directory and confirm STRIPE_WEBHOOK_SECRET shows a real whsec_ value."
    expected: "STRIPE_WEBHOOK_SECRET is set to whsec_... (real signing secret from the registered Stripe endpoint), not a placeholder."
    why_human: "Cannot inspect env var values without Vercel CLI auth."
---

# Phase 11: Dashboard KPIs + Vercel Deployment Verification Report

**Phase Goal:** The command-center is deployed to Vercel with a production URL, all environment variables set, and the dashboard showing real revenue, order, and inventory data.
**Verified:** 2026-03-16T19:45:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (plan 11-03, commit 05438b8)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Dashboard shows Today's Revenue combining B2B Sale + WebsiteOrder totals | VERIFIED | Line 191: `todayRevenue = todaySaleRevenue + todayOrderRevenue + todayWebsiteRevenue`. `websiteOrderTodayRevenueAgg` queries `db.websiteOrder.aggregate` (lines 157–164) with `status: { not: 'CANCELLED' }` filter for today's window. |
| 2 | Dashboard shows MTD Revenue combining B2B Sale + WebsiteOrder totals | VERIFIED | Line 198: `mtdRevenue = mtdSaleRevenue + mtdOrderRevenue + mtdWebsiteRevenue`. `websiteOrderMTDRevenueAgg` queries `db.websiteOrder.aggregate` (lines 166–173) with `status: { not: 'CANCELLED' }` filter for month window. |
| 3 | Dashboard Open Orders card shows count of WebsiteOrder records with status NEW or PROCESSING | VERIFIED | Line 239: `openOrderCount = websiteOrderCount + operatorOrderCount`. `websiteOrderCount` uses `status: { in: ['NEW', 'PROCESSING'] }`. |
| 4 | Dashboard shows Inventory Status section with per-SKU HEALTHY/REORDER/CRITICAL badges | VERIFIED | `InventoryStatusSummary.tsx` (67 lines) imports `InventoryAlertBadge`, renders per-SKU rows. Wired in `dashboard/page.tsx` line 13 (import) and line 146 (render). Role-gated to ADMIN/MANAGER. Suspense-wrapped. |
| 5 | Command-center is accessible at production Vercel URL without 500 errors | VERIFIED | `https://command-center-psi-nine.vercel.app` returns HTTP 307 (redirect to /login — correct auth gate). Stripe webhook endpoint returns HTTP 405 on GET (correct for POST-only route). |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/command-center/src/app/actions/dashboard-kpis.ts` | `getDashboardKPIs()` combining all three revenue sources (Sale + operator Order + WebsiteOrder) | VERIFIED | 277 lines, substantive. Two new aggregates added in commit 05438b8. Revenue calculation at lines 188–199 now includes all three sources. `npx tsc --noEmit` passes clean. |
| `apps/command-center/src/app/(dashboard)/dashboard/page.tsx` | KPI cards wired to real data, combined revenue, open orders count | VERIFIED | 244 lines, substantive. Imports `getDashboardKPIs` (line 11). Calls at line 28. Revenue now includes WebsiteOrder via the fixed action. |
| `apps/command-center/src/components/dashboard/InventoryStatusSummary.tsx` | Compact read-only inventory summary with per-SKU InventoryAlertBadge | VERIFIED | 67 lines, substantive. Imports `InventoryAlertBadge`, renders SKU/Product/Available/Status columns. |
| `apps/command-center/src/app/actions/orders.ts` | `getOrderMetrics()` counts NEW + PROCESSING | VERIFIED | `status: { in: ['NEW', 'PROCESSING'] }` present. Note: superseded by `getDashboardKPIs()` for dashboard use, but the logic is correctly replicated there. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `dashboard/page.tsx` | `getDashboardKPIs()` | `import from @/app/actions/dashboard-kpis` | WIRED | Line 11 import, line 28 call. |
| `dashboard/page.tsx` | `getInventoryAggregation()` | `import from @/app/actions/inventory` | WIRED | Line 12 import, line 145 call in `InventorySummary` async component. |
| `InventoryStatusSummary.tsx` | `InventoryAlertBadge` | `import from @/components/inventory/InventoryAlertBadge` | WIRED | Line 10 import, lines 48–51 render with `currentStock` and `stockLevel` props. |
| `getDashboardKPIs()` | `WebsiteOrder` revenue (today) | `db.websiteOrder.aggregate` — lines 157–164 | WIRED | `websiteOrderTodayRevenueAgg._sum?.orderTotal` fed into `todayRevenue` at line 191. Gap closed. |
| `getDashboardKPIs()` | `WebsiteOrder` revenue (MTD) | `db.websiteOrder.aggregate` — lines 166–173 | WIRED | `websiteOrderMTDRevenueAgg._sum?.orderTotal` fed into `mtdRevenue` at line 198. Gap closed. |
| Vercel deployment | Neon PostgreSQL | `DATABASE_URL`/`DIRECT_URL` env vars | VERIFIED (via SUMMARY) | Per 11-02-SUMMARY: 13 env vars configured. HTTP 307 confirms deployment is live. |
| Stripe webhook | `/api/webhooks/stripe` | `STRIPE_WEBHOOK_SECRET` | VERIFIED (via SUMMARY + HTTP) | Webhook endpoint returns 405 on GET — route is live. SUMMARY documents `whsec_` set 2026-03-16. |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| DASH-01: Today's Revenue (Sale + WebsiteOrder) | SATISFIED | Fixed in commit 05438b8. `todayRevenue = Sale + Order + WebsiteOrder`. |
| DASH-02: MTD Revenue (Sale + WebsiteOrder) | SATISFIED | Fixed in commit 05438b8. `mtdRevenue = Sale + Order + WebsiteOrder`. |
| DASH-03: Open Orders count | SATISFIED | `openOrderCount = websiteOrderCount + operatorOrderCount`. Unchanged from initial verification. |
| DASH-04: Inventory Summary with per-SKU badges | SATISFIED | `InventoryStatusSummary` wired and role-gated. Unchanged from initial verification. |
| INFRA-03: Production Vercel URL accessible | SATISFIED | HTTP 307 at `https://command-center-psi-nine.vercel.app`. Confirmed in re-verification. |
| INFRA-04: All env vars configured | SATISFIED (human-dependent) | Per 11-02-SUMMARY 13 vars set; `STRIPE_WEBHOOK_SECRET` updated 2026-03-16. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `dashboard/page.tsx` | 127–130 | `value="0" subtitle="Coming in Phase 5"` (SALES_REP view: Active Customers, Pending Follow-ups) | Info | Only affects SALES_REP role view. Does not affect ADMIN/MANAGER goal. Unchanged from initial verification. |

### Human Verification Required

#### 1. Dashboard renders with live data at production URL

**Test:** Log into https://command-center-psi-nine.vercel.app with admin credentials. Check the dashboard page loads and all KPI cards render non-empty values.
**Expected:** Today's Revenue shows a dollar figure (even $0.00 is acceptable if no orders today), MTD Revenue shows a progress bar vs target, Open Orders shows a count, Inventory Status shows a per-SKU table with color badges.
**Why human:** Vercel URL redirects to /login. Automated checks cannot authenticate.

#### 2. STRIPE_WEBHOOK_SECRET is not a placeholder

**Test:** From a machine with Vercel CLI authenticated, run `vercel env ls production` in the command-center directory and confirm `STRIPE_WEBHOOK_SECRET` shows a real value.
**Expected:** `STRIPE_WEBHOOK_SECRET` is set to `whsec_...` (real signing secret from the registered Stripe endpoint).
**Why human:** Cannot inspect env var values without Vercel CLI auth.

## Re-verification Summary

Two gaps from the initial verification are now closed:

**DASH-01 (Today's Revenue):** Commit `05438b8` added `websiteOrderTodayRevenueAgg` — a `db.websiteOrder.aggregate` query filtered to `status: { not: 'CANCELLED' }` within today's date window — and included its `_sum.orderTotal` result as `todayWebsiteRevenue` in the `todayRevenue` sum (line 191). The `todayOrderCount` now also includes the WebsiteOrder record count via `_count._all`.

**DASH-02 (MTD Revenue):** Same commit added `websiteOrderMTDRevenueAgg` for the month window and included `mtdWebsiteRevenue` in the `mtdRevenue` sum (line 198). `mtdOrderCount` similarly updated.

Two TypeScript deviations from the original plan were auto-fixed during implementation: `REFUNDED` is not in the `OrderStatus` enum (resolved to `not: 'CANCELLED'`), and `_count: { id: true }` on a String-id model caused a type union issue (resolved to `_count: { _all: true }`). Both changes are semantically correct.

TypeScript compiles without errors (`npx tsc --noEmit` clean). All three previously-passing truths (DASH-03, DASH-04, INFRA-03) remain intact with no regressions detected.

The two remaining human verification items (live dashboard data + Stripe webhook secret confirmation) cannot be resolved programmatically. All automated checks pass.

---

_Verified: 2026-03-16T19:45:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes — gaps closed by plan 11-03, commit 05438b8_
