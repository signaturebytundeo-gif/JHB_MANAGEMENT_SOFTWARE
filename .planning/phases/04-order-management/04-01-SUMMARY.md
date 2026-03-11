---
phase: 04-order-management
plan: 01
subsystem: database
tags: [prisma, postgresql, zod, order-management, invoicing, fifo]

# Dependency graph
requires:
  - phase: 03-inventory-management
    provides: InventoryMovement model and FIFO utilities that Order deductions link to
provides:
  - Order model with catering, farmers market, and approval fields
  - OrderLineItem model (Cascade delete from Order)
  - Invoice model with AR aging fields (dueDate, overdueAt, lateFeeAmount)
  - InvoicePayment model for payment logging
  - OperatorOrderStatus, InvoiceStatus, OperatorOrderType enums
  - orderId field on InventoryMovement linking deductions to orders
  - createOperatorOrderSchema + updateOrderStatusSchema Zod validators
  - createInvoiceSchema + logPaymentSchema Zod validators
  - generateOrderNumber + generateInvoiceNumber utilities
affects:
  - 04-02 (order create actions and form)
  - 04-03 (order confirm / FIFO deduction action)
  - 04-04 (invoice generate and AR aging)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Separate OperatorOrderStatus enum from existing OrderStatus (WebsiteOrder domain isolation)"
    - "Named Prisma relation CustomerOperatorOrders on Customer — avoids clash with existing orders WebsiteOrder[]"
    - "lineItems JSON-string transform in Zod — hidden input serializes line items before FormData submit"
    - "tx parameter on number generators — pass Prisma transaction for concurrency-safe sequential numbering"

key-files:
  created:
    - apps/command-center/src/lib/validators/operator-orders.ts
    - apps/command-center/src/lib/validators/invoices.ts
    - apps/command-center/src/lib/utils/order-number.ts
  modified:
    - apps/command-center/prisma/schema.prisma

key-decisions:
  - "OperatorOrderStatus separate from OrderStatus — adding DRAFT/CONFIRMED/COMPLETED to existing enum would break WebsiteOrderList STATUS_BADGES TypeScript record"
  - "Named relation CustomerOperatorOrders — Customer already has orders WebsiteOrder[], unnamed Order relation would cause Prisma validation error"
  - "eventDate field added to Order for CATERING type — required anchor for balanceDueDate (7 days before event) per pitfall 6 in research"
  - "lineItems passed as JSON string in hidden input — FormData cannot serialize arrays; transform parses on server before Zod validates shape"

patterns-established:
  - "Pattern: Zod z.nativeEnum(PaymentMethod) for payment method validation — follows sales.ts pattern"
  - "Pattern: z.enum with error key (not required_error) for Zod v4 enum validation — consistent with existing inventory.ts"
  - "Pattern: generateOrderNumber(tx?) optional transaction param — caller decides atomic context"

# Metrics
duration: 3min
completed: 2026-03-11
---

# Phase 4 Plan 1: Order Management Data Foundation Summary

**Prisma schema extended with Order, OrderLineItem, Invoice, InvoicePayment models and three new enums; Zod validators and sequential number generators for the operator order management system**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-11T00:00:33Z
- **Completed:** 2026-03-11T00:02:48Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added Order model with full lifecycle fields: catering deposit tracking, farmers market notes, dual-approval workflow fields
- Added Invoice model with AR aging infrastructure (dueDate, overdueAt, lateFeeAmount, paidAmount)
- Added InventoryMovement.orderId field linking FIFO deduction records back to the source order
- Created three validator files + number generator with correct Zod v4 patterns and optional transaction support
- Database synced via `prisma db push` and client regenerated — all new types available immediately

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Order Management models and enums to Prisma schema** - `d17ce38` (feat)
2. **Task 2: Create Zod validators and number generators** - `241a7d8` (feat)

**Plan metadata:** (to be committed below)

## Files Created/Modified

- `apps/command-center/prisma/schema.prisma` - Added 3 enums, 4 models, reverse relations on User/Product/Location/SalesChannel/Customer, orderId on InventoryMovement
- `apps/command-center/src/lib/validators/operator-orders.ts` - createOperatorOrderSchema (with JSON line items transform and refine), updateOrderStatusSchema, form state types
- `apps/command-center/src/lib/validators/invoices.ts` - createInvoiceSchema, logPaymentSchema, form state types
- `apps/command-center/src/lib/utils/order-number.ts` - generateOrderNumber, generateInvoiceNumber (sequential ORD/INV-YYYY-NNNN format, optional tx param)

## Decisions Made

- **OperatorOrderStatus separate from OrderStatus:** The existing `OrderStatus` enum is used by `WebsiteOrder` and typed as `Record<OrderStatus, ...>` in `WebsiteOrderList.tsx`. Extending it would require updating existing components and pollute the webhook-received order domain.
- **Named relation `CustomerOperatorOrders`:** Customer already has `orders WebsiteOrder[]`. An unnamed Order relation would create an ambiguous `orders` field collision and Prisma validation error.
- **eventDate added to Order:** Research pitfall 6 called out that `balanceDueDate = subDays(eventDate, 7)` requires an event date anchor. Added `eventDate DateTime?` to the Order model.
- **lineItems as JSON string:** HTML FormData cannot serialize arrays. The form must serialize line items to a JSON string in a hidden input; Zod's `.transform()` parses it back on the server before validation.

## Deviations from Plan

None - plan executed exactly as written. One enhancement added (eventDate field on Order) was called out as a required field in the research pitfalls section, so it was included per the plan's instruction to follow 04-RESEARCH.md specifications.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Database schema applied automatically via `prisma db push` against the existing Neon PostgreSQL connection.

## Next Phase Readiness

- Order, Invoice, and supporting models are live in the database
- Prisma client regenerated — `db.order`, `db.invoice`, `db.orderLineItem`, `db.invoicePayment` are all available
- Validators and number generators ready for use in server actions (Plan 04-02)
- InventoryMovement.orderId field ready for FIFO deduction linking (Plan 04-03)

## Self-Check: PASSED

All created files and task commits verified present on disk.

---
*Phase: 04-order-management*
*Completed: 2026-03-11*
