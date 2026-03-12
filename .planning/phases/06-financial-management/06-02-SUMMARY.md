---
phase: 06-financial-management
plan: 02
subsystem: finance
tags: [revenue-analytics, cogs, gross-margin, recharts, server-actions, date-fns]
dependency_graph:
  requires:
    - 06-01 (Expense model, Budget schema, recharts installed, chart.tsx component)
    - 04-order-management (Order model with channelId + totalAmount + status)
    - 02-production-quality-control (Batch model with materials, RawMaterial.costPerUnit)
  provides:
    - getRevenueByChannel: daily revenue merged from Sale + Order by channel
    - getMonthlyRevenueTrend: 12-month actual vs projection benchmarks
    - getBatchCOGS: per-batch COGS (materials+labor+overhead) with incomplete-data flagging
    - getGrossMarginByProduct: aggregated margin analysis by product
    - Revenue analytics page (/dashboard/finance/revenue)
    - COGS and gross margin page (/dashboard/finance/cogs)
  affects:
    - Sidebar navigation (Revenue + COGS links added)
    - Finance dashboard (two new sub-pages)
tech_stack:
  added: []
  patterns:
    - Server page fetches two actions in parallel via Promise.all
    - recharts BarChart wrapped in ChartContainer (same pattern as shadcn chart)
    - Client-side sortable table with useState sort key + direction
    - Color-coded table cells for threshold-based visual status
    - Decimal->Number conversion at action boundary before returning to client
key_files:
  created:
    - apps/command-center/src/app/actions/financial-reports.ts
    - apps/command-center/src/app/(dashboard)/dashboard/finance/revenue/page.tsx
    - apps/command-center/src/components/finance/RevenueByChannelChart.tsx
    - apps/command-center/src/components/finance/RevenueVsProjectionChart.tsx
    - apps/command-center/src/app/(dashboard)/dashboard/finance/cogs/page.tsx
    - apps/command-center/src/components/finance/COGSTable.tsx
    - apps/command-center/src/components/finance/GrossMarginTable.tsx
  modified:
    - apps/command-center/src/components/layout/Sidebar.tsx
decisions:
  - "[Phase 06-02]: BatchStatus filter uses in[] with valid enum values — schema has no QUARANTINED status (PLANNED/IN_PROGRESS/QC_REVIEW/RELEASED/HOLD)"
  - "[Phase 06-02]: getGrossMarginByProduct calls getBatchCOGS internally — avoids duplicate batch query, natural dependency"
  - "[Phase 06-02]: avgSalePrice uses actual Sale.unitPrice average when available, falls back to PricingTier wholesale price — real data preferred over nominal pricing"
  - "[Phase 06-02]: COMPLETED status included in Order revenue aggregation — delivered operator orders should count toward revenue"
metrics:
  duration: "4 minutes"
  completed: "2026-03-12"
  tasks: 2
  files_created: 7
  files_modified: 1
---

# Phase 06 Plan 02: Revenue Analytics and COGS Summary

**One-liner:** Revenue analytics (daily by channel + monthly vs $100K/mo projections) and COGS calculation (per-batch materials+labor+overhead with gross margin analysis by product) using recharts BarCharts and sortable tables.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Revenue and COGS server actions | a1b7460 | financial-reports.ts |
| 2 | Revenue charts and COGS/margin pages | 06da8ba | revenue/page.tsx, RevenueByChannelChart.tsx, RevenueVsProjectionChart.tsx, cogs/page.tsx, COGSTable.tsx, GrossMarginTable.tsx, Sidebar.tsx |

## What Was Built

### Server Actions (financial-reports.ts)

- `getRevenueByChannel(date)`: Queries `db.sale.groupBy` + `db.order.groupBy` by channelId for a given date, merges both sources into a per-channel revenue map. Fetches channel names and returns `{ channel, revenue }[]` with all Decimals converted via `Number()`.
- `getMonthlyRevenueTrend(year)`: Iterates 12 months using `eachMonthOfInterval`, aggregates Sale + Order revenue per month. Projection = $100K/mo for 2026, $291.7K/mo for 2027, $600K/mo for 2028+.
- `getBatchCOGS()`: Fetches batches with materials + rawMaterial included. Computes materialsCost by summing `quantityUsed * costPerUnit` (null costPerUnit sets `costDataIncomplete: true`). Total COGS = materials + labor + overhead. Guards div-by-zero for cogsPerUnit.
- `getGrossMarginByProduct()`: Groups batch COGS data by product, calculates avgCOGS. Fetches Sale.unitPrice for actual avg sale price (falls back to PricingTier wholesale). Computes `grossMarginPct = (avgSalePrice - avgCOGS) / avgSalePrice * 100`.

### Revenue Page (/dashboard/finance/revenue)

- Summary cards: today's total revenue, month-to-date revenue
- `RevenueByChannelChart`: recharts BarChart in ChartContainer, Y-axis formatted as currency. Shows empty state message if no data.
- `RevenueVsProjectionChart`: grouped BarChart with actual revenue bars and semi-transparent projection bars, Legend component, currency tooltips.

### COGS Page (/dashboard/finance/cogs)

- Summary cards: average COGS per unit, average gross margin %, incomplete cost data count
- `COGSTable`: client-side sortable (all columns), "Cost data incomplete" Badge on rows with null raw material costs, "Complete" badge otherwise.
- `GrossMarginTable`: margin % color-coded (green ≥50%, yellow 30-50%, red <30%) with status label per row.

### Sidebar

- "Revenue" (TrendingUp icon) and "COGS" (BarChart icon) links added after Expenses, both under `finance` permission.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used valid BatchStatus enum values instead of nonexistent QUARANTINED**
- **Found during:** Task 1
- **Issue:** Plan specified `where: { status: { not: 'QUARANTINED' } }` but the Prisma schema BatchStatus enum has no QUARANTINED value (values: PLANNED, IN_PROGRESS, QC_REVIEW, RELEASED, HOLD). TypeScript compile error TS2322.
- **Fix:** Replaced with `status: { in: ['PLANNED', 'IN_PROGRESS', 'QC_REVIEW', 'RELEASED', 'HOLD'] }, isActive: true` — includes all active batches, excludes soft-deleted.
- **Files modified:** financial-reports.ts
- **Commit:** a1b7460

## Self-Check: PASSED

All 7 created files exist on disk. Both task commits (a1b7460, 06da8ba) verified in git log. `tsc --noEmit` passes with no errors.
