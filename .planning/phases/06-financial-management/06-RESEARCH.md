# Phase 6: Financial Management - Research

**Researched:** 2026-03-12
**Domain:** Financial tracking, expense management, COGS calculation, P&L/cash flow reporting — within existing Next.js 16 + Prisma 7 + shadcn/ui stack, with new charting (Recharts via shadcn/ui chart) and optional file upload (Vercel Blob) dependencies
**Confidence:** HIGH

---

## Summary

Phase 6 is a **schema extension + financial computation + new UI sections** phase. The core application stack is locked and fully understood from prior phases. The new technical surface areas are: (1) expense tracking with file receipt uploads, (2) expense approval workflow using the existing `ApprovalThreshold` DB table, (3) revenue analytics across channels, (4) COGS calculation per batch using `BatchMaterial` data, and (5) financial report generation (P&L, Cash Flow, budget vs actual).

The existing schema provides the raw materials: `Sale` records are the revenue source, `BatchMaterial` + `RawMaterial` is the COGS material data, `ApprovalThreshold` seeds all four threshold tiers already, and `Invoice` + `InvoicePayment` models track receivables. What is missing: an `Expense` model (with category, receipt URL, amount, approval workflow fields), a `Budget` model for budget-vs-actual comparisons, and a `CashFlowProjection` model or computed structure for 90-day projections. Chart rendering requires adding `recharts` + the shadcn/ui `chart` component (not currently installed). Receipt file upload requires `@vercel/blob` (not currently installed).

The financial reports (P&L, Cash Flow Statement) are pure computation — data is assembled server-side in Server Action functions, then passed to client components for display. No third-party accounting SDK needed. The 90-day cash flow projection uses a simple linear model: average daily revenue from last 30 days * remaining days + known upcoming invoice due dates. This matches the complexity level of the existing `getSalesMetrics()` function.

**Primary recommendation:** Build schema-first (Expense + Budget models), wire expense approval to existing `ApprovalThreshold` table (same pattern as order approval in `operator-orders.ts`), add shadcn/ui chart component with recharts for revenue visualizations, use `@vercel/blob` server-upload for receipts (files are tiny, well under 4.5MB limit), and generate all financial reports as server-computed data passed to client display components.

---

## Codebase Inventory — What Already Exists

All claims verified by reading source files in the project.

### Schema Models Available for Phase 6

| Model | Relevant Fields | Phase 6 Use |
|-------|----------------|-------------|
| `Sale` | saleDate, channelId, productId, quantity, unitPrice, totalAmount, paymentMethod | Revenue by channel (FIN-03), P&L revenue line (FIN-07) |
| `ApprovalThreshold` | minAmount, maxAmount, approvalType ("auto"/"single_member"/"dual_member"/"dual_bank") | Expense approval workflow (FIN-02) — already seeded with all 4 tiers |
| `BatchMaterial` | batchId, rawMaterialId, quantityUsed | COGS materials component (FIN-05) |
| `RawMaterial` | name, supplier, quantity, unit | Material cost reference for COGS |
| `Batch` | totalUnits, productId, productionDate, status | COGS per-batch denominator |
| `Invoice` | totalAmount, paidAmount, status, dueDate | Cash flow (FIN-08), receivables in P&L |
| `InvoicePayment` | invoiceId, amount, paidAt | Cash inflows for cash flow statement |
| `Order` + `OrderLineItem` | totalAmount, lineItems, paymentMethod | Revenue for operator orders |
| `PricingTier` | tierName, unitPrice, casePrice | Wholesale cash price for FIFO COGS estimate |

### Existing Approval Threshold Seeds (Verified)

```
threshold-under-150:   minAmount=0,     maxAmount=149.99,  approvalType="auto"
threshold-150-500:     minAmount=150,   maxAmount=499.99,  approvalType="single_member"
threshold-500-2500:    minAmount=500,   maxAmount=2499.99, approvalType="dual_member"
threshold-over-2500:   minAmount=2500,  maxAmount=null,    approvalType="dual_bank"
```

### Existing Approval Logic Pattern (from `operator-orders.ts`)

The `confirmOrder` server action already implements the full threshold lookup pattern:
```typescript
const thresholds = await tx.approvalThreshold.findMany({ orderBy: { minAmount: 'asc' } });
const matchingThreshold = thresholds.find((t) => {
  const min = Number(t.minAmount);
  const max = t.maxAmount !== null ? Number(t.maxAmount) : Infinity;
  return totalAmount >= min && totalAmount <= max;
});
// Then branch on matchingThreshold.approvalType
```
Expense approval uses this exact same pattern. No new approval infrastructure needed.

### Existing Financial Routes

```
/dashboard/finance/                    — finance page.tsx (invoices + AR aging)
/dashboard/finance/invoices/           — invoice list
/dashboard/finance/invoices/[id]/      — invoice detail
/dashboard/reports/                    — placeholder ("Coming in Phase 5")
```

### Existing UI Components Available

All shadcn/ui base components: `button`, `card`, `table`, `badge`, `input`, `select`, `textarea`, `label`, `form`, `sonner` (toasts), `tooltip`. No `chart` component installed yet.

### Missing New Dependencies

| Dependency | Purpose | Status |
|------------|---------|--------|
| `recharts` | Bar/line charts for revenue and cash flow | Not installed |
| shadcn `chart` component | ChartContainer, ChartTooltip wrappers | Not installed |
| `@vercel/blob` | Receipt file upload storage | Not installed |

---

## Standard Stack

### Core (existing — no change)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| Next.js | 16.1.6 | App Router, Server Actions | No change |
| Prisma | 7.4.0 + @prisma/adapter-neon | Database ORM | Add new models via migration |
| shadcn/ui + Tailwind v4 | current | UI components | Add `chart` component |
| Zod | 4.3.6 | Validation schemas | `z.coerce.number()`, `z.nativeEnum()` pattern |
| date-fns | 4.1.0 | Date arithmetic | Already installed, use for period calculations |
| sonner | 2.0.7 | Toast notifications | Already installed |

### New Dependencies for Phase 6
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `recharts` | latest (2.x) | Revenue/cash flow charts | shadcn/ui chart component requires it |
| `@vercel/blob` | latest | Receipt file storage | Official Vercel storage, server upload < 4.5MB works for receipts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@vercel/blob` for receipts | Store base64 in PostgreSQL | Postgres is not designed for binary blobs; URL in `receiptUrl` field is cleaner |
| `@vercel/blob` for receipts | Skip receipt upload in MVP | FIN-01 explicitly requires receipt uploads — cannot defer |
| recharts via shadcn/ui chart | Plain HTML tables for revenue | Charts are required by FIN-03 (daily revenue by channel) and FIN-09 (90-day projection) |
| recharts via shadcn/ui chart | nivo, visx, Chart.js | shadcn/ui chart wraps recharts specifically — use the same library ecosystem |

**Installation:**
```bash
npm install recharts @vercel/blob
npx shadcn@latest add chart
```

---

## Schema Changes Required

### New Models

```prisma
// Expense model — core of FIN-01 and FIN-02
model Expense {
  id              String         @id @default(cuid())
  description     String
  amount          Decimal
  category        ExpenseCategory
  expenseDate     DateTime
  receiptUrl      String?        // Vercel Blob URL
  vendorName      String?
  notes           String?

  // Approval workflow (mirrors Order approval pattern)
  approvalStatus  String?        // "auto_approved", "pending_single", "pending_dual", "pending_bank", "approved", "rejected"
  approvedById    String?
  secondApprovedById String?
  approvedAt      DateTime?
  bankAuthorizationRef String?   // For dual_bank: reference number

  createdById     String
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  // Relations
  createdBy       User           @relation("ExpenseCreator", fields: [createdById], references: [id])
  approvedBy      User?          @relation("ExpenseApprover", fields: [approvedById], references: [id])
  secondApprovedBy User?         @relation("ExpenseSecondApprover", fields: [secondApprovedById], references: [id])

  @@index([expenseDate])
  @@index([category])
  @@index([approvalStatus])
  @@index([createdById])
}

// Budget model — for FIN-10 budget vs actual
model Budget {
  id          String   @id @default(cuid())
  period      String   // "2026-03" (YYYY-MM format)
  category    ExpenseCategory
  budgetedAmount Decimal
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([period, category])
  @@index([period])
}
```

### New Enum

```prisma
enum ExpenseCategory {
  INGREDIENTS
  PACKAGING
  LABOR
  EQUIPMENT
  MARKETING
  SHIPPING
  UTILITIES
  RENT
  INSURANCE
  OTHER
}
```

### User Model Relations to Add

```prisma
// On User model, add:
expensesCreated        Expense[]  @relation("ExpenseCreator")
expensesApproved       Expense[]  @relation("ExpenseApprover")
expensesSecondApproved Expense[]  @relation("ExpenseSecondApprover")
```

### COGS Strategy

Phase 1 decision: FIFO valuation uses 40% of wholesale cash price as COGS estimate. Phase 6 delivers full material/labor/overhead COGS per batch.

**Full COGS formula per batch:**
```
Materials cost = SUM(BatchMaterial.quantityUsed * RawMaterial.costPerUnit)
  → Note: RawMaterial has no costPerUnit field — this field must be added
Labor cost    = manual entry on Batch (new field: laborCostTotal)
Overhead cost = manual entry on Batch (new field: overheadCostTotal)
Total COGS    = Materials + Labor + Overhead
COGS per unit = Total COGS / Batch.totalUnits
Gross margin  = (Sale.unitPrice - COGS per unit) / Sale.unitPrice
```

**Schema additions to Batch:**
```prisma
laborCostTotal    Decimal?   @default(0)
overheadCostTotal Decimal?   @default(0)
```

**Schema addition to RawMaterial:**
```prisma
costPerUnit       Decimal?   // Cost per unit of measure
```

---

## Architecture Patterns

### Recommended File Structure (Phase 6 additions)

```
src/
├── app/(dashboard)/dashboard/
│   ├── finance/
│   │   ├── page.tsx                    — existing (invoices + AR aging) — EXPAND with tabs
│   │   ├── expenses/
│   │   │   └── page.tsx               — expense list + log expense form (FIN-01, FIN-02)
│   │   ├── revenue/
│   │   │   └── page.tsx               — revenue by channel, monthly vs projections (FIN-03, FIN-04)
│   │   ├── cogs/
│   │   │   └── page.tsx               — COGS per batch, gross margin by product (FIN-05, FIN-06)
│   │   └── reports/
│   │       └── page.tsx               — P&L, Cash Flow, 90-day projection, budget vs actual (FIN-07..FIN-11)
│   └── invoices/                       — existing, no change
├── app/actions/
│   ├── expenses.ts                     — logExpense, approveExpense, getExpenses
│   └── financial-reports.ts           — getPnL, getCashFlow, getCashFlowProjection, getBudgetVsActual
├── components/finance/
│   ├── ExpenseList.tsx
│   ├── LogExpenseModal.tsx
│   ├── ApproveExpenseModal.tsx
│   ├── RevenueByChannelChart.tsx      — recharts BarChart
│   ├── RevenueVsProjectionChart.tsx   — recharts LineChart or BarChart
│   ├── COGSTable.tsx
│   ├── GrossMarginTable.tsx
│   ├── PnLReport.tsx
│   ├── CashFlowStatement.tsx
│   ├── CashFlowProjectionChart.tsx    — recharts AreaChart
│   └── BudgetVsActualTable.tsx
└── lib/
    ├── utils/
    │   └── financial-calculations.ts  — pure TS: computePnL(), computeCashFlow(), computeCOGS()
    └── validators/
        └── expenses.ts                — logExpenseSchema, approveExpenseSchema
```

### Pattern 1: Server Page + Thin Client Wrapper (established pattern)

This is the FinanceDashboardClient pattern used throughout. Continue it for all Phase 6 pages.

```typescript
// Source: verified in /src/app/(dashboard)/dashboard/finance/page.tsx
// app/(dashboard)/dashboard/finance/expenses/page.tsx
export default async function ExpensesPage() {
  const [expenses, thresholds] = await Promise.all([
    getExpenses(),
    getApprovalThresholds(),
  ]);
  return <ExpensesDashboardClient expenses={expenses} thresholds={thresholds} />;
}
```

### Pattern 2: Expense Approval — Same as Order Approval

```typescript
// Source: verified in /src/app/actions/operator-orders.ts
// src/app/actions/expenses.ts
export async function logExpense(
  prevState: LogExpenseFormState,
  formData: FormData
): Promise<LogExpenseFormState> {
  const session = await verifySession();

  // 1. Validate fields with Zod
  // 2. Upload receipt to Vercel Blob if provided
  // 3. Lookup ApprovalThreshold by amount (same query as order approval)
  const thresholds = await db.approvalThreshold.findMany({ orderBy: { minAmount: 'asc' } });
  const match = thresholds.find(t =>
    amount >= Number(t.minAmount) && (t.maxAmount === null || amount <= Number(t.maxAmount))
  );
  // 4. Set approvalStatus based on match.approvalType
  // 5. Create Expense record
  // 6. revalidatePath('/dashboard/finance/expenses')
}
```

### Pattern 3: Receipt Upload via Vercel Blob

```typescript
// Source: https://vercel.com/docs/vercel-blob/server-upload
// In expenses.ts server action:
import { put } from '@vercel/blob';

const receiptFile = formData.get('receipt') as File | null;
let receiptUrl: string | null = null;

if (receiptFile && receiptFile.size > 0) {
  const blob = await put(`receipts/${Date.now()}-${receiptFile.name}`, receiptFile, {
    access: 'public',
  });
  receiptUrl = blob.url;
}
```

Note: Receipts are photos/PDFs, typically 1-3MB. Vercel serverless 4.5MB body limit is not a concern.

### Pattern 4: shadcn/ui Chart (Recharts wrapper)

```typescript
// Source: https://ui.shadcn.com/docs/components/chart
// 'use client' required — recharts uses browser APIs
'use client';
import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

const chartConfig = {
  revenue: { label: 'Revenue', color: 'hsl(var(--chart-1))' },
};

export function RevenueByChannelChart({ data }: { data: ChannelRevenue[] }) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <BarChart data={data}>
        <XAxis dataKey="channel" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="revenue" fill="var(--color-revenue)" />
      </BarChart>
    </ChartContainer>
  );
}
```

### Pattern 5: Financial Report Computation (Pure Server-Side)

```typescript
// Source: verified getSalesMetrics() pattern in /src/app/actions/sales.ts
// src/app/actions/financial-reports.ts
export async function getPnLReport(period: { year: number; month?: number }) {
  // Revenue: SUM of Sale.totalAmount + Order.totalAmount for period
  // COGS: SUM of computed COGS per batch (materials + labor + overhead)
  // Gross Profit: Revenue - COGS
  // Operating Expenses: SUM of approved Expense records for period
  // Net Income: Gross Profit - Operating Expenses
  // All Decimal fields coerced to Number before returning
}
```

### Anti-Patterns to Avoid

- **Cron job for overdue flagging:** Established pattern is to flag on page load (see `flagOverdueInvoices()` called in `finance/page.tsx`). Do not introduce cron jobs.
- **Approval status as enum:** Phase 4 used `approvalStatus` as a plain `String?` field (not a Prisma enum) with string literals (`"auto_approved"`, `"pending_single"`, etc.). Keep consistent.
- **Decimal arithmetic in TypeScript:** Always `Number(decimal)` before arithmetic. Never pass Prisma `Decimal` objects to arithmetic operators directly.
- **File objects in Server Actions:** Pass file via FormData (`formData.get('receipt') as File`), not as a direct argument. FormData is the supported pattern.
- **Client-side financial calculations:** All P&L/cash flow computation happens in server actions. Client components receive pre-computed numbers and render them.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bar/line charts | Custom SVG drawing | recharts via shadcn/ui `chart` component | Responsive, accessible, theming via CSS vars |
| Receipt storage | Local filesystem or base64 in DB | `@vercel/blob` server upload | Vercel functions are ephemeral; blob is persistent |
| Date period math | Custom month/quarter logic | `date-fns` (already installed) | `startOfMonth`, `endOfMonth`, `subMonths`, `eachMonthOfInterval` all available |
| Approval routing | Custom threshold table | Existing `ApprovalThreshold` DB table | Already seeded, already proven in `operator-orders.ts` |

**Key insight:** Financial computation in this app is vanilla arithmetic on database aggregates. The complexity is in data assembly (correct JOINs, period filters), not in algorithms. Pure TypeScript utility functions are sufficient.

---

## Common Pitfalls

### Pitfall 1: COGS Data Gaps — RawMaterial Has No Cost Field
**What goes wrong:** `RawMaterial` has quantity and unit but no `costPerUnit` field. Computing material COGS requires a cost per unit, but that field doesn't exist.
**Why it happens:** Phase 2 built raw material tracking for traceability (lot numbers, expiration), not costing.
**How to avoid:** Add `costPerUnit Decimal?` to `RawMaterial` in the Phase 6 migration. Treat it as optional — if null, material COGS for that ingredient is 0 (with a UI indicator that cost data is incomplete).
**Warning signs:** `BatchMaterial` query returns records but COGS calculation outputs $0 — check for null `costPerUnit`.

### Pitfall 2: Revenue Double-Counting Between Sale and Order Models
**What goes wrong:** Revenue exists in TWO places: `Sale` records (direct sales logged by staff) AND `Order` records (operator orders with line items). Naive sum of Sales only misses operator order revenue.
**Why it happens:** The app evolved to have two revenue entry paths. The dashboard page already handles this: `salesMetrics.mtdRevenue + orderMetrics.revenueMTD`.
**How to avoid:** Revenue computation must query BOTH `Sale.totalAmount` (groupBy channel) AND `Order.totalAmount` (filtered by status CONFIRMED+, groupBy channel via `Order.channelId`). The `getOrderMetrics()` action already demonstrates the Order query pattern.
**Warning signs:** Revenue figures don't match manual spot-check against order totals.

### Pitfall 3: Prisma Decimal Not Serializable
**What goes wrong:** Prisma `Decimal` type cannot be passed from Server Component to Client Component (not JSON-serializable).
**Why it happens:** Prisma returns `Decimal` objects from `Decimal` fields, not plain numbers.
**How to avoid:** In every server action, map results with `Number(record.amount)`. This pattern is already established in all existing actions (see `invoices.ts`, `sales.ts`).
**Warning signs:** "Only plain objects can be passed to Client Components" error at runtime.

### Pitfall 4: 90-Day Cash Flow Projection — Scope Creep Risk
**What goes wrong:** Over-engineering a complex forecasting model when a simple linear projection suffices.
**Why it happens:** Financial projections sound like they need sophisticated models.
**How to avoid:** Use a simple model: (average daily revenue from last 30 days) * (days in projection window) + (sum of outstanding invoice amounts due within 90 days). Present as "estimated" with clear caveat. The user confirmed benchmarks ($1.2M/$3.5M/$7.2M) are targets, not model inputs.
**Warning signs:** Spending more than one task on projection logic.

### Pitfall 5: Expense Approval for "dual_bank" — No External Integration
**What goes wrong:** "dual bank authorization" sounds like it requires bank API integration.
**Why it happens:** Misreading the requirement.
**How to avoid:** "dual_bank" means two internal members approve AND a bank authorization reference number is manually entered. Store `bankAuthorizationRef String?` on the Expense record. No external bank API needed.
**Warning signs:** Any plan task referencing Plaid, bank API, or external payment gateway for approval.

### Pitfall 6: Vercel Blob Not Set Up on Project
**What goes wrong:** `@vercel/blob` requires `BLOB_READ_WRITE_TOKEN` env var set in Vercel dashboard.
**Why it happens:** The package can be installed locally without the store being created in Vercel.
**How to avoid:** First task in expense upload subtask must be: create Blob store in Vercel dashboard + pull env vars with `vercel env pull`. If not on Vercel yet, use a simple local file path fallback for development.
**Warning signs:** `put()` throws authentication error.

---

## Code Examples

Verified patterns from existing codebase (all read directly from source):

### Period-Bounded Revenue Query (Prisma groupBy)
```typescript
// Source: verified pattern from /src/app/actions/sales.ts getSalesMetrics()
const sales = await db.sale.groupBy({
  by: ['channelId'],
  where: {
    saleDate: { gte: startOfMonth, lte: endOfMonth },
  },
  _sum: { totalAmount: true },
});
// Result: [{ channelId: '...', _sum: { totalAmount: Decimal } }]
// Then join with channel names:
const channels = await db.salesChannel.findMany({ select: { id: true, name: true } });
const channelMap = Object.fromEntries(channels.map(c => [c.id, c.name]));
return sales.map(s => ({
  channel: channelMap[s.channelId] ?? 'Unknown',
  revenue: Number(s._sum.totalAmount ?? 0),
}));
```

### Expense Log Action with Approval Routing
```typescript
// Source: pattern from /src/app/actions/operator-orders.ts confirmOrder
export async function logExpense(prevState: LogExpenseFormState, formData: FormData) {
  const session = await verifySession();
  // 1. Validate
  // 2. Upload receipt if present
  // 3. Lookup threshold
  const thresholds = await db.approvalThreshold.findMany({ orderBy: { minAmount: 'asc' } });
  const match = thresholds.find(t => {
    const min = Number(t.minAmount);
    const max = t.maxAmount !== null ? Number(t.maxAmount) : Infinity;
    return amount >= min && amount <= max;
  });
  let approvalStatus = 'auto_approved';
  if (match?.approvalType === 'single_member') approvalStatus = 'pending_single';
  if (match?.approvalType === 'dual_member') approvalStatus = 'pending_dual';
  if (match?.approvalType === 'dual_bank') approvalStatus = 'pending_bank';
  // 4. Create expense
  await db.expense.create({ data: { ..., approvalStatus, createdById: session.userId } });
  revalidatePath('/dashboard/finance/expenses');
}
```

### COGS Per Batch Computation
```typescript
// Source: pattern derived from BatchMaterial/RawMaterial schema
export async function getBatchCOGS(batchId: string) {
  const batch = await db.batch.findUnique({
    where: { id: batchId },
    include: {
      materials: { include: { rawMaterial: true } },
    },
  });
  if (!batch) return null;

  const materialsCost = batch.materials.reduce((sum, bm) => {
    const costPerUnit = Number(bm.rawMaterial.costPerUnit ?? 0);
    return sum + Number(bm.quantityUsed) * costPerUnit;
  }, 0);

  const laborCost = Number(batch.laborCostTotal ?? 0);
  const overheadCost = Number(batch.overheadCostTotal ?? 0);
  const totalCOGS = materialsCost + laborCost + overheadCost;
  const cogsPerUnit = batch.totalUnits > 0 ? totalCOGS / batch.totalUnits : 0;

  return { batchId, materialsCost, laborCost, overheadCost, totalCOGS, cogsPerUnit, totalUnits: batch.totalUnits };
}
```

### Budget vs Actual Query
```typescript
// Budget model uses period string "YYYY-MM" for simple indexing
const budgets = await db.budget.findMany({ where: { period: '2026-03' } });
const actuals = await db.expense.groupBy({
  by: ['category'],
  where: {
    expenseDate: { gte: startOfMonth, lte: endOfMonth },
    approvalStatus: { in: ['auto_approved', 'approved'] },
  },
  _sum: { amount: true },
});
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Custom chart SVG | recharts via shadcn/ui `chart` component | Responsive, accessible, uses Tailwind CSS var colors |
| Store files in DB as base64 | `@vercel/blob` URL reference | Clean separation of binary data from relational data |
| useFormState (React 18) | useActionState (React 19) | Already in use — `useActionState` is correct for this codebase |

**Deprecated/outdated patterns:**
- `useFormState` from `react-dom`: replaced by `useActionState` from `react` — already correct in codebase
- Prisma `Decimal` passed directly to client: must always use `Number()` coercion — already established pattern

---

## Financial Report Structure

### P&L Report (FIN-07) — Data Shape

```typescript
type PnLReport = {
  period: string;           // "March 2026" or "Q1 2026"
  revenue: {
    byChannel: { channel: string; amount: number }[];
    total: number;
  };
  cogs: {
    byBatch: { batchCode: string; amount: number }[];
    total: number;
  };
  grossProfit: number;
  grossMarginPct: number;
  operatingExpenses: {
    byCategory: { category: string; amount: number }[];
    total: number;
  };
  netIncome: number;
  netMarginPct: number;
};
```

### Cash Flow Statement (FIN-08) — Data Shape

```typescript
type CashFlowStatement = {
  period: string;
  operating: {
    inflows: { description: string; amount: number }[];   // InvoicePayments + cash Sales
    outflows: { description: string; amount: number }[];  // approved Expenses
    netOperating: number;
  };
  investing: { items: []; netInvesting: 0 };  // Phase 6: static (no capex tracking)
  financing: { items: []; netFinancing: 0 };  // Phase 6: static (no debt tracking)
  netChange: number;
  openingBalance: number | null;   // User-entered or null
  closingBalance: number | null;
};
```

### 90-Day Cash Flow Projection (FIN-09) — Computation

```typescript
// Simple linear model:
// 1. Average daily revenue = last 30 days total revenue / 30
// 2. Project daily revenue * 90 days forward (each 7-day bucket for chart)
// 3. Add outstanding invoices by due date (known future inflows)
// 4. Subtract recurring expenses at historical average
```

---

## Open Questions

1. **Receipt storage: Vercel Blob setup status unknown**
   - What we know: `@vercel/blob` package is the correct choice, `BLOB_READ_WRITE_TOKEN` env var is required
   - What's unclear: Whether the Vercel project has a Blob store already created
   - Recommendation: First task in the expense subtask should include Vercel Blob setup verification. If not set up, include setup step. Fall back to `receiptUrl = null` with a UI note during local dev.

2. **RawMaterial.costPerUnit — no existing data**
   - What we know: Field doesn't exist yet; must be added via migration
   - What's unclear: Whether existing raw material records have accurate cost data available to enter
   - Recommendation: Add nullable `costPerUnit Decimal?` field. UI for batch COGS should show "cost data missing" badge when null, rather than blocking COGS display entirely.

3. **Opening cash balance for Cash Flow Statement**
   - What we know: We have no `BankAccount` or `OpeningBalance` model
   - What's unclear: Whether an opening balance concept is needed or if net change is sufficient
   - Recommendation: Add a simple `openingBalance Decimal?` field to a new `FinancialSettings` singleton table (or accept null and show net change only). Keep scope minimal.

4. **Budget entry UX**
   - What we know: `Budget` model has period (YYYY-MM) and category; budget amounts are manually entered
   - What's unclear: Whether there is existing budget data to load or if this is built from scratch in Phase 6
   - Recommendation: Build a simple budget entry form per category per month. Default all to $0. Users enter budgets manually.

---

## Sources

### Primary (HIGH confidence)
- Source files read directly: `schema.prisma`, `actions/invoices.ts`, `actions/sales.ts`, `actions/operator-orders.ts`, `actions/financial-reports.ts` (non-existent, confirmed absence), `components/finance/FinanceDashboardClient.tsx`, `prisma/seed.ts`
- `package.json` — confirmed all installed dependencies and versions
- `src/components/ui/` directory — confirmed chart component NOT installed

### Secondary (MEDIUM confidence)
- [shadcn/ui chart docs](https://ui.shadcn.com/docs/components/chart) — confirmed recharts is the underlying library, ChartContainer API verified
- [Vercel Blob server upload docs](https://vercel.com/docs/vercel-blob/server-upload) — confirmed `put()` API, 4.5MB limit, `BLOB_READ_WRITE_TOKEN` requirement

### Tertiary (LOW confidence)
- WebSearch: recharts + shadcn App Router 2025 — consistent with official docs, elevated to MEDIUM
- WebSearch: Vercel Blob free tier limits — specific GB limits not confirmed, 4.5MB body limit confirmed by official Vercel limits page

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all verified by reading source files; new deps confirmed by official docs
- Architecture: HIGH — follows established patterns proven in phases 1-5; no new patterns invented
- Schema changes: HIGH — gaps identified by direct schema inspection
- Pitfalls: HIGH — revenue double-counting and Decimal serialization confirmed by existing code reading; COGS gap confirmed by schema inspection
- Financial calculation logic: MEDIUM — pure TS arithmetic, straightforward, but P&L/cash flow correctness depends on correct DB queries (verify with spot tests)

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable stack; Vercel Blob and recharts APIs are stable)
