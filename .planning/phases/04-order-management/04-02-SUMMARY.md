---
phase: 04-order-management
plan: 02
subsystem: order-management
tags: [server-actions, forms, components, crud, order-management]

# Dependency graph
requires:
  - phase: 04-01
    provides: Order/OrderLineItem/Invoice schema, createOperatorOrderSchema, generateOrderNumber utility
provides:
  - createOperatorOrder server action (validates, transaction-wrapped, ORD-YYYY-NNNN auto-number)
  - getOperatorOrders server action (list with customer/channel/location/lineItem count)
  - getOperatorOrderById server action (full detail with line items + product + invoice)
  - OperatorOrderForm component (multi-line-item, order type toggle, catering/FM conditional fields)
  - OperatorOrderList component (responsive table/cards, status + search filtering)
  - OrderStatusBadge component (7-status color-coded badge)
  - /dashboard/orders/new route (create order page)
  - Operator Orders tab on /dashboard/orders
  - OperatorOrder rendering path in /dashboard/orders/[id]
affects:
  - 04-03 (order confirm / FIFO deduction — builds on createOperatorOrder pattern)
  - 04-04 (invoice generate — getOperatorOrderById returns invoice relation)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useActionState(createOperatorOrder) + useFormStatus SubmitButton — matches SaleForm.tsx pattern"
    - "lineItems JSON-string hidden input — serialized before submit, Zod .transform() parses on server"
    - "db.$transaction for order number generation — concurrency-safe sequential ORD-YYYY-NNNN"
    - "Dual-dispatch in [id]/page.tsx — getOperatorOrderById checked first, falls through to WebsiteOrder"

key-files:
  created:
    - apps/command-center/src/app/actions/operator-orders.ts
    - apps/command-center/src/components/orders/OrderStatusBadge.tsx
    - apps/command-center/src/components/orders/OperatorOrderList.tsx
    - apps/command-center/src/components/orders/OperatorOrderForm.tsx
    - apps/command-center/src/app/(dashboard)/dashboard/orders/new/page.tsx
  modified:
    - apps/command-center/src/app/(dashboard)/dashboard/orders/page.tsx
    - apps/command-center/src/app/(dashboard)/dashboard/orders/tabs.tsx
    - apps/command-center/src/app/(dashboard)/dashboard/orders/[id]/page.tsx

key-decisions:
  - "User.name used (not firstName/lastName) — User model has single name field, unlike Customer which has firstName/lastName"
  - "Dual-dispatch in [id]/page.tsx — getOperatorOrderById returns null if not found, allows WebsiteOrder fallback without breaking existing detail route"
  - "OperatorOrderList client-side filtering — small dataset, instant UI response without server round-trips"
  - "Auto-fill unit price from first pricing tier on product select — reduces manual entry, user can override"

# Metrics
duration: 4min
completed: 2026-03-11
---

# Phase 4 Plan 2: Operator Order Actions and UI Summary

**Operator order CRUD server actions, multi-line-item creation form with CATERING/FARMERS_MARKET conditional fields, responsive order list, and order detail page — enabling full ORD-01/07/08/09 workflow**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-11T19:25:42Z
- **Completed:** 2026-03-11T19:29:58Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Created `operator-orders.ts` with three server actions: createOperatorOrder (transaction-wrapped, CATERING balance due date calculation), getOperatorOrders (list with includes), getOperatorOrderById (full detail)
- Created OrderStatusBadge covering all 7 OperatorOrderStatus values with appropriate color coding
- Created OperatorOrderList with desktop table + mobile cards pattern matching WebsiteOrderList, with client-side status + order number filtering
- Created OperatorOrderForm with multi-line-item section (add/remove rows, auto-fill price from product tier), order type toggle, conditional CATERING and FARMERS_MARKET sections, useActionState pattern, success toast + redirect
- Added `/dashboard/orders/new` page with server-side data fetching for channels, products (with pricing tiers), locations, customers
- Added 4th "Operator Orders" tab to OrdersTabs component
- Updated orders page with New Order header button and OperatorOrdersContent server component
- Updated `[id]/page.tsx` with dual-dispatch: checks getOperatorOrderById first, renders OperatorOrderDetail component; falls through to WebsiteOrder if not found
- TypeScript compiles cleanly; Next.js build succeeds with all 28 pages generating correctly

## Task Commits

1. **Task 1: Create operator order server actions** — `8fd92ec` (feat)
2. **Task 2: Create order form, list, badge components and wire to pages** — `b0b9ac6` (feat)

## Files Created/Modified

- `apps/command-center/src/app/actions/operator-orders.ts` — Three server actions: createOperatorOrder, getOperatorOrders, getOperatorOrderById; exported OperatorOrderListItem and OperatorOrderDetail types
- `apps/command-center/src/components/orders/OrderStatusBadge.tsx` — Color-coded badge for DRAFT/CONFIRMED/PROCESSING/SHIPPED/DELIVERED/COMPLETED/CANCELLED
- `apps/command-center/src/components/orders/OperatorOrderList.tsx` — Responsive table (desktop) / card (mobile) list with search + status filtering
- `apps/command-center/src/components/orders/OperatorOrderForm.tsx` — Multi-line-item form with useActionState, order type toggle, conditional sections, running total
- `apps/command-center/src/app/(dashboard)/dashboard/orders/new/page.tsx` — Server component fetching channels/products/locations/customers, renders OperatorOrderForm
- `apps/command-center/src/app/(dashboard)/dashboard/orders/page.tsx` — Added getOperatorOrders import, OperatorOrdersContent component, operatorOrders prop on OrdersTabs, New Order header button
- `apps/command-center/src/app/(dashboard)/dashboard/orders/tabs.tsx` — Added 4th Operator Orders tab
- `apps/command-center/src/app/(dashboard)/dashboard/orders/[id]/page.tsx` — Dual-dispatch with OperatorOrderDetail component for operator orders

## Decisions Made

- **User.name in server action:** User model has a single `name` field (not firstName/lastName like Customer). The createdBy select was updated to use `name`.
- **Dual-dispatch in [id] page:** Rather than creating a separate route, the existing `/dashboard/orders/[id]` route checks `getOperatorOrderById` first. Returns null if not found, allowing fallback to `getWebsiteOrderById` for backward compat.
- **Client-side OperatorOrderList filtering:** Small dataset (operator orders are created manually, not via webhooks), so client filtering is instant with no round-trips.
- **Auto-fill unit price on product select:** When user selects a product in a line item row, the unit price auto-fills from the first pricing tier. User can still override.

## Deviations from Plan

None — plan executed exactly as written. One small fix (Rule 1): User model uses `name` not `firstName`/`lastName` — caught on first TypeScript compile, corrected immediately in the same task before commit.

## Issues Encountered

None after TypeScript auto-fix.

## User Setup Required

None.

## Next Phase Readiness

- Server actions ready for plan 04-03 to call `updateOrderStatus` and add FIFO deduction logic
- `getOperatorOrderById` returns `invoice` relation for plan 04-04 to check existing invoices
- Order detail page has placeholder Actions card ready to be wired with status controls in 04-03

## Self-Check: PASSED
