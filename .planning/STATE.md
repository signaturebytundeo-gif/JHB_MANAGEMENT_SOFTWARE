# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-13)

**Core value:** Production tracking is the foundation — every unit traceable from batch creation (with QC sign-off) through inventory location to sale.

**Current focus:** Phase 11 (inserted) — Dashboard KPIs + Vercel Deployment. Plan 11-02 complete. App is deployment-ready.

## Current Position

Phase: 11 (inserted) of 11+ (Dashboard KPIs + Vercel Deployment)
Plan: 2 of 2 complete
Status: Phase 11 Complete — App ready for Vercel production deployment
Last activity: 2026-03-06 — Phase 11-02 execution complete, Vercel deployment configured

Progress: [██████░░░░] 55%

## Performance Metrics

**Velocity:**
- Total plans completed: 14
- Average duration: 5 minutes
- Total execution time: 0.87 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-authentication | 4 | 28m | 7m |
| 02-production-quality-control | 4 | 17m | 4.3m |
| 03-inventory-management | 4 | 15m | 3.75m |
| 11-dashboard-kpis-vercel-deployment | 2 | 6m | 3m |

**Recent Trend:**
- Last 5 plans: 03-03 (5m), 11-01 (3m), 11-02 (3m)
- Trend: Steady pace, excellent efficiency

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Production tracking as first module - everything flows from knowing what was produced and where it is
- Build all 10 modules (full vision) - founders want complete system for investor conversations
- CSV import before API integration - pragmatic bridge to get data flowing immediately
- MMDDYY batch code format - matches existing manual workflow Anthony uses
- Founders-only initial users - Anthony and Tunde first, expand to team once workflows proven
- Use Tailwind CSS v4 with @tailwindcss/postcss - Latest version with improved performance and CSS-native theming
- Use shadcn/ui component library - Customizable, accessible, TypeScript-first components for faster development
- Use PostgreSQL adapter for Prisma v7 - Adapter pattern required for Prisma v7, provides connection pooling
- Generate Prisma client to default location - Standard @prisma/client import works seamlessly with tsx and Next.js
- Bcrypt cost factor 10 for password hashing - Good security-performance balance (~100ms per hash)
- Use jose library for JWT instead of jsonwebtoken - ESM-native, Edge runtime compatible
- Session management with 7-day sliding expiration - Encrypt/decrypt using jose HS256, httpOnly cookies
- Data Access Layer caching with React cache() - Avoid redundant session verification database queries
- Generic login error messages - Never reveal which field is wrong (prevents email enumeration)
- Role-based navigation with permission matrix - ROLE_PERMISSIONS + hasPermission + getRoleDashboard
- Use Resend for transactional emails - Industry-standard service with excellent DX and generous free tier
- Email templates use inline CSS - Email clients have inconsistent CSS support, inline styles are most reliable
- Magic link tokens single-use with 15-min expiration - Security best practice prevents token replay attacks
- Invite tokens expire after 7 days - Balances security (limited lifetime) with UX (reasonable acceptance window)
- Generic success message for magic link requests - Prevents email enumeration attacks, don't reveal registered emails
- Quick action buttons disabled with phase tooltips - Demonstrates future functionality with clear UX expectations
- Use MMDDYY format for batch codes with letter suffixes - Matches existing manual workflow Anthony uses, prevents duplicates
- Soft delete for batches (isActive flag) - Production records are immutable for audit trail and traceability
- Conditional validation via Zod refine - CO_PACKER source requires partner ID, allocations must sum to totalUnits
- SQLite Decimal without @db annotations - Prisma handles Decimal mapping automatically for SQLite
- Auto-fail QC tests when pH >= 4.6 - Food safety compliance, prevents unsafe batches from releasing
- Batch status state machine with enforced transitions - Prevents invalid status changes (e.g., RELEASED can't transition)
- Mobile-first form inputs (16px, 44px touch targets) - Prevents iOS auto-zoom, optimizes for Anthony's phone usage
- Production source toggle buttons vs select - Large touch targets for mobile, clearer visual state indication
- Location allocations optional at batch creation - Flexibility to allocate later, but must sum to total if provided
- Separate raw-materials actions file - Avoid conflicts with future production.ts file from parallel plans
- Badge component with status variants - success/warning/destructive variants for visual status indicators
- Expiration tracking with date-fns - Expired (<0 days), Expiring Soon (<=30 days), OK (>30 days) status logic
- Client-server component split for settings - Server fetches data, client handles edit/toggle interactions
- SQLite case-sensitive queries - Removed 'mode: insensitive' option not supported in SQLite
- Client-side batch filtering - Small dataset (dozens of batches), faster than server round-trips, instant UI updates
- Responsive table-to-cards transform - Desktop gets dense tables, mobile gets touch-friendly cards (no horizontal scroll)
- Real-time pH validation feedback - Shows target range/safe/unsafe as user types, prevents 4.6 threshold errors
- InventoryAdjustmentReason separate from AdjustmentReason - preserves StockAdjustment backward compat while giving InventoryMovement its own reason set
- FIFO available quantity = initial BatchAllocation + inbound InventoryMovements - outbound InventoryMovements
- Zod v4 enum params use 'error' key (not 'required_error'/'invalid_type_error' from Zod v3)
- Named Prisma relations on InventoryMovement for disambiguation: 'FromLocation', 'ToLocation', 'MovementCreator', 'MovementApprover'
- getStockLevels fetches all allocations + movements in 4 parallel queries then aggregates in memory (avoids N×M DB round-trips)
- Phase 3 inventory actions appended to existing inventory.ts — preserves legacy Phase 2 exports for backwards compat
- Inventory page renders Phase 3 StockLevelGrid + legacy InventoryPageClient in separate Suspense boundaries
- Inline JS filtering for packaging reorder alerts — avoids Prisma cross-column comparison limitation, safe for small dataset
- FIFO valuation uses 40% of wholesale cash price as COGS estimate — full material/labor/overhead COGS deferred to Phase 6
- ReorderAlertPanel as server component receiving typed props — no client interactivity needed
- updatePackagingMaterial bound via Function.bind(null, id) — Next.js pattern for parameterized server actions
- getPendingAdjustments separate from getAuditTrail — needs createdById for dual-control UI check not returned by audit trail action
- PendingApprovals uses direct async call (not useActionState) — per-card optimistic feedback without cross-card state pollution
- TransferForm captures formValues before reset for post-success summary — useActionState state resets on next interaction
- AuditTrailTable client-side filtering — 100-record cap makes server round-trips unnecessary, instant filter response
- vercel.json installCommand uses cd ../.. to install from monorepo root — npm workspaces require install from workspace root
- Prisma schema datasource uses url + directUrl — pooled URL (PrismaNeon adapter) for runtime, direct URL for prisma migrate deploy DDL
- DIRECT_URL for Neon migrations — pooled Neon connections cannot run DDL reliably; direct connection bypasses PgBouncer
- .env.example restructured to production-first with Neon PostgreSQL template and all Vercel env vars documented

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-03-06
Stopped at: Completed 11-dashboard-kpis-vercel-deployment plan 11-02 (Vercel deployment configuration)
Resume file: .planning/phases/11-dashboard-kpis-vercel-deployment/11-02-SUMMARY.md
