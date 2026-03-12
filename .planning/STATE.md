# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-13)

**Core value:** Production tracking is the foundation — every unit traceable from batch creation (with QC sign-off) through inventory location to sale.

**Current focus:** Phase 05 — Sales Channels CRM. Plans 01 and 04 complete. CRM data foundation + lead pipeline UI + promotional pricing CRUD + PriceCalculator widget deployed.

## Current Position

Phase: 05 (Sales Channels CRM)
Plan: 4 of N complete
Status: In Progress — Lead pipeline (6 stages, overdue tracking, stage quick-change), promotional pricing CRUD (date ranges, percent/fixed, deactivate), and PriceCalculator widget ready
Last activity: 2026-03-12 — Phase 05-04 execution complete, 6 files created (1,591 lines), 0 TypeScript errors

Progress: [█████████░] 74%

## Performance Metrics

**Velocity:**
- Total plans completed: 16
- Average duration: 5 minutes
- Total execution time: 0.97 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-authentication | 4 | 28m | 7m |
| 02-production-quality-control | 4 | 17m | 4.3m |
| 03-inventory-management | 4 | 15m | 3.75m |
| 11-dashboard-kpis-vercel-deployment | 2 | 6m | 3m |
| 04-order-management | 4 | 15m | 3.75m |
| 05-sales-channels-crm | 2 | 11m | 5.5m |

**Recent Trend:**
- Last 5 plans: 04-03 (3m), 04-04 (5m), 05-01 (8m), 05-04 (3m)
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
- OperatorOrderStatus separate from OrderStatus — existing enum is used by WebsiteOrder and typed as Record<OrderStatus, ...> in WebsiteOrderList; extending it would break existing components and pollute webhook-order domain
- Named relation CustomerOperatorOrders on Customer — Customer already has orders WebsiteOrder[]; unnamed Order relation would cause Prisma validation error
- eventDate field added to Order for CATERING type — required anchor for balanceDueDate (subDays(eventDate, 7)) per research pitfall 6
- lineItems passed as JSON string in hidden input — FormData cannot serialize arrays; Zod .transform() parses on server before validation
- User.name used in operator order server actions (not firstName/lastName) — User model has single name field unlike Customer model
- Dual-dispatch in [id]/page.tsx — getOperatorOrderById checked first, null result falls through to WebsiteOrder for backward compat
- OperatorOrderList client-side filtering — small manually-created dataset, instant response without server round-trips
- [Phase 04-order-management]: confirmOrder wraps FIFO + DEDUCTION creation inside db.$transaction for atomicity
- [Phase 04-order-management]: Approval thresholds queried from DB ApprovalThreshold table, approvalType string mapped to logic branches
- [Phase 04-04 invoices]: Finance page flags overdue invoices on each load — eliminates cron job dependency, ensures real-time overdue detection
- [Phase 04-04 invoices]: FinanceDashboardClient + InvoiceDetailClient thin wrapper pattern — server page fetches all data, client component handles modal state only
- [Phase 04-04 invoices]: lateFeeAmount stored on invoice at flagging time and recomputed on read — stored value used for AR aging summary totals
- [Phase 05-01 CRM]: Promotional pricing supersedes volume and frequency discounts — only max(volume, frequency) applies when no promo active, no stacking
- [Phase 05-01 CRM]: Named Prisma relations on SubscriptionMember (CustomerSubscriptions, PlanMembers) and Lead (LeadAssignee, LeadCreator) to disambiguate multi-relation models
- [Phase 05-01 CRM]: calculateLineItemPrice accepts PrismaClient as parameter — enables use inside db.$transaction calls
- [Phase 05-04 CRM]: getLeads computes overdue boolean server-side (followUpAt < now AND stage != CLOSED) — avoids client-side date arithmetic
- [Phase 05-04 CRM]: updateLeadStage uses startTransition + direct action call (not form submission) — enables non-blocking inline stage change per row
- [Phase 05-04 CRM]: discountType hidden input drives XOR discount field visibility — matches createPromotionalPricingSchema refine constraint from Plan 01
- [Phase 05-04 CRM]: PriceCalculator uses useEffect with cancelled flag — prevents stale state on rapid prop changes

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-03-12
Stopped at: Completed 05-sales-channels-crm plan 05-04 (Lead Pipeline + Promotional Pricing)
Resume file: .planning/phases/05-sales-channels-crm/05-04-SUMMARY.md
