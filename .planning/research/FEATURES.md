# Feature Landscape

**Domain:** Food Manufacturing Operations Management
**Researched:** 2026-02-13
**Confidence:** MEDIUM

## Table Stakes

Features users expect. Missing = product feels incomplete.

### Production & Quality Control

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Batch tracking with lot codes | FDA traceability requirement (21 CFR Part 117) | MEDIUM | MMDDYY format with append letters for multiples |
| Quality control checkpoints | Food safety (HACCP, GMP) | MEDIUM | pH required before release, temp monitoring, pass/fail |
| Raw material tracking | Traceability regulations | MEDIUM | Lot numbers, expiration dates, supplier linkage |
| Production status workflow | Core manufacturing workflow | LOW | Planned > In Progress > QC Review > Released > Hold |
| Co-packer vs in-house tracking | Common in small food manufacturing | LOW | Different data capture per source type |

### Inventory Management

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Multi-location inventory | Standard for distribution operations | MEDIUM | 7 locations with real-time visibility |
| Lot/batch expiration tracking | Food safety and waste reduction | MEDIUM | FIFO/FEFO enforcement, expiration alerts |
| Stock level alerts | Prevent stockouts | LOW | Configurable reorder points per SKU per location |
| Inventory transfers | Multi-location operations | LOW | Audit trail on all movements |
| Inventory adjustments | Operational necessity | LOW | Reason codes, approval for variance > 2% |

### Sales & Orders

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Order entry and fulfillment | Core business function | MEDIUM | Pick/pack/ship workflow |
| Multi-channel order tracking | Modern sales reality | HIGH | 9 channels with different workflows |
| Invoicing with payment terms | Legal and accounting requirement | MEDIUM | Net 30, overdue flagging, AR aging |
| Pricing tiers | Revenue operations | MEDIUM | Wholesale/retail, volume discounts, payment term differentials |

### Financial Management

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Expense tracking | Business operations | LOW | Categorized with receipt uploads |
| Approval workflows | Operating agreement compliance | MEDIUM | $150/$500/$2,500 thresholds |
| Revenue tracking by channel | Business decision-making | MEDIUM | Daily/monthly breakdown |
| Basic financial reports | Management oversight | MEDIUM | P&L, Cash Flow, Balance Sheet |
| COGS tracking | Profitability analysis | MEDIUM | Material + labor + overhead per batch |

## Differentiators

Features that set product apart. Not expected in generic ERP, but critical for JHB.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Farmers market/event sales tracking | Ignored by enterprise ERP — critical for artisan food businesses | MEDIUM | On-site inventory, cash/card, event profitability |
| Subscription management | Growing DTC model unique to specialty food | HIGH | Recurring billing, pause/cancel, loyalty rewards |
| pH testing workflow with batch blocking | Food safety for acidified foods, typically manual | MEDIUM | Digital pH logs tied to batches, auto-hold if fail |
| Batch allocation at creation | Operational efficiency for pre-sold inventory | MEDIUM | Split units to locations at production time |
| Investor dashboard (read-only) | Transparency for funded food startups | MEDIUM | Revenue trends, growth metrics, formatted for non-operators |
| Mobile batch logging | On-production-floor usability | MEDIUM | Clean, fast form for phone at restaurant |
| MMDDYY auto-generated batch codes | Matches existing manual workflow | LOW | Zero adoption friction, append letters for multiples |
| Co-packer partner management | Configurable list, their lot numbers alongside internal codes | LOW | Settings-managed, no code changes to add partners |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full MES (Manufacturing Execution System) | Over-engineering for 15K units/month | Simple production orders with manual status updates |
| Advanced Planning & Scheduling (APS) | Complexity overwhelms value at small scale | Calendar-based scheduling, human judgment |
| Built-in e-commerce storefront | Shopify/WooCommerce already solve this | Integrate with existing platforms |
| IoT equipment monitoring | Hardware complexity, minimal benefit for small batch | Manual entry of batch data |
| Multi-currency support | Unlikely for regional manufacturer | Invoice in USD only |
| Full barcode scanning system | Hardware costs for small team | Manual entry, selective barcodes later |
| Built-in payroll | Specialized compliance domain | Integrate with Gusto/ADP, track labor hours for COGS only |
| Custom report builder (drag-and-drop) | Users struggle to build useful reports | Pre-built reports covering 90% of needs, export to Excel |
| Real-time chat | Not core to operations management | Use existing tools (Slack, text) |
| Double-entry general ledger | Full accounting system is a separate product | Export to QuickBooks/Xero for proper accounting |

## Feature Dependencies

```
Production (Batch Tracking)
    └── requires → Product Catalog + Locations (foundation)
    └── enables → Inventory Management (batch completion adds stock)
    └── enables → QC Workflow (batches need QC before release)

Inventory Management
    └── requires → Production (source of finished goods)
    └── enables → Order Fulfillment (can't ship without stock)
    └── enables → Financial (COGS calculation from inventory)

Order Management
    └── requires → Inventory (allocation for fulfillment)
    └── requires → Customer Management (who's ordering)
    └── enables → Invoicing (bill for what shipped)

Financial Management
    └── requires → Orders + Inventory (revenue + COGS sources)
    └── enables → Investor Dashboard (financial metrics)
    └── enables → Reporting (financial reports)

Investor Dashboard
    └── requires → Financial + Sales + Production data
    └── last to build (needs all other modules)
```

## Feature Prioritization

| Feature | User Value | Complexity | Priority |
|---------|------------|------------|----------|
| Batch tracking with lot codes | HIGH | MEDIUM | P1 |
| pH testing / QC workflow | HIGH | MEDIUM | P1 |
| Multi-location inventory | HIGH | MEDIUM | P1 |
| Order management | HIGH | MEDIUM | P1 |
| Invoicing with payment terms | HIGH | MEDIUM | P1 |
| Multi-channel sales tracking | HIGH | HIGH | P2 |
| Customer/distributor CRM | MEDIUM | MEDIUM | P2 |
| Financial reporting | MEDIUM | MEDIUM | P2 |
| Expense tracking + approvals | MEDIUM | MEDIUM | P2 |
| Subscription management | HIGH | HIGH | P3 |
| Investor dashboard | MEDIUM | MEDIUM | P3 |
| Lead pipeline | LOW | MEDIUM | P3 |
| Document management | LOW | LOW | P3 |

---
*Feature research for: JHB Command Center*
*Researched: 2026-02-13*
