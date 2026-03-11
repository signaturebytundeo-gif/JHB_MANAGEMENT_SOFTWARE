---
phase: 04-order-management
plan: 04
subsystem: finance
tags: [invoices, ar-aging, payments, late-fees, net-30, print]
dependency_graph:
  requires: [04-03]
  provides: [invoices, ar-aging-report, payment-tracking, branded-print-invoice]
  affects: [finance-dashboard, order-detail]
tech_stack:
  added: []
  patterns:
    - useActionState for invoice creation and payment logging
    - Server component page + client wrapper for modal state
    - Custom fixed-overlay modal pattern (consistent with codebase)
    - window.print() + @media print CSS for PDF invoice output
    - differenceInDays/addDays from date-fns for all date math
key_files:
  created:
    - apps/command-center/src/app/actions/invoices.ts
    - apps/command-center/src/components/finance/InvoiceList.tsx
    - apps/command-center/src/components/finance/InvoiceDetail.tsx
    - apps/command-center/src/components/finance/PaymentModal.tsx
    - apps/command-center/src/components/finance/ARAgingReport.tsx
    - apps/command-center/src/components/finance/CreateInvoiceModal.tsx
    - apps/command-center/src/components/finance/FinanceDashboardClient.tsx
    - apps/command-center/src/components/finance/InvoiceDetailClient.tsx
    - apps/command-center/src/app/(dashboard)/dashboard/finance/invoices/[id]/page.tsx
  modified:
    - apps/command-center/src/app/(dashboard)/dashboard/finance/page.tsx
decisions:
  - Finance page flags overdue invoices on each load — eliminates need for cron job, ensures real-time overdue detection
  - FinanceDashboardClient thin wrapper pattern — server page fetches all data, client component handles modal state only
  - InvoiceDetailClient as separate client wrapper — keeps InvoiceDetail a pure presentational component usable in print contexts
  - lateFeeAmount stored on invoice at flagging time + recomputed on read — stored value used for AR aging summary, live value used for display
metrics:
  duration: 5m
  completed_date: 2026-03-11
  tasks_completed: 2
  files_created: 9
  files_modified: 1
---

# Phase 04 Plan 04: Invoice System & AR Aging Summary

Complete invoicing system with Net 30 terms, 1.5%/month late fees, AR aging buckets, branded printable invoice output, and payment logging with PARTIAL/PAID status tracking.

## What Was Built

### Task 1: Invoice Server Actions (`invoices.ts`)

Seven server actions implementing the complete invoice lifecycle:

- **`createInvoice`**: Guards order must be CONFIRMED+, not already invoiced. Calculates subtotal from lineItems, applies taxRate, sets `dueDate = addDays(issuedAt, 30)` once (never recomputed). Generates `INV-YYYY-NNNN` via `generateInvoiceNumber`, creates with status `SENT`.
- **`getInvoices`**: Returns all invoices with order/customer selects. Computes live `lateFeeAmount` for OVERDUE invoices: `principal * 0.015 * (daysOverdue / 30)`.
- **`getInvoiceById`**: Full invoice with order line items + products, customer, payments. Same late fee computation.
- **`logPayment`**: Creates `InvoicePayment` record, updates `paidAmount`. Transitions: `paidAmount >= total → PAID`, `paidAmount > 0 → PARTIAL`.
- **`flagOverdueInvoices`**: Queries non-PAID/VOID/OVERDUE invoices where `dueDate < now - 1 day`, updates status=OVERDUE, stores lateFeeAmount.
- **`getARAgingReport`**: Buckets all unpaid invoices into CURRENT/1_30/31_60/61_90/90_PLUS by daysPastDue. Returns items + summary totals per bucket.
- **`getUninvoicedOrders`**: Returns CONFIRMED+ orders with no linked invoice — powers the CreateInvoiceModal picker.

### Task 2: Finance UI Components & Dashboard

- **`InvoiceList`**: Responsive table-to-cards (desktop/mobile). Status filter buttons. OVERDUE rows get red-50 background. Late fee shown inline. Links to `/dashboard/finance/invoices/${id}`.
- **`InvoiceDetail`**: Branded JHB invoice layout. Company header, Bill To, line items table, totals breakdown with late fee line item for overdue. Payment terms note. Print button calls `window.print()`. `@media print` CSS hides nav/sidebar/buttons, renders invoice only.
- **`PaymentModal`**: Custom fixed-overlay. `useActionState(logPayment)`. Pre-fills amount with current balance. Date, method, notes fields. Closes + toasts on success.
- **`CreateInvoiceModal`**: Fetches `getUninvoicedOrders()` on mount. Scrollable order picker list with order#/customer/total/date. Selection shows order summary with Net 30 notice. Tax rate input. `useActionState(createInvoice)`.
- **`ARAgingReport`**: 5 KPI cards (green → dark-red gradient). Grand total row. Detail table sortable by outstanding or days past due. Bucket filter buttons. Late fee shown per row.
- **`FinanceDashboardClient`**: Client wrapper managing `showCreateModal` state. Renders ARAgingReport + InvoiceList + Generate Invoice button.
- **`InvoiceDetailClient`**: Client wrapper with payment modal state. Renders InvoiceDetail + payment history table + Log Payment button. Status summary at bottom.
- **`finance/page.tsx`**: Server component. Calls `flagOverdueInvoices()` first, then parallel `getInvoices()` + `getARAgingReport()`. Passes to `FinanceDashboardClient`.
- **`finance/invoices/[id]/page.tsx`**: Server component. Calls `getInvoiceById`, renders `InvoiceDetailClient`.

## Verification

- TypeScript: `npx tsc --noEmit` — passes clean
- Build: `npm run build` — all routes compile, `/dashboard/finance` and `/dashboard/finance/invoices/[id]` present
- PRICE-01: Branded JHB invoice with print CSS via `window.print()`
- PRICE-02: Status lifecycle SENT → PARTIAL/PAID/OVERDUE tracked in DB
- PRICE-03: `dueDate = addDays(issuedAt, 30)`, overdue flagged at 31 days
- PRICE-04: `lateFeeAmount = principal * 0.015 * (daysOverdue / 30)`
- PRICE-05: AR aging CURRENT/1-30/31-60/61-90/90+ with KPI cards and summary totals

## Deviations from Plan

**1. [Rule 2 - Missing Critical Functionality] Added `InvoiceDetailClient` wrapper component**

- **Found during:** Task 2 — InvoiceDetail is a pure presentational component, but the page needs client state for PaymentModal
- **Fix:** Created `InvoiceDetailClient` as a thin client wrapper that manages payment modal state, keeping `InvoiceDetail` purely presentational and printable
- **Files modified:** `InvoiceDetailClient.tsx` (new), `invoices/[id]/page.tsx` (uses wrapper)
- **Commit:** f432e80

**2. [Rule 2 - Missing Critical Functionality] Added `FinanceDashboardClient` wrapper component**

- **Found during:** Task 2 — finance/page.tsx is async server component but needs useState for CreateInvoiceModal
- **Fix:** Added `FinanceDashboardClient` thin client component, consistent with pattern used throughout codebase (e.g., production, inventory pages)
- **Files modified:** `FinanceDashboardClient.tsx` (new), `finance/page.tsx` (delegates to wrapper)
- **Commit:** f432e80
