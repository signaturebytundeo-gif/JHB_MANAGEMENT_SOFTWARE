# Technology Stack

**Analysis Date:** 2026-02-13

## Languages

**Primary:**
- TypeScript 5.4+ - Full-stack type safety for operations software, catches batch/inventory/financial calculation errors at compile time
- JavaScript (via TypeScript transpilation) - React/Next.js client and server code

**Secondary:**
- SQL - PostgreSQL queries, database migrations via Prisma

## Runtime

**Environment:**
- Node.js - Latest LTS or matching specified version
- Browser environment - React 19 via Next.js

**Package Manager:**
- npm - Specified in Next.js init; lockfile: `package-lock.json`

## Frameworks

**Core:**
- Next.js 15.x (App Router) - Full-stack React framework, server components for data-heavy dashboards, server actions for mutations, Vercel-native deployment
- React 19.x - UI library via Next.js, server components reduce client bundle, concurrent features improve mobile UX

**Authentication:**
- Auth.js (NextAuth v5) 5.x - Native App Router support, Prisma adapter, flexible for 4-role RBAC (Admin/Manager/Sales/Investor)

**UI & Styling:**
- Tailwind CSS 3.4+ - Utility-first CSS for rapid mobile-first responsive design
- shadcn/ui (Latest) - Component library built on Radix UI, fully accessible, copy into codebase pattern

**Data Visualization:**
- Recharts 2.x - Pure React charts for production trends, sales analytics, inventory levels

**Forms & Validation:**
- React Hook Form 7.x+ - Form state management with best performance for complex forms (batch entry), minimal re-renders on mobile
- Zod 3.x+ - Schema validation shared between client/server, generates TypeScript types

**ORM & Database:**
- Prisma 5.x+ - Type-safe ORM, auto-generated TypeScript types, version-controlled migrations, excellent for complex reporting queries

**Data Tables:**
- @tanstack/react-table 8.x+ - Headless data table library for batch history, inventory grids, sales records — styled with Tailwind

## Key Dependencies

**Critical:**
- @auth/prisma-adapter - NextAuth.js Prisma adapter for session/user storage
- @prisma/client - Prisma client library for database queries
- next-auth - Authentication middleware and session handling
- zod - Schema validation for forms and API inputs

**Infrastructure:**
- @supabase/supabase-js - Supabase client for file storage and real-time subscriptions
- date-fns 3.x+ - Date manipulation for batch expiration tracking, production scheduling, financial periods
- nuqs (Latest) - URL search params for shareable filtered views (inventory by location, sales by channel)
- react-hot-toast 2.x+ - Toast notifications for batch save confirmations, error messages
- @t3-oss/env-nextjs - Type-safe environment variable validation at build time
- react-dropzone - File uploads for QC photos, batch documentation, mobile camera capture
- xlsx - Excel export/import for inventory reports, bulk sales data imports
- clsx + tailwind-merge - Conditional class composition for Tailwind utility classes

## Configuration

**Environment:**
- `.env.local` - Required for local development (not in git, never commit secrets)
- `.env.example` - Template showing required variables (in git)
- Key variables: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, Supabase credentials

**Build:**
- `tsconfig.json` - TypeScript configuration with path aliases for cleaner imports
- `next.config.js` - Next.js configuration (app router, image optimization, redirects)
- `.eslintrc.json` - Linting rules extending Next.js preset
- `.prettierrc` - Code formatting rules (2-space indent, trailing commas, Tailwind class sorting)
- `tailwind.config.ts` - Tailwind configuration with Caribbean-inspired colors (deep green, gold, black)
- `prisma/schema.prisma` - Database schema definition and migrations

## Database

**Primary:**
- PostgreSQL 15+ via Supabase - ACID compliance for financial transactions and inventory consistency, JSON support for batch metadata

**ORM:**
- Prisma 5.x+ - Manages all database queries, migrations, and type generation from schema

**Migrations:**
- Prisma migrations - Version-controlled, run via `npx prisma migrate dev`
- Location: `prisma/migrations/`

## File Storage

**Service:**
- Supabase Storage - QC photos, batch documentation, customer documents, invoice PDFs
- Alternative: Could use AWS S3 or local file system, but Supabase provides integrated PostgreSQL + storage

**Managed by:**
- @supabase/supabase-js client library

## Platform Requirements

**Development:**
- Node.js LTS or matching version specified in `.nvmrc`
- npm (v10+ recommended)
- PostgreSQL 15+ running locally OR Supabase project
- Git for version control
- Code editor (VSCode recommended with Tailwind, ESLint, Prettier extensions)

**Production:**
- Vercel (recommended) - Native Next.js deployment, serverless functions, edge middleware
- Alternative: Any platform supporting Node.js 18+ and PostgreSQL
- Supabase PostgreSQL database
- Environment variables securely managed in deployment platform

## Performance Optimizations

**Server-Side:**
- Server Components by default - Reduces JavaScript sent to browser
- Server Actions for mutations - Direct database access without API round-trip
- Database transactions for inventory changes - Prevents race conditions

**Client-Side:**
- React Hook Form with lazy validation - Minimal re-renders
- Dynamic imports for heavy components
- Image optimization via Next.js `Image` component
- Tailwind CSS purging - Only used styles included in build

**Mobile:**
- Mobile-first responsive design via Tailwind breakpoints
- Touch-optimized form inputs and buttons
- Minimal JavaScript for field validation before server submission

---

*Stack analysis: 2026-02-13*
