# Phase 4: Order Management - Research

**Researched:** 2026-03-11
**Domain:** Order lifecycle management, FIFO inventory deduction, invoice generation, AR aging
**Confidence:** HIGH

---

## Summary

Phase 4 adds a full B2B order management layer on top of the existing `WebsiteOrder`/`Sale` infrastructure. The schema does not yet have a general-purpose `Order` model for wholesale/catering/event orders — `WebsiteOrder` is Stripe-webhook-driven and read-only from the operations side. All new orders (ORD-01 through ORD-09) require a **new `Order` model** that is operator-created, multi-line-item, multi-channel, and integrated with the InventoryMovement event-sourcing system built in Phase 3.

The FIFO allocation function (`allocateInventoryFIFO` in `src/lib/utils/fifo.ts`) already exists and is battle-tested. The Phase 4 pattern is: create Order in `DRAFT`, on `CONFIRMED` call `allocateInventoryFIFO` inside a `db.$transaction`, write `MovementType.DEDUCTION` records, and advance status. Invoice and AR aging are pure database queries on top of the Order — no external library is needed.

The codebase uses `useActionState` + `useFormStatus` (React 19 pattern) consistently for forms, NOT React Hook Form, even though RHF is installed. All forms follow the `prevState: FormState, formData: FormData` server action signature. Modals are custom `fixed inset-0` overlays, not Radix Dialog. Responsive pattern is `hidden md:block` desktop table + `md:hidden` mobile cards.

**Primary recommendation:** Extend the schema with a new `Order` model and `Invoice` model, wire them to the existing FIFO + InventoryMovement system, and follow the `useActionState` + Zod validator pattern established by all existing actions.

---

## Codebase Inventory (What Already Exists)

This is a codebase-first research phase. The following are confirmed facts from reading the source.

### Existing Models in Schema (Relevant to Phase 4)

| Model | Key Fields | Phase 4 Use |
|-------|-----------|-------------|
| `WebsiteOrder` | `orderId`, `customerId`, `items` (JSON), `status: OrderStatus`, `source: OrderSource` | Read-only — already handles Stripe/marketplace orders |
| `Customer` | `email`, `firstName`, `lastName`, `orderCount`, `totalSpent` | Link new Orders to customers |
| `SalesChannel` | `name`, `type: ChannelType` | All 9 channels already seeded |
| `Product` | `id`, `name`, `sku`, `size`, `pricingTiers` | Line items on new Orders |
| `PricingTier` | `productId`, `tierName`, `unitPrice`, `casePrice` | Price resolution for order lines |
| `InventoryMovement` | `movementType`, `batchId`, `fromLocationId`, `toLocationId`, `quantity`, `approvedAt` | Deduct inventory on fulfillment |
| `BatchAllocation` | `batchId`, `locationId`, `quantity` | Source of truth for FIFO |
| `Location` | `name`, `type: LocationType` | Shipping location on orders |

### Existing Enums (Relevant)

| Enum | Values | Gap for Phase 4 |
|------|--------|----------------|
| `OrderStatus` | `NEW, PROCESSING, SHIPPED, DELIVERED, CANCELLED` | MISSING: `DRAFT, CONFIRMED` (required by ORD-02) |
| `MovementType` | `PRODUCTION, TRANSFER, ADJUSTMENT, ALLOCATION, DEDUCTION` | `DEDUCTION` exists — use it for fulfillment |
| `PaymentMethod` | `CASH, CREDIT_CARD, SQUARE, STRIPE, ZELLE, CHECK, NET_30, AMAZON_PAY, OTHER` | Sufficient; `NET_30` covers invoice terms |

### Existing Utilities

| File | Function | Phase 4 Use |
|------|----------|------------|
| `src/lib/utils/fifo.ts` | `allocateInventoryFIFO(productId, locationId, quantityNeeded, tx)` | Call on order confirmation per line item |
| `src/lib/utils/fifo.ts` | `getAvailableStock(productId, locationId, tx)` | Show available stock in order form |
| `src/lib/dal.ts` | `verifySession()`, `verifyManagerOrAbove()`, `verifyAdmin()` | Role-based access in all actions |

### Existing Actions

| File | Functions | Relation to Phase 4 |
|------|-----------|---------------------|
| `src/app/actions/orders.ts` | `getWebsiteOrders`, `updateOrderStatus`, `fulfillOrder` | Handles WebsiteOrder only — Phase 4 adds parallel actions for new Order model |
| `src/app/actions/inventory.ts` | `transferInventory`, `createAdjustment`, `approveAdjustment` | FIFO + `db.$transaction` patterns to replicate |
| `src/app/actions/sales.ts` | `createSale` | Pattern for simple form server action |

### Existing Routes

| Route | What It Does |
|-------|-------------|
| `(dashboard)/dashboard/orders/` | Tabs: Manual Sales, Website Orders, Marketplace Sync |
| `(dashboard)/dashboard/orders/[id]/` | Order detail page |
| `(dashboard)/dashboard/finance/` | Exists but currently empty placeholder |

---

## Schema Changes Required

Phase 4 requires Prisma schema additions. These are new models — no existing models need to change except adding relations.

### New Enum: Extended OrderStatus

The requirement is `Draft > Confirmed > Processing > Shipped > Delivered > Completed`. The existing `OrderStatus` enum (`NEW, PROCESSING, SHIPPED, DELIVERED, CANCELLED`) belongs to `WebsiteOrder`. For the new `Order` model, define a separate enum:

```prisma
enum OperatorOrderStatus {
  DRAFT
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  COMPLETED
  CANCELLED
}
```

### New Enum: Invoice Status

```prisma
enum InvoiceStatus {
  DRAFT
  SENT
  VIEWED
  PARTIAL
  PAID
  OVERDUE
  VOID
}
```

### New Enum: Order Type (for catering vs standard)

```prisma
enum OperatorOrderType {
  STANDARD      // wholesale / direct / event
  CATERING      // 50% deposit tracking (ORD-09)
  FARMERS_MARKET // location/weather/foot traffic notes (ORD-08)
}
```

### New Model: Order

```prisma
model Order {
  id              String               @id @default(cuid())
  orderNumber     String               @unique  // human-readable, e.g. ORD-2026-001
  status          OperatorOrderStatus  @default(DRAFT)
  orderType       OperatorOrderType    @default(STANDARD)
  customerId      String?
  channelId       String
  locationId      String               // shipping/fulfillment location
  paymentMethod   PaymentMethod
  orderDate       DateTime             @default(now())
  notes           String?

  // Catering-specific (ORD-09)
  depositAmount   Decimal?             // 50% deposit
  depositPaidAt   DateTime?
  balanceDueDate  DateTime?            // 7 days before event

  // Farmers market / event (ORD-08)
  eventLocation   String?
  weatherNotes    String?
  footTrafficNotes String?

  // Approval tracking (ORD-06)
  totalAmount     Decimal              @default(0)
  approvalStatus  String?              // "auto", "pending_single", "pending_dual", "approved"
  approvedById    String?
  secondApprovedById String?
  approvedAt      DateTime?

  // Relations
  createdById     String
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt

  customer        Customer?            @relation(fields: [customerId], references: [id])
  channel         SalesChannel         @relation(fields: [channelId], references: [id])
  location        Location             @relation(fields: [locationId], references: [id])
  createdBy       User                 @relation("OrderCreator", fields: [createdById], references: [id])
  approvedBy      User?                @relation("OrderApprover", fields: [approvedById], references: [id])
  secondApprovedBy User?               @relation("OrderSecondApprover", fields: [secondApprovedById], references: [id])
  lineItems       OrderLineItem[]
  invoice         Invoice?
  inventoryMovements InventoryMovement[] @relation("OrderMovements")

  @@index([status])
  @@index([customerId])
  @@index([channelId])
  @@index([orderDate])
  @@index([orderType])
}
```

### New Model: OrderLineItem

```prisma
model OrderLineItem {
  id          String   @id @default(cuid())
  orderId     String
  productId   String
  quantity    Int
  unitPrice   Decimal
  totalPrice  Decimal

  order       Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product     Product  @relation(fields: [productId], references: [id])

  @@index([orderId])
  @@index([productId])
}
```

### New Model: Invoice

```prisma
model Invoice {
  id             String        @id @default(cuid())
  invoiceNumber  String        @unique  // e.g. INV-2026-001
  orderId        String        @unique
  customerId     String?
  status         InvoiceStatus @default(DRAFT)
  subtotal       Decimal
  taxAmount      Decimal       @default(0)
  totalAmount    Decimal
  paidAmount     Decimal       @default(0)
  issuedAt       DateTime?
  dueDate        DateTime?     // issuedAt + 30 days
  paidAt         DateTime?
  viewedAt       DateTime?
  overdueAt      DateTime?     // set when flagged at 31 days
  lateFeeAmount  Decimal       @default(0)  // accumulated 1.5%/mo
  notes          String?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  order          Order         @relation(fields: [orderId], references: [id])
  customer       Customer?     @relation(fields: [customerId], references: [id])
  payments       InvoicePayment[]

  @@index([status])
  @@index([customerId])
  @@index([dueDate])
  @@index([issuedAt])
}
```

### New Model: InvoicePayment

```prisma
model InvoicePayment {
  id            String        @id @default(cuid())
  invoiceId     String
  amount        Decimal
  paymentMethod PaymentMethod
  paidAt        DateTime
  notes         String?
  createdById   String
  createdAt     DateTime      @default(now())

  invoice       Invoice       @relation(fields: [invoiceId], references: [id])
  createdBy     User          @relation(fields: [createdById], references: [id])

  @@index([invoiceId])
  @@index([paidAt])
}
```

### Schema Note: InventoryMovement Relation to Order

The existing `InventoryMovement` model needs an optional `orderId` field added so deduction movements can be linked back to the order:

```prisma
// Add to InventoryMovement:
orderId    String?
order      Order?   @relation("OrderMovements", fields: [orderId], references: [id])
```

---

## Architecture Patterns

### Recommended Project Structure (Phase 4 Additions)

```
apps/command-center/src/
├── app/
│   ├── actions/
│   │   ├── orders.ts          # Extended — add operator order CRUD + fulfillment
│   │   └── invoices.ts        # NEW — invoice CRUD, payment logging, AR aging
│   └── (dashboard)/dashboard/
│       ├── orders/
│       │   ├── page.tsx       # Extended — add "Operator Orders" tab
│       │   ├── tabs.tsx       # Extended — add 4th tab slot
│       │   ├── [id]/          # Existing — extend for operator order detail
│       │   └── new/           # NEW — create operator order form
│       └── finance/
│           └── page.tsx       # Extended — invoices + AR aging (currently empty)
├── components/
│   ├── orders/
│   │   ├── OperatorOrderList.tsx   # NEW — table+cards for operator orders
│   │   ├── OperatorOrderForm.tsx   # NEW — multi-line-item create form
│   │   ├── PickPackList.tsx        # NEW — print-friendly pick list (ORD-04)
│   │   └── OrderStatusBadge.tsx    # NEW — OperatorOrderStatus badge map
│   └── finance/
│       ├── InvoiceList.tsx         # NEW — invoice table with status badges
│       ├── InvoiceDetail.tsx       # NEW — branded invoice view / print
│       ├── PaymentModal.tsx        # NEW — log payment form
│       └── ARAgingReport.tsx       # NEW — aging buckets table (PRICE-05)
└── lib/
    ├── utils/
    │   ├── fifo.ts            # Existing — already handles FIFO
    │   └── order-number.ts    # NEW — generate ORD-YYYY-NNN sequence
    └── validators/
        ├── operator-orders.ts  # NEW — Zod schemas for order create/update
        └── invoices.ts         # NEW — Zod schemas for invoice + payment
```

### Pattern 1: Order Confirmation with FIFO Inventory Deduction

This is the most complex new action. Mirror the `transferInventory` pattern exactly.

**What:** On order confirmation, allocate inventory using FIFO per line item, create `DEDUCTION` InventoryMovement records, and advance status — all inside `db.$transaction`.

**Source:** Derived from `apps/command-center/src/app/actions/inventory.ts` `transferInventory` function (verified in codebase).

```typescript
// Source: apps/command-center/src/app/actions/inventory.ts (transferInventory pattern)
export async function confirmOrder(
  orderId: string
): Promise<{ success?: boolean; message?: string }> {
  try {
    const session = await verifyManagerOrAbove();

    await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { lineItems: true },
      });

      if (!order) throw new Error('Order not found');
      if (order.status !== 'DRAFT') throw new Error('Only DRAFT orders can be confirmed');

      const now = new Date();

      // FIFO allocation per line item — throws if insufficient stock
      for (const line of order.lineItems) {
        const allocations = await allocateInventoryFIFO(
          line.productId,
          order.locationId,
          line.quantity,
          tx as typeof db
        );

        // Write DEDUCTION movement per batch
        for (const allocation of allocations) {
          await tx.inventoryMovement.create({
            data: {
              movementType: 'DEDUCTION',
              batchId: allocation.batchId,
              fromLocationId: order.locationId,
              toLocationId: null,
              quantity: allocation.quantity,
              orderId: order.id,
              requiresApproval: false,
              approvedById: session.userId,
              approvedAt: now,
              createdById: session.userId,
            },
          });
        }
      }

      // Determine approval status (ORD-06)
      const approvalStatus = order.totalAmount < 150
        ? 'auto'
        : order.totalAmount <= 500
        ? 'pending_single'
        : 'pending_dual';

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: approvalStatus === 'auto' ? 'CONFIRMED' : 'DRAFT',
          approvalStatus,
          approvedById: approvalStatus === 'auto' ? session.userId : null,
          approvedAt: approvalStatus === 'auto' ? now : null,
        },
      });
    });

    revalidatePath('/dashboard/orders');
    return { success: true, message: 'Order confirmed and inventory allocated' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to confirm order';
    return { message };
  }
}
```

### Pattern 2: Form with useActionState (Established Codebase Pattern)

Do NOT use React Hook Form for forms here. The codebase uses `useActionState` + `useFormStatus` consistently.

**Source:** Verified in `SaleForm.tsx`, `BatchForm.tsx`, and all existing forms.

```typescript
// Source: apps/command-center/src/components/sales/SaleForm.tsx (verified pattern)
'use client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { createOperatorOrder } from '@/app/actions/orders';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full h-12 text-base bg-caribbean-green hover:bg-caribbean-green/90 text-white">
      {pending ? 'Creating...' : 'Create Order'}
    </Button>
  );
}

export function OperatorOrderForm({ channels, products, locations }) {
  const [state, formAction] = useActionState(createOperatorOrder, undefined);
  // ...
}
```

### Pattern 3: Responsive Table-to-Cards Transform

**Source:** Verified in `WebsiteOrderList.tsx` (desktop) and the mobile card section.

```typescript
// Desktop table (hidden on mobile):
<div className="hidden md:block rounded-lg border bg-card">
  <Table>...</Table>
</div>

// Mobile cards (hidden on desktop):
<div className="md:hidden space-y-3">
  {orders.map(order => (
    <div className="rounded-lg border bg-card p-4 space-y-2">...</div>
  ))}
</div>
```

### Pattern 4: AR Aging Report Query

Aging buckets are computed in the server action via date arithmetic. No library needed.

```typescript
// Source: derived from Prisma date filter patterns (verified in inventory.ts)
export async function getARAgingReport() {
  const now = new Date();

  const invoices = await db.invoice.findMany({
    where: { status: { notIn: ['PAID', 'VOID'] } },
    include: { customer: { select: { firstName: true, lastName: true } }, order: true },
  });

  return invoices.map(inv => {
    const daysPastDue = inv.dueDate
      ? Math.max(0, Math.floor((now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const bucket =
      daysPastDue === 0 ? 'CURRENT' :
      daysPastDue <= 30 ? '1_30' :
      daysPastDue <= 60 ? '31_60' :
      daysPastDue <= 90 ? '61_90' : '90_PLUS';

    return { ...inv, daysPastDue, bucket };
  });
}
```

### Pattern 5: Late Interest Calculation (PRICE-04)

1.5% per month is applied on the overdue balance when flagging or when viewing.

```typescript
// 1.5% monthly = daily rate of 1.5/30 = 0.05% per day
function calculateLateFee(principal: number, daysOverdue: number): number {
  const monthsOverdue = daysOverdue / 30;
  return principal * 0.015 * monthsOverdue;
}
```

### Pattern 6: Modal Pattern (Established)

The codebase uses custom `fixed inset-0 bg-black/50` overlays, not Radix Dialog. Follow the `FulfillmentModal.tsx` pattern.

**Source:** Verified in `apps/command-center/src/components/orders/FulfillmentModal.tsx`.

### Pattern 7: Order Number Sequence

Generate human-readable order numbers (ORD-2026-001) by querying the count of existing orders for the year.

```typescript
// src/lib/utils/order-number.ts
export async function generateOrderNumber(tx: PrismaClient = db): Promise<string> {
  const year = new Date().getFullYear();
  const count = await tx.order.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  return `ORD-${year}-${String(count + 1).padStart(4, '0')}`;
}
// Same pattern for invoices: INV-2026-0001
```

### Anti-Patterns to Avoid

- **Using React Hook Form:** All existing forms use `useActionState`. Do not introduce RHF — it conflicts with the FormData pattern and would be inconsistent.
- **Storing invoice HTML as a blob:** Generate branded invoices as a React component rendered to the page (print CSS), not by serializing HTML to the database.
- **Recalculating FIFO outside a transaction:** Always pass `tx` to `allocateInventoryFIFO` so the stock check and movement creation are atomic.
- **Creating a new `OrderStatus` enum:** Do not modify the existing `OrderStatus` (used by `WebsiteOrder`). Create `OperatorOrderStatus` as a new enum.
- **Running FIFO for each line item in a separate query outside a transaction:** Race condition — another order could allocate the same batch between queries.
- **Computing aging buckets in the component:** Always compute in the server action; send pre-bucketed data to the client.

---

## Standard Stack

All libraries are already installed. No new npm packages are required.

### Core (Already Installed)

| Library | Version | Purpose | Phase 4 Use |
|---------|---------|---------|-------------|
| `prisma` | 7.4.0 | ORM | New Order, Invoice, InvoicePayment models + migrations |
| `@prisma/client` | 7.4.0 | Generated client | All DB operations |
| `next` | 16.1.6 | App Router + Server Actions | All form actions, page routes |
| `zod` | 4.3.6 | Schema validation | Validator files for orders + invoices |
| `date-fns` | 4.1.0 | Date arithmetic | AR aging day calculations, Net 30 due dates |

### Supporting (Already Installed)

| Library | Version | Purpose | Phase 4 Use |
|---------|---------|---------|-------------|
| `react` | 19.2.4 | `useActionState`, `useTransition` | Forms + optimistic UI |
| `sonner` | 2.0.7 | Toast notifications | Success/error feedback |
| `lucide-react` | 0.564.0 | Icons | Order status, invoice, print icons |
| `@radix-ui/react-select` | 2.2.6 | Select dropdowns | Channel, product, location selectors |
| `@radix-ui/react-tooltip` | 1.2.8 | Tooltips | Approval status hints |

### No New Packages Needed

The full phase can be implemented with existing dependencies. Branded invoice printing uses `@media print` CSS — no PDF library required. AR aging is pure date math with `date-fns`.

**Installation:** None required.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FIFO inventory allocation | Custom batch selection loop | `allocateInventoryFIFO` in `fifo.ts` | Already handles: RELEASED status filter, inbound/outbound movement aggregation, oldest-first sort, throws on insufficient stock |
| Available stock check | Ad-hoc aggregation query | `getAvailableStock` in `fifo.ts` | Already tested and consistent with FIFO logic |
| Date math for AR aging | Manual ms arithmetic | `date-fns` `differenceInDays` | Handles DST, leap years correctly |
| Session/auth check | `jwt.verify()` direct call | `verifySession()` / `verifyManagerOrAbove()` from `dal.ts` | Already handles redirect, role extraction, cookie parsing |
| Invoice PDF generation | `puppeteer` or `pdfkit` | `@media print` CSS on React invoice component | Zero added dependencies, works in browser, matches existing UI |
| Form validation | Manual type checks | `zod` + `safeParse` pattern (see existing validators) | Consistent with all other forms; `flatten().fieldErrors` maps to field-level errors |
| Approval threshold logic | Hardcoded conditionals inline | Configurable `ApprovalThreshold` model (already in schema) | Query thresholds from DB so they can be changed without deploys |

**Key insight:** The biggest trap is reimplementing FIFO outside the existing `fifo.ts`. That function is the single source of truth for available stock — any divergence will cause inventory drift.

---

## Common Pitfalls

### Pitfall 1: Running FIFO Outside a Transaction

**What goes wrong:** `allocateInventoryFIFO` is called for line items one at a time, but each call runs in its own DB connection. Between calls, another order confirmation can allocate the same batch, causing overselling.

**Why it happens:** Developers call `await allocateInventoryFIFO(...)` without passing a `tx` context.

**How to avoid:** Always wrap the entire order confirmation (loop over all line items + movement creates + order update) in `db.$transaction(async (tx) => { ... })` and pass `tx as typeof db` to `allocateInventoryFIFO`.

**Warning signs:** Tests pass individually but fail under concurrent load. Stock goes negative.

### Pitfall 2: Modifying the Existing `OrderStatus` Enum

**What goes wrong:** Adding `DRAFT`, `CONFIRMED`, `COMPLETED` to the existing `OrderStatus` enum causes a Prisma migration that affects `WebsiteOrder` records. `WebsiteOrder.status` will gain values it never uses, and the existing `STATUS_BADGES` record in `WebsiteOrderList.tsx` will need updating.

**Why it happens:** Phase description says "Draft > Confirmed > Processing > Shipped > Delivered > Completed" which looks like an extension.

**How to avoid:** Create a separate `OperatorOrderStatus` enum. The `Order` model is a different domain from `WebsiteOrder`.

**Warning signs:** TypeScript errors in `WebsiteOrderList.tsx` after migration.

### Pitfall 3: Invoice Due Date Drift

**What goes wrong:** Net 30 is calculated at invoice creation, but if the invoice is re-generated or updated, the `dueDate` shifts. Overdue flagging at 31 days fires based on `issuedAt`, not `createdAt`.

**Why it happens:** `dueDate` is derived but mutable.

**How to avoid:** Set `dueDate = addDays(issuedAt, 30)` (using `date-fns`) only on initial issue. Never recompute on update. Store `issuedAt` as the immutable anchor.

**Warning signs:** Same invoice shows different due dates on different renders.

### Pitfall 4: Approval Workflow Bypassed on Status Update

**What goes wrong:** A user directly updates `order.status` to `CONFIRMED` without going through the `confirmOrder` action that handles the approval threshold check (ORD-06).

**Why it happens:** An admin drops into a direct `db.order.update({ data: { status: 'CONFIRMED' } })` in a utility action.

**How to avoid:** The `confirmOrder` action is the only path to `CONFIRMED` status. Add a guard: `if (order.approvalStatus !== 'approved' && order.totalAmount >= 150) throw new Error(...)`.

**Warning signs:** Orders over $500 confirmed without a second approver.

### Pitfall 5: Pick/Pack List Doesn't Match Allocated Inventory

**What goes wrong:** The pick/pack list (ORD-04) is generated from `order.lineItems` quantities, but the actual deducted inventory (in `InventoryMovement`) may differ if FIFO splits across multiple batches.

**Why it happens:** The pick list shows "24 units of 5oz sauce" but the warehouse needs to know which batch codes to pull.

**How to avoid:** Generate the pick list from the `InventoryMovement` records linked to the order (via `orderId`), not from `lineItems`. This shows batch codes per line.

**Warning signs:** Picker grabs wrong batch, compromising FIFO integrity.

### Pitfall 6: Catering Deposit — Balance Due Date Calculation

**What goes wrong:** `balanceDueDate` (7 days before event) is set on the order but there is no event date field to anchor it to.

**Why it happens:** ORD-09 says "balance 7 days before" but the schema design doesn't capture the event date.

**How to avoid:** Add `eventDate DateTime?` to the `Order` model for `CATERING` type orders. `balanceDueDate = subDays(eventDate, 7)`.

**Warning signs:** `balanceDueDate` is null for all catering orders.

---

## Code Examples

Verified patterns from the existing codebase:

### Zod Validator Pattern (for new validators/operator-orders.ts)

```typescript
// Source: apps/command-center/src/lib/validators/sales.ts (verified pattern)
import { z } from 'zod';

export const createOperatorOrderSchema = z.object({
  channelId: z.string().min(1, 'Channel is required'),
  locationId: z.string().min(1, 'Location is required'),
  customerId: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'CREDIT_CARD', 'SQUARE', 'STRIPE', 'ZELLE', 'CHECK', 'NET_30', 'AMAZON_PAY', 'OTHER']),
  orderType: z.enum(['STANDARD', 'CATERING', 'FARMERS_MARKET']).default('STANDARD'),
  notes: z.string().optional(),
  // Line items passed as JSON string from a hidden input
  lineItems: z.string().transform((val) => JSON.parse(val) as Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>),
});

export type CreateOperatorOrderFormState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean; orderId?: string }
  | undefined;
```

### Server Action Pattern (for createOperatorOrder)

```typescript
// Source: apps/command-center/src/app/actions/sales.ts (verified pattern adapted)
'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/dal';
import { createOperatorOrderSchema, type CreateOperatorOrderFormState } from '@/lib/validators/operator-orders';
import { generateOrderNumber } from '@/lib/utils/order-number';

export async function createOperatorOrder(
  prevState: CreateOperatorOrderFormState,
  formData: FormData
): Promise<CreateOperatorOrderFormState> {
  try {
    const session = await verifySession();

    const validatedFields = createOperatorOrderSchema.safeParse({
      channelId: formData.get('channelId'),
      locationId: formData.get('locationId'),
      customerId: formData.get('customerId') || undefined,
      paymentMethod: formData.get('paymentMethod'),
      orderType: formData.get('orderType') || 'STANDARD',
      notes: formData.get('notes') || undefined,
      lineItems: formData.get('lineItems'),
    });

    if (!validatedFields.success) {
      return { errors: validatedFields.error.flatten().fieldErrors };
    }

    const data = validatedFields.data;
    const totalAmount = data.lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
    const orderNumber = await generateOrderNumber();

    const order = await db.order.create({
      data: {
        orderNumber,
        channelId: data.channelId,
        locationId: data.locationId,
        customerId: data.customerId ?? null,
        paymentMethod: data.paymentMethod,
        orderType: data.orderType,
        totalAmount,
        notes: data.notes ?? null,
        status: 'DRAFT',
        createdById: session.userId,
        lineItems: {
          create: data.lineItems.map((li) => ({
            productId: li.productId,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            totalPrice: li.quantity * li.unitPrice,
          })),
        },
      },
    });

    revalidatePath('/dashboard/orders');
    return { success: true, message: 'Order created', orderId: order.id };
  } catch (error) {
    console.error('Error creating order:', error);
    return { message: 'Failed to create order' };
  }
}
```

### Prisma Transaction with FIFO (for confirmOrder)

```typescript
// Source: apps/command-center/src/app/actions/inventory.ts (transferInventory, verified)
import { allocateInventoryFIFO } from '@/lib/utils/fifo';

await db.$transaction(async (tx) => {
  const allocations = await allocateInventoryFIFO(
    productId,
    locationId,
    quantityNeeded,
    tx as typeof db  // cast required — Prisma tx is compatible but TypeScript needs the cast
  );

  for (const allocation of allocations) {
    await tx.inventoryMovement.create({
      data: {
        movementType: 'DEDUCTION',
        batchId: allocation.batchId,
        fromLocationId: locationId,
        toLocationId: null,
        quantity: allocation.quantity,
        orderId: orderId,
        requiresApproval: false,
        approvedById: session.userId,
        approvedAt: new Date(),
        createdById: session.userId,
      },
    });
  }
});
```

### AR Aging with date-fns

```typescript
// Source: date-fns 4.x API (verified in package.json — date-fns ^4.1.0 installed)
import { differenceInDays, addDays } from 'date-fns';

const daysOverdue = differenceInDays(new Date(), invoice.dueDate);
const dueDate = addDays(issuedAt, 30); // Net 30
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `useFormState` (React 18) | `useActionState` (React 19) | Already used throughout codebase — use `useActionState` |
| Separate `FormData` extraction + validation | `schema.safeParse(formDataFields)` with Zod | Already established pattern — follow it |
| PDF invoice with `pdfkit` | Print-styled React component (`@media print`) | No new deps; works with `window.print()` |
| Polling for order status updates | `revalidatePath` on server action completion | Sufficient for this use case — no WebSocket needed |

**Deprecated/outdated:**
- `useFormState` from `react-dom`: Replaced by `useActionState` from `react`. The codebase already uses the new API.
- React Hook Form for these forms: RHF is installed but not used. The `useActionState` + FormData pattern is the codebase standard.

---

## Open Questions

1. **Should `OrderStatus` existing enum be extended or is a new `OperatorOrderStatus` enum correct?**
   - What we know: Existing `OrderStatus` is used by `WebsiteOrder` model with values `NEW, PROCESSING, SHIPPED, DELIVERED, CANCELLED`. The `STATUS_BADGES` in `WebsiteOrderList.tsx` is typed to `Record<OrderStatus, ...>`.
   - What's unclear: Whether the operator order workflow should share this enum (simpler migration) or stay separate (cleaner domain model).
   - Recommendation: **Create separate `OperatorOrderStatus` enum.** Extending `OrderStatus` risks TypeScript errors in existing components when new values are added. The domain is distinct (operator-created vs webhook-received).

2. **How should the `OperatorOrderForm` handle multi-line-item entry on mobile?**
   - What we know: The mobile pattern uses cards not tables. Line item entry with add/remove rows is complex on a 375px screen.
   - What's unclear: Whether a single-product simplified form is acceptable, or full multi-line is required.
   - Recommendation: Implement a "dynamic line items" pattern — start with one row, add/remove via JS state. Serialize to JSON for `lineItems` hidden input before submit. On mobile, stack the row fields vertically.

3. **Does the `ApprovalThreshold` model (already in schema) get used for ORD-06, or is the $150/$500 logic hardcoded?**
   - What we know: `ApprovalThreshold` model exists in the schema with `minAmount`, `maxAmount`, `approvalType`. The values from the spec match: auto (<$150), single ($150-$500), dual (>$500).
   - What's unclear: Whether thresholds should be seeded/configured or if the $150/$500 values are business constants.
   - Recommendation: **Query from `ApprovalThreshold` table** so the business can update thresholds without a code change. Seed the three tiers in the migration.

4. **Should invoice generation (PRICE-01) produce a print-ready page or a downloadable PDF?**
   - What we know: No PDF library is installed. React component with `@media print` CSS works for printing. `window.print()` can be triggered from a button.
   - What's unclear: Whether the customer receives the invoice via email (requiring an email template) or just views/prints it in the browser.
   - Recommendation: **Print-ready React page at `/dashboard/finance/invoices/[id]`** with a "Print / Save as PDF" button using `window.print()`. If email delivery is required, add a Resend template (library already installed).

---

## Sources

### Primary (HIGH confidence)

- Codebase: `apps/command-center/prisma/schema.prisma` — verified all model definitions, enum values, index patterns
- Codebase: `apps/command-center/src/lib/utils/fifo.ts` — verified `allocateInventoryFIFO` signature, tx parameter, FIFOAllocation type
- Codebase: `apps/command-center/src/app/actions/inventory.ts` — verified `db.$transaction` + `allocateInventoryFIFO(tx)` integration pattern
- Codebase: `apps/command-center/src/app/actions/sales.ts` — verified `useActionState` + Zod `safeParse` pattern
- Codebase: `apps/command-center/src/components/sales/SaleForm.tsx` — verified `useActionState`, `useFormStatus`, no React Hook Form
- Codebase: `apps/command-center/src/components/orders/WebsiteOrderList.tsx` — verified responsive table-to-cards pattern
- Codebase: `apps/command-center/src/components/orders/FulfillmentModal.tsx` — verified modal overlay pattern
- Codebase: `apps/command-center/src/lib/dal.ts` — verified `verifySession`, `verifyManagerOrAbove`, `verifyAdmin` signatures
- Codebase: `apps/command-center/package.json` — verified all library versions (prisma 7.4, next 16.1.6, zod 4.3.6, date-fns 4.1.0, react 19.2.4)

### Secondary (MEDIUM confidence)

- Prisma `db.$transaction` with interactive transactions — pattern confirmed in codebase; API stable in Prisma 7.x
- `date-fns` v4 `differenceInDays` / `addDays` API — confirmed in package.json; v4 API is stable

### Tertiary (LOW confidence)

- `@media print` CSS for invoice printing — browser-standard, not library-specific; no code verification needed
- `window.print()` for PDF-save — browser API, works in all modern browsers; LOW because no existing usage in codebase to confirm the UX pattern

---

## Metadata

**Confidence breakdown:**
- Schema changes: HIGH — read actual schema, identified exact gaps
- Architecture patterns: HIGH — all patterns derived from existing codebase
- FIFO integration: HIGH — existing function verified, tx cast pattern confirmed
- Invoice/AR patterns: MEDIUM — logic is standard, no existing invoice code to mirror
- Pitfalls: HIGH — derived from actual code reading, not speculation

**Research date:** 2026-03-11
**Valid until:** 2026-04-10 (stable stack — Prisma 7, Next 16, React 19 are not fast-moving)
