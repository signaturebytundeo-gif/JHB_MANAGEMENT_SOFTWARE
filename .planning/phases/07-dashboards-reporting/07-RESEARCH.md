# Phase 7: Dashboards & Reporting - Research

**Researched:** 2026-03-12
**Domain:** Dashboard KPIs, investor portal, operational reports, export (CSV/PDF/Excel), configurable alerts
**Confidence:** HIGH

---

## Summary

Phase 7 wires up the already-scaffolded dashboard and investor portal pages with real data, adds pre-built operational reports, multi-format export (CSV, PDF, Excel), and configurable alert emails. The foundation is strong: recharts + shadcn/ui `ChartContainer` are already installed and in active use across Phase 6 finance components. The executive dashboard page already renders KPI cards for Today's Revenue, MTD Revenue, Units Produced, Open Orders, and Accounts Receivable — all backed by live server actions (`getSalesMetrics`, `getOrderMetrics`, `getProductionMetrics`). The investor portal page is scaffolded but shows placeholder "Coming in Phase X" values.

The biggest net-new technical work is: (1) writing the report data-fetching actions for the seven pre-built reports, (2) implementing multi-format export (CSV is trivial client-side, PDF via `window.print()` is simplest for App Router, Excel via `exceljs` in a Route Handler), (3) wiring the investor dashboard to live data with recharts charts, and (4) implementing alert emails via the existing Resend client. The quick action buttons on the executive dashboard just need `enabled: true` and valid `href` values — the UI already exists.

There is no schema migration needed for this phase. All data models (`Sale`, `Order`, `Batch`, `InventoryTransaction`, `Expense`, `Invoice`, `SubscriptionMember`, `SubscriptionPlan`) already exist and are queryable. The `getOrderMetrics()` function only counts `WebsiteOrder` records (not operator `Order` records) for the Open Orders KPI — this is a data gap the planner should flag and fix.

**Primary recommendation:** Use `window.print()` with a print-only CSS class for PDF export (no new dependencies), `exceljs` via a Next.js Route Handler for Excel (avoids the SheetJS/npm vulnerability), and raw JS Blob construction for CSV (pattern already established in `CSVExportButton.tsx`).

---

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^2.15.4 | Chart rendering | Already installed, Phase 6 finance charts use it |
| shadcn/ui ChartContainer | installed | Wraps recharts with theme tokens | Already in `src/components/ui/chart.tsx` |
| next-themes | ^0.4.6 | Dark mode toggle | Already installed, ThemeProvider already wraps app |
| date-fns | ^4.1.0 | Date ranges for report periods | Already installed, used in financial-reports.ts |
| lucide-react | ^0.564.0 | Icons for quick actions and buttons | Already installed |
| resend | ^6.9.2 | Alert notification emails | Already installed, client pattern established |

### New Dependencies Needed
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| exceljs | ^4.4.0 | Server-side Excel (.xlsx) generation | RPT-08 Excel export only |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| exceljs | SheetJS/xlsx | SheetJS npm package is unmaintained and has high-severity CVE; use exceljs or install SheetJS from cdn.sheetjs.com as tarball |
| exceljs | jsPDF + html2canvas | jsPDF is for PDF, not Excel; no benefit here |
| window.print() | jsPDF | window.print() requires zero new dependencies and preserves full CSS/Tailwind styling; jsPDF ignores flex/grid/web fonts without html2canvas rasterization workaround |

**Installation:**
```bash
npm install exceljs --save
# Install into apps/command-center, not monorepo root
cd apps/command-center && npm install exceljs
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── actions/
│   │   ├── dashboard-kpis.ts       # NEW: combined KPI fetch for executive dash
│   │   ├── reports.ts              # NEW: all 7 pre-built report data functions
│   │   └── alerts.ts               # NEW: alert threshold check + Resend trigger
│   ├── api/
│   │   └── export/
│   │       └── excel/
│   │           └── route.ts        # NEW: Route Handler for Excel download
│   └── (dashboard)/dashboard/
│       ├── page.tsx                # MODIFY: wire DASH-01 to DASH-07
│       ├── reports/
│       │   └── page.tsx            # MODIFY: redirect → new reports hub
│       ├── investor/
│       │   └── page.tsx            # MODIFY: wire INVST-01 to INVST-07
│       └── alerts/
│           └── page.tsx            # NEW: alert configuration page
└── components/
    ├── dashboard/
    │   ├── KPICard.tsx             # EXISTS: supports trend prop
    │   ├── MTDRevenueVsTarget.tsx  # NEW: progress bar + target delta
    │   └── ARAgingWidget.tsx       # NEW: inline overdue highlighting
    ├── investor/
    │   ├── RevenueTrendChart.tsx   # NEW: Line chart, recharts
    │   ├── ChannelPieChart.tsx     # NEW: PieChart, recharts
    │   ├── CapacityGauge.tsx       # NEW: reuse CapacityMetrics pattern
    │   └── OwnershipTable.tsx      # NEW: static equity table (already in page)
    ├── reports/
    │   ├── ReportSelector.tsx      # NEW: 7-report picker UI
    │   ├── ReportTable.tsx         # NEW: generic data table for report output
    │   └── ExportButtons.tsx       # NEW: CSV / PDF / Excel export row
    └── alerts/
        └── AlertConfigForm.tsx     # NEW: threshold config UI
```

### Pattern 1: Server Component Data Fetching for KPI Pages
**What:** Each dashboard section is an async Server Component that fetches its own data, wrapped in `<Suspense>` for streaming.
**When to use:** All KPI cards, investor metrics sections.
**Example:**
```typescript
// Source: established pattern in src/app/(dashboard)/dashboard/page.tsx
async function KPICards({ role }: { role: string }) {
  const [productionMetrics, salesMetrics, orderMetrics] = await Promise.all([
    getProductionMetrics(),
    getSalesMetrics(),
    getOrderMetrics(),
  ]);
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-6">...</div>;
}

// In page:
<Suspense fallback={<DashboardSkeleton />}>
  <KPICards role={user.role} />
</Suspense>
```

### Pattern 2: Client Component Chart with Server-Fetched Data (prop drilling)
**What:** Page is a Server Component that fetches data and passes it as props to a `'use client'` chart component.
**When to use:** All recharts components (recharts requires browser DOM).
**Example:**
```typescript
// Source: established pattern in src/components/finance/RevenueVsProjectionChart.tsx
'use client';
import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

const chartConfig: ChartConfig = {
  revenue: { label: 'Revenue', color: 'hsl(var(--chart-1))' },
};

export function RevenueTrendChart({ data }: { data: MonthlyRevenueTrendItem[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-72 w-full">
      <BarChart data={data}>...</BarChart>
    </ChartContainer>
  );
}
```

### Pattern 3: CSV Export via Client-Side Blob
**What:** Pure client-side, no API route, constructs CSV string → Blob → anchor click.
**When to use:** All CSV exports (RPT-08).
**Example:**
```typescript
// Source: established pattern in src/components/inventory/CSVExportButton.tsx
const csvContent = [
  headers.join(','),
  ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
].join('\n');
const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = `report-name-${new Date().toISOString().split('T')[0]}.csv`;
link.click();
URL.revokeObjectURL(url);
```

### Pattern 4: PDF Export via window.print()
**What:** Add a `print:` Tailwind class to hide non-report UI, then call `window.print()`. Browser renders the page as PDF.
**When to use:** RPT-08 PDF export, INVST-07 investor dashboard PDF.
**Example:**
```typescript
// Client component button:
'use client';
export function PrintButton({ label }: { label: string }) {
  return (
    <button onClick={() => window.print()} className="print:hidden">
      {label}
    </button>
  );
}
// Page layout wraps printable content:
<div className="print:block">
  {/* all report content */}
</div>
<div className="print:hidden">
  {/* nav, sidebar, export buttons */}
</div>
```
Tailwind CSS v4 supports `print:` variants natively. No new dependencies.

### Pattern 5: Excel Export via Next.js Route Handler + exceljs
**What:** GET `/api/export/excel?report=daily-sales&date=2026-03` → server generates workbook → streams as .xlsx.
**When to use:** RPT-08 Excel export.
**Example:**
```typescript
// Source: exceljs docs pattern
// src/app/api/export/excel/route.ts
import ExcelJS from 'exceljs';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const report = searchParams.get('report');

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Report');
  sheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Channel', key: 'channel', width: 20 },
    { header: 'Revenue', key: 'revenue', width: 15 },
  ];
  // ... add rows from DB query

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${report}-${Date.now()}.xlsx"`,
    },
  });
}
```

### Pattern 6: Alert Emails via Resend in Server Action
**What:** A scheduled check (or on-demand trigger) calls Resend to notify admins.
**When to use:** RPT-09 configurable alerts.
**Example:**
```typescript
// Source: established Resend pattern in src/lib/emails/customer-emails.ts
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendLowInventoryAlert(product: string, currentStock: number) {
  await resend.emails.send({
    from: 'Jamaica House Brand <alerts@jamaicahousebrand.com>',
    to: ['admin@jamaicahousebrand.com'],
    subject: `Low Inventory Alert: ${product}`,
    html: `<p>Current stock: ${currentStock} units</p>`,
  });
}
```
Alerts are triggered as a side effect within existing server actions (e.g., inventory adjustment) or as a dedicated `/api/alerts/check` cron-compatible Route Handler.

### Pattern 7: Dark Mode Toggle for Investor Dashboard
**What:** Use `next-themes` `useTheme()` hook in a `'use client'` button component.
**When to use:** INVST-06.
**Example:**
```typescript
// Source: next-themes is already installed with ThemeProvider in layout
'use client';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

export function DarkModeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? <Sun /> : <Moon />}
    </button>
  );
}
```

### Anti-Patterns to Avoid
- **Using the xlsx npm package:** It is unmaintained since v0.18.5 (npm registry) and carries a high-severity ReDoS CVE. Use exceljs instead.
- **Fetching all data in one god action:** Split report data into individual server actions so each can be cached/revalidated independently.
- **Putting recharts inside Server Components:** recharts requires browser DOM. Always `'use client'` for chart components, pass data as props.
- **Building alert scheduling from scratch:** For Phase 7, trigger alerts as side effects in server actions (on inventory adjustment, invoice overdue). Do NOT implement cron scheduling — that is out of scope.
- **Attempting PDF with jsPDF:** jsPDF ignores Tailwind classes and requires html2canvas rasterization (loses text selectability, adds bundle weight). `window.print()` is zero-dependency and works with existing CSS.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart theming (dark/light) | Custom CSS var injection | shadcn/ui ChartContainer + ChartConfig | Already handles THEMES object with light/dark selectors |
| Progress bar for capacity | Custom SVG gauge | Tailwind CSS div with `style={{ width: X% }}` | Already done in `CapacityMetrics.tsx` — copy pattern |
| CSV download | API route + DB streaming | Client-side Blob construction | Already established in CSVExportButton.tsx |
| Excel generation | Custom XML manipulation | exceljs | Handles cell formatting, column widths, headers |
| PDF layout | jsPDF with html2canvas | window.print() + print: Tailwind variants | Zero deps, preserves styles |
| Dark mode | localStorage + CSS class toggle | next-themes (already installed) | Handles SSR hydration mismatch, system preference |
| Email delivery | SMTP server | Resend (already installed) | API already configured, pattern established |
| Subscription MRR | Custom billing engine | Query SubscriptionMember.plan.price grouped by billingCycle | Data model supports it directly |

**Key insight:** The entire charting and theme stack is already present. The primary work is writing data-fetching queries and connecting them to existing UI patterns — not building new primitives.

---

## Common Pitfalls

### Pitfall 1: Open Orders KPI Gap (DASH-05)
**What goes wrong:** `getOrderMetrics()` only counts `WebsiteOrder` records (status NEW/PROCESSING). Operator `Order` records (the B2B/catering/farmers-market model) with status DRAFT/CONFIRMED are not included in the Open Orders count.
**Why it happens:** `getOrderMetrics` was written for the website orders view in Phase 4 before the operator order system was fully built.
**How to avoid:** Create a new `getDashboardKPIs()` action that queries BOTH `db.websiteOrder` and `db.order` (operator orders), with appropriate status filters for each.
**Warning signs:** Open Orders count appears lower than expected when there are confirmed operator orders in the system.

### Pitfall 2: MTD Revenue vs Target (DASH-02) Needs Target Source
**What goes wrong:** `getSalesMetrics()` returns MTD revenue but has no target to compare against. The progress bar needs a denominator.
**Why it happens:** Revenue targets are not stored in the database (only per-category expense budgets exist in the `Budget` model).
**How to avoid:** Use the same hardcoded projection values already established in `financial-reports.ts` (`getMonthlyProjection(year)` returns $100K/mo for 2026). Reference this function, don't duplicate the constant.
**Warning signs:** DASH-02 shows revenue with no percentage indicator or target bar.

### Pitfall 3: Investor Dashboard Route Handler Access Control
**What goes wrong:** The investor layout at `/dashboard/investor/layout.tsx` only allows ADMIN and INVESTOR roles. This is correct, but the new Excel export route at `/api/export/excel` has no auth by default.
**Why it happens:** Next.js Route Handlers don't inherit middleware/layout auth.
**How to avoid:** Call `verifySession()` at the top of every Route Handler, same as server actions. Return 401 if no session.
**Warning signs:** Anyone with the URL can download report data without authentication.

### Pitfall 4: recharts SSR Hydration Error
**What goes wrong:** If a chart component is rendered as a Server Component (missing `'use client'`), you get a hydration mismatch or a `window is not defined` error at build time.
**Why it happens:** recharts uses browser APIs internally.
**How to avoid:** Every file that imports from `recharts` must have `'use client'` at the top. This pattern is already established in all Phase 6 finance charts.
**Warning signs:** `Error: window is not defined` during `next build`.

### Pitfall 5: Subscription MRR Calculation Logic
**What goes wrong:** MRR (Monthly Recurring Revenue) for annual subscribers needs normalization. A subscriber paying $240/year should contribute $20/month to MRR, not $240.
**Why it happens:** The `SubscriptionPlan.billingCycle` field is either "monthly" or "annual". Annual plan prices must be divided by 12.
**How to avoid:** In the subscription metrics report action, apply: `mrr += billingCycle === 'annual' ? price / 12 : price` for each ACTIVE member.
**Warning signs:** MRR looks unrealistically high when annual subscribers are included.

### Pitfall 6: Farmers Market Channel Identification
**What goes wrong:** RPT-06 (Farmers Market Performance) requires filtering sales by the farmers market channel. There is no `ChannelType.MARKET` filter readily available — channel names are freeform strings in the `SalesChannel` table.
**Why it happens:** Channel identification relies on `SalesChannel.type === 'EVENT'` or name-matching.
**How to avoid:** Query `SalesChannel.findMany({ where: { type: { in: ['EVENT', 'MARKETPLACE'] } } })` to get relevant channel IDs, then filter `Sale` and `Order` by those IDs. Document this assumption in the action.
**Warning signs:** Farmers Market report returns zero rows despite known market sales.

### Pitfall 7: window.print() Prints Entire Page
**What goes wrong:** Calling `window.print()` without CSS isolation prints the sidebar, header, and nav alongside the report.
**Why it happens:** `window.print()` renders the full document DOM.
**How to avoid:** Add `print:hidden` to all layout elements (sidebar, header, quick actions) and ensure the report content itself is NOT marked `print:hidden`. Tailwind CSS v4 supports `@media print` via the `print:` variant.
**Warning signs:** PDF output includes navigation chrome.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### Existing KPI Card (no changes needed)
```typescript
// Source: src/components/dashboard/KPICard.tsx (existing)
<KPICard
  title="MTD Revenue"
  value={`$${mtdRevenue.toFixed(2)}`}
  subtitle={`${utilizationPercent.toFixed(1)}% of $100K target`}
  icon={<TrendingUp className="h-5 w-5" />}
  trend="up"
/>
```

### Progress Bar (copy CapacityMetrics.tsx pattern)
```typescript
// Source: src/components/production/CapacityMetrics.tsx (existing)
<div className="h-2 w-full rounded-full bg-muted overflow-hidden">
  <div
    className={cn('h-full transition-all', getColorClass())}
    style={{ width: `${cappedPercent}%` }}
  />
</div>
```

### ChartConfig for Revenue Trend Line Chart (new, follows existing pattern)
```typescript
// Source: follows pattern in src/components/finance/RevenueVsProjectionChart.tsx
'use client';
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

const chartConfig: ChartConfig = {
  revenue: { label: 'Revenue', color: 'hsl(var(--chart-1))' },
  projection: { label: 'Projection', color: 'hsl(var(--chart-2))' },
};

export function RevenueTrendLineChart({ data }: { data: MonthlyRevenueTrendItem[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-72 w-full">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" />
        <Line type="monotone" dataKey="projection" stroke="var(--color-projection)" strokeDasharray="5 5" />
      </LineChart>
    </ChartContainer>
  );
}
```

### PieChart for Channel Diversification
```typescript
// Source: recharts docs pattern, adapted to existing ChartContainer
'use client';
import { Pie, PieChart, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

export function ChannelPieChart({ data }: { data: { channel: string; revenue: number }[] }) {
  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];
  const config: ChartConfig = Object.fromEntries(
    data.map((d, i) => [d.channel, { label: d.channel, color: COLORS[i % COLORS.length] }])
  );
  return (
    <ChartContainer config={config} className="h-64 w-full">
      <PieChart>
        <Pie data={data} dataKey="revenue" nameKey="channel" cx="50%" cy="50%" outerRadius={80}>
          {data.map((entry, index) => (
            <Cell key={entry.channel} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
      </PieChart>
    </ChartContainer>
  );
}
```

### Subscription MRR Calculation
```typescript
// New action in src/app/actions/reports.ts
export async function getSubscriptionMetrics() {
  await verifySession();
  const members = await db.subscriptionMember.findMany({
    where: { status: 'ACTIVE' },
    include: { plan: { select: { price: true, billingCycle: true } } },
  });

  let mrr = 0;
  let churnCount = 0;

  for (const member of members) {
    const price = Number(member.plan.price);
    mrr += member.plan.billingCycle === 'annual' ? price / 12 : price;
  }

  const cancelled = await db.subscriptionMember.count({ where: { status: 'CANCELLED' } });
  const total = members.length + cancelled;
  const churnRate = total > 0 ? (cancelled / total) * 100 : 0;

  // LTV: average months active * average monthly price
  // Use members with cancelledAt as churn signal
  return { mrr, activeCount: members.length, churnRate, ltv: mrr > 0 ? mrr * 12 : 0 };
}
```

### Excel Route Handler (exceljs)
```typescript
// Source: exceljs npm docs pattern
// src/app/api/export/excel/route.ts
import ExcelJS from 'exceljs';
import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/dal';

export async function GET(req: NextRequest) {
  await verifySession(); // Always auth-gate Route Handlers

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Daily Sales');
  sheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Channel', key: 'channel', width: 25 },
    { header: 'Units', key: 'units', width: 10 },
    { header: 'Revenue', key: 'revenue', width: 15 },
  ];
  // Style header row
  sheet.getRow(1).font = { bold: true };
  // Add data rows from DB query here...

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="report-${Date.now()}.xlsx"`,
    },
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| xlsx/SheetJS npm package | exceljs or SheetJS CDN tarball | SheetJS moved off npm at v0.18.5 (2022) | Must install exceljs or use `npm i https://cdn.sheetjs.com/xlsx-0.20.x/xlsx-0.20.x.tgz` |
| jsPDF for React reports | window.print() + print: CSS | App Router era (2023+) | Zero-dependency PDF from existing Tailwind layout |
| Client-side data fetching (useEffect + fetch) | Server Components + Suspense | Next.js 13+ App Router | Eliminates loading spinners, improves TTFB |

**Deprecated/outdated:**
- `xlsx` (npm): Do not use the npm registry version — it is 2+ years old with a high-severity CVE (CVE-2024-22363, ReDoS). Use `exceljs` instead.
- `react-pdf`: Heavyweight and requires separate layout DSL. Only needed for complex branded PDFs with precise layout. Not warranted for this phase.

---

## Data Model Analysis

### What's Already Available (no new queries needed)
- **Today's Revenue (DASH-01):** `getSalesMetrics().todayRevenue` + `getOrderMetrics().revenueToday` — already on dashboard page
- **MTD Revenue (DASH-02):** `getSalesMetrics().mtdRevenue` + `getOrderMetrics().revenueMTD` — already on dashboard page
- **Units Produced (DASH-03):** `getProductionMetrics().totalUnits`, `.utilizationPercent`, `.target` — already on dashboard page
- **Accounts Receivable (DASH-06):** `getSalesMetrics().accountsReceivable` (NET_30 sales) — already on dashboard page
- **Inventory Value (DASH-04):** `getInventoryAggregation()` returns per-product stock × price — need to aggregate to a dollar total
- **Revenue by Channel (INVST-02):** `getRevenueByChannel(date)` in `financial-reports.ts` — ready to use
- **Monthly Revenue Trend (INVST-01):** `getMonthlyRevenueTrend(year)` in `financial-reports.ts` — ready to use
- **P&L data (RPT-03):** `getPnLReport({year, month})` in `financial-reports.ts` — ready to use
- **Subscription members:** `getSubscriptionMembers()` in `crm-subscriptions.ts` — data available, MRR calculation needed

### What Needs New Queries
- **Open Orders full count (DASH-05):** Needs BOTH `db.websiteOrder` (NEW/PROCESSING) AND `db.order` (DRAFT/CONFIRMED) — `getOrderMetrics` only covers WebsiteOrder
- **Current Inventory Value dollar amount (DASH-04):** `getInventoryAggregation` returns stock levels; need to join with product pricing to get dollar value
- **Daily Sales Summary by channel (RPT-01):** New query — `Sale` + `Order` grouped by channelId for a given date
- **Weekly Production Summary (RPT-02):** New query — `Batch` grouped by week with units, status, QC pass rate
- **Inventory Valuation by location (RPT-04):** New query — `BatchAllocation` + `InventoryMovement` grouped by location, priced by product tier
- **Product Performance (RPT-05):** New query — `Sale` + `OrderLineItem` grouped by productId with revenue and margin
- **Farmers Market Performance (RPT-06):** New query — filter `Sale`/`Order` by channels with `type IN (EVENT, MARKETPLACE)`
- **Subscription Metrics MRR/churn/LTV (RPT-07):** New calculation on existing `SubscriptionMember` data

---

## Open Questions

1. **Inventory Value dollar amount (DASH-04)**
   - What we know: `getInventoryAggregation()` returns units per product/location. Products have `pricingTiers` with wholesale/retail prices.
   - What's unclear: Which price to use? Wholesale cash price is the most conservative. This needs a business decision or should default to lowest `PricingTier.unitPrice`.
   - Recommendation: Default to lowest pricing tier per product (conservative valuation). Document the assumption in the action.

2. **Alert delivery timing (RPT-09)**
   - What we know: Alerts should trigger for low inventory, overdue invoices, QC failures, expense approvals.
   - What's unclear: Is this real-time (side effect in server actions) or batch (daily cron)? Phase 7 has no Vercel Cron setup.
   - Recommendation: Implement as side effects in existing server actions (e.g., inventory adjustment triggers low-stock check, invoice status update triggers overdue alert). No new scheduling infrastructure needed.

3. **Alert threshold configuration storage**
   - What we know: RPT-09 says "configurable alerts" but there is no `AlertConfig` model in the schema.
   - What's unclear: Do thresholds need to be persisted per user, or are they system-wide constants?
   - Recommendation: Start with hardcoded defaults (reorderPoint from Product model for inventory; 7-day overdue threshold for invoices). Add a simple UI to show current thresholds. Full persistence can be Phase 11+ if needed.

4. **Quick action "New Order" target (DASH-07)**
   - What we know: The quick actions already have `enabled: false` with `phase: 6` tooltips. "Record Expense" points to Phase 6 which is now done.
   - What's unclear: "New Order" button — should it link to the operator order form or the website orders list?
   - Recommendation: Link "New Order" to `/dashboard/orders/new` (operator order form, which exists). Link "Record Expense" to `/dashboard/finance/expenses`. Link "Invoice" to `/dashboard/finance/invoices`.

---

## Sources

### Primary (HIGH confidence)
- Codebase inspection — `src/app/actions/financial-reports.ts`, `src/app/actions/sales.ts`, `src/app/actions/orders.ts`, `src/app/actions/production.ts`, `src/app/actions/inventory.ts`, `src/app/actions/crm-subscriptions.ts`
- Codebase inspection — `src/components/finance/RevenueByChannelChart.tsx`, `src/components/finance/RevenueVsProjectionChart.tsx`
- Codebase inspection — `src/components/ui/chart.tsx` (ChartContainer/ChartConfig API)
- Codebase inspection — `src/components/production/CapacityMetrics.tsx` (progress bar pattern)
- Codebase inspection — `src/components/inventory/CSVExportButton.tsx` (CSV export pattern)
- Codebase inspection — `src/components/theme-provider.tsx` (next-themes already installed)
- Codebase inspection — `prisma/schema.prisma` (complete data model)
- Codebase inspection — `package.json` (all installed dependencies)

### Secondary (MEDIUM confidence)
- [SheetJS CDN](https://cdn.sheetjs.com/) — confirmed npm version is unmaintained and vulnerable; CDN tarball install is the recommended alternative
- [exceljs npm](https://www.npmjs.com/package/exceljs) — active maintenance, browser + Node compatible, ExcelJS is standard alternative per multiple sources
- [SheetJS CVE-2024-22363](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9) — confirmed ReDoS vulnerability in xlsx npm package

### Tertiary (LOW confidence)
- WebSearch results on jsPDF + html2canvas patterns — consistent across multiple blog sources but not officially benchmarked against window.print() for this specific use case

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all core libraries verified by reading package.json and component source code
- Architecture patterns: HIGH — all patterns verified against existing codebase patterns
- Data model / queries: HIGH — verified by reading full Prisma schema and existing actions
- Export approach: MEDIUM — exceljs/window.print() recommendations verified via official npm page + SheetJS CVE confirmation; not verified in a live build
- Pitfalls: HIGH for data gaps (verified by code inspection); MEDIUM for exceljs build behavior in Next.js App Router

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable domain — recharts, exceljs, Next.js App Router patterns are stable)
