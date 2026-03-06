---
phase: 03-inventory-management
plan: 01
subsystem: database
tags: [prisma, postgresql, zod, fifo, inventory, typescript]

# Dependency graph
requires:
  - phase: 02-production-quality-control
    provides: Batch, BatchAllocation, BatchStatus enum, Location model, User model — all used by InventoryMovement relations
provides:
  - InventoryMovement model with MovementType and InventoryAdjustmentReason enums for event-sourced audit trail
  - PackagingMaterial model with reorder tracking (reorderPoint, leadTimeDays, currentQuantity)
  - Product.reorderPoint and Product.leadTimeDays fields for stock level classification
  - transferSchema, adjustmentSchema, packagingMaterialSchema Zod validators
  - allocateInventoryFIFO and getAvailableStock FIFO utility
  - calculateReorderPoint and classifyStockLevel reorder-point utility
affects:
  - 03-02-stock-levels
  - 03-03-transfers-adjustments
  - 03-04-packaging-tracking

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Event-sourced inventory via InventoryMovement (movementType + from/to locations + quantity)
    - FIFO allocation: oldest RELEASED batches first, available = initial + inbound - outbound movements
    - Reorder classification: CRITICAL (<reorderPoint), REORDER (<reorderPoint*1.2), HEALTHY (>=reorderPoint*1.2)
    - Zod v4 enum params use 'error' key (not 'required_error'/'invalid_type_error')

key-files:
  created:
    - apps/command-center/src/lib/utils/fifo.ts
    - apps/command-center/src/lib/utils/reorder-point.ts
  modified:
    - apps/command-center/prisma/schema.prisma
    - apps/command-center/prisma/seed.ts
    - apps/command-center/src/lib/validators/inventory.ts

key-decisions:
  - "InventoryAdjustmentReason enum separate from existing AdjustmentReason — preserves StockAdjustment backward compat while giving InventoryMovement its own reason set (DAMAGE, SHRINKAGE, SAMPLING, EXPIRED, COUNT_CORRECTION)"
  - "Phase 3 schemas coexist with legacy schemas in inventory.ts — no breaking changes to existing StockAdjustment/InventoryTransaction flows"
  - "FIFO available quantity = initial BatchAllocation quantity + inbound InventoryMovements - outbound InventoryMovements"
  - "Zod v4 enum params use 'error' key instead of 'required_error'/'invalid_type_error' from Zod v3"

patterns-established:
  - "Named Prisma relations on InventoryMovement for disambiguation: 'FromLocation', 'ToLocation', 'MovementCreator', 'MovementApprover'"
  - "FIFO utility accepts optional tx PrismaClient param for transaction context"
  - "Reorder point = leadTimeDemand + safetyStock (default 7 days safety buffer)"

# Metrics
duration: 4min
completed: 2026-03-06
---

# Phase 3 Plan 1: Inventory Management Database Foundation Summary

**InventoryMovement event-sourcing model, PackagingMaterial reorder tracking, FIFO allocation algorithm, and Zod validators for the Phase 3 inventory management system**

## Performance

- **Duration:** 4 minutes
- **Started:** 2026-03-06T14:25:58Z
- **Completed:** 2026-03-06T14:30:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added `InventoryMovement` model with `MovementType` enum and `InventoryAdjustmentReason` enum to Prisma schema, enabling event-sourced audit trail for all inventory changes
- Added `PackagingMaterial` model with reorder tracking fields and seeded 6 common materials (2 bottle sizes, caps, 2 label sizes, shipping boxes)
- Created FIFO allocation utility (`allocateInventoryFIFO`, `getAvailableStock`) that queries oldest RELEASED batches first and calculates available stock from BatchAllocation + InventoryMovement data
- Created reorder-point utility (`calculateReorderPoint`, `classifyStockLevel`) for demand-driven threshold calculations with HEALTHY/REORDER/CRITICAL classification
- Extended `inventory.ts` validators with `transferSchema`, `adjustmentSchema`, `packagingMaterialSchema` for Phase 3 forms

## Task Commits

Each task was committed atomically:

1. **Task 1: Prisma schema + seed** - `161ae3f` (feat)
2. **Task 2: Validators, FIFO utility, reorder-point utility** - `0632733` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/command-center/prisma/schema.prisma` - Added InventoryMovement, PackagingMaterial models; MovementType, InventoryAdjustmentReason enums; Product reorderPoint/leadTimeDays fields; back-references on Batch, Location, User
- `apps/command-center/prisma/seed.ts` - Added packaging material seed data and product reorder defaults
- `apps/command-center/src/lib/validators/inventory.ts` - Added transferSchema, adjustmentSchema, packagingMaterialSchema and their form state types
- `apps/command-center/src/lib/utils/fifo.ts` - FIFO allocation algorithm with allocateInventoryFIFO and getAvailableStock
- `apps/command-center/src/lib/utils/reorder-point.ts` - Reorder threshold calculation with calculateReorderPoint and classifyStockLevel

## Decisions Made

- **InventoryAdjustmentReason separate enum:** Created a new `InventoryAdjustmentReason` enum (DAMAGE, SHRINKAGE, SAMPLING, EXPIRED, COUNT_CORRECTION) rather than replacing the existing `AdjustmentReason` enum (DAMAGE, THEFT, COUNTING_ERROR, TRANSFER, OTHER) that `StockAdjustment` model depends on. This preserves backward compatibility with existing inventory flows.
- **Phase 3 schemas coexist with legacy:** Added new schemas to `inventory.ts` alongside existing `stockAdjustmentSchema`/`inventoryTransferSchema`. Legacy schemas preserved unchanged to avoid breaking Phase 2 server actions.
- **Zod v4 enum error handling:** Zod v4's `z.enum()` uses `{ error: string }` param syntax instead of Zod v3's `required_error`/`invalid_type_error`. Auto-fixed during compilation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zod v4 enum params use 'error' not 'required_error'/'invalid_type_error'**
- **Found during:** Task 2 (inventory validators)
- **Issue:** Plan's code sample used Zod v3 `z.enum()` error params (`required_error`, `invalid_type_error`) which don't exist in Zod v4 — TypeScript error TS2769
- **Fix:** Changed to `{ error: 'message' }` which is the Zod v4 API
- **Files modified:** `apps/command-center/src/lib/validators/inventory.ts`
- **Verification:** `npx tsc --noEmit` passed with zero errors
- **Committed in:** `0632733` (Task 2 commit)

**2. [Rule 1 - Bug] AdjustmentReason enum conflict — used InventoryAdjustmentReason instead**
- **Found during:** Task 1 (schema design)
- **Issue:** Existing `AdjustmentReason` enum has different values (THEFT, COUNTING_ERROR, TRANSFER, OTHER) vs plan's intended values (SHRINKAGE, SAMPLING, EXPIRED, COUNT_CORRECTION). Replacing it would break `StockAdjustment` model.
- **Fix:** Created new `InventoryAdjustmentReason` enum for InventoryMovement, kept original `AdjustmentReason` for StockAdjustment
- **Files modified:** `apps/command-center/prisma/schema.prisma`
- **Verification:** `npx prisma db push` succeeded; `npx tsc --noEmit` passed
- **Committed in:** `161ae3f` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Both fixes necessary for correctness. No scope creep. The InventoryAdjustmentReason enum is functionally equivalent to what the plan intended.

## Issues Encountered

None — both deviations were caught at compilation time and fixed immediately.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Schema foundation complete — `InventoryMovement` and `PackagingMaterial` tables exist in the database
- FIFO utility ready for use in transfer/deduction server actions (Phase 3, Plans 2-3)
- Validator schemas ready for form handling in stock level and packaging management UIs
- Reorder-point utility ready for stock level grid classification (Plan 2)
- All 6 packaging materials seeded in database, all 6 products have reorder defaults

---
*Phase: 03-inventory-management*
*Completed: 2026-03-06*
