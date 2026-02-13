# Requirements: JHB Command Center

**Defined:** 2026-02-13
**Core Value:** Production tracking is the foundation — every unit traceable from batch creation (with QC sign-off) through inventory location to sale.

## v1 Requirements

### Authentication & Access

- [ ] **AUTH-01**: User can log in with email and password
- [ ] **AUTH-02**: User can log in via magic link (optional)
- [ ] **AUTH-03**: Admin can invite users with pre-assigned roles via invite link
- [ ] **AUTH-04**: System enforces 4 role levels (Admin, Manager, Sales Rep, Investor)
- [ ] **AUTH-05**: Each user sees a role-appropriate dashboard on login

### Production & Quality Control

- [ ] **PROD-01**: User can create a batch with auto-generated MMDDYY batch code (append letter for multiples)
- [ ] **PROD-02**: User can select production source: In-House or Co-Packer
- [ ] **PROD-03**: Co-Packer selection shows partner dropdown, their lot number field, and receiving date
- [ ] **PROD-04**: User can enter pH level reading (required before batch can be released)
- [ ] **PROD-05**: User can record visual/taste QC check as pass/fail with notes
- [ ] **PROD-06**: Batch follows status workflow: Planned > In Progress > QC Review > Released > Hold
- [ ] **PROD-07**: Failed QC places batch on Hold — units do not enter available inventory
- [ ] **PROD-08**: User can optionally allocate batch quantities to locations at creation (must sum to total)
- [ ] **PROD-09**: User can track raw materials with lot numbers, suppliers, and expiration dates
- [ ] **PROD-10**: Co-packer partner list is configurable in settings (add/edit without code changes)
- [ ] **PROD-11**: Batch creation form is mobile-optimized for phone use at restaurant
- [ ] **PROD-12**: User can view batch list filtered by date range, product, source, and status
- [ ] **PROD-13**: User can view production capacity utilization vs 15,000 unit/month target
- [ ] **PROD-14**: Batch records are immutable — cannot be deleted, retained 2+ years

### Inventory Management

- [ ] **INV-01**: User can view real-time stock levels for every SKU at every location
- [ ] **INV-02**: Inventory grid uses color coding: green (healthy), yellow (reorder point), red (critical)
- [ ] **INV-03**: System enforces FIFO allocation using original production date across all locations
- [ ] **INV-04**: User can transfer inventory between locations with full audit trail
- [ ] **INV-05**: User can make inventory adjustments with reason codes (damage, shrinkage, sampling, expired)
- [ ] **INV-06**: Adjustments exceeding 2% variance require dual approval
- [ ] **INV-07**: User can track packaging materials (bottles, caps, labels) with 30-day supply alerts
- [ ] **INV-08**: System alerts when raw materials hit reorder points (2-week and 4-week lead times)
- [ ] **INV-09**: Every inventory movement creates audit trail entry (timestamp, user, from/to, SKU, qty, reason, reference)
- [ ] **INV-10**: System prevents negative inventory at database level
- [ ] **INV-11**: User can view inventory valuation report using FIFO cost method

### Order Management

- [ ] **ORD-01**: User can create orders from any channel with customer linkage
- [ ] **ORD-02**: Order follows status workflow: Draft > Confirmed > Processing > Shipped > Delivered > Completed
- [ ] **ORD-03**: System auto-allocates inventory on order confirmation using FIFO
- [ ] **ORD-04**: User can generate pick/pack lists for order fulfillment
- [ ] **ORD-05**: Order fulfillment automatically deducts inventory from shipping location
- [ ] **ORD-06**: Approval workflow enforced: under $150 auto-approve, $150-500 single approval, over $500 dual approval
- [ ] **ORD-07**: User can track orders across all 9 sales channels
- [ ] **ORD-08**: User can log farmers market/event sales with location, weather, and foot traffic notes
- [ ] **ORD-09**: User can create catering orders with 50% deposit tracking (balance 7 days before)

### Invoicing & Pricing

- [ ] **PRICE-01**: User can generate branded invoices with JHB branding
- [ ] **PRICE-02**: System tracks invoice status: Sent > Viewed > Partial Payment > Paid > Overdue
- [ ] **PRICE-03**: Net 30 payment terms with automatic overdue flagging at 31 days
- [ ] **PRICE-04**: Late payment interest calculated at 1.5% per month
- [ ] **PRICE-05**: User can view Accounts Receivable aging report (current, 30, 60, 90+ days)
- [ ] **PRICE-06**: System calculates volume discounts (5% at 6-10 cases, 10% at 11+ cases)
- [ ] **PRICE-07**: System applies frequency discounts (quarterly 2%, annual 5%)
- [ ] **PRICE-08**: User can set promotional pricing with date ranges
- [ ] **PRICE-09**: Pricing supports wholesale cash, wholesale Net 30, and retail tiers

### Customer & Partner CRM

- [ ] **CRM-01**: User can manage customer profiles with contact info, addresses, payment terms, credit limit
- [ ] **CRM-02**: System tracks customer types: Retail, Wholesale, Distributor, Restaurant, Subscription, Event
- [ ] **CRM-03**: User can view customer purchase history and lifetime value
- [ ] **CRM-04**: User can manage distributor agreements with territory assignments
- [ ] **CRM-05**: User can track distributor performance metrics and commissions
- [ ] **CRM-06**: User can manage subscription members (Standard/Premium, Monthly/Annual)
- [ ] **CRM-07**: System tracks subscription lifecycle: Active, Paused, Cancelled, Expired
- [ ] **CRM-08**: System sends renewal reminders 30 days before annual expiry
- [ ] **CRM-09**: 6-month loyalty reward tracking (1 month free)
- [ ] **CRM-10**: User can track leads through pipeline: Lead > Contacted > Meeting > Proposal > Negotiation > Closed
- [ ] **CRM-11**: User can set follow-up reminders on leads

### Financial Management

- [ ] **FIN-01**: User can log expenses with categories and receipt uploads
- [ ] **FIN-02**: Expense approval workflow enforced: under $150 auto, $150-500 single, over $500 dual, over $2,500 dual bank
- [ ] **FIN-03**: User can view daily revenue by channel
- [ ] **FIN-04**: User can view monthly revenue vs projections ($1.2M/$3.5M/$7.2M benchmarks)
- [ ] **FIN-05**: System calculates COGS per batch (materials, labor, overhead)
- [ ] **FIN-06**: User can view gross margin analysis by product
- [ ] **FIN-07**: User can generate P&L report (monthly, quarterly, annual)
- [ ] **FIN-08**: User can generate Cash Flow Statement
- [ ] **FIN-09**: User can view 90-day cash flow projections
- [ ] **FIN-10**: User can compare budget vs actual spending
- [ ] **FIN-11**: User can view weekly cash position reports

### Investor Dashboard

- [ ] **INVST-01**: Investor sees read-only dashboard with revenue trends and growth metrics
- [ ] **INVST-02**: Dashboard shows sales channel diversification
- [ ] **INVST-03**: Dashboard shows production capacity utilization
- [ ] **INVST-04**: Dashboard shows financial health metrics (revenue vs projections, unit economics)
- [ ] **INVST-05**: Dashboard shows ownership structure (70/30 split) and equity table
- [ ] **INVST-06**: Investor dashboard supports dark mode
- [ ] **INVST-07**: Investor can export dashboard as PDF report

### Reporting & Analytics

- [ ] **RPT-01**: Pre-built Daily Sales Summary by channel
- [ ] **RPT-02**: Pre-built Weekly Production Summary
- [ ] **RPT-03**: Pre-built Monthly P&L report
- [ ] **RPT-04**: Pre-built Inventory Valuation by location
- [ ] **RPT-05**: Pre-built Product Performance report (units, revenue, margin by SKU)
- [ ] **RPT-06**: Pre-built Farmers Market Performance comparison
- [ ] **RPT-07**: Pre-built Subscription Metrics (MRR, churn, LTV)
- [ ] **RPT-08**: All reports exportable to CSV, PDF, Excel
- [ ] **RPT-09**: Configurable alerts for low inventory, overdue invoices, QC failures, and expense approvals

### Document Management

- [ ] **DOC-01**: User can upload documents with categories (Agreements, Invoices, Certifications, SOPs, Marketing)
- [ ] **DOC-02**: Documents can be linked to relevant records (customer, order, batch)
- [ ] **DOC-03**: System tracks document versions
- [ ] **DOC-04**: Template library for invoices, purchase orders, wholesale agreements

### Executive Dashboard

- [ ] **DASH-01**: Dashboard shows Today's Revenue across all channels
- [ ] **DASH-02**: Dashboard shows MTD Revenue vs target
- [ ] **DASH-03**: Dashboard shows Units Produced this month vs 15,000 capacity (progress bar)
- [ ] **DASH-04**: Dashboard shows Current Inventory Value across all locations
- [ ] **DASH-05**: Dashboard shows Open Orders count and total value
- [ ] **DASH-06**: Dashboard shows Accounts Receivable with overdue highlighted
- [ ] **DASH-07**: Dashboard has quick action buttons (New Order, Log Batch, Record Expense, Transfer, Invoice)

### Infrastructure & Seed Data

- [ ] **INFRA-01**: Database pre-seeded with all 6 products, pricing tiers, and volume discounts
- [ ] **INFRA-02**: Database pre-seeded with all 7 locations
- [ ] **INFRA-03**: Database pre-seeded with all 9 sales channels
- [ ] **INFRA-04**: Database pre-seeded with 2 admin users (Anthony and Tunde)
- [ ] **INFRA-05**: Database pre-seeded with subscription plan configurations
- [ ] **INFRA-06**: Database pre-seeded with approval workflow thresholds
- [ ] **INFRA-07**: Mobile-first responsive design across all views
- [ ] **INFRA-08**: Caribbean-inspired color palette (deep green, gold, black)
- [ ] **INFRA-09**: Dark mode option
- [ ] **INFRA-10**: Toast notifications for real-time updates
- [ ] **INFRA-11**: Loading skeletons for data-heavy views

## v2 Requirements

### Social Media Integration

- **SOCIAL-01**: Dashboard shows social media metrics (followers, engagement, reach)
- **SOCIAL-02**: User can schedule and publish content to Instagram, TikTok from app
- **SOCIAL-03**: Social media analytics with post performance tracking

### Advanced Integrations

- **INTG-01**: Amazon Seller Central API auto-import
- **INTG-02**: Square POS live integration
- **INTG-03**: Stripe live payment processing
- **INTG-04**: QuickBooks/Xero accounting sync
- **INTG-05**: ShipStation shipping management

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native mobile app | Responsive web first — reassess after v1 launch |
| Full MES/APS automation | Over-engineering for 15K units/month scale |
| Built-in e-commerce storefront | Shopify/WooCommerce already solve this |
| IoT equipment monitoring | Hardware complexity, minimal benefit at current scale |
| Multi-currency support | USD-only for regional manufacturer |
| Built-in payroll | Use Gusto/ADP — track labor hours for COGS only |
| Real-time chat | Not core to operations — use Slack/text |
| Double-entry general ledger | Full accounting is a separate product — export to QuickBooks |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| — | — | — |

**Coverage:**
- v1 requirements: 95 total
- Mapped to phases: 0
- Unmapped: 95

---
*Requirements defined: 2026-02-13*
*Last updated: 2026-02-13 after initial definition*
