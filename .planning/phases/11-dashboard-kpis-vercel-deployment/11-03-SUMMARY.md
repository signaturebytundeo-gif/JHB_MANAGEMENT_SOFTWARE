---
phase: 11-dashboard-kpis-vercel-deployment
plan: 03
subsystem: api
tags: [prisma, dashboard, revenue, websiteorder, kpis]

# Dependency graph
requires:
  - phase: 11-dashboard-kpis-vercel-deployment
    provides: getDashboardKPIs() with Sale + Order revenue only (DASH-01/DASH-02 incomplete)
provides:
  - getDashboardKPIs() with WebsiteOrder.orderTotal included in todayRevenue and mtdRevenue
  - DASH-01 gap closed: todayRevenue = Sale + operator Order + WebsiteOrder
  - DASH-02 gap closed: mtdRevenue = Sale + operator Order + WebsiteOrder
affects:
  - 11-dashboard-kpis-vercel-deployment
  - dashboard KPI display components

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Revenue aggregation: notIn status filter not applicable when enum lacks REFUNDED — use not: 'CANCELLED' instead"
    - "Prisma _count._all for aggregate count when field-level _count typing causes union type issues"

key-files:
  created: []
  modified:
    - apps/command-center/src/app/actions/dashboard-kpis.ts

key-decisions:
  - "Used status: { not: 'CANCELLED' } instead of notIn: ['CANCELLED', 'REFUNDED'] — WebsiteOrder uses OrderStatus enum which has no REFUNDED variant"
  - "Used _count: { _all: true } with ._count._all instead of _count: { id: true } — WebsiteOrder id is String (cuid), Prisma aggregate typing returns union with true causing TS error on .id access"

patterns-established:
  - "Revenue query pattern: two parallel aggregates (today + MTD) added to existing Promise.all array"

# Metrics
duration: 8min
completed: 2026-03-16
---

# Phase 11 Plan 03: WebsiteOrder Revenue Gap Closure Summary

**Closed DASH-01 and DASH-02 revenue gaps by adding WebsiteOrder.orderTotal to todayRevenue and mtdRevenue in getDashboardKPIs()**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-16T19:23:21Z
- **Completed:** 2026-03-16T19:32:15Z
- **Tasks:** 1 of 1
- **Files modified:** 1

## Accomplishments

- todayRevenue now combines Sale.totalAmount + Order.totalAmount + WebsiteOrder.orderTotal (non-cancelled, today)
- mtdRevenue now combines Sale.totalAmount + Order.totalAmount + WebsiteOrder.orderTotal (non-cancelled, MTD)
- todayOrderCount and mtdOrderCount include WebsiteOrder record counts via _count._all
- TypeScript compiles without errors; existing DASH-03 through DASH-06 logic untouched

## Task Commits

Each task was committed atomically:

1. **Task 1: Add WebsiteOrder revenue to today and MTD totals in getDashboardKPIs()** - `05438b8` (feat)

**Plan metadata:** (see final docs commit)

## Files Created/Modified

- `apps/command-center/src/app/actions/dashboard-kpis.ts` - Added websiteOrderTodayRevenueAgg and websiteOrderMTDRevenueAgg to Promise.all; updated DASH-01 and DASH-02 calculation blocks

## Decisions Made

- **status filter uses `not: 'CANCELLED'` not `notIn: ['CANCELLED', 'REFUNDED']`** — The WebsiteOrder model uses the `OrderStatus` enum (`NEW`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`) which has no `REFUNDED` variant. Using `notIn` with `REFUNDED` caused TS2322 type error.
- **Used `_count: { _all: true }` with `._count._all`** — `_count: { id: true }` works on Sale/Order (Int id fields) but WebsiteOrder has a String cuid id. Prisma's aggregate typing returns a union type that doesn't allow `.id` access. Using `_all` is cleaner and avoids the type ambiguity.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced notIn REFUNDED filter — REFUNDED not in OrderStatus enum**
- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** Plan specified `notIn: ['CANCELLED', 'REFUNDED']` but `REFUNDED` is not a member of the `OrderStatus` enum used by WebsiteOrder
- **Fix:** Changed to `status: { not: 'CANCELLED' }` — semantically equivalent for this enum (excludes only cancelled, all other statuses count as revenue)
- **Files modified:** apps/command-center/src/app/actions/dashboard-kpis.ts
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** 05438b8

**2. [Rule 1 - Bug] Replaced _count: { id: true } with _count: { _all: true }**
- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** `_count: { id: true }` on WebsiteOrder aggregate returns union type including `true`, breaking `.id` property access (TS2339/TS18048)
- **Fix:** Used `_count: { _all: true }` and accessed `._count._all` with null coalescing
- **Files modified:** apps/command-center/src/app/actions/dashboard-kpis.ts
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** 05438b8

---

**Total deviations:** 2 auto-fixed (2 bugs found during TypeScript compilation)
**Impact on plan:** Both fixes required for TypeScript correctness. Filter change is semantically equivalent. No scope creep.

## Issues Encountered

TypeScript exposed two type incompatibilities in the plan's specified code. Both resolved inline during Task 1 before commit.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DASH-01 and DASH-02 verification gaps are now closed
- getDashboardKPIs() includes all three revenue sources: Sale, operator Order, WebsiteOrder
- Ready for 11-VERIFICATION.md re-run to confirm DASH-01 and DASH-02 pass

---
*Phase: 11-dashboard-kpis-vercel-deployment*
*Completed: 2026-03-16*
