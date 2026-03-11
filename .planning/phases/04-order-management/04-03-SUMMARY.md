---
phase: 04-order-management
plan: 03
subsystem: api
tags: [prisma, nextjs, fifo, inventory, orders, server-actions, approval-workflow]

# Dependency graph
requires:
  - phase: 04-02
    provides: Operator order CRUD, getOperatorOrderById, Order/OrderLineItem/ApprovalThreshold schema
  - phase: 03-inventory-management
    provides: allocateInventoryFIFO, InventoryMovement DEDUCTION pattern, FIFO available stock calculation

provides:
  - confirmOrder server action with FIFO allocation inside db.$transaction
  - approveOrder server action with dual-control enforcement
  - updateOrderStatus server action with legal transition validation
  - getPickPackList server action returning InventoryMovement-based batch codes
  - OrderActions client component with useTransition buttons for full workflow
  - PickPackList client component with print-friendly layout and window.print()
  - Order detail page wired with live status controls and pick/pack display

affects:
  - 04-04
  - 05-invoicing
  - 11-dashboard-kpis

# Tech tracking
tech-stack:
  added: []
  patterns:
    - FIFO inside db.$transaction — allocateInventoryFIFO called within transaction; each allocation creates DEDUCTION movement atomically
    - ApprovalThreshold DB query — approval logic reads thresholds from DB and maps approvalType strings, never hardcoded
    - Dual-control approval — second approver must be different userId from first approver
    - Legal transition map — VALID_TRANSITIONS Record enforces allowed status paths
    - useTransition for server actions — prevents double-submit, shows pending state without useState loading flag

key-files:
  created:
    - apps/command-center/src/components/orders/OrderActions.tsx
    - apps/command-center/src/components/orders/PickPackList.tsx
  modified:
    - apps/command-center/src/app/actions/operator-orders.ts
    - apps/command-center/src/app/(dashboard)/dashboard/orders/[id]/page.tsx

key-decisions:
  - "confirmOrder wraps FIFO + DEDUCTION creation + approval logic in single db.$transaction for atomicity"
  - "approvalType strings from ApprovalThreshold mapped to logic branches (auto/single_member/dual_member/dual_bank)"
  - "VALID_TRANSITIONS Record at module level — single source of truth for legal status paths"
  - "getPickPackList queries InventoryMovement DEDUCTION records (not lineItems) — shows actual batch codes allocated"
  - "PickPackList renders checkbox column for warehouse staff; print CSS hides non-print elements via id=pick-pack-list"
  - "Pick/pack always visible at PROCESSING status in page; toggled by button inside OrderActions component"
  - "Order detail page fetches pickPackData server-side for CONFIRMED+ statuses and passes as prop"

patterns-established:
  - "Server action result shape: { success: boolean; message: string } — consistent across all lifecycle actions"
  - "FIFO inside transaction: allocateInventoryFIFO(productId, locationId, qty, tx as typeof db)"
  - "Print-friendly component: style tag with @media print + id for isolation, window.print() button"

# Metrics
duration: 3min
completed: 2026-03-11
---

# Phase 04 Plan 03: Order Fulfillment Engine Summary

**FIFO allocation in atomic transaction on confirm, DB-driven approval thresholds with dual-control, full status workflow, and batch-code pick/pack lists from InventoryMovement records**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-11T19:32:40Z
- **Completed:** 2026-03-11T19:35:47Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- confirmOrder performs FIFO allocation inside db.$transaction, creates DEDUCTION movements per batch, then determines approval path from ApprovalThreshold records
- approveOrder enforces dual-control: second approver must be a different user from first; pending_single auto-confirms on approval
- updateOrderStatus validates transitions via a VALID_TRANSITIONS map (CONFIRMED→PROCESSING→SHIPPED→DELIVERED→COMPLETED, any→CANCELLED)
- getPickPackList queries InventoryMovement DEDUCTION records grouped by product SKU, showing batch codes for warehouse staff
- OrderActions (client component) uses useTransition to display context-appropriate buttons per status with sonner toasts
- PickPackList renders print-friendly layout with checkbox column; @media print CSS isolates the list via #pick-pack-list id

## Task Commits

1. **Task 1: Server actions** - `aca6aba` (feat)
2. **Task 2: Components + page wiring** - `cfb4e45` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `apps/command-center/src/app/actions/operator-orders.ts` - Added confirmOrder, approveOrder, updateOrderStatus, getPickPackList, PickPackList/PickPackItem types
- `apps/command-center/src/components/orders/OrderActions.tsx` - Client component with status-conditional action buttons
- `apps/command-center/src/components/orders/PickPackList.tsx` - Print-friendly batch code pick list
- `apps/command-center/src/app/(dashboard)/dashboard/orders/[id]/page.tsx` - Wired OrderActions and PickPackList into OperatorOrderDetail

## Decisions Made
- confirmOrder wraps FIFO + DEDUCTION creation + approval logic in a single db.$transaction — prevents partial allocation
- Approval thresholds queried from DB (ApprovalThreshold.findMany) at confirm time, ordered by minAmount ascending; matchingThreshold found by range check
- approvalType string field maps to logic: 'auto' → CONFIRMED + auto-approve fields; 'single_member' → pending_single DRAFT; 'dual_member'/'dual_bank' → pending_dual DRAFT
- Pick/pack data fetched server-side in page.tsx for CONFIRMED+ statuses, passed as prop to avoid client fetches
- PickPackList always rendered in a separate Card for PROCESSING status, plus toggled via OrderActions for other statuses

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- ORD-02 through ORD-06 criteria all satisfied
- Full order lifecycle (DRAFT→CONFIRMED→PROCESSING→SHIPPED→DELIVERED→COMPLETED) operational
- DEDUCTION movements created at confirm time — inventory deducted correctly from correct location
- Pick/pack lists functional — warehouse staff can see batch codes per order
- Ready for plan 04-04 (invoice generation on order completion)

## Self-Check: PASSED

All files created and commits verified:
- `apps/command-center/src/app/actions/operator-orders.ts` — FOUND
- `apps/command-center/src/components/orders/OrderActions.tsx` — FOUND
- `apps/command-center/src/components/orders/PickPackList.tsx` — FOUND
- `.planning/phases/04-order-management/04-03-SUMMARY.md` — FOUND
- Commit `aca6aba` (Task 1 server actions) — FOUND
- Commit `cfb4e45` (Task 2 components + page) — FOUND

---
*Phase: 04-order-management*
*Completed: 2026-03-11*
