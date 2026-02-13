# JHB Command Center

## What This Is

A full-stack operations management application for Jamaica House Brand LLC — a Caribbean food products company (jerk sauce, Escovitch/Pikliz) based in Fort Lauderdale, FL. The app unifies production tracking, multi-location inventory, multi-channel sales, financial management, and investor reporting into a single system. Built for two founders (Anthony and Tunde) who currently manage operations across fragmented tools (Square, Amazon Seller Central, spreadsheets) with no unified visibility.

## Core Value

Production tracking is the foundation — every unit must be traceable from batch creation (with QC sign-off) through inventory location to eventual sale. If nothing else works, the system must answer: "What did we make, did it pass QC, and where is it now?"

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Authentication with 4 role levels (Admin, Manager, Sales Rep, Investor) and invite system
- [ ] Production batch tracking with MMDDYY batch codes, in-house and co-packer support, required QC (pH, temp, pass/fail), and optional location allocation at creation
- [ ] Multi-location inventory tracking across 7+ locations with real-time stock levels, color-coded alerts, and full movement audit trail
- [ ] Raw materials and packaging materials tracking with FIFO, lot numbers, expiration dates, and reorder alerts (2-week and 4-week lead times)
- [ ] Order management with multi-channel support (Amazon, Restaurant, Wholesale, Farmers Markets, DTC, Subscription, Catering, Events)
- [ ] Invoicing with Net 30 terms, overdue flagging, 1.5% monthly late interest, and AR aging
- [ ] Pricing engine with wholesale/retail tiers, volume discounts (5%/10%), frequency discounts (2%/5%), and promotional pricing
- [ ] Customer/Partner CRM with customer types, purchase history, lifetime value, and communication log
- [ ] Subscription management (Standard $75/yr or $13/mo, Premium $125/yr or $20/mo) with lifecycle tracking and loyalty rewards
- [ ] Distributor management with territory assignments, performance metrics, and commission tracking
- [ ] Lead pipeline (H-E-B, Costco, Whole Foods LEAP, potential investors) with stages and follow-up reminders
- [ ] Executive dashboard with KPI cards, revenue by channel, production vs. capacity, inventory levels, margin trends
- [ ] Financial management: revenue tracking, cost management, expense tracking with approval workflows ($150/$500/$2,500 thresholds), cash flow, and full financial reports (P&L, Balance Sheet, Cash Flow Statement)
- [ ] Investor dashboard (read-only portal) with revenue trends, growth metrics, market traction, unit economics, and ownership/equity visualization
- [ ] Reporting & analytics with 10+ pre-built reports, custom report builder, and configurable alerts/notifications
- [ ] Document management with categories, version tracking, and template library
- [ ] Pre-seeded database with all products, locations, channels, pricing, subscription plans, and company data

### Out of Scope

- Social media integration (analytics + content scheduling/publishing) — deferred to future Module 11 after core operations are solid
- Amazon Seller Central API integration — CSV import first, API later
- Square POS live integration — CSV import first, API later
- Stripe live integration — CSV import first, API later
- QuickBooks/Xero sync — CSV export for accountants first
- ShipStation integration — manual shipping management first
- Native mobile app — responsive web first, native later
- Real-time chat — not core to operations management
- Video content in documents — standard file uploads only

## Context

### Company Information
- **Entity:** Jamaica House Brand LLC
- **Address:** 200 S. Andrews Ave Ste 504 #1168, Fort Lauderdale, FL 33301
- **Members:**
  - Anthony Amos Jr. — CEO/Founder (70% ownership) — Food Production Division — anthony@jamaicahousebrand.com — (305) 965-7494
  - Olatunde Ogunjulugbe — President (30% ownership) — Marketing & Distribution — tunde@jamaicahousebrand.com — (786) 709-1027
- **Other Key Personnel:**
  - Olutomiwa Ogunjulugbe — Creative Director
  - Xavier Artis — Business Development
  - Alejandra — Sales Representative

### Current State
- Using multiple disconnected tools (Square for POS, Amazon Seller Central, spreadsheets)
- No unified inventory visibility across locations
- Difficulty reconciling revenue/expenses across channels
- Investor conversations coming in the next few months — need professional reporting
- Amazon channel showing 3,500%+ YoY growth ($2,038.59 YTD, 133 units Jan-Jul 2025)
- 15,000+ Instagram followers, 4.8% engagement rate, 92% customer satisfaction

### Product Catalog (6 SKUs)

| Product | Size | Units/Case | Wholesale Cash | Wholesale Net 30 | Retail |
|---------|------|-----------|----------------|-------------------|--------|
| Original Jerk Sauce | 2oz | 25/case | $3.00/unit ($75/case) | — | $3.50-4.00 |
| Original Jerk Sauce | 5oz | 12/case | $5.00/unit ($60/case) | $6.25/unit ($75/case) | $7.00-8.00 |
| Original Jerk Sauce | 10oz | 12/case | $10.00/unit ($110/case) | $12.50/unit ($150/case) | $12.00-15.00 |
| Escovitch/Pikliz | 12oz | 12/case | $4.58/unit ($55/case) | — | $6.00-8.00 |
| Original Jerk Sauce | 1 gallon | 1 | $80.00 (intro: $50 first 3mo) | $100.00 | — |
| Original Jerk Sauce | 9g sachet | TBD | — | — | — |

### Locations (7)
1. Miami Gardens Restaurant — Production facility + restaurant + retail (some locations open, some planned)
2. Broward Blvd Restaurant — Restaurant + retail (weekly delivery)
3. Miramar Restaurant — Restaurant + retail (weekly delivery)
4. Amazon FBA Warehouse — E-commerce fulfillment
5. Main Warehouse/Storage — Finished goods + raw materials
6. Farmers Markets — Rotating South Florida locations
7. Event/Tailgate Locations — Pop-up sales

### Sales Channels (9)
Amazon, Restaurant Retail (3 locations), Wholesale/Distribution (Net 30), Farmers Markets (Square/cash), E-commerce/Website (Stripe), Etsy, Subscription/Membership, Catering, Events/Tailgates

### Production Workflow (from Anthony)
- Batch codes: MMDDYY format, append letter for multiples (021326A, 021326B)
- **In-house production:** Anthony at Miami Gardens. Simple: date, product, quantity, QC
- **Co-packer production:** Space Coast Sauces (first partner), Tabanero Holdings (potential). Stores their lot number, receiving date, quantity received alongside our internal batch code
- **QC:** pH level (required before release), visual/taste check (pass/fail + notes), temperature monitoring. Failed QC = batch on Hold, not available inventory
- **Allocation:** Optional at batch creation — split units to locations (must sum to total), or leave all at production location and transfer later
- **Form must be clean and fast** — mobile-friendly, minimal required fields: date/batch code, source, product, quantity, pH, pass/fail, optional location splits
- Current capacity: 15,000 units/month at 85% efficiency target

### Financial Rules (from Operating Agreement)
- Under $150: Auto-approve
- $150-$500: Single member approval + notification
- Over $500: Dual authorization required
- Over $2,500: Dual bank authorization required
- Monthly financial statements (internal), quarterly (external firm)
- Weekly cash flow reports, daily bank reconciliation

### Volume Discounts
- 1-5 cases: Standard price
- 6-10 cases: 5% discount
- 11+ cases: 10% discount
- Quarterly orders: +2% discount
- Annual contracts: +5% discount + priority allocation

### Revenue Projections (benchmarks)
- Year 1: $1.2M
- Year 2: $3.5M
- Year 3: $7.2M
- Target margins: 70% (Y1), 72% (Y2), 75% (Y3)

### Co-Packing Partners
- Space Coast Sauces — confirmed first co-packing partner
- Tabanero Holdings — potential future partner
- Partner list should be configurable in settings (add/edit without code changes)

### Subscription Plans
- Standard Annual: $75/yr — 1x 5oz monthly + gift bottle
- Premium Annual: $125/yr — 1x 10oz monthly + gift bottle
- Standard Monthly: $13/mo — 2x 5oz monthly
- Premium Monthly: $20/mo — 2x 10oz monthly
- 6-month loyalty reward: 1 month free
- Cancellation requires 30 days written notice

## Constraints

- **Tech Stack:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Prisma ORM, PostgreSQL — flexible on specifics but this is the direction. Deploy-ready for Vercel + Supabase
- **Authentication:** NextAuth.js with credentials provider (email/password) + optional magic link
- **Data Visualization:** Recharts
- **Validation:** Zod (form level) + Prisma constraints (database level)
- **Performance:** Server components and server actions where possible, optimistic UI updates, database transactions for inventory changes
- **Mobile-first:** Responsive design — managers log batches and sales on their phones at restaurants and farmers markets
- **Branding:** Caribbean-inspired colors — deep green, gold, black, hummingbird brand mark
- **Accessibility:** ARIA labels, keyboard navigation, screen reader support
- **Data Integrity:** FIFO inventory, production batch records retained 2+ years (never deletable), audit trail on all inventory movements, all data changes logged with before/after values
- **Food Safety:** HACCP critical control points enforced — ingredient receiving, cooking temp/time, pH levels, bottle sealing, final storage. pH testing every batch, temperature monitoring, monthly microbiological testing
- **Regulatory:** Batch records retained minimum 2 years, full lot traceability from production through sale

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Production tracking as first module | Everything flows from knowing what was produced and where it is — inventory, sales, and finances all depend on batch data | — Pending |
| Build all 10 modules (full vision) | The founders want the complete system, not an MVP — investor conversations approaching and operations need full coverage | — Pending |
| CSV import before API integration | Pragmatic bridge — gets data flowing immediately without API complexity. Amazon, Square, Stripe, QuickBooks APIs come later | — Pending |
| Social media as future Module 11 | Analytics + content scheduling deferred until core operations modules are solid | — Pending |
| MMDDYY batch code format | Matches existing manual workflow Anthony already uses — zero adoption friction | — Pending |
| Co-packer as configurable list | Space Coast Sauces is first, but more partners likely — settings-managed list avoids code changes | — Pending |
| Founders-only initial users | Anthony and Tunde first, expand to team (Alejandra, Xavier, market reps) once workflows are proven | — Pending |

---
*Last updated: 2026-02-13 after initialization*
