# External Integrations

**Analysis Date:** 2026-02-13

## APIs & External Services

**v1 (Not Integrated - CSV Import Only):**

These integrations are deferred to v2 and handled via CSV import in v1:

- **Amazon Seller Central** - e-commerce sales channel
  - SDK/Client: None (CSV import in v1)
  - Auth: None (CSV import in v1)
  - V2 Plan: Full API integration for auto-import of orders and inventory

- **Square POS** - restaurant/farmers market point-of-sale
  - SDK/Client: None (CSV import in v1)
  - Auth: None (CSV import in v1)
  - V2 Plan: Live API integration for real-time sales data

- **Stripe** - e-commerce payment processing
  - SDK/Client: None (CSV import in v1)
  - Auth: None (CSV import in v1)
  - V2 Plan: Live payment processing integration

- **QuickBooks / Xero** - Accounting software
  - SDK/Client: None (CSV export in v1)
  - Auth: None (CSV export in v1)
  - V2 Plan: Accounting sync for expense/revenue reconciliation

- **ShipStation** - Shipping management
  - SDK/Client: None (Manual in v1)
  - Auth: None (Manual in v1)
  - V2 Plan: Shipping order management integration

## Data Storage

**Databases:**

- **PostgreSQL 15+** (via Supabase)
  - Connection: `DATABASE_URL` environment variable
  - Client: Prisma ORM (`@prisma/client`)
  - Schema: `prisma/schema.prisma` defines all tables
  - Real-time subscriptions: Available via Supabase for live inventory updates

**File Storage:**

- **Supabase Storage** - Primary file storage
  - Purpose: QC photos, batch documentation, customer documents, invoice PDFs
  - Bucket structure: `/qc-photos`, `/batch-docs`, `/customer-files`, `/invoices`, `/reports`
  - Accessed via: `@supabase/supabase-js` client
  - Authentication: Supabase auth system with row-level security (RLS)

**Caching:**

- None currently implemented in v1
- Potential additions: Redis for session caching or batch allocation caching (deferred to performance optimization phase)

## Authentication & Identity

**Auth Provider:**

- **Auth.js (NextAuth v5)** - Credentials provider (email/password) with optional magic link
  - Implementation: Email/password login with password hashing (bcrypt)
  - Adapter: Prisma adapter for storing sessions and users
  - Config location: `src/auth.config.ts` (configuration) and `src/auth.ts` (initialization)
  - Session storage: PostgreSQL via Prisma (tables: `User`, `Account`, `Session`, `VerificationToken`)
  - Role-based access: 4 roles managed in database
    - Admin: Full system access, user management, settings
    - Manager: Operations access, batch/inventory/order management
    - Sales Rep: Sales and customer-facing features only
    - Investor: Read-only dashboard and reports
  - Magic link: Optional email-based sign-in (requires email service integration in v2)

## Monitoring & Observability

**Error Tracking:**

- Not integrated in v1
- Potential: Sentry, LogRocket (deferred to v2)

**Logs:**

- Browser console logs in development (Next.js debug output)
- Server logs via stdout/stderr (captured by deployment platform)
- Audit trail: Custom audit log table in PostgreSQL
  - Table: `AuditLog` in Prisma schema
  - Records: User ID, action, affected resource, before/after values, timestamp
  - All inventory movements, expense approvals, user changes logged

**Database Monitoring:**

- Supabase dashboard provides query performance metrics
- Prisma Studio available for local development debugging (`npx prisma studio`)

## CI/CD & Deployment

**Hosting:**

- **Vercel** (recommended) - Primary production platform
  - Native Next.js deployment
  - Environment variables managed in Vercel dashboard
  - Automatic deployments on git push to main/production branch
  - Serverless functions for API routes and server actions
  - Edge middleware support for authentication redirects

**Alternative Platforms:**

- AWS Amplify, Netlify, Railway, or any Node.js host supporting Next.js
- Requires PostgreSQL database separate from platform

**CI Pipeline:**

- Not configured in v1 (deferred to v2)
- Future: GitHub Actions for automated testing, linting, type-checking on PRs

## Environment Configuration

**Required env vars for local development:**

```
DATABASE_URL=postgresql://user:password@localhost:5432/jhb_command_center
NEXTAUTH_SECRET=generated-secret-key-for-production
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Required env vars for production:**

- All of above, plus:
- `NEXTAUTH_SECRET` - Must be strong random string (use `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Production domain (e.g., `https://command-center.jamaicahousebrand.com`)
- Database credentials for production PostgreSQL/Supabase

**Secrets location:**

- Local: `.env.local` (NOT in git — add to `.gitignore`)
- Production: Vercel environment variables dashboard (encrypted)
- Never commit `.env` files to git

**Configuration Template:**

- `.env.example` - Committed to git, shows required variables without values
- Developers copy `.env.example` to `.env.local` and fill in their local values

## Webhooks & Callbacks

**Incoming Webhooks:**

- None in v1
- V2 Future: Stripe webhooks (payment notifications), Amazon webhooks (order updates), Square webhooks (POS events)

**Outgoing Webhooks:**

- None implemented
- Potential: Slack notifications for approval thresholds, email notifications for order status, SMS for critical alerts (v2+)

## Email Integration

**Email Service:**

- Not integrated in v1
- V2 Plan: Email service for magic link authentication, invoice delivery, notification emails
- Potential providers: SendGrid, Resend, AWS SES

## Multi-Channel Sales Channels (Not Integrated APIs)

The system supports tracking orders from 9 channels, but v1 requires manual entry or CSV import:

1. **Amazon** - E-commerce (auto-import in v2)
2. **Restaurant Retail** (3 locations) - In-person sales (manual entry)
3. **Wholesale/Distribution** - Bulk orders (manual entry)
4. **Farmers Markets** - Pop-up sales (manual entry via mobile form)
5. **E-commerce/Website** - Direct sales (Stripe integration in v2)
6. **Etsy** - Marketplace (manual entry, could auto-import in v2)
7. **Subscription/Membership** - Recurring billing (manual management in v1)
8. **Catering** - Event/bulk orders (manual entry)
9. **Events/Tailgates** - Pop-up sales (manual entry)

All sales channels write to same database, enabling unified reporting and inventory allocation.

## Tax & Regulatory

**Tax Integration:**

- Not integrated in v1
- Future: Sales tax calculation per channel/location, tax report generation

**Compliance:**

- Food Safety: HACCP requirements enforced via database constraints
  - Batch records retained minimum 2 years (immutable, never deletable)
  - QC pH testing every batch
  - Temperature monitoring tracked in batch records
  - Lot traceability from production through sale

---

*Integration audit: 2026-02-13*
