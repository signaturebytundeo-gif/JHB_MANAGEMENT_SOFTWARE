# Architecture Patterns

**Domain:** Food Manufacturing Operations Management
**Researched:** 2026-02-13
**Confidence:** MEDIUM-HIGH

## Recommended Architecture

**Monolithic Next.js App Router** — single deployment with service layer separation. At 2 users and 15K units/month, microservices would be massive over-engineering.

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Production Module | Batch CRUD, QC workflow, co-packer tracking | Inventory (creates movements on batch completion) |
| Inventory Module | Stock levels, movements, FIFO, raw materials, packaging | Production (receives), Orders (allocates), Locations |
| Order Module | Order lifecycle, fulfillment, multi-channel | Inventory (allocates stock), Customers, Invoicing |
| Financial Module | Expenses, approvals, revenue tracking, reports | Orders (revenue), Inventory (COGS), Approval workflow |
| CRM Module | Customers, distributors, subscriptions, leads | Orders (purchase history), Financial (lifetime value) |
| Investor Module | Read-only dashboards, metrics | Financial (data source), Sales (growth metrics) |
| Reporting Module | Pre-built reports, exports | All modules (aggregates data) |
| Auth Module | Authentication, RBAC, sessions | All modules (permission checks) |

### Suggested Directory Structure

```
app/
├── (auth)/                    # Auth pages (login, register, invite)
│   ├── login/page.tsx
│   └── register/page.tsx
├── (dashboard)/               # Authenticated app (shared layout)
│   ├── layout.tsx             # Sidebar + header
│   ├── page.tsx               # Executive dashboard
│   ├── production/
│   │   ├── batches/page.tsx   # Batch list
│   │   ├── batches/new/       # Create batch form
│   │   └── batches/[id]/      # Batch detail + QC
│   ├── inventory/
│   │   ├── page.tsx           # Multi-location grid
│   │   ├── transfers/         # Transfer management
│   │   └── raw-materials/     # Raw material tracking
│   ├── orders/
│   ├── customers/
│   ├── finance/
│   ├── investor/              # Investor-only layout
│   └── reports/
├── api/                       # API routes (webhooks, exports)
│
├── actions/                   # Server Actions by domain
│   ├── production.ts
│   ├── inventory.ts
│   ├── orders.ts
│   └── finance.ts
│
lib/
├── services/                  # Business logic layer
│   ├── production.service.ts
│   ├── inventory.service.ts
│   ├── order.service.ts
│   ├── financial.service.ts
│   └── approval.service.ts
├── validators/                # Zod schemas
├── utils/                     # Helpers (FIFO, audit, formatting)
├── auth/                      # Auth config + RBAC
└── db.ts                      # Prisma client singleton

prisma/
├── schema.prisma              # Database schema
├── migrations/
└── seed.ts                    # Pre-seed company data

types/                         # Shared TypeScript types
components/                    # UI components
hooks/                         # React hooks
```

## Key Architectural Patterns

### Pattern 1: Event-Driven Inventory Movements

All inventory changes flow through a single InventoryService that creates immutable movement records.

```typescript
// Every stock change creates a movement record
await inventoryService.createMovement({
  type: 'PRODUCTION_OUTPUT', // or TRANSFER, SALE, ADJUSTMENT
  productId, quantity, locationId,
  batchId, orderId, // reference to source
  userId, notes
});
// Stock levels are derived from movement history
```

**Why:** Complete audit trail, FIFO guaranteed, traceable from batch to sale.

### Pattern 2: Database Transactions for Inventory

Multi-step operations must be atomic — batch completion + inventory creation in one transaction.

```typescript
await prisma.$transaction(async (tx) => {
  await tx.batch.update({ where: { id }, data: { status: 'RELEASED' } });
  await tx.inventoryMovement.create({ data: { ... } });
  await tx.stockLevel.upsert({ ... });
  await tx.auditLog.create({ data: { ... } });
});
```

**Why:** Prevents partial state (batch marked complete but inventory not updated).

### Pattern 3: Approval Workflow Engine

Configurable thresholds with state machine for financial approvals.

```
Under $150 → Auto-approve
$150-$500 → Single member approval + notification
Over $500 → Dual authorization required
Over $2,500 → Dual bank authorization
```

Approvals recorded as immutable entries — cannot be deleted, only revoked.

### Pattern 4: RBAC Middleware

Role checks at API/Server Action entry point, not scattered through business logic.

```typescript
const permissions = {
  'production:write': ['ADMIN', 'MANAGER'],
  'financial:approve': ['ADMIN'],
  'reports:read': ['ADMIN', 'MANAGER', 'SALES_REP', 'INVESTOR'],
};
```

### Pattern 5: Server Actions for Mutations, Server Components for Reads

- **Server Components:** Fetch batches, inventory, sales data via direct Prisma queries
- **Server Actions:** Create batch, adjust inventory, log expense (co-located with forms)
- **API Routes:** Only for webhooks and file downloads (PDF/Excel exports)

## Data Flow

### Production → Inventory → Sales

```
Batch Created (MMDDYY code)
    ↓
QC Checks (pH required)
    ↓ (pass)
Batch Released → Inventory Movement (PRODUCTION_OUTPUT)
    ↓
Stock Levels Updated (per location)
    ↓
Order Placed → Inventory Allocated (FIFO)
    ↓
Order Fulfilled → Inventory Movement (SALE_OUT)
    ↓
Invoice Generated → Payment Tracked
```

### FIFO Allocation Flow

```
Order: 10 units of 5oz Jerk Sauce from Miami Gardens
    ↓
Query batches with stock (ORDER BY createdAt ASC)
    ↓
Batch 021126: 6 units remaining (oldest)
Batch 021326: 15 units remaining
    ↓
Allocate: 6 from 021126, 4 from 021326
    ↓
Create movements, update stock levels (atomic transaction)
```

## Build Order (Dependencies)

1. **Foundation** — Database schema, auth, RBAC, product catalog, locations, seed data
2. **Production** — Batch CRUD, QC workflow, co-packer support (source of inventory)
3. **Inventory** — Multi-location tracking, movements, FIFO, raw materials (depends on production)
4. **Orders** — Order management, fulfillment, invoicing (depends on inventory)
5. **Sales & CRM** — Multi-channel tracking, customers, distributors (depends on orders)
6. **Financial** — Expenses, approvals, reports, cash flow (depends on orders + inventory)
7. **Investor & Reporting** — Dashboards, analytics, exports (depends on everything)

## Anti-Patterns to Avoid

| Anti-Pattern | Why Bad | Do This Instead |
|-------------|---------|-----------------|
| Direct DB updates bypassing services | No audit trail, FIFO not maintained | Always go through InventoryService |
| Business logic in API routes | Untestable, can't reuse | Service layer with dependency injection |
| Circular service dependencies | Tight coupling, Node.js import issues | Use events or shared workflows |
| Over-normalized schema (status as separate table) | Unnecessary joins for enums | Use Prisma enums for controlled vocabularies |
| Missing transaction boundaries | Partial state corruption | Wrap multi-step operations in $transaction |
| Single audit log table for everything | Query performance degrades | Domain-specific movement/event tables |

## Scaling Considerations

| Scale | Architecture |
|-------|-------------|
| 0-100 users | Monolith is ideal. Single Next.js + Prisma. No caching needed. |
| 100-1K users | Add Redis for sessions + frequently accessed data. Database indexes on common queries. |
| 1K-10K users | Read replicas for reports. Background jobs (BullMQ) for report generation. |
| 10K+ users | Consider splitting bounded contexts into services. Message queue for inter-service communication. |

**First bottleneck will be:** Database query performance on reports. Fix with indexes and materialized views, not architectural changes.

---
*Architecture research for: JHB Command Center*
*Researched: 2026-02-13*
