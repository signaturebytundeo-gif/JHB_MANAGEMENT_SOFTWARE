# Architecture

**Analysis Date:** 2026-02-13

## Pattern Overview

**Overall:** Monolithic Next.js Full-Stack with Service Layer Separation

**Key Characteristics:**
- Single Next.js 15+ deployment with App Router
- Server Components for data-heavy reads, Server Actions for mutations
- Service layer isolates business logic from UI
- Database transactions enforce consistency for critical operations (inventory, financial approvals)
- Event-driven inventory movements with immutable audit trails
- Role-Based Access Control (RBAC) enforced at API/Server Action entry points

## Layers

**Presentation Layer:**
- Purpose: Render role-specific UIs for 4 user roles (Admin, Manager, Sales Rep, Investor)
- Location: `app/(dashboard)/` and `app/(auth)/`
- Contains: Page components, form components, dashboard views
- Depends on: Server Components fetch data via Prisma, Server Actions handle mutations
- Used by: End users (Anthony, Tunde, team members, investors)

**Business Logic Layer:**
- Purpose: Encapsulate domain operations (batch creation, FIFO allocation, approval workflows)
- Location: `lib/services/`
- Contains: `production.service.ts`, `inventory.service.ts`, `order.service.ts`, `financial.service.ts`, `approval.service.ts`
- Depends on: Database layer (Prisma client)
- Used by: Server Actions, API routes

**Validation Layer:**
- Purpose: Define schemas for request validation (client + server)
- Location: `lib/validators/`
- Contains: Zod schemas shared between client forms and server-side validation
- Depends on: Zod library
- Used by: React Hook Form (client), Server Actions (server)

**Data Access Layer:**
- Purpose: Provide type-safe database access and query construction
- Location: `lib/db.ts` (Prisma singleton), `prisma/schema.prisma` (schema definition)
- Contains: Prisma schema with 15+ models, migrations
- Depends on: PostgreSQL via Supabase
- Used by: All services, Server Components

**Infrastructure Layer:**
- Purpose: Authentication, authorization, environment configuration
- Location: `lib/auth/` (auth configuration + RBAC helpers)
- Contains: Auth.js setup, permission matrix, session management
- Depends on: Prisma adapter for Auth.js
- Used by: All authenticated endpoints

**Integration Layer:**
- Purpose: External service adapters (file storage, email, payment processors)
- Location: `lib/integrations/`
- Contains: Supabase file storage client, future payment/email adapters
- Depends on: External APIs (Supabase, Stripe future, etc.)
- Used by: Server Actions (document upload, invoice generation)

## Data Flow

**Production → Inventory → Sales → Financial:**

```
1. BATCH CREATION
   User creates batch (mobile-friendly form)
   └→ Server Action validates with Zod
      └→ ProductionService.createBatch() checks capacity
         └→ Prisma $transaction creates Batch record (immutable)
            └→ Batch status = PENDING_QC

2. QUALITY CONTROL
   User enters pH reading + pass/fail check
   └→ Server Action validates QC data
      └→ ProductionService.recordQC() updates batch
         └→ If PASS: status = RELEASED
            If FAIL: status = HOLD (units do NOT enter inventory)

3. INVENTORY MOVEMENT (on batch release)
   ProductionService triggers InventoryService.createMovement()
   └→ Movement type = PRODUCTION_OUTPUT
      └→ Prisma $transaction:
         ├→ Create InventoryMovement record (immutable audit trail)
         ├→ Update StockLevel for each location
         ├→ Create AuditLog entry (before/after values)
         └→ Batch marked RELEASED (visible in inventory)

4. ORDER PLACEMENT
   User creates order with customer + product + quantity + channel
   └→ Server Action validates order data
      └→ OrderService.createOrder() calls InventoryService.allocateByFIFO()
         └→ Query: SELECT batches WHERE status=RELEASED ORDER BY createdAt ASC
            └→ Allocate oldest-first across locations
               └→ Prisma $transaction:
                  ├→ Create Order + OrderLineItem records
                  ├→ Create InventoryMovement (type=SALE_ALLOCATION)
                  ├→ Update StockLevels
                  └→ Create AuditLog

5. FULFILLMENT & INVOICING
   User marks order as Shipped/Delivered
   └→ Server Action triggers InventoryService.createMovement(type=SALE_OUT)
      └→ Deducts from allocated inventory
         └→ FinancialService.generateInvoice()
            └→ Creates Invoice record with terms, due date, interest calculations
```

**State Management:**
- Inventory stock levels are **derived** from InventoryMovement history (immutable source of truth)
- Batch status controlled by strict state machine: PENDING_QC → RELEASED or HOLD (never backwards)
- Financial approvals recorded as immutable ApprovalLog entries (cannot be deleted, only revoked)
- All data mutations wrapped in Prisma transactions to prevent partial state

## Key Abstractions

**InventoryMovement (Core Abstraction):**
- Purpose: Single source of truth for all inventory changes with complete audit trail
- Examples: `lib/services/inventory.service.ts`
- Pattern: Event-sourcing style — every change is a movement record with timestamp, user, reason, before/after quantities

**ApprovalWorkflow (State Machine):**
- Purpose: Enforce 4-tier financial approval thresholds based on amount
- Examples: `lib/services/approval.service.ts`
- Pattern: Threshold-based routing — <$150 auto-approve, $150-500 single member, >$500 dual, >$2500 dual bank auth

**BatchCode Generator (Domain Logic):**
- Purpose: Generate immutable MMDDYY codes matching Anthony's manual workflow
- Examples: `lib/utils/batch-code.ts`
- Pattern: Pure function with deterministic collision handling (append letter for duplicates on same day)

**FIFO Allocation Algorithm:**
- Purpose: Guarantee FIFO ordering across locations using original production date
- Examples: `lib/services/inventory.service.ts` (allocateByFIFO method)
- Pattern: Sorted query (ORDER BY batch.createdAt) with transactional allocation

**RBAC Middleware:**
- Purpose: Enforce role-based permissions at request boundary
- Examples: `lib/auth/permissions.ts`
- Pattern: Permission matrix checked before business logic executes
- Roles: ADMIN (full access), MANAGER (operations), SALES_REP (orders/customers), INVESTOR (read-only dashboards)

## Entry Points

**Authentication Pages:**
- Location: `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`, `app/(auth)/invite/[token]/page.tsx`
- Triggers: Initial load, invite link clicked
- Responsibilities: User login, invite acceptance, session creation

**Executive Dashboard:**
- Location: `app/(dashboard)/page.tsx`
- Triggers: Authenticated user navigates to /
- Responsibilities: KPI cards (Today Revenue, MTD Revenue vs target, Units vs capacity, Open Orders, AR), quick action buttons

**Production Module:**
- Location: `app/(dashboard)/production/batches/page.tsx`, `app/(dashboard)/production/batches/new/page.tsx`
- Triggers: User navigates to /production
- Responsibilities: List batches, create batch form, QC data entry, capacity tracking

**Inventory Module:**
- Location: `app/(dashboard)/inventory/page.tsx`, `app/(dashboard)/inventory/transfers/page.tsx`
- Triggers: User navigates to /inventory
- Responsibilities: Multi-location stock grid, transfers, FIFO validation, raw materials tracking

**Order Module:**
- Location: `app/(dashboard)/orders/page.tsx`, `app/(dashboard)/orders/new/page.tsx`
- Triggers: User navigates to /orders
- Responsibilities: Order list, create order (with FIFO allocation), fulfillment workflow, invoicing

**API Webhooks:**
- Location: `app/api/webhooks/`
- Triggers: External payment processors, file uploads
- Responsibilities: Handle Stripe webhooks (future), file upload callbacks

## Error Handling

**Strategy:** Try-catch at Server Action boundary, return typed result objects

**Patterns:**
- Server Actions catch database errors and return `{ success: false, error: string }`
- Form validation errors from Zod returned to client without server error logging
- Database constraint violations (negative inventory, duplicate batch code) logged as audit events
- Transaction rollback on any failure — no partial state
- User-facing errors are generic ("Could not save batch"), detailed errors logged to server
- Validation failures distinguished from system errors in client UI

## Cross-Cutting Concerns

**Logging:** Console via `console.log/error` in development, structured logging to Supabase logs in production. Server Actions log: operation name, user ID, timestamp, success/failure, execution time.

**Validation:** Zod schemas validate all user input at Server Action boundary. Prisma constraints (unique, check, not null) provide database-level safety. Type-safe FormData in React Hook Form prevents invalid submissions.

**Authentication:** Auth.js with Prisma adapter. NextAuth session middleware validates JWT on each request. Role checks happen in auth config and per-endpoint permission checks.

**Audit Trail:** InventoryMovement records are immutable (no updates). AuditLog captures before/after for financial changes. ApprovalLog is immutable (only revoke creates new entry). All movement/approval records include userId, timestamp, reason/notes.

**Data Consistency:** Inventory and financial changes wrapped in `prisma.$transaction()`. Batch status changes are atomic with inventory movement creation. Order fulfillment deducts inventory in same transaction as movement creation.

---

*Architecture analysis: 2026-02-13*
