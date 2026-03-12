# JHB Command Center

## What This Is

A full-stack operations management application for Jamaica House Brand LLC — a Caribbean food products company (jerk sauce, Escovitch/Pikliz) based in Fort Lauderdale, FL. The app unifies production tracking, multi-location inventory, multi-channel sales, CRM, financial management, reporting, and document management into a single system. Built for two founders (Anthony and Tunde) who previously managed operations across fragmented tools (Square, Amazon Seller Central, spreadsheets).

**Shipped v1.0 MVP** — 53,698 LOC TypeScript across 498 files. Deployed on Vercel + Neon PostgreSQL.

## Core Value

Production tracking is the foundation — every unit must be traceable from batch creation (with QC sign-off) through inventory location to eventual sale. If nothing else works, the system must answer: "What did we make, did it pass QC, and where is it now?"

## Requirements

### Validated

- ✓ Authentication with 4 role levels (Admin, Manager, Sales Rep, Investor) and invite system — v1.0
- ✓ Production batch tracking with MMDDYY batch codes, in-house and co-packer support, required QC (pH, temp, pass/fail) — v1.0
- ✓ Multi-location inventory tracking across 7+ locations with real-time stock levels, color-coded alerts, and full movement audit trail — v1.0
- ✓ Raw materials and packaging materials tracking with FIFO, lot numbers, expiration dates, and reorder alerts — v1.0
- ✓ Order management with multi-channel support (9 channels) and FIFO inventory allocation — v1.0
- ✓ Invoicing with Net 30 terms, overdue flagging, 1.5% monthly late interest, and AR aging — v1.0
- ✓ Pricing engine with wholesale/retail tiers, volume discounts (5%/10%), frequency discounts (2%/5%), and promotional pricing — v1.0
- ✓ Customer/Partner CRM with customer types, purchase history, lifetime value — v1.0
- ✓ Subscription management with lifecycle tracking and loyalty rewards — v1.0
- ✓ Distributor management with territory assignments, performance metrics, and commission tracking — v1.0
- ✓ Lead pipeline with stages and follow-up reminders — v1.0
- ✓ Executive dashboard with KPI cards, revenue by channel, production vs. capacity — v1.0
- ✓ Financial management: revenue tracking, COGS, expense tracking with 4-tier approval workflow, P&L, cash flow, budget vs actual — v1.0
- ✓ Investor dashboard (read-only portal) with revenue trends, growth metrics, dark mode, PDF export — v1.0
- ✓ Reporting with 7 pre-built reports and CSV/PDF/Excel export — v1.0
- ✓ Document management with categories, version tracking, record linking, and template library — v1.0
- ✓ Pre-seeded database with all products, locations, channels, pricing, subscription plans, and company data — v1.0

### Active

- [ ] Amazon Seller Central full sync — orders, FBA inventory levels, sales reports, returns, fee tracking
- [ ] Square POS full sync — sales transactions, inventory counts, item catalog, customer data, payments from 3 restaurant locations
- [ ] Stripe full integration — payment processing, subscription management, refunds, data sync
- [ ] ShipStation integration — shipping labels, multi-carrier support (USPS/UPS/FedEx), tracking numbers, delivery notifications
- [ ] Proactive alert delivery — email/SMS for low inventory, overdue invoices, QC failures, expense approvals

## Current Milestone: v2.0 Connected

**Goal:** Transform the Command Center from a standalone system to a fully connected platform with live data sync from Amazon, Square, and Stripe, integrated shipping via ShipStation, and proactive email/SMS alerts.

**Target features:**
- Amazon Seller Central full sync (orders, inventory, sales, returns, fees)
- Square POS full sync (transactions, inventory, catalog, customers, payments)
- Stripe full integration (payment processing, subscriptions, refunds)
- ShipStation shipping (labels, tracking, multi-carrier)
- Email/SMS alert delivery (replacing in-app only)

### Out of Scope

- Social media integration (analytics + content scheduling/publishing) — deferred to future milestone after core operations are solid
- QuickBooks/Xero sync — CSV export for accountants first, API deferred
- Native mobile app — responsive web first, native later
- Real-time chat — not core to operations management
- Video content in documents — standard file uploads only
- Custom report builder — 7 pre-built reports cover current needs
- Balance sheet — requires asset/liability tracking not yet modeled

## Context

### Current State

Shipped v1.0 MVP with 53,698 LOC TypeScript.

**Tech stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Prisma 7.4 + Neon PostgreSQL, Zod v4, recharts, exceljs, @vercel/blob, jose (JWT), bcrypt, Resend (email), date-fns. Deployed on Vercel.

**Architecture:** Monorepo (`apps/command-center`). Server components + server actions pattern. React 19 `useActionState` for forms. FIFO inventory allocation via database transactions. 4-tier expense approval workflow. Role-based access control (Admin, Manager, Sales Rep, Investor).

**Known limitations:**
- No API integrations yet (Amazon, Square, Stripe) — CSV import is the bridge
- COGS uses 40% wholesale price proxy when batch materials/labor not entered
- Cash flow opening/closing balance not tracked (no bank account model)
- No custom report builder — 7 pre-built reports only
- No alert delivery system beyond in-app status panel

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
1. Miami Gardens Restaurant — Production facility + restaurant + retail
2. Broward Blvd Restaurant — Restaurant + retail (weekly delivery)
3. Miramar Restaurant — Restaurant + retail (weekly delivery)
4. Amazon FBA Warehouse — E-commerce fulfillment
5. Main Warehouse/Storage — Finished goods + raw materials
6. Farmers Markets — Rotating South Florida locations
7. Event/Tailgate Locations — Pop-up sales

### Sales Channels (9)
Amazon, Restaurant Retail (3 locations), Wholesale/Distribution (Net 30), Farmers Markets (Square/cash), E-commerce/Website (Stripe), Etsy, Subscription/Membership, Catering, Events/Tailgates

### Production Workflow
- Batch codes: MMDDYY format, append letter for multiples (021326A, 021326B)
- In-house production: Anthony at Miami Gardens
- Co-packer production: Space Coast Sauces (first partner), Tabanero Holdings (potential)
- QC: pH level (auto-fail at ≥4.6), visual/taste check (pass/fail + notes), temperature monitoring
- Current capacity: 15,000 units/month at 85% efficiency target

### Financial Rules
- Under $150: Auto-approve
- $150-$500: Single member approval + notification
- Over $500: Dual authorization required
- Over $2,500: Dual bank authorization required

## Constraints

- **Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Prisma 7.4 + Neon PostgreSQL, shadcn/ui, Zod v4. Deployed on Vercel.
- **Authentication:** JWT sessions via jose, bcrypt password hashing, magic link via Resend
- **Data Visualization:** Recharts via shadcn/ui ChartContainer
- **Validation:** Zod v4 (form level) + Prisma constraints (database level)
- **Performance:** Server components and server actions, parallel Promise.all queries, client-side filtering for small datasets
- **Mobile-first:** Responsive design — managers log batches and sales on phones at restaurants and farmers markets
- **Branding:** Caribbean-inspired colors — deep green, gold, black, hummingbird brand mark
- **Data Integrity:** FIFO inventory, batch records retained 2+ years (soft delete only), audit trail on all inventory movements
- **Food Safety:** pH auto-fail at ≥4.6, batch status state machine with enforced transitions

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Production tracking as first module | Everything flows from knowing what was produced and where it is | ✓ Good — batch data is foundation for inventory, orders, and finance |
| Build all 8 modules (full vision) | Founders want complete system for investor conversations | ✓ Good — delivered in 28 days |
| CSV import before API integration | Pragmatic bridge — gets data flowing immediately | — Pending — APIs not yet needed |
| MMDDYY batch code format | Matches existing manual workflow Anthony uses | ✓ Good — zero adoption friction |
| Founders-only initial users | Anthony and Tunde first, expand to team once workflows proven | — Pending |
| Tailwind CSS v4 + shadcn/ui | Latest version with improved performance, customizable components | ✓ Good |
| Prisma v7 with Neon PostgreSQL | Adapter pattern for connection pooling, direct URL for migrations | ✓ Good |
| jose for JWT (not jsonwebtoken) | ESM-native, Edge runtime compatible | ✓ Good |
| Resend for transactional email | Excellent DX, generous free tier | ✓ Good |
| FIFO valuation at 40% wholesale proxy | Placeholder COGS until material/labor data entered | ⚠️ Revisit — need real COGS data |
| prisma db push (not migrate dev) | Migration history drift from direct Neon deploys | ⚠️ Revisit — should move to migrate for production |
| window.print() for PDF export | Zero dependencies, Tailwind print: variants | ✓ Good — simple and effective |
| exceljs for Excel export | CVE-free alternative to xlsx package | ✓ Good |
| Polymorphic nullable FKs for documents | At-most-one constraint enforced in application layer | ✓ Good |
| Named Prisma relations throughout | Avoids ambiguous relation errors on multi-FK models | ✓ Good — consistent pattern |

---
*Last updated: 2026-03-12 after v2.0 milestone start*
