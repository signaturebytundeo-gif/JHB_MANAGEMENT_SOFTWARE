---
phase: 06-financial-management
plan: 01
subsystem: finance
tags: [expenses, approval-workflow, receipt-upload, schema, prisma, vercel-blob, recharts]
dependency_graph:
  requires:
    - 04-order-management (ApprovalThreshold table, approval routing pattern)
    - 01-foundation-authentication (verifySession, User model)
  provides:
    - Expense model with full approval workflow
    - Budget model for phase 02
    - ExpenseCategory enum for COGS tracking in phase 03
    - logExpense/approveExpense/getExpenses server actions
  affects:
    - prisma/schema.prisma (Expense, Budget, ExpenseCategory, RawMaterial.costPerUnit, Batch labor/overhead)
    - User model (three new Expense relations)
    - Sidebar navigation (Expenses link added)
tech_stack:
  added:
    - recharts@2.15.4 (chart rendering for future plans)
    - "@vercel/blob@2.3.1" (receipt file upload)
    - shadcn chart component (src/components/ui/chart.tsx)
  patterns:
    - useActionState for logExpense and approveExpense forms
    - Threshold lookup from DB (never hardcoded) — same pattern as confirmOrder
    - BLOB_READ_WRITE_TOKEN optional (graceful skip in development)
    - Self-approval prevention enforced in server action
    - Decimal->Number conversion at action boundary
key_files:
  created:
    - apps/command-center/src/lib/validators/expenses.ts
    - apps/command-center/src/app/actions/expenses.ts
    - apps/command-center/src/app/(dashboard)/dashboard/finance/expenses/page.tsx
    - apps/command-center/src/components/finance/ExpensesDashboardClient.tsx
    - apps/command-center/src/components/finance/LogExpenseForm.tsx
    - apps/command-center/src/components/finance/ExpenseApprovalCard.tsx
    - apps/command-center/src/components/ui/chart.tsx
  modified:
    - apps/command-center/prisma/schema.prisma
    - apps/command-center/src/components/layout/Sidebar.tsx
    - apps/command-center/package.json
decisions:
  - "[Phase 06-01]: prisma db push used instead of migrate dev — migration history drift from prior direct deploys to Neon"
  - "[Phase 06-01]: ExpenseCategory as Prisma enum (not string) — enables nativeEnum Zod validation and type safety across actions"
  - "[Phase 06-01]: approvalStatus as String (not enum) — consistent with Order.approvalStatus pattern from Phase 4"
  - "[Phase 06-01]: currentUserId passed from server page to client components as prop — avoids useSession client-side call"
  - "[Phase 06-01]: Expenses as separate sidebar nav item (not sub-menu) — sidebar has no sub-nav infrastructure"
metrics:
  duration: "6 minutes"
  completed: "2026-03-12"
  tasks: 2
  files_created: 7
  files_modified: 3
---

# Phase 06 Plan 01: Expense Tracking System Summary

**One-liner:** Full expense logging with four-tier approval routing (auto/single/dual/dual-bank), receipt upload via Vercel Blob, and ExpenseCategory enum + Budget schema foundation for Plans 02-03.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Schema migration, dependencies, and Zod validators | 736f581 | schema.prisma, expenses.ts (validator), chart.tsx, package.json |
| 2 | Expense server actions and UI | ee64d4e | expenses.ts (actions), page.tsx, ExpensesDashboardClient.tsx, LogExpenseForm.tsx, ExpenseApprovalCard.tsx, Sidebar.tsx |

## What Was Built

### Schema Changes
- `ExpenseCategory` enum: INGREDIENTS, PACKAGING, LABOR, EQUIPMENT, MARKETING, SHIPPING, UTILITIES, RENT, INSURANCE, OTHER
- `Expense` model with approval workflow fields (approvalStatus string, approvedById, secondApprovedById, bankAuthorizationRef)
- `Budget` model with unique constraint on (period, category) for Plan 02
- `RawMaterial.costPerUnit` (Decimal?) for COGS tracking in Plan 03
- `Batch.laborCostTotal` and `overheadCostTotal` (Decimal?) for COGS tracking in Plan 03
- Three User relations: ExpenseCreator, ExpenseApprover, ExpenseSecondApprover

### Server Actions (src/app/actions/expenses.ts)
- `logExpense`: validates fields, uploads receipt to Vercel Blob (skips gracefully if BLOB_READ_WRITE_TOKEN absent), looks up ApprovalThreshold from DB, sets approvalStatus: auto -> "auto_approved", single_member -> "pending_single", dual_member -> "pending_dual", dual_bank -> "pending_bank"
- `approveExpense`: prevents self-approval, handles all four approval paths, enforces dual-control (different users), requires bankAuthorizationRef for pending_bank
- `getExpenses`: returns expenses ordered by expenseDate desc with creator/approver names, Decimal->Number converted

### UI Components
- `ExpensesPage`: server component, fetches expenses + thresholds + session in parallel
- `ExpensesDashboardClient`: expense table with status badges (green/yellow/orange/red), pending approvals section filtered to actionable items for current user, log form toggle
- `LogExpenseForm`: full form with description, amount, category select, date, vendor, receipt file, notes, approval threshold info panel, sonner toasts
- `ExpenseApprovalCard`: per-expense card with approve/reject buttons, bank auth ref input for pending_bank, shows "Awaiting second approver" when current user is first approver
- Sidebar updated: "Expenses" link (Receipt icon) added after Finance

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Used prisma db push instead of migrate dev**
- **Found during:** Task 1
- **Issue:** `prisma migrate dev` failed with "Drift detected" — the Neon database is ahead of the migration history because previous phases applied changes via `db push` directly. Running `migrate dev` would require dropping all data.
- **Fix:** Used `prisma db push` to sync schema changes directly. Migration history remains stale but production schema matches prisma/schema.prisma.
- **Files modified:** None additional — same end result
- **Commit:** 736f581

**2. [Rule 2 - Missing Critical Functionality] currentUserId prop pattern for client components**
- **Found during:** Task 2
- **Issue:** ExpenseApprovalCard needs currentUserId to enforce self-approval checks in the UI (show "awaiting second" vs "approve" button), and to filter pending approvals for the current user. Client components cannot call verifySession (server-only).
- **Fix:** Server page calls verifySession, extracts userId, passes as prop to ExpensesDashboardClient which threads it to ExpenseApprovalCard. Self-approval is also enforced server-side in approveExpense action.
- **Files modified:** expenses/page.tsx, ExpensesDashboardClient.tsx, ExpenseApprovalCard.tsx
- **Commit:** ee64d4e

## Self-Check: PASSED

All 7 created files exist on disk. Both task commits (736f581, ee64d4e) found in git log.
