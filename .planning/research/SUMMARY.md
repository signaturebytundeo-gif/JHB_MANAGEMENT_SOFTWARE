# Project Research Summary

**Project:** JHB Command Center
**Domain:** Food Manufacturing Operations Management
**Researched:** 2026-02-13
**Confidence:** MEDIUM-HIGH

## Executive Summary

JHB Command Center is a food manufacturing operations platform for a small-scale hot sauce producer (15K units/month, 7 distribution locations, 9 sales channels). This domain combines FDA-regulated traceability requirements with the operational complexity of multi-location inventory, multi-channel sales, and dual approval financial workflows. The recommended approach is a monolithic Next.js App Router application backed by PostgreSQL, prioritizing regulatory compliance (batch traceability, FIFO enforcement) and mobile usability (on-floor batch logging) over premature optimization.

The most successful implementations of food manufacturing systems follow these principles: (1) immutable audit trails for regulatory compliance, (2) service-layer transaction enforcement for inventory integrity, (3) FIFO allocation as a first-class concern in the data model, and (4) role-based access control enforced at the service layer, not UI. The stack research recommends Next.js 15 with App Router for server-side rendering of data-heavy dashboards, Prisma for type-safe database access with migration control, and Supabase for managed PostgreSQL with file storage for QC photos and COA documents.

Key risks center on inventory race conditions, FIFO enforcement breaking across location transfers, and batch traceability gaps that would fail FDA recall requirements. Mitigations include database-level CHECK constraints on stock levels, Prisma transactions with serializable isolation, tracking originalProductionDate separately from receivedAtLocationDate, and designing traceability as a first-class schema concern with mandatory source references on every inventory movement. The investor dashboard and subscription management features are identified as v2+ candidates, allowing the core production-inventory-sales workflow to be battle-tested before adding complexity.

## Key Findings

### Recommended Stack

The research converges on a modern, type-safe JavaScript stack optimized for data-heavy operations dashboards with mobile-first batch logging. PostgreSQL is non-negotiable for ACID compliance on financial transactions and inventory consistency, with JSON support for flexible batch metadata. Next.js 15 App Router leverages Server Components to reduce client bundle size for mobile users while Server Actions provide a clean mutation API without building a separate REST backend.

**Core technologies:**
- **Next.js 15 (App Router)**: Full-stack React framework — Server Components for data-heavy dashboards, Server Actions for mutations, eliminates need for separate backend API
- **TypeScript 5.4+**: Type safety for operations software — catches batch/inventory/financial calculation errors at compile time, essential for regulatory compliance
- **PostgreSQL 15+ (Supabase)**: Relational database — ACID compliance for financial transactions, FIFO guarantees, batch traceability, JSON for metadata
- **Prisma 5.x+**: Type-safe ORM — auto-generated TypeScript types, migration version control, excellent for complex reporting queries
- **Auth.js (NextAuth v5)**: Authentication with native App Router support — Prisma adapter for 4-role RBAC (Admin/Manager/Sales/Investor)
- **Tailwind CSS + shadcn/ui**: Rapid mobile-first UI development — accessible components, no runtime dependency, works well with Server Components
- **React Hook Form + Zod**: Form management and validation — best performance for complex mobile forms, shared client/server validation schemas

**What NOT to use:**
- MongoDB (eventual consistency risky for inventory), Redux (Server Components reduce client state needs), Firebase (vendor lock-in, unpredictable pricing), GraphQL/tRPC (over-engineered at this scale), separate Express backend (Next.js is full-stack).

### Expected Features

Research identified a three-tier feature hierarchy: table stakes (missing = incomplete product), differentiators (competitive advantage), and anti-features (explicitly avoid).

**Must have (table stakes):**
- Batch tracking with MMDDYY lot codes (FDA traceability requirement 21 CFR Part 117)
- Quality control checkpoints with pH testing (HACCP, GMP compliance, must pass before release)
- Multi-location inventory with real-time visibility (7 locations, FIFO/FEFO enforcement)
- Multi-channel order tracking (9 channels with different workflows)
- Invoicing with payment terms (Net 30, overdue flagging, AR aging)
- Expense tracking with approval workflows ($150/$500/$2,500 thresholds per operating agreement)
- Raw material tracking with lot numbers and expiration dates

**Should have (competitive differentiators):**
- Farmers market/event sales tracking (ignored by enterprise ERP, critical for artisan food businesses)
- pH testing workflow with automatic batch blocking (food safety typically manual)
- Batch allocation at creation (split to locations at production time for operational efficiency)
- Mobile batch logging (clean, fast form for phone use on production floor)
- Co-packer partner management (configurable list, map their lot numbers to internal codes)
- Investor dashboard (read-only transparency for funded food startups)

**Defer (v2+):**
- Subscription management (HIGH complexity, HIGH value but not launch-critical)
- Lead pipeline CRM (LOW value until core operations stable)
- Full MES/APS systems (over-engineering for 15K units/month scale)
- Built-in e-commerce (Shopify/WooCommerce already solve this)
- IoT equipment monitoring (hardware complexity, minimal benefit for small batch)
- Multi-currency, barcode scanning, built-in payroll, custom report builder

### Architecture Approach

The recommended architecture is a monolithic Next.js App Router application with service layer separation. At 2 active users and 15K units/month, microservices would be massive over-engineering. The first bottleneck will be database query performance on reports, fixable with indexes and materialized views rather than architectural changes.

**Major components:**
1. **Production Module** — Batch CRUD, QC workflow, co-packer tracking; creates inventory movements on batch completion
2. **Inventory Module** — Stock levels, movements, FIFO/FEFO allocation, raw materials, packaging; receives from production, allocates to orders
3. **Order Module** — Order lifecycle, multi-channel fulfillment, customer management; allocates inventory, triggers invoicing
4. **Financial Module** — Expenses with approval workflows, revenue tracking, COGS calculation, reports; sources data from orders and inventory
5. **CRM Module** — Customers, distributors, subscriptions (v2), leads; integrates with orders for purchase history
6. **Investor Module** — Read-only dashboards and metrics; aggregates financial, sales, production data
7. **Reporting Module** — Pre-built reports (no drag-and-drop), Excel exports; queries all modules
8. **Auth Module** — Authentication, 4-role RBAC, session management; permission checks at service layer

**Key patterns:**
- **Event-driven inventory movements**: All stock changes flow through InventoryService creating immutable movement records (type: PRODUCTION_OUTPUT, TRANSFER, SALE, ADJUSTMENT); stock levels derived from movement history
- **Database transactions for atomicity**: Multi-step operations (batch release + inventory creation) wrapped in Prisma transactions to prevent partial state
- **Approval workflow engine**: Configurable thresholds with state machine; approvals recorded as immutable entries (cannot be deleted, only revoked)
- **RBAC at service layer**: Role checks at API/Server Action entry points, not scattered through business logic
- **Server Actions for writes, Server Components for reads**: Direct Prisma queries in Server Components, co-located Server Actions for mutations, API Routes only for webhooks and file downloads

### Critical Pitfalls

1. **Inventory race conditions** — Two users simultaneously allocating the same inventory leads to overselling and negative stock. Prevention: Prisma transactions with serializable isolation, database CHECK constraint `quantity >= 0`, optimistic locking with version counters, queue concurrent operations for same SKU/location. Address in Phase 1 (database constraints) and Phase 2 (transaction patterns).

2. **FIFO enforcement breaking across location transfers** — FIFO works within a location but fails when inventory is transferred; transferred stock gets new "received" timestamp, losing FIFO ordering. Prevention: Track `originalProductionDate` separately from `receivedAtLocationDate`, FIFO always uses original date, maintain batch genealogy for lot splits, test with transferred stock and co-packer batches. Address in Phase 2 (Inventory) — multi-location FIFO must be designed from day one.

3. **Batch traceability gaps** — FDA requires forward/backward traceability within 24 hours during recalls. Gaps occur when raw materials not linked to batches, co-packer lot numbers not mapped, lot splits not recorded. Prevention: Design traceability as first-class concern in data model (supplier lot → raw material receipt → batch ingredients → production batch → finished goods lot → movements → order items → customer shipments), every InventoryMovement must reference source, batch records immutable. Address in Phase 1 (Data Model) — retrofitting traceability is extremely painful.

4. **Financial approval bypass** — Approval workflows enforced in UI but not at service layer; users or integrations bypass by calling APIs directly. Prevention: Implement state machine at service layer (UI never touches DB directly), approval thresholds in configuration not hardcoded, separate approval recording from state changes, no "admin override" that bypasses dual authorization requirement, audit all attempts. Address in Phase 3 (Financial) but state machine architecture designed in Phase 1.

5. **Co-packer integration as afterthought** — System built assuming internal production only, then co-packer support bolted on; lot number integration, QC workflows, and traceability have manual gaps. Prevention: Design production module with pluggable sources from the start (in-house, co-packer), store internal batch code + their lot number + receiving date, QC supports both internal testing (data entry) and external COA (document upload + approval). Address in Phase 2 (Production) — co-packer architecture designed even if not all features built immediately.

## Implications for Roadmap

Based on combined research, the natural dependency chain emerges as: Foundation → Production → Inventory → Orders → Sales/CRM → Financial → Investor/Reporting. This ordering respects architectural dependencies (production is the source of inventory, inventory enables order fulfillment, orders generate financial data) and pitfall prevention (traceability designed in foundation, FIFO handles multi-location from inventory phase start, approval state machine architecture consistent across phases).

### Phase 1: Foundation & Data Model
**Rationale:** Database schema must encode traceability, audit trails, and approval workflows from the start. Retrofitting these concerns causes rewrites. Co-packer support architecture (even if not fully implemented) must be in schema to prevent later refactoring.

**Delivers:**
- Database schema with Prisma migrations
- Auth with 4-role RBAC (Admin, Manager, Sales Rep, Investor)
- Product catalog (SKUs, variants, pricing tiers)
- Location management (7 locations)
- Seed data for company info, initial users, product list
- Database constraints (CHECK quantity >= 0, unique constraints with soft delete handling)
- Traceability relationships (every movement has source reference)

**Addresses features:** None directly visible to end users; pure infrastructure.

**Avoids pitfalls:** Traceability gaps (Pitfall #3), soft delete confusion (Pitfall #8), approval bypass architecture (Pitfall #4 foundation).

**Research flag:** Standard patterns; no additional research needed. Well-documented schema design for inventory systems.

### Phase 2: Production & Batch Tracking
**Rationale:** Production is the source of finished goods inventory. Batch tracking must be built before inventory management since batches define what goes into stock. Co-packer architecture must be designed now even if full workflow comes later.

**Delivers:**
- Batch CRUD with auto-generated MMDDYY lot codes (append letters for multiples on same day)
- Production status workflow (Planned > In Progress > QC Review > Released > Hold)
- Co-packer vs in-house toggle with partner management
- QC checkpoints with pH testing (required before release)
- Batch detail pages with raw material linkage for traceability
- Mobile-optimized batch logging form
- Batch completion triggers inventory movement creation

**Addresses features:** Batch tracking (table stakes), QC workflow with pH testing (differentiator), mobile batch logging (differentiator), co-packer support (differentiator).

**Avoids pitfalls:** Co-packer integration afterthought (Pitfall #7), traceability gaps at batch level (Pitfall #3).

**Research flag:** Standard patterns for batch tracking; no additional research needed.

### Phase 3: Inventory Management & FIFO
**Rationale:** Depends on production as source of finished goods. Must be fully functional before orders can allocate stock. FIFO logic must handle multi-location transfers from day one to avoid Pitfall #2.

**Delivers:**
- Multi-location inventory visibility (7 locations)
- InventoryService with immutable movement records (PRODUCTION_OUTPUT, TRANSFER, SALE, ADJUSTMENT)
- FIFO allocation using originalProductionDate (handles transfers correctly)
- Stock level alerts (configurable reorder points per SKU per location)
- Inventory transfer workflow with audit trail
- Inventory adjustment with reason codes and approval for >2% variance
- Raw material tracking with lot numbers and expiration dates
- Database transactions for all inventory mutations (Prisma serializable isolation)

**Addresses features:** Multi-location inventory (table stakes), FIFO/FEFO enforcement (table stakes), raw material tracking (table stakes), batch allocation at creation (differentiator).

**Avoids pitfalls:** Inventory race conditions (Pitfall #1), FIFO breaking across locations (Pitfall #2).

**Research flag:** Needs research-phase for FIFO implementation patterns. Multi-location FIFO with lot transfers is complex; sparse documentation for this specific scenario.

### Phase 4: Order Management & Fulfillment
**Rationale:** Depends on inventory for allocation. Orders are the bridge between inventory and financial modules. Multi-channel complexity deferred to Phase 5; start with single-channel flow to validate fulfillment workflow.

**Delivers:**
- Order CRUD with customer linkage
- Order status workflow (New > Confirmed > Picking > Packed > Shipped > Delivered)
- Inventory allocation on order confirmation (FIFO via InventoryService)
- Pick/pack/ship workflow with mobile support
- Invoicing with payment terms (Net 30, overdue flagging)
- Basic order list and detail views
- Order fulfillment creates inventory movements (SALE_OUT type)

**Addresses features:** Order entry and fulfillment (table stakes), invoicing with payment terms (table stakes).

**Avoids pitfalls:** Inventory race conditions during allocation (Pitfall #1).

**Research flag:** Standard e-commerce patterns; no additional research needed.

### Phase 5: Multi-Channel Sales & CRM
**Rationale:** Depends on order management infrastructure. Multi-channel adds complexity (9 channels with different workflows) so comes after single-channel order flow is validated. CRM integrates purchase history from orders.

**Delivers:**
- Multi-channel order tracking (Website, Wholesale, Farmers Markets, Distributors, Subscriptions, Special Events, Consignment, Corporate Gifting, Export)
- Channel-specific workflows (farmers market on-site inventory, event sales tracking)
- Customer and distributor CRM with purchase history
- Pricing tiers (wholesale vs retail, volume discounts, payment term differentials)
- Event/farmers market sales tracking with profitability reporting

**Addresses features:** Multi-channel order tracking (table stakes), farmers market/event sales (differentiator), customer CRM (table stakes), pricing tiers (table stakes).

**Avoids pitfalls:** Multi-channel pricing spaghetti (Pitfall #5) via composable pricing rule system.

**Research flag:** Needs research-phase for pricing engine architecture. Composable pricing with channel + payment term + volume + promotional overlays is complex.

### Phase 6: Financial Management & Approvals
**Rationale:** Depends on orders (revenue source) and inventory (COGS source). Approval workflows are complex state machines that must be built correctly the first time.

**Delivers:**
- Expense tracking with categorization and receipt uploads
- Approval workflow engine with configurable thresholds ($150/$500/$2,500)
- State machine for approval states (Pending > Approved > Rejected > Revoked)
- Service-layer enforcement (UI cannot bypass approvals)
- Revenue tracking by channel (daily/monthly breakdown)
- COGS tracking (material + labor + overhead per batch)
- Basic financial reports (P&L, Cash Flow, Balance Sheet)
- Immutable approval entries (audit trail)

**Addresses features:** Expense tracking with approvals (table stakes), revenue tracking by channel (table stakes), COGS tracking (table stakes), financial reports (table stakes).

**Avoids pitfalls:** Financial approval bypass (Pitfall #4).

**Research flag:** Standard accounting workflow patterns; no additional research needed.

### Phase 7: Investor Dashboard & Advanced Reporting
**Rationale:** Depends on all other modules for data sources. Read-only dashboards with no write operations. Can be built last since it's aggregation/visualization of existing data.

**Delivers:**
- Investor-specific read-only layout and navigation
- Revenue trends and growth metrics
- Production volume trends
- Channel performance comparison
- Financial summary metrics formatted for non-operators
- Pre-built operational reports (inventory aging, batch history, sales by channel, AR aging)
- Excel/PDF export functionality

**Addresses features:** Investor dashboard (differentiator), basic financial reports (table stakes), operational reporting.

**Avoids pitfalls:** None specific; aggregation layer has standard patterns.

**Research flag:** Standard dashboard patterns; no additional research needed.

### Phase 8 (v2+): Subscription Management
**Rationale:** HIGH complexity, HIGH value but not launch-critical. Subscription edge cases (pausing mid-cycle, cancellation with notice, failed payments, grace periods, loyalty rewards during pause) are complex state machines. Core operations should be battle-tested before adding this complexity.

**Delivers:**
- Subscription CRUD with state machine (Active, Paused, Pending Cancellation, Cancelled, Payment Failed, Grace Period)
- Recurring billing with configurable cadence
- Pause/resume with date tracking
- Cancellation policy enforcement (30-day notice period)
- Failed payment handling with retry schedule (day 3, 7, 14, 21, then pause)
- Loyalty rewards with earned/expiration dates independent of subscription state
- Prorating for quantity/frequency changes mid-cycle

**Addresses features:** Subscription management (differentiator deferred to v2).

**Avoids pitfalls:** Subscription edge cases (Pitfall #6) via explicit state machine design.

**Research flag:** Needs research-phase for subscription state machine and payment retry logic. Complex domain with many edge cases.

### Phase Ordering Rationale

1. **Foundation first**: Traceability, audit trails, and approval architecture must be in the schema from day one. Retrofitting causes rewrites (Pitfall #3).

2. **Production before Inventory**: Batches are the source of finished goods. Inventory management needs batches to exist before it can track stock.

3. **Inventory before Orders**: Order fulfillment requires inventory allocation. FIFO must be working correctly before orders go live (Pitfall #2).

4. **Single-channel Orders before Multi-channel Sales**: Validate core fulfillment workflow before adding multi-channel complexity and pricing rules (Pitfall #5).

5. **Financial after Orders + Inventory**: Financial module aggregates data from orders (revenue) and inventory (COGS). Approval workflows are complex; build after simpler workflows are validated.

6. **Investor Dashboard last**: Pure aggregation/visualization layer. Depends on all other modules for data. No write operations, so can't break anything.

7. **Subscriptions deferred to v2**: HIGH complexity (Pitfall #6) justifies deferring until core operations are stable. Monthly subscriptions can be manually managed initially.

This ordering prevents architectural rewrites, respects data flow dependencies, and allows early phases to be battle-tested before adding complexity.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Inventory)**: Multi-location FIFO with lot transfers and co-packer integration is complex. Need research on FIFO allocation patterns that handle originalProductionDate vs receivedAtLocationDate correctly.
- **Phase 5 (Multi-Channel Sales)**: Composable pricing engine with channel + payment term + volume + promotional overlays. Need research on pricing rule system architecture to avoid spaghetti (Pitfall #5).
- **Phase 8 (Subscriptions, v2)**: Subscription state machines with edge cases (pause, cancellation with notice, payment retry, grace periods). Need research on failed payment handling and loyalty reward interaction with subscription state.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation)**: Database schema design for inventory systems is well-documented. Traceability patterns well-established for food manufacturing.
- **Phase 2 (Production)**: Batch tracking is standard manufacturing workflow. Lot code generation straightforward.
- **Phase 4 (Orders)**: Single-channel order fulfillment has established e-commerce patterns.
- **Phase 6 (Financial)**: Approval workflows and expense tracking are standard accounting patterns.
- **Phase 7 (Investor Dashboard)**: Dashboard design and reporting have well-documented patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Next.js + Prisma + PostgreSQL is well-documented for this use case. Strong community consensus. Official docs comprehensive. Alternatives considered and rejected with rationale. |
| Features | MEDIUM | Table stakes features validated against FDA requirements (21 CFR Part 117, HACCP) and manufacturing best practices. Differentiators identified from operating agreement and small food manufacturer pain points. Some assumptions about v2 deferral may need validation with stakeholders. |
| Architecture | MEDIUM-HIGH | Service layer patterns, event-driven inventory, and transaction boundaries are well-established. FIFO across multi-location has less documentation but principles are sound. Monolith-first approach validated for 2-user scale. |
| Pitfalls | MEDIUM-HIGH | Critical pitfalls (race conditions, FIFO breaks, traceability gaps, approval bypass) are well-documented failure modes in inventory systems. Co-packer integration and subscription edge cases based on domain knowledge but need validation during implementation. |

**Overall confidence:** MEDIUM-HIGH

Research is comprehensive enough to proceed to roadmap creation with high confidence. Architecture decisions are validated by established patterns. Stack choices have strong rationale. Feature prioritization aligns with table stakes expectations and differentiator opportunities.

### Gaps to Address

- **Subscription pricing complexity**: Research identified subscriptions as v2+ due to complexity, but stakeholder validation needed on whether DTC subscription revenue is growing fast enough to justify earlier implementation. If 20%+ of revenue, may need to prioritize higher.

- **Co-packer workflow details**: Research identified architecture for co-packer support, but specific QC workflows (COA upload, approval process, traceability mapping) need stakeholder validation during Phase 2 planning. Different co-packers may have different data requirements.

- **Multi-channel pricing rules**: Identified composable pricing engine as solution to Pitfall #5, but exact business rules (payment term differentials, volume discount tiers, promotional overlays) need stakeholder definition during Phase 5 planning. Research-phase at Phase 5 start will fill this gap.

- **Financial approval thresholds**: Operating agreement specifies $150/$500/$2,500 thresholds, but exact approval logic (single vs dual authorization, role restrictions, override policies) needs stakeholder clarification during Phase 6 planning.

- **Investor dashboard metrics**: Research identified "revenue trends, growth metrics" as investor needs, but exact KPIs and visualization preferences need stakeholder input during Phase 7 planning. May need interviews with current investors to understand their reporting expectations.

These gaps are normal at this stage. They don't block roadmap creation but will need resolution during phase-specific planning.

## Sources

### Primary (HIGH confidence)
- **Next.js 15 official documentation** — App Router patterns, Server Components, Server Actions, API routes strategy
- **Prisma documentation** — Transaction patterns, migration workflow, TypeScript type generation, PostgreSQL best practices
- **FDA 21 CFR Part 117** — Food safety regulations for traceability requirements (24-hour forward/backward trace during recalls)
- **HACCP principles** — Quality control checkpoint requirements for food manufacturing
- **PostgreSQL documentation** — ACID compliance, transaction isolation levels, CHECK constraints, partial indexes for soft deletes

### Secondary (MEDIUM confidence)
- **Community consensus on food manufacturing ERP** — Table stakes features, differentiators for small-scale manufacturers (farmers market tracking, artisan production workflows)
- **Inventory management best practices** — FIFO enforcement patterns, multi-location tracking, movement-based audit trails
- **React Hook Form + Zod patterns** — Form state management for complex mobile forms, shared client/server validation
- **Supabase documentation** — PostgreSQL hosting, file storage patterns, real-time subscriptions for live inventory

### Tertiary (LOW confidence)
- **Small food manufacturer operational workflows** — Inferred from operating agreement and project description. Co-packer workflows, approval thresholds, channel breakdown based on limited context. Needs stakeholder validation.
- **Subscription edge cases** — Based on general SaaS subscription patterns, but food product subscriptions may have unique requirements (seasonal pausing, dietary restrictions, gift subscriptions). Needs research-phase at Phase 8.

---
*Research completed: 2026-02-13*
*Ready for roadmap: yes*
