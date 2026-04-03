---
phase: 23-unified-dashboard-automation
plan: 01
subsystem: ui
tags: [recharts, prisma, dashboard, server-action, channel-performance]

# Dependency graph
requires:
  - phase: 11-dashboard-kpis-vercel-deployment
    provides: dashboard page layout with Suspense blocks and KPICards pattern
  - phase: 07-postgresql-foundation
    provides: db.sale, db.order, db.websiteOrder, db.salesChannel Prisma models

provides:
  - getUnifiedChannelStats() server action aggregating Sale + Order + WebsiteOrder MTD
  - ChannelComparisonWidget Recharts BarChart with revenue + orderCount bars per channel
  - Channel Performance (MTD) section in dashboard page gated to ADMIN/MANAGER

affects:
  - 23-unified-dashboard-automation (future plans in this phase reference channel-stats)
  - any future reporting that needs per-channel revenue breakdown

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server action uses Promise.all for three parallel Prisma groupBy queries merged in statMap
    - Client component imports type from server action file (ChannelStatItem)
    - Async server component (ChannelStats) wraps client component (ChannelComparisonWidget) in Suspense

key-files:
  created:
    - apps/command-center/src/app/actions/channel-stats.ts
    - apps/command-center/src/components/dashboard/ChannelComparisonWidget.tsx
  modified:
    - apps/command-center/src/app/(dashboard)/dashboard/page.tsx

key-decisions:
  - "WebsiteOrder source enum (WEBSITE/AMAZON/ETSY) mapped to display names in sourceNames constant in channel-stats.ts"
  - "orderCount uses two bars (revenue + orderCount) without a second YAxis — orderCount numbers are small enough to share scale"
  - "Summary table rendered below chart for quick scan without hovering tooltips"

patterns-established:
  - "statMap merge pattern: upsert(key, revenue, count) accumulates across multiple table sources"
  - "Channel display name resolution: channelMap for Sale/Order (by channelId), sourceNames for WebsiteOrder (by enum)"

# Metrics
duration: 22min
completed: 2026-04-02
---

# Phase 23 Plan 01: Unified Dashboard Automation Summary

**Recharts BarChart widget showing MTD revenue and order count per sales channel (Website DTC, Amazon, Etsy, Farmers Market/Square), aggregated from Sale + Order + WebsiteOrder tables via a unified server action**

## Performance

- **Duration:** 22 min
- **Started:** 2026-04-03T01:08:38Z
- **Completed:** 2026-04-03T01:31:09Z
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- Created `getUnifiedChannelStats()` server action running three parallel Prisma groupBy queries and merging results into a single channel-keyed stat map
- Created `ChannelComparisonWidget` client component with Recharts BarChart (two bars: revenue + orderCount), summary table, and zero-state handling
- Wired Channel Performance (MTD) section into dashboard page, gated to ADMIN and MANAGER roles, wrapped in Suspense

## Task Commits

Each task was committed atomically:

1. **Task 1: Create getUnifiedChannelStats server action** - `708e8ab` (feat)
2. **Task 2: Create ChannelComparisonWidget and wire into dashboard page** - `3c9641f` (feat)

**Plan metadata:** (see docs commit below)

## Files Created/Modified
- `apps/command-center/src/app/actions/channel-stats.ts` - Server action exporting ChannelStatItem type and getUnifiedChannelStats() function
- `apps/command-center/src/components/dashboard/ChannelComparisonWidget.tsx` - Client component with Recharts BarChart + summary table
- `apps/command-center/src/app/(dashboard)/dashboard/page.tsx` - Added imports, ChannelStats async server component, and Channel Performance section in JSX

## Decisions Made
- WebsiteOrder source enum values (WEBSITE/AMAZON/ETSY) mapped to human-readable display names in a `sourceNames` constant — keeps display logic in the server action rather than the component
- Two bars per channel (revenue + orderCount) share a single Y-axis — order counts are small relative to revenue scale, avoiding the visual complexity of a dual-axis chart
- Summary table below chart gives quick scannable data without requiring hover interactions

## Deviations from Plan

None — plan executed exactly as written.

One issue encountered: first `npm run build` failed with a stale `.next` cache artifact (`Cannot find module settings/page.js`). Confirmed it pre-existed by testing a stash — baseline build also failed with that error if cache was present. Resolved by clearing `.next/` and rebuilding. No code changes required.

## Issues Encountered
- Stale `.next` build cache caused false settings page error on first build attempt. Cleared cache, second build passed cleanly. Pre-existing issue unrelated to this plan's changes.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Channel Performance widget live on dashboard for ADMIN/MANAGER roles
- `getUnifiedChannelStats()` available for any future report or automation that needs per-channel breakdown
- No blockers for next plan in phase 23

---
*Phase: 23-unified-dashboard-automation*
*Completed: 2026-04-02*

## Self-Check: PASSED

- `apps/command-center/src/app/actions/channel-stats.ts` — FOUND
- `apps/command-center/src/components/dashboard/ChannelComparisonWidget.tsx` — FOUND
- `.planning/phases/23-unified-dashboard-automation/23-01-SUMMARY.md` — FOUND
- Commit `708e8ab` (Task 1) — FOUND
- Commit `3c9641f` (Task 2) — FOUND
