# Roadmap: JHB Command Center

## Overview

This roadmap transforms fragmented operations (Square, Amazon, spreadsheets) into a unified production-to-sale system for Jamaica House Brand. The journey starts with foundational infrastructure and authentication, builds core production batch tracking with QC controls, establishes multi-location inventory with FIFO enforcement, implements order fulfillment and multi-channel sales, adds financial management with approval workflows, and culminates in executive and investor dashboards. Every unit is traceable from batch creation through QC sign-off to eventual sale, with full audit trails for regulatory compliance.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Authentication** - Auth, roles, seed data, database foundation
- [ ] **Phase 2: Production & Quality Control** - Batch tracking with MMDDYY codes, QC workflows, co-packer support
- [ ] **Phase 3: Inventory Management** - Multi-location FIFO, transfers, raw materials, audit trails
- [ ] **Phase 4: Order Management** - Order lifecycle, fulfillment, inventory allocation
- [ ] **Phase 5: Sales Channels & CRM** - Multi-channel sales, pricing engine, customer management
- [ ] **Phase 6: Financial Management** - Expenses, approvals, revenue tracking, financial reports
- [ ] **Phase 7: Dashboards & Reporting** - Executive dashboard, investor portal, analytics
- [ ] **Phase 8: Document Management** - Document uploads, versioning, templates

## Phase Details

### Phase 1: Foundation & Authentication
**Goal**: Users can securely access the system with role-appropriate views, and the database contains all foundational data needed for operations.

**Depends on**: Nothing (first phase)

**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07, INFRA-08, INFRA-09, INFRA-10, INFRA-11

**Success Criteria** (what must be TRUE):
  1. User can log in with email/password and see role-specific dashboard
  2. Admin can send invite links that create users with pre-assigned roles
  3. System enforces access control: Admin sees all, Manager sees operations, Sales Rep sees sales, Investor sees read-only metrics
  4. Database contains all 6 products with complete pricing tiers and volume discounts
  5. Database contains all 7 locations, 9 sales channels, subscription plans, and approval thresholds

**Plans**: TBD

Plans:
- [ ] 01-01: TBD during phase planning
- [ ] 01-02: TBD during phase planning
- [ ] 01-03: TBD during phase planning

### Phase 2: Production & Quality Control
**Goal**: Users can create production batches with auto-generated lot codes, track QC testing, and ensure only passed batches enter available inventory.

**Depends on**: Phase 1

**Requirements**: PROD-01, PROD-02, PROD-03, PROD-04, PROD-05, PROD-06, PROD-07, PROD-08, PROD-09, PROD-10, PROD-11, PROD-12, PROD-13, PROD-14

**Success Criteria** (what must be TRUE):
  1. User can create batch on mobile phone with auto-generated MMDDYY code and optional location allocation
  2. User can select In-House or Co-Packer production source with partner-specific fields
  3. User can enter pH reading and pass/fail QC check
  4. Batches that fail QC are placed on Hold and units do not enter available inventory
  5. Batch records are immutable and retained forever (cannot be deleted)
  6. User can view production capacity utilization vs 15,000 unit/month target

**Plans**: TBD

Plans:
- [ ] 02-01: TBD during phase planning
- [ ] 02-02: TBD during phase planning
- [ ] 02-03: TBD during phase planning

### Phase 3: Inventory Management
**Goal**: Users can view real-time stock levels across all locations, transfer inventory with FIFO enforcement, and track every movement with full audit trails.

**Depends on**: Phase 2

**Requirements**: INV-01, INV-02, INV-03, INV-04, INV-05, INV-06, INV-07, INV-08, INV-09, INV-10, INV-11

**Success Criteria** (what must be TRUE):
  1. User sees real-time stock levels for every SKU at every location with color-coded alerts
  2. System enforces FIFO allocation using original production date across all locations (transfers preserve FIFO)
  3. User can transfer inventory between locations and make adjustments with reason codes
  4. All inventory movements create immutable audit trail entries with timestamp, user, reason
  5. System prevents negative inventory at database level
  6. User can track raw materials and packaging with expiration dates and reorder alerts

**Plans**: TBD

Plans:
- [ ] 03-01: TBD during phase planning
- [ ] 03-02: TBD during phase planning
- [ ] 03-03: TBD during phase planning
- [ ] 03-04: TBD during phase planning

### Phase 4: Order Management
**Goal**: Users can create orders, allocate inventory via FIFO, track fulfillment workflow, and generate invoices with payment terms.

**Depends on**: Phase 3

**Requirements**: ORD-01, ORD-02, ORD-03, ORD-04, ORD-05, ORD-06, ORD-07, ORD-08, ORD-09, PRICE-01, PRICE-02, PRICE-03, PRICE-04, PRICE-05

**Success Criteria** (what must be TRUE):
  1. User can create order with customer linkage and system auto-allocates inventory using FIFO
  2. User can track order through workflow: Draft > Confirmed > Processing > Shipped > Delivered
  3. User can generate pick/pack lists and order fulfillment deducts inventory from correct location
  4. User can generate branded invoices with Net 30 terms and automatic overdue flagging
  5. System tracks invoice status and late payment interest at 1.5% per month
  6. User can view Accounts Receivable aging report (current, 30, 60, 90+ days)

**Plans**: TBD

Plans:
- [ ] 04-01: TBD during phase planning
- [ ] 04-02: TBD during phase planning
- [ ] 04-03: TBD during phase planning

### Phase 5: Sales Channels & CRM
**Goal**: Users can track orders across all 9 sales channels, apply channel-specific pricing rules, and manage customer relationships with purchase history.

**Depends on**: Phase 4

**Requirements**: PRICE-06, PRICE-07, PRICE-08, PRICE-09, CRM-01, CRM-02, CRM-03, CRM-04, CRM-05, CRM-06, CRM-07, CRM-08, CRM-09, CRM-10, CRM-11

**Success Criteria** (what must be TRUE):
  1. User can create orders from any of 9 channels with channel-specific workflows
  2. System automatically calculates volume discounts (5% at 6-10 cases, 10% at 11+ cases)
  3. System applies frequency discounts (quarterly 2%, annual 5%) and promotional pricing
  4. User can log farmers market/event sales with location, weather, foot traffic notes
  5. User can manage customer profiles with purchase history, lifetime value, and payment terms
  6. User can manage distributor agreements with territory assignments and commission tracking
  7. User can track subscription members with lifecycle status and 6-month loyalty rewards
  8. User can manage lead pipeline with stages and follow-up reminders

**Plans**: TBD

Plans:
- [ ] 05-01: TBD during phase planning
- [ ] 05-02: TBD during phase planning
- [ ] 05-03: TBD during phase planning
- [ ] 05-04: TBD during phase planning

### Phase 6: Financial Management
**Goal**: Users can track expenses with approval workflows, view revenue by channel, calculate COGS, and generate financial reports.

**Depends on**: Phase 5

**Requirements**: FIN-01, FIN-02, FIN-03, FIN-04, FIN-05, FIN-06, FIN-07, FIN-08, FIN-09, FIN-10, FIN-11

**Success Criteria** (what must be TRUE):
  1. User can log expenses with categories and receipt uploads
  2. System enforces approval workflow: under $150 auto, $150-500 single approval, over $500 dual approval, over $2,500 dual bank authorization
  3. User can view daily revenue by channel and monthly revenue vs projections
  4. System calculates COGS per batch (materials, labor, overhead)
  5. User can generate P&L report, Cash Flow Statement, and view 90-day cash flow projections
  6. User can compare budget vs actual spending

**Plans**: TBD

Plans:
- [ ] 06-01: TBD during phase planning
- [ ] 06-02: TBD during phase planning
- [ ] 06-03: TBD during phase planning

### Phase 7: Dashboards & Reporting
**Goal**: Executives see real-time KPIs and quick actions, investors see read-only metrics, and users can generate operational reports.

**Depends on**: Phase 6

**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07, INVST-01, INVST-02, INVST-03, INVST-04, INVST-05, INVST-06, INVST-07, RPT-01, RPT-02, RPT-03, RPT-04, RPT-05, RPT-06, RPT-07, RPT-08, RPT-09

**Success Criteria** (what must be TRUE):
  1. Executive dashboard shows Today's Revenue, MTD Revenue vs target, Units Produced vs capacity, Current Inventory Value, Open Orders, Accounts Receivable
  2. Dashboard has quick action buttons: New Order, Log Batch, Record Expense, Transfer, Invoice
  3. Investor sees read-only dashboard with revenue trends, channel diversification, production capacity, financial health, ownership structure
  4. Investor can export dashboard as PDF report and toggle dark mode
  5. User can generate pre-built reports: Daily Sales Summary, Weekly Production, Monthly P&L, Inventory Valuation, Product Performance, Farmers Market Performance, Subscription Metrics
  6. All reports exportable to CSV, PDF, Excel
  7. System sends configurable alerts for low inventory, overdue invoices, QC failures, expense approvals

**Plans**: TBD

Plans:
- [ ] 07-01: TBD during phase planning
- [ ] 07-02: TBD during phase planning
- [ ] 07-03: TBD during phase planning

### Phase 8: Document Management
**Goal**: Users can upload documents linked to records, track versions, and access template library.

**Depends on**: Phase 7

**Requirements**: DOC-01, DOC-02, DOC-03, DOC-04

**Success Criteria** (what must be TRUE):
  1. User can upload documents with categories (Agreements, Invoices, Certifications, SOPs, Marketing)
  2. Documents can be linked to customers, orders, or batches
  3. System tracks document versions and shows version history
  4. Template library provides downloadable templates for invoices, purchase orders, wholesale agreements

**Plans**: TBD

Plans:
- [ ] 08-01: TBD during phase planning

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Authentication | 0/3 | Not started | - |
| 2. Production & Quality Control | 0/3 | Not started | - |
| 3. Inventory Management | 0/4 | Not started | - |
| 4. Order Management | 0/3 | Not started | - |
| 5. Sales Channels & CRM | 0/4 | Not started | - |
| 6. Financial Management | 0/3 | Not started | - |
| 7. Dashboards & Reporting | 0/3 | Not started | - |
| 8. Document Management | 0/1 | Not started | - |
