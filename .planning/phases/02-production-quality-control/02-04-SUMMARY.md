---
phase: 02-production-quality-control
plan: 04
subsystem: production-configuration
tags: [settings, raw-materials, co-packers, crud, soft-delete, expiration-tracking]
dependency_graph:
  requires: [02-01]
  provides: [co-packer-settings-ui, raw-material-tracking]
  affects: [batch-creation-workflow]
tech_stack:
  added: [badge-component, textarea-component, date-fns-expiration-logic]
  patterns: [server-actions, client-forms, responsive-tables]
key_files:
  created:
    - src/app/actions/settings.ts
    - src/app/actions/raw-materials.ts
    - src/components/settings/CoPackerPartnerForm.tsx
    - src/components/settings/CoPackerPartnerList.tsx
    - src/app/(dashboard)/dashboard/settings/co-packers/page.tsx
    - src/components/production/RawMaterialForm.tsx
    - src/components/production/RawMaterialList.tsx
    - src/app/(dashboard)/dashboard/production/raw-materials/page.tsx
    - src/components/ui/badge.tsx
    - src/components/ui/textarea.tsx
  modified:
    - src/app/(dashboard)/dashboard/settings/page.tsx
decisions:
  - Used separate actions file (raw-materials.ts) to avoid conflicts with future production.ts from Plan 02-02
  - SQLite doesn't support case-insensitive mode, so removed 'mode: insensitive' from queries
  - Badge component created with success/warning/destructive variants for status display
  - Client-server component split: server fetches data, client handles interactivity
  - Expiration status logic: <0 days = Expired, <=30 days = Expiring Soon, >30 days = OK
metrics:
  duration_minutes: 6
  tasks_completed: 2
  files_created: 10
  files_modified: 1
  commits: 2
  completed_at: 2026-02-17T17:38:29Z
---

# Phase 02 Plan 04: Co-Packer & Raw Material Management Summary

**One-liner:** Co-packer partner management in settings UI with raw materials expiration tracking using date-fns and responsive table/card layouts.

## What Was Built

### Co-Packer Partner Management (Task 1)
- **Settings page at `/dashboard/settings/co-packers`** - Admin-only access for managing co-packing partners
- **Server Actions** (`settings.ts`) - CRUD operations with duplicate name checking and soft delete
- **CoPackerPartnerForm** - Add/edit form with validation for partner details (name, contact, email, phone, address)
- **CoPackerPartnerList** - Interactive table with edit/toggle functionality, shows Active/Inactive badges
- **Settings landing page** - Added card link to co-packer management
- **UI Components** - Created Badge and Textarea components for enhanced UX

### Raw Materials Tracking (Task 2)
- **Raw materials page at `/dashboard/production/raw-materials`** - Manager+ access for tracking materials
- **Server Actions** (`raw-materials.ts`) - Create and deactivate raw materials with lot number tracking
- **RawMaterialForm** - Entry form for materials with lot numbers, suppliers, dates, quantities, and units
- **RawMaterialList** - Responsive table (desktop) and card (mobile) view with expiration status badges
- **Expiration Logic** - Uses date-fns to calculate days until expiration and display status:
  - **Expired** (red badge) - Past expiration date
  - **Expiring Soon** (yellow badge) - Within 30 days
  - **OK** (green badge) - More than 30 days

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] SQLite case-insensitive query mode not supported**
- **Found during:** Task 1 - TypeScript compilation
- **Issue:** Prisma `mode: 'insensitive'` option not available for SQLite string filters
- **Fix:** Removed `mode: 'insensitive'` from findFirst queries in settings.ts
- **Files modified:** `src/app/actions/settings.ts`
- **Commit:** a484135 (included in Task 1 commit)
- **Impact:** Duplicate name checking is now case-sensitive instead of case-insensitive

**2. [Rule 2 - Missing Critical Functionality] Badge component missing**
- **Found during:** Task 1 - Creating co-packer list component
- **Issue:** No Badge component existed for displaying status indicators
- **Fix:** Created badge.tsx with variants (success, warning, destructive, outline, secondary)
- **Files created:** `src/components/ui/badge.tsx`
- **Commit:** a484135 (included in Task 1 commit)
- **Impact:** Enables visual status indicators throughout the app

**3. [Rule 2 - Missing Critical Functionality] Textarea component missing**
- **Found during:** Task 1 - Creating co-packer partner form
- **Issue:** No Textarea component existed for multi-line address input
- **Fix:** Created textarea.tsx following shadcn/ui patterns
- **Files created:** `src/components/ui/textarea.tsx`
- **Commit:** a484135 (included in Task 1 commit)
- **Impact:** Enables multi-line text input for forms

**4. [Rule 3 - Blocking Issue] Decimal type import error**
- **Found during:** Task 2 - TypeScript compilation
- **Issue:** Cannot import Decimal type from '@prisma/client/runtime/library'
- **Fix:** Changed type to union type `number | { toString(): string }` to handle Prisma Decimal
- **Files modified:** `src/components/production/RawMaterialList.tsx`
- **Commit:** 8395c74 (included in Task 2 commit)
- **Impact:** Component properly handles Decimal quantity values from Prisma

## Key Implementation Details

### Co-Packer Partner Features
- **Admin-only access** - Settings layout enforces verifyAdmin()
- **Soft delete** - isActive flag toggle, never hard delete partners
- **Duplicate prevention** - Check for existing partner names before create/update
- **Edit mode** - Inline editing within the list component
- **Server-client split** - Server component fetches data, client component handles interactions

### Raw Materials Features
- **Lot number tracking** - Full traceability with supplier and lot numbers
- **Expiration awareness** - Visual badges using date-fns calculations
- **Quantity with units** - Support for kg, lbs, liters, gallons, units, cases
- **Responsive design** - Table view on desktop, card view on mobile
- **Form reset** - Automatically clears form after successful submission
- **Soft delete** - isActive flag with confirmation dialog

## Technical Decisions

1. **Separate actions files** - Created `raw-materials.ts` instead of adding to `production.ts` to avoid conflicts with Plan 02-02 which may create that file
2. **Client-server component pattern** - Server components fetch data, client components handle state and interactions
3. **Date-fns for expiration** - Used differenceInDays() for accurate date calculations
4. **Mobile-first forms** - All inputs use text-base and h-11 for touch-friendly targets
5. **Confirmation dialogs** - Added confirm() for destructive actions (remove raw material)

## Files Breakdown

### Server Actions (2 files, 234 lines)
- `src/app/actions/settings.ts` - Co-packer CRUD with validation
- `src/app/actions/raw-materials.ts` - Raw material CRUD with validation

### Client Components (4 files, 505 lines)
- `src/components/settings/CoPackerPartnerForm.tsx` - Add/edit partner form
- `src/components/settings/CoPackerPartnerList.tsx` - Partners table with actions
- `src/components/production/RawMaterialForm.tsx` - Add material form
- `src/components/production/RawMaterialList.tsx` - Materials table/cards with expiration badges

### Server Pages (2 files, 86 lines)
- `src/app/(dashboard)/dashboard/settings/co-packers/page.tsx` - Co-packer management page
- `src/app/(dashboard)/dashboard/production/raw-materials/page.tsx` - Raw materials page

### UI Components (2 files, 77 lines)
- `src/components/ui/badge.tsx` - Status badge component
- `src/components/ui/textarea.tsx` - Multi-line text input

### Modified Files (1 file)
- `src/app/(dashboard)/dashboard/settings/page.tsx` - Added co-packer link card

## Verification Results

All verification criteria met:

1. ✅ /dashboard/settings has link to co-packer partner management
2. ✅ /dashboard/settings/co-packers provides CRUD for partners
3. ✅ /dashboard/production/raw-materials shows material tracking with expiration badges
4. ✅ Raw materials form includes lot numbers and supplier information
5. ✅ Co-packer partner list accessible to Admin users only
6. ✅ Raw materials page accessible to Manager+ users
7. ✅ All deactivations use soft deletes (isActive flag)
8. ✅ TypeScript compiles without errors (`npx tsc --noEmit`)

## Success Criteria

- ✅ Co-packer partners configurable from settings UI without code changes (PROD-10)
- ✅ Raw materials track lot numbers, suppliers, and expiration dates (PROD-09)
- ✅ Expiration dates have visual indicators (Expired, Expiring Soon, OK)
- ✅ All deletions are soft deletes for data integrity
- ✅ Role-based access control enforced (Admin for settings, Manager+ for raw materials)
- ✅ All TypeScript files compile without errors

## Impact on Roadmap

### Completed
- Co-packer partner list is now configurable without code changes
- Raw materials can be tracked with full traceability (lot numbers, suppliers, dates)
- Expiration tracking provides proactive inventory management

### Enables
- **Plan 02-02** (Batch creation) - Can now select co-packer partners from settings
- **Plan 02-03** (QC workflow) - Raw materials provide traceability foundation
- **Future production features** - Expiration awareness for compliance

### Dependencies Satisfied
- Requires Plan 02-01 (database schema) - ✅ Complete

## Self-Check: PASSED

**Created files verification:**
```
✅ FOUND: src/app/actions/settings.ts
✅ FOUND: src/app/actions/raw-materials.ts
✅ FOUND: src/components/settings/CoPackerPartnerForm.tsx
✅ FOUND: src/components/settings/CoPackerPartnerList.tsx
✅ FOUND: src/app/(dashboard)/dashboard/settings/co-packers/page.tsx
✅ FOUND: src/components/production/RawMaterialForm.tsx
✅ FOUND: src/components/production/RawMaterialList.tsx
✅ FOUND: src/app/(dashboard)/dashboard/production/raw-materials/page.tsx
✅ FOUND: src/components/ui/badge.tsx
✅ FOUND: src/components/ui/textarea.tsx
```

**Commits verification:**
```
✅ FOUND: a484135 - feat(02-04): add co-packer partner management in settings
✅ FOUND: 8395c74 - feat(02-04): add raw materials tracking with expiration awareness
```

All files created and commits recorded successfully.
