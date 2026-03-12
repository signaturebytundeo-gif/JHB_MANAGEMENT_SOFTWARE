---
phase: 05-sales-channels-crm
plan: 01
subsystem: database
tags: [prisma, postgresql, zod, crm, pricing, typescript]

# Dependency graph
requires:
  - phase: 01-foundation-authentication
    provides: User model, PrismaClient pattern, seed infrastructure
  - phase: 04-order-management
    provides: OrderLineItem model, Customer model, Order/Invoice models
provides:
  - CustomerType, SubscriptionStatus, LeadStage enums in Prisma schema
  - DistributorAgreement, SubscriptionMember, Lead, PromotionalPricing models
  - Extended Customer model with company, paymentTerms, creditLimit, addresses
  - Extended OrderLineItem with discountPercent and discountReason fields
  - calculateLineItemPrice utility: promotional > max(volume, frequency) logic
  - Zod validators for all 4 CRM entity types
affects:
  - 05-sales-channels-crm (all remaining plans use these models and validators)
  - 06-production-launch (CRM data feeds into reporting)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Prisma named relations for disambiguation (CustomerSubscriptions, PlanMembers, LeadAssignee, LeadCreator)
    - Promotional pricing supersedes volume/frequency — no stacking, highest of two non-promotional discounts wins
    - XOR refine on Zod schemas (discountPercent OR fixedPrice, never both/neither)
    - Decimal boundary conversion via Number() at Prisma -> JS boundary in pricing utility

key-files:
  created:
    - apps/command-center/src/lib/validators/crm-customers.ts
    - apps/command-center/src/lib/validators/crm-subscriptions.ts
    - apps/command-center/src/lib/validators/crm-leads.ts
    - apps/command-center/src/lib/validators/pricing.ts
    - apps/command-center/src/lib/utils/pricing.ts
  modified:
    - apps/command-center/prisma/schema.prisma

key-decisions:
  - "Promotional pricing supersedes volume and frequency discounts — only max(volume, frequency) applies when no promo active, no stacking"
  - "Named Prisma relations on SubscriptionMember (CustomerSubscriptions, PlanMembers) and Lead (LeadAssignee, LeadCreator) to disambiguate multi-relation models"
  - "renewalReminderSentAt field on SubscriptionMember for idempotent renewal reminder sending"
  - "Prisma client regenerated (prisma generate) immediately after schema change to expose new enums to TypeScript"
  - "VolumeDiscount and FrequencyDiscount seed data already present from Phase 1 — seed.ts not modified"

patterns-established:
  - "calculateLineItemPrice accepts PrismaClient (or tx) as parameter — enables use inside transactions"
  - "Discount priority: promotional (date-range active) > max(volume, frequency) — never stacked"
  - "All new Customer CRM fields nullable — avoids breaking existing data or requiring migration of existing rows"

# Metrics
duration: 8min
completed: 2026-03-12
---

# Phase 05 Plan 01: CRM Data Foundation Summary

**CRM schema layer with 4 new Prisma models (DistributorAgreement, SubscriptionMember, Lead, PromotionalPricing), 3 enums, extended Customer/OrderLineItem, Zod validators for all CRM entities, and a pure calculateLineItemPrice utility implementing promotional > max(volume, frequency) discount logic**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-12T12:55:41Z
- **Completed:** 2026-03-12T13:03:00Z
- **Tasks:** 2/2
- **Files modified:** 6

## Accomplishments

- Extended Prisma schema with 3 new enums and 4 new CRM models; pushed to Neon PostgreSQL via `db push`
- Extended Customer model with 10 CRM fields (all nullable); extended OrderLineItem with discount tracking
- Created 4 Zod validator files and pricing calculation utility with correct discount composition logic

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Prisma schema with CRM models, enums, and seed discount data** - `5f2e2c4` (feat)
2. **Task 2: Create Zod validators and pricing calculation utility** - `e517c61` (feat)

**Plan metadata:** committed with SUMMARY.md update

## Files Created/Modified

- `apps/command-center/prisma/schema.prisma` - Added CustomerType/SubscriptionStatus/LeadStage enums; DistributorAgreement, SubscriptionMember, Lead, PromotionalPricing models; extended Customer and OrderLineItem
- `apps/command-center/src/lib/validators/crm-customers.ts` - createCustomerSchema + updateCustomerSchema with CustomerType, paymentTerms, addresses
- `apps/command-center/src/lib/validators/crm-subscriptions.ts` - createSubscriptionMemberSchema + updateSubscriptionStatusSchema
- `apps/command-center/src/lib/validators/crm-leads.ts` - createLeadSchema + updateLeadSchema with email union validation (email|empty string)
- `apps/command-center/src/lib/validators/pricing.ts` - createPromotionalPricingSchema with XOR refine for discountPercent vs fixedPrice
- `apps/command-center/src/lib/utils/pricing.ts` - calculateLineItemPrice: fetches tier base price, applies promotional > max(volume, frequency), returns PriceCalculation type

## Decisions Made

- Promotional pricing supersedes volume and frequency discounts; only the higher of volume/frequency applies when no promo is active (no stacking)
- Named Prisma relations required on SubscriptionMember and Lead models to disambiguate multiple relations to same target models
- `renewalReminderSentAt` field added to SubscriptionMember for idempotent reminder sending per plan requirement
- Prisma client regenerated with `prisma generate` after schema push — new enums not available until regeneration
- Seed file not modified — VolumeDiscount (0%, 5%, 10%) and FrequencyDiscount (2%, 5%) records were already seeded in Phase 1

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma client regeneration required after schema push**
- **Found during:** Task 2 (TypeScript compilation of validators)
- **Issue:** `npx tsc --noEmit` failed with "CustomerType has no exported member" errors — new enums not in client until regenerated
- **Fix:** Ran `npx prisma generate` to regenerate the Prisma client with all new enums and models
- **Files modified:** node_modules/@prisma/client (generated output, not committed)
- **Verification:** Subsequent `npx tsc --noEmit` passed with zero errors
- **Committed in:** e517c61 (Task 2 commit, noted in commit message)

---

**Total deviations:** 1 auto-fixed (1 blocking — missing Prisma client regeneration step)
**Impact on plan:** Required fix, zero scope creep.

## Issues Encountered

None beyond the Prisma client regeneration blocking issue documented above.

## User Setup Required

None - schema changes auto-applied to Neon PostgreSQL via `prisma db push`.

## Self-Check

### Files Exist

- [x] `apps/command-center/prisma/schema.prisma` - modified with new models
- [x] `apps/command-center/src/lib/validators/crm-customers.ts` - created
- [x] `apps/command-center/src/lib/validators/crm-subscriptions.ts` - created
- [x] `apps/command-center/src/lib/validators/crm-leads.ts` - created
- [x] `apps/command-center/src/lib/validators/pricing.ts` - created
- [x] `apps/command-center/src/lib/utils/pricing.ts` - created

### Commits Exist

- [x] `5f2e2c4` - feat(05-01): extend Prisma schema with CRM models, enums, and discount fields
- [x] `e517c61` - feat(05-01): create CRM Zod validators and pricing calculation utility

## Self-Check: PASSED

## Next Phase Readiness

- Schema and validators ready for Phase 05-02 (CRM UI — customer list, lead pipeline, subscription management)
- `calculateLineItemPrice` ready to be called from order server actions when discount logic is needed
- All must-have truths satisfied: 3 new enums, 4 new models, extended Customer, extended OrderLineItem, correct discount seeding, pricing utility with correct logic

---
*Phase: 05-sales-channels-crm*
*Completed: 2026-03-12*
