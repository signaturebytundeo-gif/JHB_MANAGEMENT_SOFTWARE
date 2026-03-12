---
phase: 05-sales-channels-crm
plan: 04
subsystem: crm-ui
tags: [crm, leads, pricing, typescript, next-server-actions, react]

# Dependency graph
requires:
  - phase: 05-sales-channels-crm/05-01
    provides: Lead/PromotionalPricing Prisma models, Zod validators, calculateLineItemPrice utility, LeadStage enum
  - phase: 01-foundation-authentication
    provides: verifySession(), db client, User model
provides:
  - Lead pipeline server actions (getLeads, createLead, updateLead, updateLeadStage, getLeadsByStage)
  - Promotional pricing server actions (getPromotionalPricings, createPromotionalPricing, deactivatePromotionalPricing, getActivePricingForProduct, getCalculatedPrice)
  - LeadPipeline component: stage summary bar, filter tabs, desktop table + mobile cards, overdue highlighting
  - LeadEditModal component: create/edit modal for leads with all fields
  - PromotionalPricingList component: promotional pricing management with status badges and deactivate
  - PriceCalculator component: price breakdown widget showing base/discount/final/line-total
affects:
  - 05-sales-channels-crm (remaining plans can embed PriceCalculator in order forms)
  - Any page that renders /dashboard/customers

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useActionState with server action binding (createLead/updateLead based on edit mode)
    - useTransition for non-blocking stage quick-change without full form submission
    - Computed overdue boolean on server (followUpAt < now AND stage != CLOSED) returned with lead data
    - isCurrentlyActive computed on server (isActive AND startDate <= now AND endDate >= now)
    - discountType hidden input pattern for XOR discount form fields (percent vs fixed)
    - useEffect cleanup with cancelled flag prevents stale state in PriceCalculator on prop changes

key-files:
  created:
    - apps/command-center/src/app/actions/crm-leads.ts
    - apps/command-center/src/components/crm/LeadPipeline.tsx
    - apps/command-center/src/components/crm/LeadEditModal.tsx
    - apps/command-center/src/app/actions/pricing.ts
    - apps/command-center/src/components/pricing/PriceCalculator.tsx
    - apps/command-center/src/components/pricing/PromotionalPricingList.tsx

key-decisions:
  - "getLeads computes overdue boolean server-side — avoids client-side date comparison, consistent with server time"
  - "updateLeadStage uses formData with startTransition direct action call — not full form, enables inline stage change per row"
  - "discountType hidden input drives XOR field visibility — matches createPromotionalPricingSchema refine constraint from Plan 01"
  - "PriceCalculator uses useEffect with cancelled flag — prevents race conditions when props change rapidly"
  - "getCalculatedPrice wraps calculateLineItemPrice as server action — PriceCalculator stays purely client-side display widget"

# Metrics
duration: 3min
completed: 2026-03-12
---

# Phase 05 Plan 04: Lead Pipeline + Promotional Pricing Summary

**Lead pipeline server actions and UI (6-stage pipeline with overdue follow-up tracking, stage quick-change via useTransition), promotional pricing CRUD (percent/fixed discount, date ranges, status badges), and a PriceCalculator display widget that wraps calculateLineItemPrice for use in order forms**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-12T13:02:05Z
- **Completed:** 2026-03-12T13:05:59Z
- **Tasks:** 2/2
- **Files created:** 6
- **Total lines:** 1,591

## Accomplishments

- Created crm-leads.ts with 5 server actions covering full lead CRUD and per-stage counts; overdue boolean computed server-side
- Created LeadEditModal.tsx (269 lines) and LeadPipeline.tsx (339 lines) with stage summary bar, filter tabs, desktop table, mobile cards, and overdue badge
- Created pricing.ts with 5 server actions including getCalculatedPrice that wraps the existing calculateLineItemPrice utility
- Created PromotionalPricingList.tsx (431 lines) with inline create modal using percent/fixed toggle, status badge logic (Active/Scheduled/Expired/Inactive), and deactivate via useTransition
- Created PriceCalculator.tsx (162 lines) as a self-contained price breakdown widget ready to embed in order forms

## Task Commits

Each task was committed atomically:

1. **Task 1: Create lead pipeline actions and UI** - `30db166` (feat)
2. **Task 2: Create promotional pricing CRUD and price calculator widget** - `96bc7a0` (feat)

**Plan metadata:** committed with SUMMARY.md update

## Files Created/Modified

- `apps/command-center/src/app/actions/crm-leads.ts` — getLeads/createLead/updateLead/updateLeadStage/getLeadsByStage; overdue computed server-side
- `apps/command-center/src/components/crm/LeadEditModal.tsx` — create/edit modal; useActionState; handles all lead fields; datetime-local conversion for followUpAt
- `apps/command-center/src/components/crm/LeadPipeline.tsx` — stage summary pills, filter tabs, desktop table with stage quick-change select, mobile cards, overdue badge
- `apps/command-center/src/app/actions/pricing.ts` — full promotional pricing CRUD + getCalculatedPrice server action wrapping calculateLineItemPrice
- `apps/command-center/src/components/pricing/PromotionalPricingList.tsx` — promotional pricing list with inline create modal, discount type toggle, status badge computation, deactivate
- `apps/command-center/src/components/pricing/PriceCalculator.tsx` — price breakdown widget; useEffect with cancelled flag; base/discount/final/line-total display

## Decisions Made

- `getLeads` computes `overdue` boolean server-side (followUpAt < now AND stage !== CLOSED) to avoid client-side date arithmetic
- Stage quick-change uses `startTransition` + direct server action call (not form submission) for non-blocking inline update
- `discountType` hidden input drives which discount field is included in FormData, matching the Zod XOR refine established in Plan 01
- `PriceCalculator` uses `useEffect` with `cancelled` flag to prevent stale updates when props change before the previous fetch resolves
- `getCalculatedPrice` is a thin server action wrapper around `calculateLineItemPrice` — keeps the utility pure while giving the client component a safe server boundary

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript error in updateLead stage comparison**
- **Found during:** Task 1 verification (tsc --noEmit)
- **Issue:** `rest.stage !== LeadStage.CLOSED` produced TS2367 "no overlap" error — TypeScript correctly inferred that `rest.stage` excluded CLOSED after the first branch, making the comparison logically unreachable via the union type
- **Fix:** Destructured `stage` separately from `rest` and used `stage === LeadStage.CLOSED` directly; conditionally spread `closedAt` into the update payload with explicit `undefined` guard
- **Files modified:** `apps/command-center/src/app/actions/crm-leads.ts`
- **Committed in:** 30db166

---

**Total deviations:** 1 auto-fixed (1 TypeScript type error — no scope creep)
**Impact on plan:** Zero. Fixed inline before commit.

## Issues Encountered

None beyond the TypeScript type error documented above.

## User Setup Required

None — all new files. No schema changes, no migrations.

## Self-Check

### Files Exist

- [x] `apps/command-center/src/app/actions/crm-leads.ts` — 220 lines
- [x] `apps/command-center/src/components/crm/LeadPipeline.tsx` — 339 lines (min: 60)
- [x] `apps/command-center/src/components/crm/LeadEditModal.tsx` — 269 lines (min: 40)
- [x] `apps/command-center/src/app/actions/pricing.ts` — 170 lines
- [x] `apps/command-center/src/components/pricing/PriceCalculator.tsx` — 162 lines (min: 30)
- [x] `apps/command-center/src/components/pricing/PromotionalPricingList.tsx` — 431 lines (min: 30)

### Commits Exist

- [x] `30db166` — feat(05-04): create lead pipeline actions and UI
- [x] `96bc7a0` — feat(05-04): create promotional pricing CRUD and price calculator widget

### Exports Verified

- [x] crm-leads.ts exports: getLeads, createLead, updateLead, updateLeadStage (+ getLeadsByStage)
- [x] pricing.ts exports: getPromotionalPricings, createPromotionalPricing, deactivatePromotionalPricing (+ getActivePricingForProduct, getCalculatedPrice)
- [x] LeadPipeline.tsx: default export, accepts leads[] with assignedTo/createdBy and users[]
- [x] LeadEditModal.tsx: default export, accepts lead?, users[], onClose
- [x] PriceCalculator.tsx: default export, accepts productId, tierName, unitQuantity, frequencyDiscount
- [x] PromotionalPricingList.tsx: default export, accepts pricings[] with product and isCurrentlyActive, products[]

### Key Links Verified

- [x] LeadPipeline imports updateLeadStage, createLead from crm-leads.ts
- [x] PriceCalculator imports getCalculatedPrice from pricing.ts
- [x] pricing.ts imports calculateLineItemPrice from lib/utils/pricing.ts

## Self-Check: PASSED

## Next Phase Readiness

- Lead pipeline ready to be mounted on /dashboard/customers CRM tab
- PromotionalPricingList ready to be mounted on /dashboard/customers pricing sub-tab
- PriceCalculator ready to embed in operator order form (wiring deferred per plan spec)
- All must-have truths satisfied per plan spec

---
*Phase: 05-sales-channels-crm*
*Completed: 2026-03-12*
