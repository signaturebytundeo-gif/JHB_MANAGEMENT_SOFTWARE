---
phase: 07-dashboards-reporting
plan: 01
subsystem: dashboard
tags: [kpis, dashboard, executive, quick-actions, AR, revenue, inventory]
dependency_graph:
  requires:
    - apps/command-center/src/app/actions/sales.ts
    - apps/command-center/src/app/actions/orders.ts
    - apps/command-center/src/app/actions/production.ts
    - apps/command-center/src/app/actions/inventory.ts
    - apps/command-center/src/app/actions/financial-reports.ts
  provides:
    - apps/command-center/src/app/actions/dashboard-kpis.ts
    - apps/command-center/src/components/dashboard/MTDRevenueVsTarget.tsx
    - apps/command-center/src/components/dashboard/ARAgingWidget.tsx
  affects:
    - apps/command-center/src/app/(dashboard)/dashboard/page.tsx
tech_stack:
  added: []
  patterns:
    - Promise.all for parallel KPI queries
    - Progress bar with inline style width for dynamic values
    - Conditional red/green highlight for overdue AR
key_files:
  created:
    - apps/command-center/src/app/actions/dashboard-kpis.ts
    - apps/command-center/src/components/dashboard/MTDRevenueVsTarget.tsx
    - apps/command-center/src/components/dashboard/ARAgingWidget.tsx
  modified:
    - apps/command-center/src/app/(dashboard)/dashboard/page.tsx
decisions:
  - getDashboardKPIs uses single Promise.all with 13 parallel queries — avoids sequential waterfall on dashboard load
  - Open Orders fixed to sum both WebsiteOrder (NEW/PROCESSING) AND operator Order (DRAFT/CONFIRMED/PROCESSING) counts
  - Inventory value uses lowest PricingTier unitPrice as conservative estimate × BatchAllocation quantity
  - AR overdue detection uses status=OVERDUE OR dueDate < now — catches both explicitly flagged and implicitly overdue invoices
  - MTD revenue percent color thresholds: green >= 80%, amber >= 50%, red < 50% — matches plan spec
  - SALES_REP KPIs sourced from getDashboardKPIs instead of old separate actions — single source of truth
metrics:
  duration: 8m
  completed: 2026-03-12
  tasks_completed: 2
  files_created: 3
  files_modified: 1
---

# Phase 07 Plan 01: Executive Dashboard KPI Wiring Summary

**One-liner:** Single getDashboardKPIs server action wires all 6 executive KPI cards with combined revenue, fixed open order count, progress bars, overdue AR highlighting, and 5 enabled quick action buttons.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create getDashboardKPIs server action | 896592a | dashboard-kpis.ts |
| 2 | Wire dashboard page with new KPIs, progress bars, AR widget, quick actions | 0b6e84b | page.tsx, MTDRevenueVsTarget.tsx, ARAgingWidget.tsx |

## What Was Built

### Task 1: getDashboardKPIs Server Action

Created `/apps/command-center/src/app/actions/dashboard-kpis.ts` — a single server action that fires 13 parallel Prisma queries via `Promise.all` and returns all 6 KPI data points:

- **DASH-01/02:** Today's + MTD revenue from `Sale.totalAmount` + `Order.totalAmount` (not CANCELLED)
- **DASH-03:** Units produced from RELEASED batches this month, with 15,000 capacity target and percentage
- **DASH-04:** Inventory value from `BatchAllocation.quantity × lowest PricingTier.unitPrice` per product
- **DASH-05:** Open order count = `websiteOrder(NEW|PROCESSING)` + `order(DRAFT|CONFIRMED|PROCESSING)` — this fixes the data gap where only WebsiteOrder was counted
- **DASH-06:** AR from invoices with status SENT/VIEWED/PARTIAL/OVERDUE, with overdue detection by status or dueDate < now

### Task 2: Dashboard Page Wiring

- Replaced 3 separate `getProductionMetrics` / `getSalesMetrics` / `getOrderMetrics` calls with single `getDashboardKPIs()`
- Created `MTDRevenueVsTarget.tsx` — KPICard-style component with inline progress bar and color thresholds (green/amber/red)
- Created `ARAgingWidget.tsx` — component with red overdue line or green "No overdue invoices" text
- Units Produced card now includes inline progress bar matching CapacityMetrics pattern
- Inventory Value card replaces "Units Sold (MTD)" with actual dollar total
- ADMIN quick actions updated: 5 buttons (New Order, Log Batch, Record Expense, Transfer, Invoice) all enabled with valid hrefs

## Verification Results

- `npx tsc --noEmit` — passes with no errors
- `npm run build` — succeeds, `/dashboard` appears in route list
- Dashboard page imports `getDashboardKPIs` (not old separate actions)
- Open Orders count includes both `WebsiteOrder` and operator `Order`
- MTD Revenue has progress bar with target percentage
- Quick actions array: 5 entries for ADMIN, all `enabled: true` with valid `href`
- ARAgingWidget conditionally highlights overdue with red vs green text

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Files Exist
- `apps/command-center/src/app/actions/dashboard-kpis.ts` — FOUND
- `apps/command-center/src/components/dashboard/MTDRevenueVsTarget.tsx` — FOUND
- `apps/command-center/src/components/dashboard/ARAgingWidget.tsx` — FOUND
- `apps/command-center/src/app/(dashboard)/dashboard/page.tsx` — FOUND (modified)

### Commits Exist
- `896592a` — feat(07-01): create getDashboardKPIs server action — FOUND
- `0b6e84b` — feat(07-01): wire executive dashboard with complete KPIs and quick actions — FOUND

## Self-Check: PASSED
