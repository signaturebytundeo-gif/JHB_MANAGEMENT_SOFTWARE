# Phase 3: Inventory Management - Research

**Researched:** 2026-02-19
**Domain:** Multi-location inventory tracking with FIFO allocation, audit trails, and database constraints
**Confidence:** HIGH

## Summary

Phase 3 builds on the existing production batch tracking (Phase 2) to implement multi-location inventory management with FIFO enforcement. The phase requires event-sourced inventory movements (append-only audit trail), database-level constraints to prevent negative inventory, real-time stock aggregation views, and color-coded alerts based on reorder point calculations.

The existing architecture already has BatchAllocation (batchId, locationId, quantity) and RawMaterial models. This phase extends that foundation with InventoryMovement (event sourcing), PackagingMaterial (bottles, caps, labels tracking), and computed inventory views with FIFO-aware allocation queries.

Key technical challenges: (1) FIFO allocation queries must sort by productionDate and allocate from oldest batches first across all locations, (2) inventory adjustments create immutable audit events rather than direct updates, (3) SQLite CHECK constraints must be added during migration (cannot ALTER TABLE after creation), (4) dual approval workflow for adjustments >2% variance requires approval state machine.

**Primary recommendation:** Use event-sourced InventoryMovement table as single source of truth for all inventory changes (transfers, adjustments, allocations, receipts). Compute current stock levels via aggregation queries. Add CHECK constraints in migration SQL. Use CVA-based color coding (green/yellow/red) matching existing BatchStatusBadge pattern.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma ORM | 7.4.0 | Database layer with SQLite adapter | Already in use, supports raw SQL for CHECK constraints |
| Zod | 3.x | Runtime validation for forms | Already in use for production module, type-safe validation |
| Next.js Server Actions | 16.1.6 | Mutations with useActionState | Existing pattern from Phase 2 (createBatch, submitQCTest) |
| React Hook Form | 7.71.1 | Form state management | Industry standard for complex forms, pairs with Zod via @hookform/resolvers |
| class-variance-authority | Latest | Color-coded badges/status | Already used in BatchStatusBadge, perfect for inventory alerts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @hookform/resolvers | 5.2.2 | Bridge React Hook Form + Zod | All form components (transfers, adjustments) |
| date-fns | Latest | Date calculations for FIFO sorting | Already in use, needed for productionDate comparisons |
| Radix UI primitives | Latest | Accessible UI components | Already in use, dialogs for approval workflows |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Event-sourced movements | Direct batch quantity updates | Event sourcing provides immutable audit trail required by INV-09, direct updates lose history |
| SQLite CHECK constraints | Application-level validation only | Database-level constraints (INV-10) prevent data corruption even if app has bugs |
| Server Actions | tRPC or API routes | Server Actions already established in Phase 2, consistency matters more than alternatives |

**Installation:**
```bash
npm install react-hook-form @hookform/resolvers zod
# (All other dependencies already installed in Phase 1-2)
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── actions/
│   │   └── inventory.ts          # Server Actions (transfer, adjust, allocate)
│   └── (dashboard)/dashboard/
│       └── inventory/
│           ├── page.tsx           # Stock levels grid with filters
│           ├── transfers/page.tsx # Transfer form and history
│           ├── adjustments/page.tsx # Adjustment form and history
│           └── raw-materials/page.tsx # Already exists from Phase 2
├── components/
│   └── inventory/
│       ├── StockLevelGrid.tsx    # Color-coded inventory table
│       ├── TransferForm.tsx      # Location-to-location transfer
│       ├── AdjustmentForm.tsx    # Reason code + approval workflow
│       ├── InventoryAlertBadge.tsx # Green/yellow/red using CVA
│       └── FIFOAllocationPreview.tsx # Shows which batches will be used
└── lib/
    ├── validators/
    │   └── inventory.ts          # Zod schemas for transfers/adjustments
    └── utils/
        └── fifo.ts               # FIFO allocation algorithm
```

### Pattern 1: Event-Sourced Inventory Movements
**What:** All inventory changes append to InventoryMovement table (never update/delete). Current stock computed via aggregation.
**When to use:** Required for immutable audit trails (INV-09) and regulatory compliance.
**Example:**
```typescript
// Prisma schema
model InventoryMovement {
  id            String          @id @default(cuid())
  movementType  MovementType    // PRODUCTION, TRANSFER, ADJUSTMENT, ALLOCATION
  batchId       String
  fromLocationId String?
  toLocationId   String?
  quantity       Int
  reason         String?         // For adjustments: DAMAGE, SHRINKAGE, SAMPLING, EXPIRED
  requiresApproval Boolean      @default(false)
  approvedById   String?
  approvedAt     DateTime?
  createdById    String
  createdAt      DateTime       @default(now())

  batch         Batch          @relation(fields: [batchId], references: [id])
  createdBy     User           @relation(fields: [createdById], references: [id])
  approvedBy    User?          @relation(fields: [approvedById], references: [id])

  @@index([batchId])
  @@index([toLocationId])
  @@index([movementType])
  @@index([createdAt])
}

enum MovementType {
  PRODUCTION      // Batch created (from BatchAllocation)
  TRANSFER        // Location A → Location B
  ADJUSTMENT      // Variance correction
  ALLOCATION      // Reserved for order (Phase 4)
  DEDUCTION       // Order fulfilled (Phase 4)
}
```

**How current stock is computed:**
```typescript
// src/lib/utils/inventory-queries.ts
export async function getCurrentStock(locationId: string, productId: string) {
  // Aggregate all movements for this location/product
  const movements = await db.inventoryMovement.findMany({
    where: {
      batch: { productId },
      OR: [
        { toLocationId: locationId },    // Additions
        { fromLocationId: locationId }   // Subtractions
      ]
    },
    include: { batch: true }
  });

  const inbound = movements
    .filter(m => m.toLocationId === locationId)
    .reduce((sum, m) => sum + m.quantity, 0);

  const outbound = movements
    .filter(m => m.fromLocationId === locationId)
    .reduce((sum, m) => sum + m.quantity, 0);

  return inbound - outbound;
}
```

### Pattern 2: FIFO Allocation Query
**What:** When allocating inventory (transfers or orders), select oldest batches first by productionDate.
**When to use:** All allocation operations (INV-03).
**Example:**
```typescript
// src/lib/utils/fifo.ts
export async function allocateInventoryFIFO(
  productId: string,
  locationId: string,
  quantityNeeded: number
) {
  // Get available batches sorted by production date (oldest first)
  const batches = await db.batch.findMany({
    where: {
      productId,
      status: 'RELEASED',
      allocations: {
        some: { locationId }
      }
    },
    include: {
      allocations: {
        where: { locationId }
      }
    },
    orderBy: {
      productionDate: 'asc'  // FIFO: oldest first
    }
  });

  // Calculate available quantity per batch (allocated - movements)
  const batchesWithAvailable = await Promise.all(
    batches.map(async (batch) => {
      const allocated = batch.allocations[0]?.quantity || 0;
      const movements = await db.inventoryMovement.aggregate({
        where: {
          batchId: batch.id,
          fromLocationId: locationId
        },
        _sum: { quantity: true }
      });
      const used = movements._sum.quantity || 0;
      return {
        ...batch,
        available: allocated - used
      };
    })
  );

  // Allocate from oldest batches first
  const allocations: { batchId: string; quantity: number }[] = [];
  let remaining = quantityNeeded;

  for (const batch of batchesWithAvailable) {
    if (remaining === 0) break;
    const toAllocate = Math.min(batch.available, remaining);
    if (toAllocate > 0) {
      allocations.push({ batchId: batch.id, quantity: toAllocate });
      remaining -= toAllocate;
    }
  }

  if (remaining > 0) {
    throw new Error(`Insufficient inventory: ${remaining} units short`);
  }

  return allocations;
}
```

### Pattern 3: Color-Coded Inventory Alerts Using CVA
**What:** Reuse BatchStatusBadge pattern with CVA variants for stock level alerts.
**When to use:** Inventory grids (INV-02).
**Example:**
```typescript
// src/components/inventory/InventoryAlertBadge.tsx
import { cva } from 'class-variance-authority';

const alertVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      level: {
        HEALTHY: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        REORDER: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      },
    },
  }
);

export function InventoryAlertBadge({
  currentStock,
  reorderPoint
}: {
  currentStock: number;
  reorderPoint: number
}) {
  // GREEN: > 20% above reorder point (healthy)
  // YELLOW: within 20% of reorder point (reorder)
  // RED: below reorder point (critical)
  const level = currentStock < reorderPoint
    ? 'CRITICAL'
    : currentStock < reorderPoint * 1.2
    ? 'REORDER'
    : 'HEALTHY';

  return (
    <span className={alertVariants({ level })}>
      {currentStock} units
    </span>
  );
}
```

### Pattern 4: Dual Approval Workflow for Adjustments
**What:** Adjustments >2% of location inventory require approval before applying.
**When to use:** Inventory adjustments (INV-06).
**Example:**
```typescript
// src/app/actions/inventory.ts
export async function createAdjustment(
  prevState: AdjustmentFormState,
  formData: FormData
): Promise<AdjustmentFormState> {
  const session = await verifyManagerOrAbove();

  const validatedFields = adjustmentSchema.safeParse({
    batchId: formData.get('batchId'),
    locationId: formData.get('locationId'),
    quantityChange: formData.get('quantityChange'),
    reason: formData.get('reason')
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { batchId, locationId, quantityChange, reason } = validatedFields.data;

  // Check if approval required (>2% variance)
  const currentStock = await getCurrentStock(locationId, batchId);
  const variancePercent = Math.abs(quantityChange / currentStock) * 100;
  const requiresApproval = variancePercent > 2;

  await db.inventoryMovement.create({
    data: {
      movementType: 'ADJUSTMENT',
      batchId,
      toLocationId: quantityChange > 0 ? locationId : null,
      fromLocationId: quantityChange < 0 ? locationId : null,
      quantity: Math.abs(quantityChange),
      reason,
      requiresApproval,
      createdById: session.userId,
      // If no approval needed, auto-approve
      approvedById: requiresApproval ? null : session.userId,
      approvedAt: requiresApproval ? null : new Date(),
    }
  });

  revalidatePath('/dashboard/inventory/adjustments');

  return {
    success: true,
    message: requiresApproval
      ? 'Adjustment submitted for approval (>2% variance)'
      : 'Adjustment applied'
  };
}
```

### Pattern 5: SQLite CHECK Constraints in Migration
**What:** Add CHECK constraints during table creation to prevent negative inventory at database level.
**When to use:** Initial migration for InventoryMovement or BatchAllocation (INV-10).
**Example:**
```sql
-- Migration: Add CHECK constraint to prevent negative quantities
-- NOTE: SQLite doesn't support ALTER TABLE ADD CONSTRAINT, so this must be in CREATE TABLE

-- For new InventoryMovement table:
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quantity" INTEGER NOT NULL CHECK (quantity >= 0),  -- Prevent negative
    "movementType" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "reason" TEXT,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT 0,
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("batchId") REFERENCES "Batch"("id"),
    FOREIGN KEY ("createdById") REFERENCES "User"("id"),
    FOREIGN KEY ("approvedById") REFERENCES "User"("id")
);

-- For existing tables, must recreate:
-- 1. Rename old table
-- 2. Create new table with CHECK constraint
-- 3. Copy data
-- 4. Drop old table
```

**Prisma migration approach:**
```typescript
// prisma/migrations/XXXXXX_add_inventory_movement/migration.sql
-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quantity" INTEGER NOT NULL CHECK (quantity >= 0),
    -- ... rest of columns
);
```

### Anti-Patterns to Avoid
- **Direct BatchAllocation updates:** Never UPDATE BatchAllocation.quantity directly. Always create InventoryMovement events.
- **Client-side FIFO logic:** FIFO allocation must happen server-side in actions to prevent race conditions.
- **Skipping approval checks:** Don't bypass dual approval for convenience. Audit compliance requires it.
- **Forgetting transaction wrapping:** Multi-movement operations (transfers create 2 movements: out + in) must use db.$transaction.
- **Using ALTER TABLE for CHECK in SQLite:** SQLite doesn't support adding CHECK constraints post-creation. Add during CREATE TABLE in migration.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validation functions | Zod schemas with React Hook Form | Type-safe, reusable, already established pattern |
| Date comparisons for FIFO | Custom date sort logic | date-fns comparison functions | Handles timezones, edge cases, already in project |
| Color-coded alerts | Conditional className strings | class-variance-authority (CVA) | Type-safe variants, matches BatchStatusBadge pattern |
| Audit trail queries | Manual JOIN queries | Prisma include/select with indexes | Query optimization, type safety, N+1 prevention |
| Approval state machine | Boolean flags | Enum-based state with timestamps | Clear state transitions, audit trail of approvals |

**Key insight:** Inventory systems have hidden complexity in race conditions (concurrent transfers), regulatory compliance (immutable audit trails), and data integrity (negative inventory prevention). Established patterns prevent production bugs.

## Common Pitfalls

### Pitfall 1: FIFO Allocation Race Conditions
**What goes wrong:** Two concurrent transfers allocate the same batch units, causing negative inventory.
**Why it happens:** FIFO query calculates available stock, then creates movement. Gap between read and write allows double allocation.
**How to avoid:** Use Prisma transactions with serializable isolation, or use database-level row locking (`SELECT FOR UPDATE` in raw SQL).
**Warning signs:** Intermittent negative inventory in production, duplicate batch allocations in movements table.

**Solution:**
```typescript
await db.$transaction(async (tx) => {
  // 1. Calculate FIFO allocation
  const allocations = await allocateInventoryFIFO(productId, locationId, quantity);

  // 2. Create movements within same transaction
  await tx.inventoryMovement.createMany({
    data: allocations.map(a => ({
      movementType: 'TRANSFER',
      batchId: a.batchId,
      fromLocationId: locationId,
      toLocationId: targetLocationId,
      quantity: a.quantity,
      createdById: userId,
      approvedById: userId,
      approvedAt: new Date(),
    }))
  });
});
```

### Pitfall 2: Forgetting to Filter by Batch Status in FIFO Queries
**What goes wrong:** FIFO allocation includes batches still in QC_REVIEW or HOLD status, allocating unavailable inventory.
**Why it happens:** Phase 2 established batch status workflow, but inventory queries forget to check status.
**How to avoid:** Always filter by `status: 'RELEASED'` in FIFO queries.
**Warning signs:** Orders allocated to batches that haven't passed QC, inventory discrepancies.

**Correct approach:**
```typescript
const batches = await db.batch.findMany({
  where: {
    productId,
    status: 'RELEASED',  // CRITICAL: only released batches
    // ... other conditions
  },
  orderBy: { productionDate: 'asc' }
});
```

### Pitfall 3: SQLite CHECK Constraint Migration Gotcha
**What goes wrong:** Adding CHECK constraint via Prisma schema change generates migration that fails on SQLite.
**Why it happens:** SQLite doesn't support `ALTER TABLE ADD CONSTRAINT`. Prisma may generate invalid migration SQL.
**How to avoid:** Manually write migration SQL to recreate table with CHECK constraint, or add CHECK in initial CREATE TABLE.
**Warning signs:** Migration fails with "near ADD: syntax error" on SQLite.

**Manual migration approach:**
```sql
-- Create new table with constraint
CREATE TABLE "InventoryMovement_new" (
    -- all columns with CHECK constraint
);

-- Copy data
INSERT INTO "InventoryMovement_new" SELECT * FROM "InventoryMovement";

-- Swap tables
DROP TABLE "InventoryMovement";
ALTER TABLE "InventoryMovement_new" RENAME TO "InventoryMovement";
```

### Pitfall 4: Computing Stock Levels on Every Render
**What goes wrong:** Inventory grid re-calculates current stock for every SKU/location on each render, causing slow page loads.
**Why it happens:** Aggregation queries in components instead of server-side data fetching.
**How to avoid:** Compute stock levels in Server Component or Server Action, pass as props. Cache results with Next.js revalidation.
**Warning signs:** Page takes 5+ seconds to load, hundreds of database queries for single page.

**Correct pattern:**
```typescript
// app/(dashboard)/dashboard/inventory/page.tsx - Server Component
export default async function InventoryPage() {
  // Compute all stock levels server-side
  const stockLevels = await getStockLevelsByLocation();

  return <StockLevelGrid data={stockLevels} />;
}

// src/app/actions/inventory.ts
export async function getStockLevelsByLocation() {
  'use server';

  // Single query with aggregation
  const movements = await db.inventoryMovement.findMany({
    include: {
      batch: {
        include: { product: true }
      }
    }
  });

  // Aggregate in memory (more efficient than N queries)
  // ... aggregation logic

  return stockLevels;
}
```

### Pitfall 5: Reorder Point Calculation Without Lead Time
**What goes wrong:** Reorder alerts trigger when inventory reaches minimum, but supplier lead time is 2 weeks, causing stockouts.
**Why it happens:** Alert threshold set to minimum stock instead of reorder point formula.
**How to avoid:** Use formula: `Reorder Point = (Average Daily Demand × Lead Time) + Safety Stock`.
**Warning signs:** Frequent stockouts despite "yellow" alerts, inventory runs out before reorder arrives.

**Correct calculation:**
```typescript
// src/lib/utils/reorder-point.ts
export function calculateReorderPoint(
  averageDailyDemand: number,
  leadTimeDays: number,
  safetyStockDays: number = 7
): number {
  const leadTimeDemand = averageDailyDemand * leadTimeDays;
  const safetyStock = averageDailyDemand * safetyStockDays;
  return Math.ceil(leadTimeDemand + safetyStock);
}

// Example: 10 units/day, 14-day lead time, 7-day safety stock
// Reorder Point = (10 × 14) + (10 × 7) = 140 + 70 = 210 units
```

## Code Examples

Verified patterns from official sources and existing codebase:

### Server Action Pattern (Existing from Phase 2)
```typescript
// src/app/actions/inventory.ts
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { verifyManagerOrAbove } from '@/lib/dal';
import { transferSchema, type TransferFormState } from '@/lib/validators/inventory';
import { allocateInventoryFIFO } from '@/lib/utils/fifo';

export async function transferInventory(
  prevState: TransferFormState,
  formData: FormData
): Promise<TransferFormState> {
  try {
    const session = await verifyManagerOrAbove();

    const validatedFields = transferSchema.safeParse({
      productId: formData.get('productId'),
      fromLocationId: formData.get('fromLocationId'),
      toLocationId: formData.get('toLocationId'),
      quantity: formData.get('quantity'),
      notes: formData.get('notes'),
    });

    if (!validatedFields.success) {
      return { errors: validatedFields.error.flatten().fieldErrors };
    }

    const { productId, fromLocationId, toLocationId, quantity, notes } = validatedFields.data;

    // Use transaction to prevent race conditions
    await db.$transaction(async (tx) => {
      // 1. FIFO allocation from source location
      const allocations = await allocateInventoryFIFO(productId, fromLocationId, quantity);

      // 2. Create outbound movements
      await tx.inventoryMovement.createMany({
        data: allocations.map(a => ({
          movementType: 'TRANSFER',
          batchId: a.batchId,
          fromLocationId,
          toLocationId: null,
          quantity: a.quantity,
          reason: notes,
          createdById: session.userId,
          approvedById: session.userId,
          approvedAt: new Date(),
        }))
      });

      // 3. Create inbound movements (preserves FIFO by maintaining batch association)
      await tx.inventoryMovement.createMany({
        data: allocations.map(a => ({
          movementType: 'TRANSFER',
          batchId: a.batchId,
          fromLocationId: null,
          toLocationId,
          quantity: a.quantity,
          reason: notes,
          createdById: session.userId,
          approvedById: session.userId,
          approvedAt: new Date(),
        }))
      });
    });

    revalidatePath('/dashboard/inventory');
    return { success: true, message: `Transferred ${quantity} units` };

  } catch (error) {
    console.error('Transfer failed:', error);
    return { message: error instanceof Error ? error.message : 'Transfer failed' };
  }
}
```

### Zod Schema with Cross-Field Validation (Phase 2 Pattern)
```typescript
// src/lib/validators/inventory.ts
import { z } from 'zod';

export const transferSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  fromLocationId: z.string().min(1, 'Source location is required'),
  toLocationId: z.string().min(1, 'Destination location is required'),
  quantity: z.coerce.number().int().positive('Quantity must be positive'),
  notes: z.string().optional(),
}).refine(
  (data) => data.fromLocationId !== data.toLocationId,
  {
    message: 'Source and destination must be different',
    path: ['toLocationId'],
  }
);

export const adjustmentSchema = z.object({
  batchId: z.string().min(1, 'Batch is required'),
  locationId: z.string().min(1, 'Location is required'),
  quantityChange: z.coerce.number().int().refine(val => val !== 0, 'Change must be non-zero'),
  reason: z.enum(['DAMAGE', 'SHRINKAGE', 'SAMPLING', 'EXPIRED'], {
    errorMap: () => ({ message: 'Valid reason required' })
  }),
  notes: z.string().optional(),
});

export type TransferFormState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean }
  | undefined;

export type AdjustmentFormState = TransferFormState;
```

### React Hook Form with useActionState (Next.js 16 Pattern)
```typescript
// src/components/inventory/TransferForm.tsx
'use client';

import { useActionState } from 'react';
import { transferInventory } from '@/app/actions/inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function TransferForm({
  products,
  locations
}: {
  products: Product[];
  locations: Location[]
}) {
  const [state, formAction, isPending] = useActionState(transferInventory, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="productId">Product</Label>
        <select id="productId" name="productId" required>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
          ))}
        </select>
        {state?.errors?.productId && (
          <p className="text-sm text-red-600">{state.errors.productId[0]}</p>
        )}
      </div>

      <div>
        <Label htmlFor="fromLocationId">From Location</Label>
        <select id="fromLocationId" name="fromLocationId" required>
          {locations.map(l => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="toLocationId">To Location</Label>
        <select id="toLocationId" name="toLocationId" required>
          {locations.map(l => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        {state?.errors?.toLocationId && (
          <p className="text-sm text-red-600">{state.errors.toLocationId[0]}</p>
        )}
      </div>

      <div>
        <Label htmlFor="quantity">Quantity</Label>
        <Input
          type="number"
          id="quantity"
          name="quantity"
          min="1"
          inputMode="numeric"
          required
        />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Transferring...' : 'Transfer Inventory'}
      </Button>

      {state?.message && (
        <p className={state.success ? 'text-green-600' : 'text-red-600'}>
          {state.message}
        </p>
      )}
    </form>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct inventory updates | Event-sourced movements | 2024-2025 | Immutable audit trails, time-travel queries, regulatory compliance |
| Application-level constraints | Database CHECK constraints | Always available in SQLite | Prevents data corruption even with app bugs |
| Client-side FIFO logic | Server-side allocation with transactions | Next.js 13+ Server Actions | Prevents race conditions, ensures FIFO integrity |
| Separate approval tables | Embedded approval state in movements | 2025 | Simpler schema, approval is property of event |
| Manual color coding | CVA-based variant systems | 2024+ | Type-safe, consistent, matches existing patterns |

**Deprecated/outdated:**
- **useState for form state in Server Actions:** Use `useActionState` hook (Next.js 15+), not useState + fetch
- **Manual transaction rollback:** Prisma transactions auto-rollback on error, no need for try/catch rollback
- **ALTER TABLE for CHECK constraints in SQLite:** Not supported, must recreate table in migration

## Open Questions

1. **Reorder point configuration storage**
   - What we know: Formula is (avg daily demand × lead time) + safety stock
   - What's unclear: Should reorder points be per-product (global) or per-product-location? Should they be in database or config file?
   - Recommendation: Add `reorderPoint` and `leadTimeDays` to Product model as defaults, allow location-specific overrides in separate ProductLocationSettings table. Start with global defaults.

2. **Packaging materials tracking detail level**
   - What we know: Requirement INV-07 wants bottles, caps, labels tracked with 30-day supply alerts
   - What's unclear: Are packaging materials batch-specific (linked via BatchMaterial) or separate inventory pool?
   - Recommendation: Create PackagingMaterial model separate from RawMaterial (different units, different suppliers). Track as pool inventory without batch linkage initially. Phase 4 can link to orders if needed.

3. **Historical inventory valuation queries**
   - What we know: Event-sourced movements allow point-in-time reconstruction
   - What's unclear: Will users need historical inventory valuation reports, or just current state?
   - Recommendation: Build current state views first (INV-01, INV-11). Add time-travel queries in Phase 7 (dashboards) if needed for investor reports.

4. **Adjustment approval notification mechanism**
   - What we know: >2% adjustments need approval (INV-06)
   - What's unclear: How do approvers get notified? Email, in-app notification, or just appears in pending list?
   - Recommendation: Start with pending adjustments list on inventory page (simple). Add email notifications in Phase 7 when alert system is built.

## Sources

### Primary (HIGH confidence)
- Prisma schema from /apps/command-center/prisma/schema.prisma - Existing models analyzed
- Phase 2 verification report - Established patterns (useActionState, Zod, Server Actions, CVA badges)
- [Prisma Data Validation Guide](https://www.prisma.io/docs/orm/more/help-and-troubleshooting/check-constraints) - CHECK constraints documentation
- [SQLite CHECK Constraint Tutorial](https://www.sqlitetutorial.net/sqlite-check-constraint/) - SQLite constraint limitations

### Secondary (MEDIUM confidence)
- [Microsoft Azure Event Sourcing Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing) - Event sourcing architecture
- [Salesforce Engineering: Event Sourcing for Inventory](https://engineering.salesforce.com/event-sourcing-for-an-inventory-availability-solution-3cc0daf5a742/) - Production implementation
- [Shopify Inventory Allocation Guide 2026](https://www.shopify.com/enterprise/blog/inventory-allocation) - FIFO best practices
- [Finale Inventory: FIFO Method Guide](https://www.finaleinventory.com/accounting-and-inventory-software/fifo-method) - FIFO implementation patterns
- [Inflow Inventory: Reorder Point Formula](https://www.inflowinventory.com/blog/reorder-point-formula-safety-stock/) - Reorder point calculations
- [ClearPoint Strategy: RAG Status Guide](https://www.clearpointstrategy.com/blog/establish-rag-statuses-for-kpis) - Color-coded dashboard best practices
- [Microsoft Dynamics 365: Reason Codes for Inventory](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/reason-codes-for-counting-journals) - Adjustment reason codes
- [Concentrus: Inventory Management Best Practices 2026](https://concentrus.com/inventory-management-best-practices/) - Dual approval thresholds
- [Next.js Server Actions Documentation](https://nextjs.org/docs/13/app/building-your-application/data-fetching/server-actions-and-mutations) - Official Next.js patterns
- [React Hook Form with Zod (January 2026)](https://oneuptime.com/blog/post/2026-01-15-type-safe-forms-react-hook-form-zod/view) - Current integration guide

### Tertiary (LOW confidence)
- WebSearch results for "inventory management audit trail" - General patterns, no specific library recommendations

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use from Phase 1-2, verified versions in package.json
- Architecture: HIGH - Patterns match existing Phase 2 implementations, official docs confirm approaches
- Pitfalls: MEDIUM-HIGH - FIFO race conditions and SQLite limitations verified via official docs, others based on common patterns

**Research date:** 2026-02-19
**Valid until:** 2026-03-21 (30 days - relatively stable domain, Next.js 16 patterns established)
