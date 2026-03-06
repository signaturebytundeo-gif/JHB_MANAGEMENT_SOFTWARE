---
phase: 11-dashboard-kpis-vercel-deployment
plan: 02
subsystem: infra
tags: [vercel, neon, postgresql, prisma, deployment, monorepo]

requires:
  - phase: 11-01
    provides: Dashboard KPI components and InventoryStatusSummary already built

provides:
  - vercel.json with monorepo-aware build configuration
  - .env.example documenting all Vercel production environment variables
  - Prisma schema with url + directUrl for Neon pooled/direct connections
  - All accumulated implementation files from phases 08-11 committed to git

affects: [production-deployment, future-phases]

tech-stack:
  added: []
  patterns:
    - vercel.json installCommand uses cd ../.. to hoist to monorepo root for npm workspaces
    - Neon PostgreSQL uses DATABASE_URL (pooled, PrismaNeon adapter) for runtime and DIRECT_URL (direct, no pooler) for migrations
    - prisma.config.ts uses DIRECT_URL || DATABASE_URL fallback for local dev compatibility

key-files:
  created:
    - apps/command-center/vercel.json
    - .planning/phases/11-dashboard-kpis-vercel-deployment/11-02-PLAN.md
  modified:
    - apps/command-center/prisma/schema.prisma
    - apps/command-center/.env.example

key-decisions:
  - "vercel.json installCommand: cd ../.. && npm install — npm workspaces requires install from monorepo root"
  - "Prisma schema now has url + directUrl — pooled URL for app runtime, direct URL for DDL migrations"
  - "DIRECT_URL for Neon migrations — pooled Neon connections cannot reliably run DDL; direct bypasses PgBouncer"
  - ".env.example restructured to production-first with Neon PostgreSQL template instead of SQLite placeholder"

duration: 3min
completed: 2026-03-06
---

# Phase 11, Plan 02: Vercel Production Deployment Summary

**Vercel deployment configured for monorepo with vercel.json, Neon PostgreSQL directUrl for migrations, and all accumulated phase 08-11 implementation files committed.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-06T18:11:35Z
- **Completed:** 2026-03-06T18:13:42Z
- **Tasks:** 4
- **Files modified:** 7

## Accomplishments

- Committed 7 untracked/modified implementation files accumulated from phases 08-11 (FulfillmentModal, customer-emails, slack integration, fulfillment migration, updated stripe webhook, planning verification reports)
- Created `apps/command-center/vercel.json` with monorepo-correct install command and Prisma-aware build command
- Updated `apps/command-center/.env.example` from SQLite placeholder to production Neon PostgreSQL template with all required Vercel env vars
- Added `url` and `directUrl` to Prisma `datasource db` block for proper Neon pooled/direct connection split
- Confirmed `npx tsc --noEmit` passes with zero type errors across the entire codebase

## Task Commits

1. **Task 1: Commit accumulated implementation files from phases 08-11** - `3a4e855` (feat)
2. **Task 2: Create vercel.json for monorepo deployment** - `1b450d3` (chore)
3. **Task 3: Update .env.example for Vercel production deployment** - `8baf8f7` (chore)
4. **Task 4: Verify TypeScript build + add Prisma directUrl** - `e41c051` (chore)

## Files Created/Modified

- `apps/command-center/vercel.json` — Vercel deployment configuration (installCommand, buildCommand, outputDirectory, framework)
- `apps/command-center/.env.example` — Production env var documentation with Neon PostgreSQL, Stripe, Resend, Slack, WEBHOOK_API_KEY
- `apps/command-center/prisma/schema.prisma` — Added `url = env("DATABASE_URL")` and `directUrl = env("DIRECT_URL")` to datasource block
- `apps/command-center/prisma/migrations/20260304000000_add_fulfillment_fields/migration.sql` — Fulfillment fields migration (committed from untracked)
- `apps/command-center/src/components/orders/FulfillmentModal.tsx` — Ship order modal with carrier/tracking number/estimated delivery (committed from untracked)
- `apps/command-center/src/lib/emails/customer-emails.ts` — Order confirmation + shipping confirmation transactional email templates (committed from untracked)
- `apps/command-center/src/lib/integrations/slack.ts` — Slack webhook for shipping and email failure notifications (committed from untracked)
- `apps/command-center/src/app/api/webhooks/stripe/route.ts` — Updated with email + Slack notification on checkout.session.completed (committed from modified)

## Decisions Made

- **vercel.json installCommand uses `cd ../.. && npm install`** — Vercel's default install runs from the project root (`apps/command-center`), but npm workspaces need to install from the monorepo root. The `cd ../..` hoists up two levels to `JHB_MANAGEMENT_SOFTWARE/` where `package.json` defines `workspaces: ["apps/*", "packages/*"]`.

- **Prisma schema directUrl for migrations** — Neon provides two connection types: pooled (PgBouncer, faster for concurrent app queries) and direct (raw TCP, required for DDL statements). `prisma migrate deploy` runs DDL; it must use the direct URL to avoid transaction mode limitations in PgBouncer. Added `directUrl = env("DIRECT_URL")` to the datasource block.

- **.env.example restructured to production-first** — Previous .env.example had `DATABASE_URL="file:./dev.db"` (SQLite) which would confuse Vercel setup. Replaced with Neon PostgreSQL template and organized into sections (Database, Auth, App URL, Email, Stripe, Slack, Internal APIs).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added url + directUrl to Prisma datasource during Task 4**
- **Found during:** Task 4 (build verification)
- **Issue:** Schema had no `url` field in `datasource db {}`, which means `prisma migrate deploy` at Vercel build time would fail without knowing which connection to use. Separately, Neon pooled connections don't support DDL statements, requiring a `directUrl` pointing to the non-pooler endpoint.
- **Fix:** Added `url = env("DATABASE_URL")` and `directUrl = env("DIRECT_URL")` to the datasource block. The adapter in `db.ts` handles runtime connections; `directUrl` handles migrations.
- **Files modified:** `apps/command-center/prisma/schema.prisma`
- **Verification:** `npx tsc --noEmit` still passes zero errors after schema change.
- **Committed in:** `e41c051` (separate commit, related to Task 4)

---

**Total deviations:** 1 auto-fixed (Rule 2 - missing critical for migrations)
**Impact on plan:** Fix is essential for Vercel deploy to succeed. Without directUrl, prisma migrate deploy would fail at build time on pooled Neon connections.

## Issues Encountered

None — plan executed cleanly. All untracked files staged and committed in Task 1. TypeScript check confirmed zero errors throughout.

## User Setup Required

Vercel requires environment variables to be set in the project dashboard before deployment will succeed. The following must be configured at `https://vercel.com/team/project/settings/environment-variables`:

| Variable | Source | Notes |
|----------|--------|-------|
| `DATABASE_URL` | Neon dashboard > Connection Details > Pooled | Used by app at runtime via PrismaNeon adapter |
| `DIRECT_URL` | Neon dashboard > Connection Details > Direct | Used by prisma migrate deploy at build time |
| `SESSION_SECRET` | Generate: `openssl rand -base64 32` | Must be 32+ characters |
| `NEXT_PUBLIC_APP_URL` | Vercel project URL or custom domain | e.g., `https://command-center.vercel.app` |
| `RESEND_API_KEY` | resend.com/api-keys | For transactional customer emails |
| `STRIPE_SECRET_KEY` | Stripe Dashboard > Developers > API Keys | `sk_live_...` for production |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard > Webhooks > Endpoint | `whsec_...` signing secret |
| `SLACK_WEBHOOK_URL` | Slack App > Incoming Webhooks | Optional — enables order notifications |
| `WEBHOOK_API_KEY` | Generate: `openssl rand -hex 16` | Internal secret for /api/incoming-order |

See `.env.example` for full documentation and format for each variable.

## Next Phase Readiness

- App is deployment-ready: TypeScript compiles clean, vercel.json configures the monorepo build, Neon database connections properly configured for both runtime and migrations
- Vercel deploy will succeed once environment variables are set in the Vercel dashboard (see User Setup Required above)
- All phases 08-11 implementation is now properly tracked in git

---
*Phase: 11-dashboard-kpis-vercel-deployment*
*Completed: 2026-03-06*

## Self-Check: PASSED

All created files verified on disk. All commit hashes verified in git log.

| Item | Status |
|------|--------|
| `apps/command-center/vercel.json` | FOUND |
| `apps/command-center/.env.example` | FOUND |
| `apps/command-center/prisma/schema.prisma` | FOUND |
| `apps/command-center/src/components/orders/FulfillmentModal.tsx` | FOUND |
| `apps/command-center/src/lib/emails/customer-emails.ts` | FOUND |
| `apps/command-center/src/lib/integrations/slack.ts` | FOUND |
| `.planning/phases/11-dashboard-kpis-vercel-deployment/11-02-SUMMARY.md` | FOUND |
| Commit `3a4e855` | FOUND |
| Commit `1b450d3` | FOUND |
| Commit `8baf8f7` | FOUND |
| Commit `e41c051` | FOUND |
