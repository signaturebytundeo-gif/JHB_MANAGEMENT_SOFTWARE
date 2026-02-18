# Codebase Structure

**Analysis Date:** 2026-02-13

## Directory Layout

```
jhb-command-center/
├── app/                          # Next.js App Router pages and layouts
│   ├── (auth)/                   # Unauthenticated group (no sidebar)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── invite/[token]/page.tsx
│   ├── (dashboard)/              # Authenticated group (shared sidebar layout)
│   │   ├── layout.tsx            # Sidebar navigation + header
│   │   ├── page.tsx              # Executive dashboard (/)
│   │   ├── production/
│   │   │   ├── page.tsx          # Batch list
│   │   │   ├── batches/
│   │   │   │   ├── new/page.tsx  # Create batch form
│   │   │   │   └── [id]/page.tsx # Batch detail + QC form
│   │   │   └── layout.tsx        # Production module sidebar
│   │   ├── inventory/
│   │   │   ├── page.tsx          # Multi-location stock grid
│   │   │   ├── transfers/page.tsx # Transfer management
│   │   │   ├── raw-materials/page.tsx
│   │   │   └── layout.tsx
│   │   ├── orders/
│   │   │   ├── page.tsx          # Order list
│   │   │   ├── new/page.tsx      # Create order with FIFO allocation
│   │   │   ├── [id]/page.tsx     # Order detail + fulfillment
│   │   │   └── layout.tsx
│   │   ├── customers/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── layout.tsx
│   │   ├── finance/
│   │   │   ├── page.tsx          # Finance dashboard
│   │   │   ├── expenses/page.tsx # Expense logging + approvals
│   │   │   ├── invoices/page.tsx
│   │   │   ├── reports/page.tsx  # Financial reports (P&L, Cash Flow)
│   │   │   └── layout.tsx
│   │   ├── investor/             # Investor-only module
│   │   │   ├── layout.tsx        # Investor-specific header (no ops actions)
│   │   │   ├── page.tsx          # Investor dashboard (read-only)
│   │   │   └── reports/page.tsx
│   │   ├── reports/
│   │   │   ├── page.tsx          # Report builder + pre-built reports
│   │   │   └── [id]/page.tsx
│   │   └── settings/
│   │       ├── page.tsx          # Company settings, co-packers, approval thresholds
│   │       └── users/page.tsx    # User management + invites
│   │
│   ├── api/                      # API routes (webhooks, exports)
│   │   ├── webhooks/
│   │   │   ├── stripe/route.ts   # Stripe payment webhooks (future)
│   │   │   └── [service]/route.ts
│   │   ├── exports/
│   │   │   ├── batch-labels/route.ts
│   │   │   ├── invoice-pdf/route.ts
│   │   │   └── report-excel/route.ts
│   │   └── import/
│   │       ├── amazon/route.ts   # CSV import endpoints
│   │       ├── square/route.ts
│   │       └── inventory/route.ts
│   │
│   └── actions/                  # Server Actions by domain
│       ├── production.ts         # createBatch, recordQC, releaseBatch
│       ├── inventory.ts          # createMovement, transferInventory, adjustStock
│       ├── orders.ts             # createOrder, fulfillOrder, generateInvoice
│       ├── finance.ts            # logExpense, approveExpense, generateReport
│       ├── customers.ts          # createCustomer, updateCustomer
│       └── auth.ts               # sendInvite, acceptInvite, logout
│
├── lib/                          # Business logic and utilities
│   ├── services/                 # Domain services with business logic
│   │   ├── production.service.ts # Batch CRUD, capacity tracking, QC workflow
│   │   ├── inventory.service.ts  # Stock levels, movements, FIFO allocation
│   │   ├── order.service.ts      # Order lifecycle, fulfillment
│   │   ├── financial.service.ts  # Revenue tracking, COGS, report generation
│   │   ├── approval.service.ts   # Approval workflows, threshold enforcement
│   │   ├── customer.service.ts   # Customer/distributor management, CRM
│   │   └── pricing.service.ts    # Volume/frequency discounts, pricing engine
│   │
│   ├── validators/               # Zod schemas for validation
│   │   ├── auth.ts               # Login, registration, invite schemas
│   │   ├── batch.ts              # Batch creation, QC schemas
│   │   ├── inventory.ts          # Transfer, adjustment schemas
│   │   ├── order.ts              # Order creation, fulfillment schemas
│   │   ├── expense.ts            # Expense logging schema
│   │   ├── customer.ts           # Customer profile schemas
│   │   └── common.ts             # Shared schemas (date, email, etc.)
│   │
│   ├── utils/                    # Helper functions
│   │   ├── batch-code.ts         # MMDDYY batch code generation
│   │   ├── fifo.ts               # FIFO allocation algorithm
│   │   ├── audit.ts              # Audit log creation helpers
│   │   ├── formatting.ts         # Currency, date, number formatting
│   │   ├── calculation.ts        # COGS, margin, discount calculations
│   │   ├── constants.ts          # Enums (OrderStatus, BatchStatus, etc.)
│   │   └── types.ts              # Shared TypeScript types (not DB models)
│   │
│   ├── auth/                     # Authentication configuration
│   │   ├── config.ts             # Auth.js configuration
│   │   ├── permissions.ts        # RBAC permission matrix
│   │   ├── middleware.ts         # Request authentication middleware
│   │   └── session.ts            # Session validation helpers
│   │
│   ├── integrations/             # External service adapters
│   │   ├── supabase.ts           # Supabase client for file storage
│   │   ├── stripe.ts             # Stripe webhook handling (future)
│   │   └── email.ts              # Email sending (future)
│   │
│   └── db.ts                     # Prisma client singleton
│
├── components/                   # Reusable React components
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── InviteForm.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── Navigation.tsx
│   │   └── Footer.tsx
│   ├── dashboard/
│   │   ├── KPICard.tsx
│   │   ├── RevenueChart.tsx
│   │   ├── InventoryAlert.tsx
│   │   └── QuickActionButton.tsx
│   ├── forms/
│   │   ├── BatchForm.tsx
│   │   ├── QCCheckForm.tsx
│   │   ├── OrderForm.tsx
│   │   ├── ExpenseForm.tsx
│   │   └── CustomerForm.tsx
│   ├── tables/
│   │   ├── BatchTable.tsx
│   │   ├── InventoryGrid.tsx
│   │   ├── OrderTable.tsx
│   │   ├── ExpenseTable.tsx
│   │   └── DataTableColumns.tsx
│   ├── modals/
│   │   ├── TransferModal.tsx
│   │   ├── AdjustmentModal.tsx
│   │   └── InvoiceModal.tsx
│   └── ui/                       # shadcn/ui component overrides
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── form.tsx
│       ├── input.tsx
│       ├── select.tsx
│       └── [other shadcn components]
│
├── hooks/                        # Custom React hooks
│   ├── useAuth.ts                # Current user + permissions
│   ├── useBatches.ts             # Batch list with filtering
│   ├── useInventory.ts           # Stock levels, movements
│   ├── useOrders.ts              # Order list + details
│   ├── useFinance.ts             # Financial data queries
│   └── useAsync.ts               # Async state management helper
│
├── prisma/                       # Database schema and migrations
│   ├── schema.prisma             # Data model definitions
│   ├── migrations/               # Version-controlled migrations
│   │   ├── 001_init/migration.sql
│   │   ├── 002_add_audit_log/migration.sql
│   │   └── ...
│   └── seed.ts                   # Pre-seeding company data, products, locations
│
├── types/                        # Shared TypeScript type definitions
│   ├── db.ts                     # Database model types (from Prisma)
│   ├── api.ts                    # API request/response types
│   ├── forms.ts                  # Form submission types
│   └── domain.ts                 # Domain-specific types (custom)
│
├── public/                       # Static assets
│   ├── images/
│   │   ├── logo.svg
│   │   └── hummingbird.svg
│   └── documents/                # Invoice templates, agreements
│
├── .env.local                    # Local environment variables (not committed)
├── .env.example                  # Template for required env vars
├── next.config.ts                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── eslint.config.js              # ESLint rules
├── .prettierrc                   # Prettier formatting rules
├── package.json                  # Dependencies and scripts
├── package-lock.json             # Dependency lock file
│
├── prisma.json                   # Prisma configuration (optional)
├── vitest.config.ts              # Vitest configuration
│
└── README.md                     # Project documentation
```

## Directory Purposes

**app/ (Next.js Pages & Layouts):**
- Purpose: Page components organized by route and feature module
- Contains: React pages (page.tsx), layouts (layout.tsx), error handlers
- Key files: `app/(dashboard)/page.tsx` (executive dashboard entry point), `app/(auth)/login/page.tsx` (login entry point)

**app/actions/ (Server Actions):**
- Purpose: Serverless mutation handlers co-located with forms
- Contains: Async functions that handle form submissions, validate with Zod, call services
- Key files: `actions/production.ts` (batch creation, QC), `actions/inventory.ts` (transfers, adjustments)

**app/api/ (API Routes):**
- Purpose: Webhook handlers and file export endpoints
- Contains: Route handlers for external services and bulk exports
- Key files: `api/exports/invoice-pdf/route.ts`, `api/import/amazon/route.ts`

**lib/services/ (Business Logic):**
- Purpose: Encapsulate domain operations away from UI
- Contains: Classes or functions implementing production, inventory, order, financial logic
- Key files: `services/inventory.service.ts` (FIFO, movements, stock levels), `services/approval.service.ts` (approval workflows)

**lib/validators/ (Zod Schemas):**
- Purpose: Single source of truth for input validation, shared client/server
- Contains: Zod schema definitions and TypeScript type inference
- Key files: `validators/batch.ts`, `validators/order.ts`

**lib/utils/ (Utilities):**
- Purpose: Pure helper functions and domain algorithms
- Contains: Batch code generation, FIFO algorithm, formatting, calculations
- Key files: `utils/batch-code.ts` (MMDDYY code), `utils/fifo.ts` (allocation algorithm)

**lib/auth/ (Authentication & Authorization):**
- Purpose: Auth configuration, RBAC, session management
- Contains: Auth.js setup, permission matrix, middleware
- Key files: `auth/config.ts`, `auth/permissions.ts` (role → action mapping)

**components/ (React Components):**
- Purpose: Reusable UI components organized by feature
- Contains: Form components, tables, modals, dashboards, shadcn overrides
- Key files: `components/forms/BatchForm.tsx`, `components/tables/InventoryGrid.tsx`

**hooks/ (Custom Hooks):**
- Purpose: Reusable component logic
- Contains: Data fetching hooks, form state hooks, auth hooks
- Key files: `hooks/useAuth.ts` (current user), `hooks/useInventory.ts` (stock levels)

**prisma/ (Database):**
- Purpose: Database schema and migrations
- Contains: `schema.prisma` (models), migrations/, seed.ts
- Key files: `prisma/schema.prisma` (15+ models: Batch, InventoryMovement, Order, Invoice, etc.)

**types/ (TypeScript Types):**
- Purpose: Shared type definitions (not models)
- Contains: API request/response types, form types, domain types
- Key files: Mostly auto-generated from Prisma schema

## Key File Locations

**Entry Points:**
- `app/(auth)/login/page.tsx`: Initial user login screen
- `app/(dashboard)/page.tsx`: Executive dashboard (main dashboard after login)
- `app/(dashboard)/production/batches/new/page.tsx`: Batch creation (mobile-first form)
- `app/(dashboard)/orders/new/page.tsx`: Order creation with FIFO allocation
- `app/(dashboard)/finance/expenses/page.tsx`: Expense logging with approval workflow

**Configuration:**
- `.env.local`: Database URL, Supabase keys, Auth.js secret (never committed)
- `prisma/schema.prisma`: Complete database model definitions
- `lib/auth/config.ts`: Auth.js provider setup
- `tailwind.config.ts`: Brand colors (deep green, gold, black)

**Core Logic:**
- `lib/services/production.service.ts`: Batch CRUD, capacity tracking, QC workflow
- `lib/services/inventory.service.ts`: Stock levels, FIFO allocation, movements (most complex)
- `lib/services/order.service.ts`: Order lifecycle, fulfillment
- `lib/services/financial.service.ts`: Revenue tracking, COGS, report generation
- `lib/services/approval.service.ts`: 4-tier approval workflow

**Testing:**
- `*.test.ts` or `*.spec.ts` (co-located with source files)
- `vitest.config.ts`: Test runner configuration

## Naming Conventions

**Files:**
- Page components: `page.tsx` (required by Next.js)
- Layout components: `layout.tsx` (required by Next.js)
- Feature components: PascalCase, e.g., `BatchForm.tsx`, `InventoryGrid.tsx`
- Utility files: camelCase, e.g., `batch-code.ts`, `fifo.ts`
- Service files: `{domain}.service.ts`, e.g., `inventory.service.ts`
- Validator files: `{domain}.ts`, e.g., `batch.ts`, `order.ts`
- Test files: `{name}.test.ts` or `{name}.spec.ts`

**Directories:**
- Feature modules: lowercase, e.g., `production/`, `inventory/`, `orders/`
- Logical groupings: parentheses for non-route groups, e.g., `(auth)/`, `(dashboard)/`
- Domain-specific: directory per service layer, e.g., `services/`, `validators/`, `utils/`

**Functions:**
- Server Actions: camelCase, e.g., `createBatch()`, `allocateInventory()`
- Services: camelCase methods, e.g., `inventoryService.createMovement()`
- Utilities: camelCase, e.g., `generateBatchCode()`, `calculateMargin()`
- Components: PascalCase, e.g., `BatchForm`, `InventoryAlert`
- Hooks: camelCase starting with `use`, e.g., `useAuth()`, `useBatches()`

**Variables:**
- Database models: PascalCase singular, e.g., `Batch`, `InventoryMovement`, `Order`
- Constants/enums: UPPER_SNAKE_CASE, e.g., `BATCH_STATUS`, `INVENTORY_TYPES`
- State variables: camelCase, e.g., `selectedLocation`, `isLoading`

**Types:**
- Database models: PascalCase, e.g., `Batch`, `Order`, `Invoice`
- Form data types: suffix `FormData`, e.g., `BatchFormData`, `OrderFormData`
- API response types: suffix `Response`, e.g., `BatchResponse`, `OrderListResponse`
- Domain enums: suffix `Type` or leave as string unions in Zod, e.g., `BatchStatus`, `OrderStatus`

## Where to Add New Code

**New Feature (e.g., Subscription Management):**
- Primary code:
  - Service: `lib/services/subscription.service.ts` (subscribe, cancel, calculate renewal)
  - Validator: `lib/validators/subscription.ts` (form schemas)
  - Server Action: `app/actions/subscriptions.ts` (createSubscription, cancelSubscription)
  - Components: `components/forms/SubscriptionForm.tsx`, `components/tables/SubscriptionTable.tsx`
  - Page: `app/(dashboard)/subscriptions/page.tsx`, `app/(dashboard)/subscriptions/[id]/page.tsx`
- Tests: Co-located with source, e.g., `lib/services/subscription.service.test.ts`

**New Component/Module (e.g., Distributor Management):**
- Implementation:
  - Create feature directory: `app/(dashboard)/distributors/`
  - Create layout: `app/(dashboard)/distributors/layout.tsx` (if custom sidebar needed)
  - Create pages: `page.tsx` (list), `new/page.tsx` (create), `[id]/page.tsx` (detail)
  - Create form component: `components/forms/DistributorForm.tsx`
  - Create table component: `components/tables/DistributorTable.tsx`
  - Create service: `lib/services/distributor.service.ts`
  - Create validators: `lib/validators/distributor.ts`
  - Create server action: `app/actions/distributors.ts`

**Utilities & Helpers:**
- Shared helpers: `lib/utils/` (reusable functions)
- Example: New discount calculation? Add to `lib/utils/calculation.ts` or new file `lib/utils/discount.ts`
- Domain-specific calculations: Consider placing in service layer if complex

**API Endpoints (Webhooks, Exports):**
- Webhooks: `app/api/webhooks/{service}/route.ts`
- Exports: `app/api/exports/{type}/route.ts`
- Imports: `app/api/import/{source}/route.ts`

## Special Directories

**prisma/migrations/:**
- Purpose: Version-controlled database schema changes
- Generated: Yes (created by `prisma migrate dev` commands)
- Committed: Yes (always committed to git)
- Usage: Each migration is numbered and immutable (never edit old migrations)

**public/:**
- Purpose: Static files accessible via HTTP
- Generated: No
- Committed: Yes
- Contains: Logo, brand assets, invoice templates

**node_modules/:**
- Purpose: Installed dependencies
- Generated: Yes (npm install)
- Committed: No (in .gitignore)

**types/ (auto-generated):**
- Purpose: TypeScript types generated from Prisma schema
- Generated: Yes (auto-generated by Prisma on schema changes)
- Committed: No (regenerated on `npm run build`)

**.next/ (build output):**
- Purpose: Compiled Next.js output
- Generated: Yes (npm run build)
- Committed: No (in .gitignore)

---

*Structure analysis: 2026-02-13*
