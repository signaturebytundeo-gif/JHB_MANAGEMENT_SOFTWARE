# Technology Stack

**Project:** JHB Command Center
**Domain:** Food Manufacturing Operations Management
**Researched:** 2026-02-13
**Confidence:** MEDIUM-HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 15.x (App Router) | Full-stack React framework | Server Components for data-heavy dashboards, Server Actions for mutations, file-based routing, Vercel-native deployment |
| TypeScript | 5.4+ | Type-safe JavaScript | Critical for operations software — catches batch/inventory/financial calculation errors at compile time |
| React | 19.x (via Next.js) | UI library | Server Components reduce client bundle, Concurrent features improve mobile UX |
| PostgreSQL | 15+ (via Supabase) | Relational database | ACID compliance for financial transactions and inventory consistency, JSON support for batch metadata |
| Prisma | 5.x+ | Type-safe ORM | Auto-generated TypeScript types, version-controlled migrations, excellent for complex reporting queries |
| Supabase | Latest | Managed PostgreSQL + Storage | PostgreSQL hosting, file storage (QC photos, documents), real-time subscriptions for live inventory |

### Authentication

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Auth.js (NextAuth v5) | 5.x | Authentication | Native App Router support, Prisma adapter, flexible for 4-role RBAC (Admin/Manager/Sales/Investor) |

### UI & Styling

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Tailwind CSS | 3.4+ | Utility-first CSS | Rapid mobile-first responsive design for phone-based batch logging |
| shadcn/ui | Latest | Component library | Built on Radix UI, fully accessible, copy into codebase (no runtime dependency), Tailwind-styled |
| Recharts | 2.x | Data visualization | Pure React charts for production trends, sales analytics, inventory levels |

### Forms & Validation

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React Hook Form | 7.x+ | Form state management | Best performance for complex forms (batch entry), minimal re-renders on mobile |
| Zod | 3.x+ | Schema validation | Share validation schemas between client/server, generates TypeScript types |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-table | 8.x+ | Complex data tables | Batch history, inventory grid, sales records — headless, style with Tailwind |
| date-fns | 3.x+ | Date manipulation | Batch expiration tracking, production scheduling, financial periods |
| nuqs | Latest | URL search params | Shareable filtered views (inventory by location, sales by channel) |
| react-hot-toast | 2.x+ | Toast notifications | Batch save confirmations, error messages |
| @t3-oss/env-nextjs | Latest | Type-safe env vars | Validates environment variables at build time |
| react-dropzone | Latest | File uploads | QC photos, batch documentation, mobile camera capture |
| xlsx | Latest | Excel export/import | Inventory reports, bulk sales data import |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| ESLint + Prettier | Linting + formatting | Next.js built-in config + Tailwind class sorting plugin |
| Prisma Studio | Database GUI | Visual database editor for debugging production data |
| Vitest | Unit testing | Fast, TypeScript-native |

## Installation

```bash
npx create-next-app@latest jhb-command-center --typescript --tailwind --app --use-npm

npm install @prisma/client @auth/prisma-adapter next-auth@beta zod react-hook-form @hookform/resolvers @tanstack/react-table recharts date-fns clsx tailwind-merge react-hot-toast nuqs @supabase/supabase-js react-dropzone xlsx @t3-oss/env-nextjs

npm install -D prisma @types/node typescript eslint prettier prettier-plugin-tailwindcss vitest

npx prisma init
npx shadcn-ui@latest init
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js App Router | Remix | If preferring simpler forms model. Next.js has better Vercel integration. |
| Prisma | Drizzle ORM | If team has strong SQL skills and wants maximum type-safety + performance. |
| Auth.js | Clerk | If budget allows $25-100/mo and want to skip auth implementation entirely. |
| shadcn/ui | Tremor | If building dashboard-only app. shadcn/ui more flexible for custom operations UX. |
| Recharts | Chart.js | If needing more chart types. Recharts sufficient for operations dashboards. |
| Supabase | Neon | If only need database (no storage/realtime). Neon has better free tier for DB only. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| MongoDB | Wrong data model — inventory, batches, finances are relational. Eventual consistency risky for inventory. | PostgreSQL |
| Redux | Overcomplicated — Server Components reduce client state needs | React Context + Server Actions |
| Firebase | Vendor lock-in, unpredictable pricing, limited SQL for complex reporting | PostgreSQL + Supabase |
| Moment.js | Unmaintained, 200kb bundle | date-fns |
| GraphQL / tRPC | Overengineered for this scale — Server Actions cover mutations, Route Handlers cover APIs | Next.js Server Actions + API Routes |
| Styled Components | Runtime CSS-in-JS slows React 19 Server Components | Tailwind CSS |
| Express backend | Next.js is full-stack — separate backend adds deployment complexity | Next.js API Routes / Server Actions |

## API Strategy

- **Server Actions** for mutations (batch creation, inventory adjustments, expense logging)
- **API Route Handlers** for webhooks (Stripe, payment processors), external integrations, file downloads (PDF/Excel)
- **Server Components** for data fetching (direct Prisma queries, no API layer needed)

---
*Stack research for: Food Manufacturing Operations Management*
*Researched: 2026-02-13*
