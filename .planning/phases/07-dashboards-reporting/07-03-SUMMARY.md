---
phase: 07-dashboards-reporting
plan: 03
subsystem: ui, api, reporting
tags: [nextjs, prisma, exceljs, resend, csv, pdf, reports, alerts]

# Dependency graph
requires:
  - phase: 06-financial-management
    provides: getPnLReport, getCashFlowStatement — delegated for monthly-pnl report type
  - phase: 05-sales-channels-crm
    provides: SubscriptionMember, SubscriptionPlan models for subscription metrics
  - phase: 04-order-management
    provides: Order, OrderLineItem, Invoice models for sales and overdue alert queries
  - phase: 03-inventory-management
    provides: BatchAllocation, InventoryMovement for inventory valuation
  - phase: 02-production-quality-control
    provides: Batch model with status HOLD for QC failures alert
provides:
  - Reports hub at /dashboard/reports with 7 pre-built reports
  - CSV export via client-side Blob
  - PDF export via window.print()
  - Excel export via /api/export/excel route (exceljs, auth-gated)
  - Alert status panel for 4 operational thresholds
  - Server actions: getDailySalesSummary, getWeeklyProductionSummary, getInventoryValuationByLocation, getProductPerformance, getFarmersMarketPerformance, getSubscriptionMetrics
  - Alert actions: getAlertStatus, checkAndSendAlerts
affects: [future phases needing operational reporting context, investor dashboard]

# Tech tracking
tech-stack:
  added: [exceljs ^4.4.0]
  patterns:
    - ReportsPageClient startTransition pattern for non-blocking server action calls on report switch
    - Column config map (REPORT_COLUMNS) decouples data shape from display format
    - ExportButtons: three-format pattern (CSV client-side, PDF window.print, Excel API route)
    - AlertConfigPanel as pure server component receiving typed props

key-files:
  created:
    - apps/command-center/src/app/actions/reports.ts
    - apps/command-center/src/app/actions/alerts.ts
    - apps/command-center/src/app/api/export/excel/route.ts
    - apps/command-center/src/components/reports/ReportSelector.tsx
    - apps/command-center/src/components/reports/ReportTable.tsx
    - apps/command-center/src/components/reports/ExportButtons.tsx
    - apps/command-center/src/components/reports/AlertConfigPanel.tsx
    - apps/command-center/src/app/(dashboard)/dashboard/reports/ReportsPageClient.tsx
    - apps/command-center/src/app/(dashboard)/dashboard/reports/layout.tsx
  modified:
    - apps/command-center/src/app/(dashboard)/dashboard/reports/page.tsx
    - apps/command-center/package.json

key-decisions:
  - "OrderLineItem.totalPrice used (not lineTotal) — correct field name per Prisma schema"
  - "Subscription MRR normalizes annual plans by dividing price by 12 (research pitfall 5)"
  - "Farmers Market report filters SalesChannel.type IN ('EVENT', 'MARKETPLACE') — not by channel name (research pitfall 6)"
  - "Inventory valuation uses 40% of wholesale tier price as COGS proxy — consistent with Phase 3 convention"
  - "Excel route sheetName typed as string not ReportType — human-readable names assigned per case"
  - "checkAndSendAlerts is manual trigger only, not a cron job — simplicity over automation for Phase 7"

# Metrics
duration: 12min
completed: 2026-03-12
---

# Phase 7 Plan 03: Reports Hub Summary

**Reports hub at /dashboard/reports with 7 pre-built reports, CSV/PDF/Excel export, and 4-category alert status panel using exceljs API route**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-12T18:41:16Z
- **Completed:** 2026-03-12T18:53:00Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- 7 server action report functions covering daily sales, weekly production, monthly P&L (delegated), inventory valuation, product performance, farmers market, and subscription metrics
- Alert status system checking 4 operational thresholds (low inventory, overdue invoices, QC failures, pending approvals) with Resend email dispatch
- Auth-gated /api/export/excel route using ExcelJS with bold headers and currency formatting for all 7 report types
- Reports hub page with ReportSelector (7 options + contextual date pickers), responsive ReportTable (desktop table / mobile cards with totals row), and ExportButtons (all 3 formats)
- AlertConfigPanel with CRITICAL/WARNING/OK badge logic per category

## Task Commits

1. **Task 1: Install exceljs, create report data actions and alert actions** - `a49bb2e` (feat)
2. **Task 2: Build reports hub page with selector, table, export, and alerts panel** - `4e3db22` (feat)

## Files Created/Modified
- `apps/command-center/src/app/actions/reports.ts` - 7 report server actions + ReportType union
- `apps/command-center/src/app/actions/alerts.ts` - getAlertStatus (4 categories), checkAndSendAlerts via Resend
- `apps/command-center/src/app/api/export/excel/route.ts` - Auth-gated Excel export with ExcelJS
- `apps/command-center/src/components/reports/ReportSelector.tsx` - Dropdown + contextual date pickers
- `apps/command-center/src/components/reports/ReportTable.tsx` - Responsive table with totals row
- `apps/command-center/src/components/reports/ExportButtons.tsx` - CSV/PDF/Excel export buttons
- `apps/command-center/src/components/reports/AlertConfigPanel.tsx` - 4-card alert status panel
- `apps/command-center/src/app/(dashboard)/dashboard/reports/ReportsPageClient.tsx` - Client wrapper with startTransition for report switching
- `apps/command-center/src/app/(dashboard)/dashboard/reports/page.tsx` - Server component, fetches initial data + alerts
- `apps/command-center/package.json` - Added exceljs ^4.4.0

## Decisions Made
- Used `OrderLineItem.totalPrice` (not `lineTotal`) — discovered during TypeScript check, auto-fixed under Rule 1
- Subscription MRR normalizes annual plans by dividing by 12 per research pitfall 5
- Farmers Market report filters `SalesChannel.type IN ('EVENT', 'MARKETPLACE')` per research pitfall 6
- Inventory valuation uses 40% of wholesale tier price as COGS proxy, consistent with Phase 3 convention
- Excel route's `sheetName` typed as `string` (not `ReportType`) so human-readable names can be assigned per report case

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed wrong OrderLineItem field name**
- **Found during:** Task 1 (getProductPerformance server action)
- **Issue:** Plan spec used `lineTotal` but Prisma schema has `totalPrice` on OrderLineItem
- **Fix:** Changed `lineTotal` → `totalPrice` in select and aggregation
- **Files modified:** apps/command-center/src/app/actions/reports.ts
- **Verification:** npx tsc --noEmit passed clean after fix
- **Committed in:** a49bb2e (Task 1 commit)

**2. [Rule 1 - Bug] Fixed sheetName type error in Excel route**
- **Found during:** Task 1 (Excel route handler)
- **Issue:** `sheetName` inferred as `ReportType` union type; human-readable string values triggered TS2322 errors
- **Fix:** Added explicit `: string` type annotation to `sheetName`
- **Files modified:** apps/command-center/src/app/api/export/excel/route.ts
- **Verification:** npx tsc --noEmit passed clean
- **Committed in:** a49bb2e (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — type/field bugs)
**Impact on plan:** Both fixes necessary for TypeScript correctness. No scope creep.

## Issues Encountered
- Stale `.next/lock` file from prior build process blocked `npm run build` — removed with `rm -f .next/lock`, resolved immediately
- Dynamic server usage errors in build output are expected (auth-gated pages using cookies can't be statically rendered) — all dashboard routes correctly compile as `ƒ (Dynamic)`

## Next Phase Readiness
- All 7 report types operational and exportable in 3 formats
- Alert system checks 4 thresholds in real time
- Reports hub at /dashboard/reports replaces the previous redirect to /dashboard/finance/reports
- Ready for Phase 07 Plan 04 or Phase 08 as directed

---
*Phase: 07-dashboards-reporting*
*Completed: 2026-03-12*
