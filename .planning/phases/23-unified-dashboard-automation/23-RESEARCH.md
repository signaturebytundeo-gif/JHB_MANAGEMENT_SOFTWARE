# Phase 23: Unified Dashboard + Automation - Research

**Researched:** 2026-04-01
**Domain:** Next.js App Router dashboard aggregation + Vercel Cron Jobs
**Confidence:** HIGH

## Summary

The codebase already has all the raw material needed for this phase. Revenue-by-channel data
exists in `getRevenueByChannel` (financial-reports.ts), unified KPIs exist in
`getDashboardKPIs` (dashboard-kpis.ts), and all three marketplace syncs are implemented in
`marketplace-sync.ts`. The work is primarily **wiring** — adding channel KPI cards to the
dashboard page, extending the `getRevenueByChannel` function to also return order counts per
channel, and creating cron API routes that invoke the sync logic without requiring a user
session.

The most important architectural constraint discovered: the existing `syncAmazonOrders`,
`syncEtsyOrders`, and `syncSquarePayments` server actions call `verifyManagerOrAbove()`, which
requires a cookie-based session. Cron jobs cannot pass cookies. The cron route handlers MUST
call internal sync logic functions directly (bypassing session checks) rather than delegating
to the existing server actions.

The second most important constraint: on a Vercel **Hobby** plan, cron jobs can only run **once
per day**. The schedule `0 2 * * *` (2am UTC) is appropriate. On Hobby, timing precision is
±59 minutes — the job will run between 2:00am and 2:59am UTC. Upgrading to Pro unlocks
per-minute scheduling and 800s function timeout.

**Primary recommendation:** Create cron-safe internal sync functions that accept `null`
userId, then register three separate cron routes secured by `CRON_SECRET`. Add a
`getUnifiedChannelStats` server action for the dashboard channel comparison widget.

---

## Standard Stack

### Core (already in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | ^16.1.6 | Route handlers for cron endpoints | Already in use; `export const maxDuration` works natively |
| Recharts | ^2.15.4 | Channel comparison bar chart | Already in use — `RevenueByChannelChart` is the pattern to follow |
| Prisma | ^7.4.0 | DB queries for aggregation | Already in use |
| date-fns | ^4.1.0 | Date range helpers | Already in use |

### Vercel Platform Constraints

| Feature | Hobby Plan | Pro Plan |
|---------|-----------|---------|
| Cron frequency | Once per day | Once per minute |
| Cron timing precision | ±59 min | Per-minute |
| Function max duration | 300s | 800s |
| Max cron jobs per project | 100 | 100 |

**Source:** https://vercel.com/docs/cron-jobs/usage-and-pricing (verified 2026-04-01)

### No New Libraries Needed

All required dependencies are already installed. No `npm install` step required for this phase.

---

## Architecture Patterns

### Recommended File Structure

```
apps/command-center/
├── src/app/api/cron/
│   ├── sync-square/route.ts     # GET handler, secured by CRON_SECRET
│   ├── sync-amazon/route.ts     # GET handler, secured by CRON_SECRET
│   └── sync-etsy/route.ts       # GET handler, secured by CRON_SECRET
├── src/app/actions/
│   ├── dashboard-kpis.ts        # ADD: marketplace KPI totals to getDashboardKPIs
│   └── channel-stats.ts         # NEW: getUnifiedChannelStats() for channel comparison
├── src/lib/integrations/
│   └── sync-internal.ts         # NEW: cron-safe sync functions (no session check)
└── src/app/(dashboard)/dashboard/
    └── page.tsx                 # UPDATE: add channel comparison section
vercel.json                      # UPDATE: add crons config
.env.local / Vercel env vars     # ADD: CRON_SECRET
```

### Pattern 1: Cron-Safe Internal Sync Function

**What:** Extract sync logic from server actions into functions that accept `userId: string | null`.
**When to use:** Any sync function that must run from both a user action AND a cron job.

```typescript
// src/lib/integrations/sync-internal.ts
// Source: pattern derived from existing marketplace-sync.ts structure

import { db } from '@/lib/db';
import { getRecentSquarePayments } from './square';
import { getRecentAmazonOrders } from './amazon';
import { getRecentEtsyOrders } from './etsy';
import type { SyncResult } from '@/app/actions/marketplace-sync';

// Helper: no session check, accepts null userId for cron invocations
async function getLastSuccessfulSyncDate(platform: 'SQUARE' | 'AMAZON' | 'ETSY'): Promise<Date> {
  const lastSync = await db.marketplaceSync.findFirst({
    where: { platform, status: { in: ['SUCCESS', 'PARTIAL'] } },
    orderBy: { startedAt: 'desc' },
  });
  return lastSync?.startedAt ?? new Date('2010-01-01');
}

export async function runSquareSyncInternal(userId: string | null): Promise<SyncResult> {
  const syncRecord = await db.marketplaceSync.create({
    data: { platform: 'SQUARE', status: 'RUNNING', triggeredById: userId },
  });
  try {
    // ... sync logic (same as syncSquarePayments but no verifyManagerOrAbove())
  } catch (error: any) {
    await db.marketplaceSync.update({
      where: { id: syncRecord.id },
      data: { status: 'FAILED', completedAt: new Date(), errorMessage: error.message },
    });
    return { success: false, message: error.message, recordsFound: 0, recordsCreated: 0, recordsSkipped: 0 };
  }
}
```

### Pattern 2: Vercel Cron Route Handler with CRON_SECRET

**What:** Next.js App Router route handler that verifies `CRON_SECRET` before running sync.
**When to use:** Every cron endpoint.

```typescript
// src/app/api/cron/sync-amazon/route.ts
// Source: https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs

import type { NextRequest } from 'next/server';
import { runAmazonSyncInternal } from '@/lib/integrations/sync-internal';

export const maxDuration = 300; // 300s = Hobby plan max; upgrade to 800 on Pro

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const result = await runAmazonSyncInternal(null);
    return Response.json({ ok: true, result });
  } catch (error: any) {
    console.error('[cron/sync-amazon] Error:', error.message);
    // Return 200 so Vercel doesn't flag as failed — failure is logged in MarketplaceSync
    return Response.json({ ok: false, error: error.message }, { status: 200 });
  }
}
```

**Why return 200 on catch:** Vercel does not retry failed cron invocations. Return 200 with an
`ok: false` body so the job completes. Log the error to `MarketplaceSync` table for visibility.

### Pattern 3: vercel.json Cron Registration

**What:** Declare cron jobs in `vercel.json` — one entry per marketplace.
**When to use:** Each sync needs its own cron path for independent failure isolation.

```json
// vercel.json — add to existing config
// Source: https://vercel.com/docs/cron-jobs (verified 2026-04-01)
{
  "installCommand": "npm install --install-strategy=nested",
  "buildCommand": "npx prisma generate && npx next build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "crons": [
    {
      "path": "/api/cron/sync-square",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/sync-amazon",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/sync-etsy",
      "schedule": "0 4 * * *"
    }
  ]
}
```

**Why staggered times:** Spreads load, avoids concurrent DB writes, respects Amazon's 1 req/min
rate limit by not layering Amazon on top of other active syncs.

**Hobby plan note:** Expressions like `0 2 * * *` pass validation (once per day). If you try
`0 */6 * * *` (every 6 hours), deployment will fail with:
*"Hobby accounts are limited to daily cron jobs."*

### Pattern 4: Unified Channel Stats Server Action

**What:** New server action that returns per-channel revenue AND order count for MTD period.
**When to use:** Dashboard channel comparison widget.

The `getRevenueByChannel` function in `financial-reports.ts` groups by day. For the dashboard,
we need MTD totals. A new function `getUnifiedChannelStats` should:

1. Query `db.sale.groupBy(['channelId'])` for MTD — captures Square (Farmers Market)
2. Query `db.order.groupBy(['channelId'])` for MTD — captures operator orders
3. Query `db.websiteOrder.groupBy(['source'])` for MTD — captures Website, Amazon, Etsy
4. Merge into a `{ channel, revenue, orderCount }[]` structure

This follows the exact merge pattern in `getRevenueByChannel` but uses `startOfMonth` /
`endOfMonth` range and also tracks `_count`.

```typescript
// src/app/actions/channel-stats.ts
// Pattern follows getRevenueByChannel in financial-reports.ts

export type ChannelStatItem = {
  channel: string;
  revenue: number;
  orderCount: number;
};

export async function getUnifiedChannelStats(): Promise<ChannelStatItem[]> {
  await verifySession();
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  // ... groupBy Sale + Order + WebsiteOrder with _count and _sum
}
```

### Anti-Patterns to Avoid

- **Calling server actions from cron routes:** `syncAmazonOrders()` calls `verifyManagerOrAbove()` which calls `cookies()`. Calling this from a Route Handler without a session will throw `redirect('/login')` and terminate silently with a 3xx. Cron jobs do not follow redirects.
- **One combined cron for all three marketplaces:** If Amazon times out, Square and Etsy never run. Keep each marketplace on its own cron path.
- **Awaiting all three syncs in sequence in one handler:** At 500ms per Amazon order item page + 10 pages max, Amazon alone can take 5-10+ seconds. Separate routes prevent cascading timeouts.
- **Adding `revalidatePath` inside cron route handlers:** Cron routes run as background jobs; `revalidatePath` only affects the current request context and is a no-op here. Omit it from cron variants.
- **`export const dynamic = 'force-dynamic'` on cron routes:** Not needed; GET handlers that read headers are already dynamic by default.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cron authentication | Custom token system | `CRON_SECRET` env var + `Authorization: Bearer` header | Vercel sends the header automatically; one env var to manage |
| Cron scheduling | External scheduler (cron.io, etc.) | `vercel.json` `"crons"` array | Native platform feature, zero infra cost |
| Duplicate-run prevention | Redis lock | Already handled — `db.sale` dedup via `referenceNumber`, `websiteOrder` dedup via P2002 unique constraint | Existing code is already idempotent |
| Channel chart | Custom D3 chart | Recharts `BarChart` via existing `RevenueByChannelChart.tsx` | Already built, matches design system |
| Marketplace totals | New DB tables | Existing `WebsiteOrder.source` enum (AMAZON, ETSY, WEBSITE) + `Sale.channelId` | Data is already partitioned correctly |

**Key insight:** This phase is 90% plumbing. The data exists; the charts exist; the sync logic
exists. The gap is: (a) the session wall blocking cron access, (b) the missing channel
comparison widget on the dashboard page, and (c) missing `vercel.json` cron declarations.

---

## Common Pitfalls

### Pitfall 1: Cron Route Redirects Silently on Auth Failure

**What goes wrong:** If a cron route calls any function that invokes `verifySession()` or
`verifyManagerOrAbove()`, and no session cookie is present, Next.js redirects to `/login`.
Vercel logs this as a 3xx completion — no error, no retry, sync never ran.

**Why it happens:** Server actions with `verifySession()` are designed for browser clients.
Cron routes are server-to-server with no cookie jar.

**How to avoid:** Extract sync logic into internal functions at `src/lib/integrations/sync-internal.ts`
that do NOT call DAL session functions. The cron Route Handler authenticates via `CRON_SECRET`
header instead.

**Warning signs:** MarketplaceSync table shows no new `RUNNING` records after cron was expected
to fire; Vercel cron logs show 302 responses.

### Pitfall 2: Amazon Rate Limit Inside Vercel 300s Timeout

**What goes wrong:** Amazon SP-API has a 1 req/min rate limit on the Orders endpoint. The
existing `getRecentAmazonOrders` already applies a 500ms delay between order item calls and
a 1000ms delay between pages (see `PAGE_DELAY_MS = 1000` in `amazon.ts`). With 10 pages max
and a 1s delay between pages, the paginated fetch alone can take ~10 seconds before any
individual item calls. On a historical sync (first run), this can exceed 300s.

**Why it happens:** Amazon requires sequential pagination. Each page call + all item calls for
orders on that page + 1s inter-page delay accumulates.

**How to avoid:** The success criteria specifies "cursor-based micro-batching." Implement this:
  - Store the `NextToken` (pagination cursor) in the `MarketplaceSync.errorDetails` field
    (or a dedicated column) as a JSON checkpoint
  - Each cron invocation processes one page (one batch), saves the cursor, and exits
  - On the next daily cron, resume from the cursor
  - This keeps each invocation well under 30s

**Warning signs:** Amazon cron logs show 504 timeout; `MarketplaceSync` record stays in
`RUNNING` status with no `completedAt`.

### Pitfall 3: Hobby Plan Cron Frequency Lock-In

**What goes wrong:** Developer writes `0 */6 * * *` (every 6 hours) in `vercel.json` and
deployment fails with: *"Hobby accounts are limited to daily cron jobs."*

**Why it happens:** Vercel validates cron expressions at deploy time on Hobby. Any expression
that would run more than once per 24 hours is rejected.

**How to avoid:** Use `0 H * * *` patterns (once per day). If more frequent syncs are needed,
upgrade to Pro or trigger syncs manually from the UI.

**Warning signs:** `vercel deploy` fails during the build output validation step.

### Pitfall 4: Dashboard KPIs Don't Include Amazon/Etsy Revenue

**What goes wrong:** Current `getDashboardKPIs` adds `todayWebsiteRevenue` from
`db.websiteOrder` which includes WEBSITE, AMAZON, and ETSY sources. So marketplace revenue
IS included in the existing KPIs — but only for "today" and "MTD." The success criteria says
the dashboard should show "total revenue, order count, and inventory — aggregated across
website, Amazon, Etsy, and Square." This is already satisfied for revenue.

However, `inventoryValue` in the current KPIs only tracks JHB production batches. Amazon/Etsy
marketplace listings are not in the batch system. The KPI is correct as-is (local inventory),
just needs a label clarification.

**How to avoid:** Do not rewrite `getDashboardKPIs`. The function is correct. Only extend the
dashboard page to add the channel comparison widget below the existing KPI cards.

**Warning signs:** Double-counting revenue if you add marketplace totals separately AND
`websiteOrder` is already included in `getDashboardKPIs`.

### Pitfall 5: Channel Comparison Missing Square Data

**What goes wrong:** `getRevenueByChannel` queries `db.websiteOrder.groupBy(['source'])` for
Amazon/Etsy/Website and `db.sale.groupBy(['channelId'])` for Sale records. Square payments
are stored as `Sale` records (not `WebsiteOrder`), under the "Farmers Markets" `channelId`.
If the channel comparison widget only queries `WebsiteOrder`, Square revenue is invisible.

**How to avoid:** `getUnifiedChannelStats` must merge `Sale` + `Order` + `WebsiteOrder` data
following the same merge pattern as `getRevenueByChannel` in `financial-reports.ts`.

---

## Code Examples

### Vercel Cron Route Handler (Complete Pattern)

```typescript
// Source: https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
// File: src/app/api/cron/sync-square/route.ts

import type { NextRequest } from 'next/server';
import { runSquareSyncInternal } from '@/lib/integrations/sync-internal';

export const maxDuration = 300; // Hobby max; set to 800 on Pro

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const result = await runSquareSyncInternal(null);
    return Response.json({ ok: true, result });
  } catch (error: any) {
    console.error('[cron/sync-square] Unhandled error:', error.message);
    return Response.json({ ok: false, error: error.message });
  }
}
```

### maxDuration Export for Next.js App Router

```typescript
// Source: https://vercel.com/docs/functions/configuring-functions/duration
// In any Next.js App Router route file:

export const maxDuration = 300; // seconds — Hobby max is 300s, Pro max is 800s
```

### Channel Stats Server Action (Skeleton)

```typescript
// Source: pattern from getRevenueByChannel in financial-reports.ts
// File: src/app/actions/channel-stats.ts
'use server';

import { startOfMonth, endOfMonth } from 'date-fns';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/dal';

export type ChannelStatItem = {
  channel: string;
  revenue: number;
  orderCount: number;
};

export async function getUnifiedChannelStats(): Promise<ChannelStatItem[]> {
  await verifySession();

  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);

  // 1. Sale records grouped by channel (captures Square + other physical channels)
  const saleByChannel = await db.sale.groupBy({
    by: ['channelId'],
    where: { saleDate: { gte: start, lte: end } },
    _sum: { totalAmount: true },
    _count: { id: true },
  });

  // 2. Operator orders grouped by channel
  const orderByChannel = await db.order.groupBy({
    by: ['channelId'],
    where: {
      createdAt: { gte: start, lte: end },
      status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] },
    },
    _sum: { totalAmount: true },
    _count: { id: true },
  });

  // 3. WebsiteOrder grouped by source (AMAZON, ETSY, WEBSITE)
  const websiteBySource = await db.websiteOrder.groupBy({
    by: ['source'],
    where: {
      orderDate: { gte: start, lte: end },
      status: { not: 'CANCELLED' },
    },
    _sum: { orderTotal: true },
    _count: { id: true },
  });

  const channels = await db.salesChannel.findMany({ select: { id: true, name: true } });
  const channelMap = new Map(channels.map((c) => [c.id, c.name]));

  const statMap = new Map<string, ChannelStatItem>();

  // Merge Sale records
  for (const row of saleByChannel) {
    const key = row.channelId;
    const existing = statMap.get(key) ?? { channel: channelMap.get(key) ?? key, revenue: 0, orderCount: 0 };
    existing.revenue += Number(row._sum.totalAmount ?? 0);
    existing.orderCount += row._count.id;
    statMap.set(key, existing);
  }

  // Merge Operator orders
  for (const row of orderByChannel) {
    const key = row.channelId;
    const existing = statMap.get(key) ?? { channel: channelMap.get(key) ?? key, revenue: 0, orderCount: 0 };
    existing.revenue += Number(row._sum.totalAmount ?? 0);
    existing.orderCount += row._count.id;
    statMap.set(key, existing);
  }

  // Merge WebsiteOrder (use source as display name)
  const sourceNames: Record<string, string> = { WEBSITE: 'Website (DTC)', AMAZON: 'Amazon', ETSY: 'Etsy' };
  for (const row of websiteBySource) {
    const channelName = sourceNames[row.source] ?? row.source;
    const existing = statMap.get(channelName) ?? { channel: channelName, revenue: 0, orderCount: 0 };
    existing.revenue += Number(row._sum.orderTotal ?? 0);
    existing.orderCount += row._count.id;
    statMap.set(channelName, existing);
  }

  return Array.from(statMap.values()).sort((a, b) => b.revenue - a.revenue);
}
```

### Dashboard Page Extension

```tsx
// Source: existing pattern from dashboard/page.tsx
// Add below the existing KPI Cards section:

import { getUnifiedChannelStats } from '@/app/actions/channel-stats';
import { ChannelComparisonWidget } from '@/components/dashboard/ChannelComparisonWidget';

async function ChannelStats() {
  const stats = await getUnifiedChannelStats();
  return <ChannelComparisonWidget data={stats} />;
}

// In DashboardPage JSX (ADMIN/MANAGER only):
{(user.role === 'ADMIN' || user.role === 'MANAGER') && (
  <div>
    <h2 className="text-lg font-semibold mb-4">Channel Performance (MTD)</h2>
    <Suspense fallback={<DashboardSkeleton />}>
      <ChannelStats />
    </Suspense>
  </div>
)}
```

---

## State of the Art

| Old Approach | Current Approach | Impact for This Phase |
|--------------|------------------|----------------------|
| Vercel functions timeout at 10s (old docs) | Hobby: 300s max, Pro: 800s max (fluid compute) | Amazon sync is safe within 300s for typical order volumes |
| Manual sync triggers only | Vercel Cron Jobs (built-in) | Zero external scheduler needed |
| Cron job security via IP allowlist | `CRON_SECRET` env var + Bearer header | Simpler, no IP management |
| Server actions as cron targets | Route Handlers as cron targets | Server actions require session context; Route Handlers don't |

**Important correction to phase briefing:** The briefing states "Vercel function timeout 10s (Hobby)." This is outdated. As of fluid compute (now default), Hobby functions have a 300s (5 minute) maximum duration. The Amazon micro-batching requirement is still valid as a robustness measure (especially for historical syncs), but the 10s constraint is no longer accurate.

**Source:** https://vercel.com/docs/functions/configuring-functions/duration (verified 2026-04-01)

---

## Open Questions

1. **Amazon cursor-based micro-batching storage**
   - What we know: `MarketplaceSync.errorDetails` is a `String?` JSON field already used for unmatched items. The `MarketplaceSync` model has `triggeredById String?` (nullable).
   - What's unclear: Should the cursor be stored in `errorDetails` (overloads its meaning) or in a new `MarketplaceSync.cursorData String?` column? Adding a column requires a Prisma migration.
   - Recommendation: For Phase 23, store cursor in a new `cursorData String?` column. Add migration as Task 1. This keeps `errorDetails` semantically correct.

2. **Cron run identity in MarketplaceSync table**
   - What we know: `triggeredById String?` is nullable — cron can pass `null`.
   - What's unclear: Should the UI show "CRON" vs a user name in the sync history table?
   - Recommendation: Pass `null` for `triggeredById`. Update `SyncHistoryTable.tsx` to display "Automated" when `triggeredBy` is null.

3. **`revalidatePath` in cron context**
   - What we know: `revalidatePath` is a Next.js server-side cache invalidation function. It's called in the existing sync server actions.
   - What's unclear: Does calling `revalidatePath` inside a Route Handler during a cron invocation have any effect on Incremental Static Regeneration (ISR)?
   - Recommendation: Omit `revalidatePath` from cron route handlers. The dashboard uses server components fetched on-demand (not cached), so ISR invalidation is irrelevant here.

---

## Sources

### Primary (HIGH confidence)
- https://vercel.com/docs/cron-jobs — cron job overview, configuration format, `vercel.json` schema
- https://vercel.com/docs/cron-jobs/usage-and-pricing — Hobby once-per-day limit, Pro per-minute, timing precision table
- https://vercel.com/docs/cron-jobs/manage-cron-jobs — `CRON_SECRET` mechanism, securing endpoints, duration limits, idempotency requirements
- https://vercel.com/docs/functions/configuring-functions/duration — `maxDuration` export syntax, 300s Hobby / 800s Pro limits (fluid compute, verified 2026-04-01)
- `/apps/command-center/src/app/actions/marketplace-sync.ts` — existing sync logic, auth pattern, MarketplaceSync DB calls
- `/apps/command-center/src/app/actions/dashboard-kpis.ts` — existing KPI aggregation, confirms WebsiteOrder (AMAZON/ETSY/WEBSITE) already included
- `/apps/command-center/src/app/actions/financial-reports.ts` — `getRevenueByChannel` merge pattern to follow
- `/apps/command-center/src/lib/dal.ts` — confirms `verifyManagerOrAbove` requires cookie session (blocking for cron)
- `/apps/command-center/prisma/schema.prisma` — confirms `MarketplaceSync.triggeredById` is `String?` (nullable, cron can pass null)
- `/apps/command-center/src/lib/integrations/amazon.ts` — confirms `PAGE_DELAY_MS = 1000`, `MAX_PAGES = 10`, sequential pagination

### Secondary (MEDIUM confidence)
- Vercel cron job behavior: "Vercel will not retry an invocation if a cron job fails" — from official docs, MEDIUM because retry behavior could change
- Amazon SP-API `getOrders` endpoint rate limit "1 req/min" — stated in phase briefing, consistent with documented SP-API limits; not independently re-verified in this session

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in the project, no new dependencies
- Architecture: HIGH — patterns verified against official Vercel docs and existing codebase
- Pitfalls: HIGH — session/cookie blocker verified by reading `dal.ts` directly; timeout limits from official docs
- Amazon micro-batching design: MEDIUM — cursor storage approach is a design recommendation, not pulled from official docs

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (Vercel platform constraints; stable for 30 days)
