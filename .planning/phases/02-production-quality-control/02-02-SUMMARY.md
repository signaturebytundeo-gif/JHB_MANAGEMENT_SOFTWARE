---
phase: 02-production-quality-control
plan: 02
subsystem: production
tags: [server-actions, mobile-first, react-19, useActionState, batch-tracking, qc-workflow]

# Dependency graph
requires:
  - phase: 02-01
    provides: Production database schema (Batch, QCTest, BatchAllocation, etc.)
  - phase: 01-04
    provides: DAL functions (verifySession, verifyManagerOrAbove)
  - phase: 01-02
    provides: Server Action patterns with useActionState
provides:
  - Production Server Actions (createBatch, submitQCTest, updateBatchStatus, getBatches, getBatchById, getProductionMetrics)
  - Mobile-optimized batch creation form at /dashboard/production/new
  - Conditional co-packer fields based on production source
  - Optional location allocation with sum validation
affects: [02-03-production-ui, 03-inventory-management, batch-detail-pages]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "React 19 useActionState for form handling with Server Actions"
    - "Mobile-first form design: 16px inputs (text-base), 44px touch targets (h-11), inputMode=numeric"
    - "Conditional form sections based on toggle state (production source)"
    - "Dynamic allocation fields with client-side sum validation"
    - "Transaction-based batch creation with allocations"
    - "QC test auto-fail logic (pH >= 4.6) with batch status updates"
    - "State machine for batch status transitions"

key-files:
  created:
    - src/app/actions/production.ts
    - src/components/production/BatchForm.tsx
    - src/components/production/AllocationFields.tsx
    - src/app/(dashboard)/dashboard/production/new/page.tsx
  modified: []

key-decisions:
  - "Server Actions handle complete batch lifecycle: creation, QC testing, status updates, queries"
  - "Auto-fail QC tests when pH >= 4.6 for food safety compliance"
  - "Batch status transitions enforced in updateBatchStatus (PLANNED -> IN_PROGRESS -> QC_REVIEW -> RELEASED/HOLD)"
  - "Location allocations are optional at batch creation but must sum to total units if provided"
  - "Production source toggle uses large touch-friendly buttons instead of select dropdown"
  - "Co-packer fields conditionally shown/required based on production source"

patterns-established:
  - "Pattern 1: Server Actions with $transaction for multi-record operations (batch + allocations)"
  - "Pattern 2: Mobile-first form design - all inputs text-base, touch targets h-11+, numeric inputMode"
  - "Pattern 3: Conditional form sections shown/hidden via client state with hidden inputs for submission"
  - "Pattern 4: Dynamic allocation rows with duplicate prevention and running total display"
  - "Pattern 5: QC test submission auto-updates batch status based on test results and existing tests"

# Metrics
duration: 3min
completed: 2026-02-17
---

# Phase 2 Plan 2: Production Server Actions & Batch Creation Form Summary

**Complete production Server Actions with mobile-optimized batch creation form supporting In-House/Co-Packer sources, optional location allocations, and QC workflow automation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-17T17:31:53Z
- **Completed:** 2026-02-17T17:35:34Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- All 6 production Server Actions created: createBatch, submitQCTest, updateBatchStatus, getBatches, getBatchById, getProductionMetrics
- Mobile-optimized batch creation form at /dashboard/production/new with conditional co-packer fields
- Auto-generated MMDDYY batch codes with letter suffixes for same-day batches
- Optional location allocation with sum validation and duplicate prevention
- QC test auto-fail logic for food safety (pH >= 4.6)
- Batch status state machine enforcing valid transitions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create all production Server Actions** - `871d7e5` (feat)
2. **Task 2: Create mobile-optimized batch creation form** - `65ac12c` (feat)

## Files Created/Modified

### Created
- `src/app/actions/production.ts` - 6 production Server Actions handling batch lifecycle, QC tests, status updates, queries, and metrics
- `src/components/production/BatchForm.tsx` - Mobile-optimized form with production source toggle, conditional co-packer fields, optional allocations
- `src/components/production/AllocationFields.tsx` - Dynamic location allocation rows with sum validation and duplicate prevention
- `src/app/(dashboard)/dashboard/production/new/page.tsx` - Server component fetching products, partners, locations for form

## Decisions Made

**createBatch Server Action:**
- Uses `verifyManagerOrAbove()` for auth (batch creation restricted to ADMIN/MANAGER)
- Extracts allocations from FormData using indexed naming: `allocation_locationId_N`, `allocation_quantity_N`
- Creates batch and allocations in single transaction for atomicity
- Auto-generates batch code via `generateBatchCode(productionDate)`
- Redirects to batch detail page on success

**submitQCTest Server Action:**
- Auto-fails tests when pH >= 4.6 (food safety requirement)
- Updates batch status based on test results:
  - Failed test → HOLD
  - All required tests pass (pH + visual_taste) → RELEASED
  - Otherwise → QC_REVIEW
- Uses transaction to create test and update batch status atomically

**updateBatchStatus Server Action:**
- Enforces valid state transitions:
  - PLANNED → IN_PROGRESS only
  - IN_PROGRESS → QC_REVIEW only
  - QC_REVIEW → RELEASED or HOLD (via QC results)
  - RELEASED → no transitions (terminal state)
  - HOLD → QC_REVIEW (for re-testing)

**getBatches and getBatchById:**
- Always filter `isActive: true` to respect soft delete pattern
- Include all relations for complete data display

**getProductionMetrics:**
- Defaults to current month
- Counts only RELEASED batches (not planned or in-progress)
- Calculates utilization vs 15,000 units target (hard-coded for Phase 2)

**Mobile-first form design:**
- All inputs use `text-base` (16px) to prevent iOS auto-zoom
- Touch targets minimum `h-11` (44px) for buttons and selects
- Number inputs use `inputMode="numeric"` for mobile number pad
- Submit button is `h-12` (48px) for easy tapping
- Single-column layout with generous spacing

**Production source toggle:**
- Large touch-friendly buttons instead of select dropdown
- Conditional rendering shows/hides co-packer fields based on selection
- Hidden input submits selected value to Server Action

**Location allocations:**
- Optional section with checkbox toggle
- Dynamic rows with add/remove functionality
- Prevents selecting same location twice
- Shows running total and remaining units
- Highlights in red if sum exceeds total units
- Hidden inputs submit indexed data: `allocation_locationId_0`, `allocation_quantity_0`, etc.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for next plans:**
- Batch creation flow complete end-to-end
- Production Server Actions ready for UI integration
- Mobile-optimized forms ready for field testing
- QC workflow automation in place

**What's available:**
- Create batches at /dashboard/production/new
- Auto-generated MMDDYY batch codes
- Conditional co-packer fields
- Optional location allocations
- QC test submission with auto-fail logic
- Batch status updates with transition validation
- Production metrics calculation

**Next steps (02-03):**
- Build production list/detail pages
- Integrate getBatches and getBatchById
- Create QC test submission UI
- Build batch status update UI
- Display production metrics

## Self-Check: PASSED

All files created and commits verified:

**Files:**
- ✓ src/app/actions/production.ts (11,343 bytes)
- ✓ src/components/production/BatchForm.tsx (9,032 bytes)
- ✓ src/components/production/AllocationFields.tsx (5,438 bytes)
- ✓ src/app/(dashboard)/dashboard/production/new/page.tsx (1,770 bytes)

**Commits:**
- ✓ 871d7e5 - Task 1: Create all production Server Actions
- ✓ 65ac12c - Task 2: Create mobile-optimized batch creation form

---
*Phase: 02-production-quality-control*
*Completed: 2026-02-17*
