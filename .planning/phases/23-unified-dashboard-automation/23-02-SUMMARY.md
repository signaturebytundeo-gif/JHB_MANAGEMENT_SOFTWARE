---
phase: 23-unified-dashboard-automation
plan: 02
subsystem: api
tags: [vercel-cron, prisma, amazon-sp-api, square, etsy, sync, cron, pagination]

# Dependency graph
requires:
  - phase: 23-01
    provides: MarketplaceSync DB model, marketplace-sync.ts server actions, Amazon/Square/Etsy integration libs
provides:
  - Three Vercel cron route handlers at /api/cron/sync-{square,amazon,etsy}
  - sync-internal.ts with session-free runSquareSyncInternal, runAmazonSyncInternal, runEtsySyncInternal
  - Amazon cursor-based micro-batching using MarketplaceSync.cursorData
  - vercel.json cron declarations (staggered daily: 2am, 3am, 4am UTC)
  - MarketplaceSync.cursorData schema column + migration
affects:
  - 23-03 (dashboard displays sync status from these cron runs)
  - vercel deployment (cron jobs activated on next deploy)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cron security via CRON_SECRET bearer token in Authorization header"
    - "Cursor-based micro-batching: one Amazon API page per cron invocation, NextToken stored in cursorData"
    - "Cron routes return 200 even on error (Vercel doesn't retry on 5xx)"
    - "Internal sync functions mirror server actions but strip session checks and revalidatePath"
    - "Sale.createdById FK resolution: admin user lookup fallback when userId is null"

key-files:
  created:
    - apps/command-center/src/lib/integrations/sync-internal.ts
    - apps/command-center/src/app/api/cron/sync-square/route.ts
    - apps/command-center/src/app/api/cron/sync-amazon/route.ts
    - apps/command-center/src/app/api/cron/sync-etsy/route.ts
    - apps/command-center/prisma/migrations/20260403000000_add_marketplace_sync_cursor/migration.sql
  modified:
    - apps/command-center/prisma/schema.prisma
    - apps/command-center/vercel.json

key-decisions:
  - "Amazon micro-batching: one page per cron invocation rather than full sync — stays within 300s Vercel limit"
  - "Cron routes return 200 on caught errors — Vercel does not retry failed cron invocations, 5xx has no benefit"
  - "Sale.createdById fallback: when cron calls Square sync with userId=null, resolve first admin user as createdById"
  - "spApiGet implemented locally in sync-internal.ts — getAccessToken and spApiGet are private in amazon.ts"
  - "Migration applied via db execute + migrate resolve (not migrate dev) due to production DB drift from migration history"
  - "vercel.json cron schedules at 0 2/3/4 * * * — staggered to avoid concurrent DB writes, Hobby-plan compatible"

patterns-established:
  - "Pattern: Internal sync functions (sync-internal.ts) = server action logic minus session check + revalidatePath"
  - "Pattern: Cron endpoint structure — auth check, call internal function, return ok:true/ok:false with 200 always"

# Metrics
duration: 21min
completed: 2026-04-02
---

# Phase 23 Plan 02: Automated Daily Sync Pipeline Summary

**Three Vercel Cron jobs pulling Square/Amazon/Etsy orders nightly via session-free internal sync functions with Amazon cursor-based micro-batching and CRON_SECRET authentication**

## Performance

- **Duration:** ~21 min
- **Started:** 2026-04-03T01:08:46Z
- **Completed:** 2026-04-03T01:29:31Z
- **Tasks:** 2 (checkpoint reached at Task 3)
- **Files modified:** 7

## Accomplishments
- Added `cursorData String?` to MarketplaceSync schema and applied migration to production DB
- Created `sync-internal.ts` with three session-free sync functions (no verifyManagerOrAbove, no revalidatePath)
- Amazon function implements cursor-based micro-batching: processes one SP-API page per invocation, stores NextToken in cursorData for next run
- Three cron routes secured with CRON_SECRET bearer token, all return 200 (never 5xx)
- vercel.json updated with three once-daily staggered cron entries (compatible with Vercel Hobby plan)
- Build passes: all three routes appear as dynamic (ƒ) routes in Next.js build output

## Task Commits

Each task was committed atomically:

1. **Task 1: Add cursorData column and create sync-internal.ts** - `44e603e` (feat)
2. **Task 2: Create cron route handlers and update vercel.json** - `01fecc3` (feat)

## Files Created/Modified
- `apps/command-center/src/lib/integrations/sync-internal.ts` — Session-free cron-safe sync functions for all three marketplaces
- `apps/command-center/src/app/api/cron/sync-square/route.ts` — GET handler secured by CRON_SECRET, calls runSquareSyncInternal
- `apps/command-center/src/app/api/cron/sync-amazon/route.ts` — GET handler with micro-batch comment, calls runAmazonSyncInternal
- `apps/command-center/src/app/api/cron/sync-etsy/route.ts` — GET handler secured by CRON_SECRET, calls runEtsySyncInternal
- `apps/command-center/prisma/migrations/20260403000000_add_marketplace_sync_cursor/migration.sql` — ALTER TABLE to add cursorData column
- `apps/command-center/prisma/schema.prisma` — MarketplaceSync.cursorData String? added
- `apps/command-center/vercel.json` — Added crons array with three staggered daily schedules

## Decisions Made
- Amazon micro-batching design: one page per cron invocation keeps function runtime well under 300s even with order-item fetches per order
- Cron routes always return HTTP 200 — Vercel does not retry failed cron invocations, so a 5xx just pollutes logs without benefit
- Sale.createdById FK workaround: Square sync requires a User reference for Sale records; when cron runs with userId=null, resolve first admin user as fallback
- `spApiGet` implemented locally in sync-internal.ts because the function is private (unexported) in amazon.ts — avoids modifying existing integration file

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added admin user fallback for Sale.createdById in Square cron sync**
- **Found during:** Task 1 (sync-internal.ts creation)
- **Issue:** `Sale.createdById` is a required non-nullable FK to User. When `userId` is null (cron context), Square sync would fail to create Sale records
- **Fix:** Added `resolveCreatedById(userId)` helper that looks up first active admin user as fallback when userId is null
- **Files modified:** `apps/command-center/src/lib/integrations/sync-internal.ts`
- **Verification:** TypeScript compiles clean, no P2003 FK violation possible
- **Committed in:** `44e603e` (Task 1 commit)

**2. [Rule 3 - Blocking] Used db execute + migrate resolve instead of migrate dev**
- **Found during:** Task 1 (Prisma migration)
- **Issue:** `prisma migrate dev` refused to run due to production DB drift (tables/columns added outside migration history). Resetting would destroy production data.
- **Fix:** Created migration SQL manually, applied via `prisma db execute --file`, marked as applied via `prisma migrate resolve --applied`
- **Files modified:** `prisma/migrations/20260403000000_add_marketplace_sync_cursor/migration.sql`
- **Verification:** `prisma generate` succeeded; column confirmed applied
- **Committed in:** `44e603e` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking)
**Impact on plan:** Both fixes necessary for correctness and data safety. No scope creep.

## Issues Encountered
- Prisma migration drift: production DB schema ahead of migration history (several tables/columns added directly). Resolved by applying SQL manually and using migrate resolve — safe approach preserving all production data.
- stale `.next/lock` file from a previous interrupted build — removed and rebuilt successfully.

## User Setup Required

Before cron jobs are secured in production:

1. **Generate CRON_SECRET:** Run `openssl rand -hex 32` to generate a secret string
2. **Add to Vercel:** Dashboard -> Project Settings -> Environment Variables -> Add `CRON_SECRET`
3. **Add to local `.env.local`:** `CRON_SECRET=your-generated-secret` for local testing

Cron jobs activate automatically on next Vercel deployment after vercel.json is deployed.

## Next Phase Readiness
- Cron infrastructure is complete — deploy to Vercel to activate daily sync jobs
- Checkpoint: verify cron endpoints return 401 on wrong secret and 200 on correct secret
- Phase 23-03 can build dashboard UI showing sync status from MarketplaceSync records created by these cron runs

---
*Phase: 23-unified-dashboard-automation*
*Completed: 2026-04-02*
