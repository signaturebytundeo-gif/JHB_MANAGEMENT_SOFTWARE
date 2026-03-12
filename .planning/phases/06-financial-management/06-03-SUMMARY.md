---
phase: 06-financial-management
plan: 03
subsystem: finance
tags: [pnl, cash-flow, projection, budget, recharts, server-actions, date-fns, useActionState]
dependency_graph:
  requires:
    - 06-01 (Expense model, Budget schema, ExpenseCategory enum)
    - 06-02 (financial-reports.ts with existing exports, recharts installed)
    - 04-order-management (Invoice, InvoicePayment models)
    - 02-production-quality-control (Batch, BatchMaterial, RawMaterial models)
  provides:
    - getPnLReport: monthly/quarterly/annual P&L with revenue by channel, COGS, OpEx, net income
    - getCashFlowStatement: operating inflows (invoice payments + cash sales) vs approved expenses
    - getCashFlowProjection: 13-week forward projection from 30-day rolling averages
    - getWeeklyCashPosition: last N weeks inflows/outflows/net position
    - getBudgetVsActual: per-category budget vs approved expense comparison with variance
    - setBudget: upsert budget amounts with Zod validation and useActionState pattern
    - Reports page (/dashboard/finance/reports): all five FIN-07 through FIN-11 features
  affects:
    - Sidebar navigation (Reports link updated to /dashboard/finance/reports)
    - Old /dashboard/reports page (now redirects to new route)
tech_stack:
  added: []
  patterns:
    - Period range helper function (getPeriodRange) encapsulates monthly/quarterly/annual date logic
    - 30-day rolling average for projection baseline with outstanding invoice overlay
    - Per-row useActionState for budget entry (independent save states per category)
    - startTransition for P&L period changes without blocking UI
    - recharts AreaChart with linearGradient fills for projection chart
    - Promise.all for parallel server action fetch on reports page
key_files:
  created:
    - apps/command-center/src/app/actions/budgets.ts
    - apps/command-center/src/app/(dashboard)/dashboard/finance/reports/page.tsx
    - apps/command-center/src/components/finance/PnLReport.tsx
    - apps/command-center/src/components/finance/CashFlowStatement.tsx
    - apps/command-center/src/components/finance/CashFlowProjectionChart.tsx
    - apps/command-center/src/components/finance/BudgetVsActualTable.tsx
    - apps/command-center/src/components/finance/BudgetEntryForm.tsx
    - apps/command-center/src/components/finance/WeeklyCashPositionTable.tsx
  modified:
    - apps/command-center/src/app/actions/financial-reports.ts (4 new exports appended)
    - apps/command-center/src/components/layout/Sidebar.tsx (Reports link updated)
    - apps/command-center/src/app/(dashboard)/dashboard/reports/page.tsx (redirect to new route)
decisions:
  - "[Phase 06-03]: getPeriodRange helper encapsulates date-fns startOfMonth/startOfQuarter/startOfYear logic — avoids repetition across P&L and cash flow functions"
  - "[Phase 06-03]: Per-row useActionState in BudgetEntryForm — each category row has independent form state with success flash, avoids cross-row state pollution"
  - "[Phase 06-03]: Cash inflows use CASH, CREDIT_CARD, SQUARE, STRIPE, ZELLE payment methods as immediate cash (not NET_30 or CHECK) — NET_30/CHECK captured via invoice payments separately"
  - "[Phase 06-03]: Projection chart uses recharts AreaChart with linearGradient fills — consistent with existing recharts BarChart pattern from Plan 02, no new chart library needed"
  - "[Phase 06-03]: Old /dashboard/reports redirects to /dashboard/finance/reports — preserves existing bookmark compatibility while delivering reports under finance namespace"
  - "[Phase 06-03]: BudgetVsActualTable skips categories with zero budget AND zero actual — avoids showing 10 empty rows when no data exists"
metrics:
  duration: "5 minutes"
  completed: "2026-03-12"
  tasks: 2
  files_created: 8
  files_modified: 3
---

# Phase 06 Plan 03: Financial Reports and Budget Management Summary

**One-liner:** P&L statement (monthly/quarterly/annual with revenue by channel, COGS, gross profit, OpEx, net income), Cash Flow Statement (invoice payment inflows vs approved expense outflows), 90-day projection chart (recharts AreaChart with 30-day rolling averages), budget entry per category (per-row useActionState), and weekly cash position table for the last 8 weeks.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | P&L, cash flow, projection, budget, and cash position server actions | b990522 | financial-reports.ts (4 appended exports), budgets.ts |
| 2 | Reports page with P&L, cash flow, projection, budget, cash position UI | 1f95e83 | reports/page.tsx, PnLReport.tsx, CashFlowStatement.tsx, CashFlowProjectionChart.tsx, BudgetVsActualTable.tsx, BudgetEntryForm.tsx, WeeklyCashPositionTable.tsx, Sidebar.tsx, reports redirect |

## What Was Built

### Server Actions (financial-reports.ts — appended)

- `getPnLReport({ year, month?, quarter? })`: `getPeriodRange` helper computes date window. Revenue = Sale + Order (confirmed+) aggregated by channelId, merged with channel names. COGS = batches produced in period (materials × costPerUnit + laborCostTotal + overheadCostTotal). OpEx = approved expenses grouped by ExpenseCategory. Returns full PnLReport shape with grossProfit, grossMarginPct, netIncome, netMarginPct.
- `getCashFlowStatement({ year, month })`: Inflows = InvoicePayment.amount for period + Sale.totalAmount for immediate payment methods (CASH/CREDIT_CARD/SQUARE/STRIPE/ZELLE). Outflows = approved Expense grouped by category. Returns CashFlowStatement with null openingBalance/closingBalance (no balance tracking model).
- `getCashFlowProjection()`: 30-day averages computed from Sale + Order revenue and approved Expense. Builds 13 weekly buckets from today. Outstanding invoices (not PAID/VOID, dueDate in next 90 days) added to projected inflow in their due week. Returns CashFlowProjectionWeek array with cumulativeNet running total.
- `getWeeklyCashPosition(weeksBack = 8)`: Iterates from weeksBack to 0, uses startOfWeek/endOfWeek, queries InvoicePayment + cash Sale for inflows and approved Expense for outflows per week. Returns WeeklyCashPositionItem array.

### Server Actions (budgets.ts — new)

- `getBudgetVsActual(period)`: Queries Budget by period, queries Expense grouped by category for the month (approved only). Builds comparison for all ExpenseCategory values that have either budget or actual spend. Returns BudgetVsActualItem array sorted alphabetically.
- `getBudgets(period)`: Simple findMany for existing Budget records in a period.
- `setBudget(prevState, formData)`: Zod validates period (YYYY-MM regex), category (nativeEnum ExpenseCategory), amount (positive number coerce). Uses `db.budget.upsert` with `period_category` compound unique key. Calls `revalidatePath('/dashboard/finance/reports')`. Returns SetBudgetState.

### Reports Page (/dashboard/finance/reports)

Server component with Promise.all fetching all 5 data sources in parallel for current month. Renders 5 vertical sections: P&L Report, Cash Flow Statement, 90-Day Projection, Budget Management (table + entry form), Weekly Cash Position.

### PnLReport Component

Client component with period selector (3 buttons: Monthly/Quarterly/Annual), year dropdown, month or quarter dropdown (contextual). Period changes call getPnLReport via startTransition. Structured table layout: revenue by channel, COGS, **Gross Profit** (green/red), OpEx by category, **Net Income** (bold xl, green/red) with margin percentages.

### CashFlowStatement Component

Client display-only component. Structured sections: Operating Activities (Inflows table, Outflows table, Net Operating bold), Investing Activities (placeholder), Financing Activities (placeholder), Net Change in Cash (bold xl), Opening/Closing Balance (shows "N/A — set opening balance in settings" when null).

### CashFlowProjectionChart Component

Client component using recharts AreaChart with ResponsiveContainer. Three areas: projectedInflow (green, gradient fill), projectedOutflow (red, gradient fill), cumulativeNet (blue dashed). X-axis shows week start dates, Y-axis formatted as $Xk. Empty state if no data.

### BudgetVsActualTable Component

Client display-only. Table with Category, Budgeted, Actual, Variance ($), Variance (%) columns. Variance color-coded: green = under budget (positive), red = over budget (negative). Totals row. Summary: "X of Y categories over budget".

### BudgetEntryForm Component

Client component. Each ExpenseCategory rendered as a BudgetRow sub-component with its own `useActionState(setBudget, initialState)`. Per-row $-prefixed Input, Save button, success flash (2s auto-dismiss), error display. Pre-filled with existing budget amounts.

### WeeklyCashPositionTable Component

Client display-only. Table with Week range, Inflows (green), Outflows (red in parens), Net Position (green/red). Average weekly net position shown in header. Last 8 weeks ordered oldest to newest.

### Sidebar + Redirect

Reports nav item updated from `/dashboard/reports` (permission: reports) to `/dashboard/finance/reports` (permission: finance). Old `/dashboard/reports` page replaced with `redirect()` call.

## Deviations from Plan

None — plan executed exactly as written. All TypeScript checks pass with zero errors.

## Self-Check: PASSED

All 9 files exist on disk. Both task commits (b990522, 1f95e83) verified in git log. `tsc --noEmit` passes with zero errors before and after each task.
