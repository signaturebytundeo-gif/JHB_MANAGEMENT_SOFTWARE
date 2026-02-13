# Phase 1: Foundation & Authentication - Research

**Researched:** 2026-02-13
**Domain:** Next.js App Router Authentication, Database Seeding, RBAC
**Confidence:** HIGH

## Summary

Phase 1 establishes the foundation for the JHB Command Center: authentication, role-based access control, and foundational data seeding. The modern Next.js 15+ ecosystem (as of 2026) offers mature, battle-tested solutions for authentication with App Router and Server Components.

**Key findings:**
- Auth.js v5 (NextAuth) is the standard for self-hosted Next.js authentication with full control over data
- Stateless session management with JWT (using Jose library) is recommended for simplicity and Edge compatibility
- Prisma seeding has moved to explicit execution only (no auto-seeding on migrate) as of v7
- shadcn/ui + Tailwind provides the best foundation for customizable, mobile-first UI with dark mode
- Middleware has been renamed to `proxy.ts` in Next.js 16+
- Role-based access should be enforced at multiple layers: Proxy (optimistic), DAL (secure), and component-level

The ecosystem strongly recommends NOT hand-rolling authentication - using established libraries prevents security vulnerabilities and reduces implementation time from weeks to days.

**Primary recommendation:** Use Auth.js v5 with credentials provider + magic link option, stateless JWT sessions with Jose, Prisma for database with explicit seeding, shadcn/ui for UI components with custom Caribbean color palette, and Resend for transactional emails (magic links and invites).

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15+ | App Router framework | Official React framework, Server Components, built-in optimizations |
| Auth.js | v5 | Authentication | Successor to NextAuth, full control over data, supports credentials + magic links, production-ready |
| Prisma | v7+ | Database ORM | Type-safe queries, excellent Next.js integration, migration tooling |
| Jose | Latest | JWT signing/verification | Edge-compatible, recommended by Next.js docs, secure token handling |
| bcrypt | Latest | Password hashing | Industry standard, proper salting, configurable cost factor |
| Zod | Latest | Schema validation | Type-safe validation, excellent TypeScript integration |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui | Latest | UI component library | All UI - copies components to project for full customization |
| Tailwind CSS | v4 | Utility-first CSS | Mobile-first responsive design, custom color palettes |
| next-themes | Latest | Dark mode management | Automatic theme switching with system preference support |
| Sonner | Latest | Toast notifications | Lightweight (2-3KB), simple API, works with shadcn/ui |
| react-loading-skeleton | Latest | Loading states | Data-heavy views, automatic sizing |
| Resend | API | Transactional emails | Magic links, invite emails (3000/month free) |
| React Email | Latest | Email templates | Type-safe email templates as React components |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Auth.js v5 | Clerk | Clerk offers better DX and pre-built UI but costs $0.02/MAU after 10K users and stores data externally |
| Auth.js v5 | Supabase Auth | Great if using full Supabase ecosystem, but adds external dependency and potential vendor lock-in |
| Stateless JWT | Database sessions | More secure but complex, higher server load - only needed for multi-device session management |
| Prisma | Drizzle ORM | Drizzle is lighter but Prisma has better tooling, migrations, and Studio for admin tasks |
| Resend | Nodemailer | Nodemailer is free but requires SMTP config, lacks delivery analytics, more setup complexity |

**Installation:**
```bash
# Core dependencies
npm install next-auth@beta prisma @prisma/client jose bcrypt zod

# UI dependencies
npm install tailwindcss postcss autoprefixer
npx shadcn@latest init
npm install next-themes sonner react-loading-skeleton

# Email dependencies
npm install resend react-email @react-email/components

# Dev dependencies
npm install -D @types/bcrypt tsx
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── (auth)/              # Auth route group
│   │   ├── login/
│   │   ├── signup/
│   │   └── magic-link/
│   ├── (dashboard)/         # Protected route group
│   │   ├── admin/
│   │   ├── manager/
│   │   ├── sales/
│   │   └── investor/
│   ├── api/
│   │   ├── auth/[...nextauth]/  # Auth.js routes
│   │   └── email/
│   └── actions/             # Server Actions
│       └── auth.ts
├── lib/
│   ├── auth.ts              # Auth.js config
│   ├── session.ts           # Session management (encrypt/decrypt)
│   ├── dal.ts               # Data Access Layer with verifySession
│   └── db.ts                # Prisma client singleton
├── components/
│   ├── ui/                  # shadcn components
│   └── auth/
├── emails/                  # React Email templates
│   ├── magic-link.tsx
│   └── invite.tsx
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
└── proxy.ts                 # Route protection (Next.js 16+)
```

### Pattern 1: Stateless Session Management

**What:** JWT-based sessions stored in HttpOnly cookies, verified on server/edge
**When to use:** Default choice for most applications - simpler, Edge-compatible, sufficient security
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/guides/authentication
// lib/session.ts
import 'server-only'
import { SignJWT, jwtVerify } from 'jose'

const secretKey = process.env.SESSION_SECRET
const encodedKey = new TextEncoder().encode(secretKey)

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey)
}

export async function decrypt(session: string | undefined = '') {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    })
    return payload
  } catch (error) {
    console.log('Failed to verify session')
  }
}

export async function createSession(userId: string, role: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const session = await encrypt({ userId, role, expiresAt })

  const cookieStore = await cookies()
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: true,
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
}
```

### Pattern 2: Data Access Layer with Role Verification

**What:** Centralized authorization logic that verifies session and role before data access
**When to use:** Every data fetch, Server Action, and Route Handler - single source of truth
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/guides/authentication
// lib/dal.ts
import 'server-only'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/session'
import { cache } from 'react'

export const verifySession = cache(async () => {
  const cookie = (await cookies()).get('session')?.value
  const session = await decrypt(cookie)

  if (!session?.userId) {
    redirect('/login')
  }

  return { isAuth: true, userId: session.userId, role: session.role }
})

// Role-specific verification
export const verifyAdmin = cache(async () => {
  const session = await verifySession()
  if (session.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }
  return session
})

export const verifyManagerOrAbove = cache(async () => {
  const session = await verifySession()
  if (!['ADMIN', 'MANAGER'].includes(session.role)) {
    throw new Error('Unauthorized: Manager access required')
  }
  return session
})

// Use in data fetching
export const getUser = cache(async () => {
  const session = await verifySession()

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true }
  })

  return user
})
```

### Pattern 3: Proxy for Optimistic Route Protection

**What:** Lightweight cookie-based auth check before route loads
**When to use:** First line of defense for protected routes - fast redirects
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/guides/authentication
// proxy.ts (Next.js 16+, formerly middleware.ts)
import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/session'
import { cookies } from 'next/headers'

const protectedRoutes = ['/dashboard', '/admin', '/manager', '/sales', '/investor']
const publicRoutes = ['/login', '/signup', '/magic-link', '/']

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))
  const isPublicRoute = publicRoutes.includes(path)

  const cookie = (await cookies()).get('session')?.value
  const session = await decrypt(cookie)

  // Redirect unauthenticated users
  if (isProtectedRoute && !session?.userId) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  // Redirect authenticated users away from auth pages
  if (isPublicRoute && session?.userId && !path.startsWith('/dashboard')) {
    // Role-based dashboard routing
    const dashboardPath = getRoleDashboard(session.role)
    return NextResponse.redirect(new URL(dashboardPath, req.nextUrl))
  }

  return NextResponse.next()
}

function getRoleDashboard(role: string): string {
  switch(role) {
    case 'ADMIN': return '/admin'
    case 'MANAGER': return '/manager'
    case 'SALES_REP': return '/sales'
    case 'INVESTOR': return '/investor'
    default: return '/dashboard'
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
```

### Pattern 4: Idempotent Database Seeding

**What:** Seed scripts that can run multiple times without creating duplicates
**When to use:** All database seeding - development, testing, and production initialization
**Example:**
```typescript
// Source: https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data (development only!)
  if (process.env.NODE_ENV === 'development') {
    await prisma.user.deleteMany()
    await prisma.product.deleteMany()
    await prisma.location.deleteMany()
  }

  // Seed admin users - upsert prevents duplicates
  const anthony = await prisma.user.upsert({
    where: { email: 'anthony@jamaicahouse.com' },
    update: {},
    create: {
      email: 'anthony@jamaicahouse.com',
      name: 'Anthony',
      password: await bcrypt.hash('temp-password', 10),
      role: 'ADMIN',
    },
  })

  const tunde = await prisma.user.upsert({
    where: { email: 'tunde@jamaicahouse.com' },
    update: {},
    create: {
      email: 'tunde@jamaicahouse.com',
      name: 'Tunde',
      password: await bcrypt.hash('temp-password', 10),
      role: 'ADMIN',
    },
  })

  // Seed products with pricing tiers
  const products = [
    {
      name: 'Original Hot Sauce',
      sku: 'JHB-OG-150',
      size: '150ml',
      basePrice: 8.99,
    },
    // ... 5 more products
  ]

  for (const productData of products) {
    await prisma.product.upsert({
      where: { sku: productData.sku },
      update: {},
      create: productData,
    })
  }

  console.log('Database seeded successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

### Pattern 5: Server Actions with Authorization

**What:** Server-side mutations that verify user permissions before execution
**When to use:** All forms and data mutations - enforce authorization server-side
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/guides/authentication
// app/actions/auth.ts
'use server'

import { SignupFormSchema } from '@/lib/definitions'
import { createSession } from '@/lib/session'
import bcrypt from 'bcrypt'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'

export async function signup(state: FormState, formData: FormData) {
  // 1. Validate form fields
  const validatedFields = SignupFormSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  // 2. Hash password
  const { name, email, password } = validatedFields.data
  const hashedPassword = await bcrypt.hash(password, 10)

  // 3. Create user
  const user = await db.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: 'SALES_REP', // Default role
    },
  })

  // 4. Create session
  await createSession(user.id, user.role)

  // 5. Redirect to role-appropriate dashboard
  redirect('/sales')
}
```

### Pattern 6: Mobile-First Responsive Design

**What:** Tailwind's mobile-first breakpoint system - unprefixed utilities for mobile, sm:/md:/lg: for larger screens
**When to use:** All UI components - ensures mobile experience is primary
**Example:**
```typescript
// Source: https://tailwindcss.com/docs/responsive-design
// components/dashboard-card.tsx
export function DashboardCard({ title, value }) {
  return (
    <div className="
      w-full                  // Full width on mobile
      p-4                     // Compact padding on mobile
      sm:p-6                  // More padding on small screens+
      md:w-1/2                // Half width on medium screens
      lg:w-1/3                // Third width on large screens
      bg-white dark:bg-gray-800
      rounded-lg
      shadow-md
    ">
      <h3 className="
        text-lg               // Smaller text on mobile
        md:text-xl            // Larger on medium+
        font-semibold
        text-gray-800 dark:text-gray-100
      ">
        {title}
      </h3>
      <p className="
        text-2xl              // Mobile size
        sm:text-3xl           // Larger on small+
        md:text-4xl           // Even larger on medium+
        font-bold
        text-caribbean-green
      ">
        {value}
      </p>
    </div>
  )
}
```

### Anti-Patterns to Avoid

- **Layout-based auth checks:** Layouts don't re-render on navigation - auth checks won't run on route changes. Always check in page components or DAL.
- **Client-only authorization:** UI hiding is not security. Always verify permissions server-side in Server Actions and Route Handlers.
- **Proxy as only defense:** Proxy runs on prefetch too - use it for redirects but always verify in DAL near data.
- **Manual cookie parsing:** Use Next.js cookies() API - handles edge cases and security properly.
- **Auto-seeding assumptions:** Prisma v7 removed auto-seeding - explicitly run `npx prisma db seed`.
- **Storing sensitive data in JWT:** Only store minimal identifiers (userId, role) - never passwords, emails, or PII.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Authentication | Custom auth system with password reset, email verification, session management | Auth.js v5, Clerk, or Supabase Auth | Password reset flows, CSRF protection, session rotation, timing attacks, rainbow tables - dozens of edge cases you'll miss |
| JWT signing/verification | Custom crypto with Node crypto module | Jose library | Algorithm confusion attacks, key management, timing-safe comparison, proper expiration handling |
| Password hashing | SHA256 or MD5 with custom salt | bcrypt (or argon2) | Bcrypt is intentionally slow with adaptive cost factor, prevents rainbow tables, salting built-in |
| Email templates | String concatenation HTML | React Email + Resend | Cross-client compatibility (Outlook, Gmail, mobile), responsive design, preview testing |
| Form validation | Manual string checks | Zod or Yup | Type inference, composable schemas, custom error messages, async validation |
| Dark mode | Manual class toggling | next-themes | System preference detection, hydration without flash, storage persistence |
| Toast notifications | Custom toast component | Sonner | Queuing, positioning, animations, accessibility, 2KB package |
| Role-based routing | Custom redirect logic | Centralized proxy + DAL pattern | Single source of truth, cache memoization, easier testing and maintenance |

**Key insight:** Authentication and authorization have decades of documented attack vectors. Every custom solution rediscovers the same security holes. Auth libraries are maintained by security experts who fix CVEs you'll never hear about. Time-to-market is measured in days vs weeks, and security posture is dramatically better.

## Common Pitfalls

### Pitfall 1: Middleware Renamed to Proxy (Next.js 16+)

**What goes wrong:** Developers create `middleware.ts` expecting it to run, but Next.js 16+ requires `proxy.ts`.
**Why it happens:** Breaking change in Next.js 16 to better reflect that middleware runs on every route (including prefetch).
**How to avoid:** Use `proxy.ts` filename in project root. If supporting Next.js 15, keep `middleware.ts` for now.
**Warning signs:** Auth checks not running, protected routes accessible without login.

### Pitfall 2: Prisma Auto-Seeding Removed (v7)

**What goes wrong:** Developers expect seeding to run automatically during `prisma migrate dev` but data never appears.
**Why it happens:** Prisma v7 removed auto-seeding to prevent unintended production data changes.
**How to avoid:** Always explicitly run `npx prisma db seed` after migrations. Update CI/CD scripts.
**Warning signs:** Empty database after migrations, "WHERE" errors on foreign keys, tests failing on missing seed data.

### Pitfall 3: Session Payload Too Large

**What goes wrong:** Storing full user objects in JWT causes cookies to exceed browser limits (4KB), breaking auth.
**Why it happens:** Developers copy patterns from database session examples without understanding stateless limitations.
**How to avoid:** JWT payload should ONLY contain: userId, role, expiresAt. Fetch user details from database when needed.
**Warning signs:** Auth works locally but breaks in production, intermittent "cookie too large" errors, mobile auth failures.

### Pitfall 4: Role Checks Only in UI

**What goes wrong:** Admin buttons hidden with client-side checks, but API routes/Server Actions don't verify - anyone can call them directly.
**Why it happens:** Misunderstanding that UI hiding ≠ security. HTTP requests can bypass UI entirely.
**How to avoid:** Always verify role in Server Actions, Route Handlers, and data fetching. Use DAL pattern for consistency.
**Warning signs:** Security audit reveals unauthorized API calls, Postman can bypass "protected" actions.

### Pitfall 5: Bcrypt Cost Factor Too Low or Too High

**What goes wrong:** Cost 8 = fast but weak (rainbow tables work). Cost 15 = secure but login takes 5+ seconds.
**Why it happens:** Not understanding exponential scaling (2^cost) or not testing on production hardware.
**How to avoid:** Use cost 10-12. Benchmark on production-equivalent hardware. Aim for 200-500ms hash time.
**Warning signs:** Login feels slow (>1s), password creation times out, or security audit flags weak hashing.

### Pitfall 6: Magic Link Expiration Not Enforced

**What goes wrong:** Magic link tokens work forever, allowing old emails to grant access months later.
**Why it happens:** Database stores token but doesn't check expiration, or JWT verification doesn't validate `exp` claim.
**How to avoid:** Always set expiration (15 minutes for magic links) and verify it before granting access. Clean up old tokens.
**Warning signs:** Magic links work days after sending, security audit flags stale tokens.

### Pitfall 7: Proxy Running on Static Assets

**What goes wrong:** Proxy runs on every image, font, and CSS file, adding latency and breaking CDN caching.
**Why it happens:** Forgetting to configure `matcher` to exclude static assets.
**How to avoid:** Use matcher: `['/((?!api|_next/static|_next/image|.*\\.png$).*)']` to exclude static files.
**Warning signs:** Slow page loads, proxy logs filled with .png/.css requests, CDN cache headers missing.

### Pitfall 8: Dark Mode Flash on Load

**What goes wrong:** Page loads in light mode, then flashes to dark mode a moment later.
**Why it happens:** Theme preference read client-side after hydration instead of during SSR.
**How to avoid:** Use next-themes with `suppressHydrationWarning` on html tag, and ThemeProvider as high as possible.
**Warning signs:** Visible flash when refreshing page in dark mode, reported as "jank" by users.

## Code Examples

Verified patterns from official sources:

### Tailwind Custom Color Palette (Caribbean Theme)

```typescript
// Source: https://tailwindcss.com/docs/theme
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        caribbean: {
          green: {
            DEFAULT: '#006633', // Deep green (primary)
            light: '#00884D',
            dark: '#004D26',
          },
          gold: {
            DEFAULT: '#D4AF37', // Gold accent
            light: '#E5C158',
            dark: '#B8941F',
          },
          black: {
            DEFAULT: '#1A1A1A', // Rich black
            light: '#2D2D2D',
          },
        },
      },
    },
  },
  plugins: [],
}
export default config
```

### Dark Mode Setup with next-themes

```typescript
// Source: https://ui.shadcn.com/docs/dark-mode/next
// components/theme-provider.tsx
'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { type ThemeProviderProps } from 'next-themes/dist/types'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

// app/layout.tsx
import { ThemeProvider } from '@/components/theme-provider'

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### Prisma Schema for Auth + Seeding

```prisma
// Source: Prisma documentation + Auth.js requirements
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  MANAGER
  SALES_REP
  INVESTOR
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  password      String?   // Nullable for magic link only users
  role          Role      @default(SALES_REP)
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts      Account[]
  sessions      Session[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Product {
  id          String   @id @default(cuid())
  name        String
  sku         String   @unique
  size        String
  basePrice   Decimal  @db.Decimal(10, 2)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Location {
  id          String   @id @default(cuid())
  name        String   @unique
  type        String   // WAREHOUSE, RETAIL, DISTRIBUTION
  address     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model SalesChannel {
  id          String   @id @default(cuid())
  name        String   @unique
  type        String   // ONLINE, RETAIL, WHOLESALE
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Magic Link Email Template

```typescript
// Source: https://react.email + https://resend.com/docs
// emails/magic-link.tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'

interface MagicLinkEmailProps {
  magicLink: string
  email: string
}

export default function MagicLinkEmail({
  magicLink,
  email,
}: MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your magic link to sign in to JHB Command Center</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Sign in to JHB Command Center</Heading>
          <Text style={text}>
            Hi! Click the button below to sign in to your account. This link will expire in 15 minutes.
          </Text>
          <Button href={magicLink} style={button}>
            Sign in
          </Button>
          <Text style={text}>
            Or copy and paste this URL into your browser:
          </Text>
          <Link href={magicLink} style={link}>
            {magicLink}
          </Link>
          <Text style={footer}>
            If you didn't request this email, you can safely ignore it.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const h1 = {
  color: '#006633', // Caribbean green
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  textAlign: 'center' as const,
}

const button = {
  backgroundColor: '#006633',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '12px',
}

const link = {
  color: '#006633',
  fontSize: '14px',
  textAlign: 'center' as const,
  textDecoration: 'underline',
}

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
}
```

### Sonner Toast Notifications Setup

```typescript
// Source: https://ui.shadcn.com/docs/components/sonner
// components/toaster.tsx
'use client'

import { Toaster as Sonner } from 'sonner'

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
          title: 'text-gray-900 dark:text-gray-100',
          description: 'text-gray-500 dark:text-gray-400',
          actionButton: 'bg-caribbean-green text-white',
          cancelButton: 'bg-gray-100 dark:bg-gray-700',
        },
      }}
    />
  )
}

// app/layout.tsx
import { Toaster } from '@/components/toaster'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}

// Usage in Server Actions
'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createUser(formData: FormData) {
  // ... create user logic

  revalidatePath('/users')
  return { success: true, message: 'User created successfully' }
}

// Client component to handle toast
'use client'
import { toast } from 'sonner'
import { useActionState } from 'react'

export function CreateUserForm() {
  const [state, formAction] = useActionState(createUser, null)

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message)
    }
  }, [state])

  return <form action={formAction}>...</form>
}
```

### Loading Skeleton Pattern

```typescript
// Source: https://www.npmjs.com/package/react-loading-skeleton
// components/dashboard-skeleton.tsx
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
          <Skeleton height={24} width={120} />
          <Skeleton height={40} width={80} className="mt-2" />
        </div>
      ))}
    </div>
  )
}

// app/dashboard/page.tsx
import { Suspense } from 'react'
import { DashboardSkeleton } from '@/components/dashboard-skeleton'

async function DashboardCards() {
  const data = await fetchDashboardData() // Server Component async fetch
  return <div>{/* Render cards */}</div>
}

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardCards />
      </Suspense>
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| middleware.ts | proxy.ts | Next.js 16 (2025) | Breaking change - rename file or middleware won't run |
| Auto-seed on migrate | Explicit `npx prisma db seed` | Prisma v7 (2025) | Prevents accidental production seeding, requires CI/CD updates |
| NextAuth v4 | Auth.js v5 | 2024 | Better App Router support, simplified config, breaking API changes |
| Pages Router auth | App Router with Server Components | Next.js 13+ | Session checks in Server Components, no useSession in server |
| Tailwind v3 config | Tailwind v4 @theme syntax | Tailwind v4 (2024) | CSS-based config, OKLCH colors, simpler custom colors |
| Database sessions default | Stateless JWT default | 2024-2025 | Edge compatibility prioritized, database sessions for specific use cases only |
| Clerk free tier 5K MAU | Clerk free tier 10K MAU | 2025 | More generous free tier, better for small apps |
| react-hot-toast | Sonner | 2024 | Lighter (2KB vs 6KB), simpler API, better animations |

**Deprecated/outdated:**
- **NextAuth v4:** Use Auth.js v5 (renamed, better App Router integration)
- **middleware.ts in Next.js 16+:** Use proxy.ts instead
- **Auto-seeding in Prisma migrations:** Removed in v7 for safety
- **next/font workaround for Tailwind:** Built-in in Next.js 13+
- **Manual dark mode class toggling:** Use next-themes for proper hydration

## Open Questions

1. **Database Choice for Production**
   - What we know: Prisma supports PostgreSQL, MySQL, SQLite. Supabase offers free PostgreSQL tier.
   - What's unclear: Production database preference (self-hosted vs managed), expected scale (concurrent users, data volume).
   - Recommendation: Default to Supabase free tier for MVP (500MB, good for 6+ months of data). PostgreSQL via Railway/Neon if self-hosted preferred. Include in PLAN as decision point.

2. **Magic Link vs Password Priority**
   - What we know: Requirements list magic link as "(optional)" but it's AUTH-02. Password is AUTH-01 (required).
   - What's unclear: Should magic link be implemented in Phase 1 or deferred?
   - Recommendation: Implement password auth first (AUTH-01), add magic link in separate task if time permits. Magic link requires email infrastructure (Resend) which is also needed for invites (AUTH-03), so bundle them together.

3. **Invite Flow Specifics**
   - What we know: AUTH-03 requires admin invite with pre-assigned roles via invite link.
   - What's unclear: Invite expiration time, whether invites allow password setup or force magic link, whether invited users can change roles.
   - Recommendation: 7-day invite expiration, require password setup on first login, roles locked by inviter. Document in PLAN for user validation.

4. **Role Permission Matrix**
   - What we know: 4 roles (Admin, Manager, Sales Rep, Investor) with different data visibility.
   - What's unclear: Detailed permission matrix for each module (can Manager edit production records? can Sales Rep see inventory levels?).
   - Recommendation: Phase 1 only implements role-based dashboard routing. Detailed permissions are module-specific and should be defined in each phase's CONTEXT.md.

5. **Session Duration and Refresh Strategy**
   - What we know: JWT sessions can expire, common default is 7 days.
   - What's unclear: Expected session duration, whether to implement refresh tokens for long-lived sessions.
   - Recommendation: 7-day sessions with sliding expiration (refreshed on each request). No refresh tokens in Phase 1 - only add if multi-device session management needed later.

6. **Production Email Provider**
   - What we know: Resend offers 3000 emails/month free, easy integration.
   - What's unclear: Expected email volume (invites + magic links), whether custom domain is available for email sending.
   - Recommendation: Start with Resend free tier, requires verified domain (emails@ jamaicahouse.com?). If no domain verification possible, use development mode (emails only sent to verified addresses) until production launch.

## Sources

### Primary (HIGH confidence)

- [Next.js Authentication Guide (Official)](https://nextjs.org/docs/app/guides/authentication) - Session management, DAL pattern, proxy implementation (v16.1.6, updated 2026-02-11)
- [Prisma Seeding Documentation](https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding) - Idempotent seeding, v7 changes
- [Auth.js Session Management](https://authjs.dev/getting-started/session-management/protecting) - Route protection, RBAC guidance
- [shadcn/ui Next.js Installation](https://ui.shadcn.com/docs/installation/next) - Component setup, React 19 compatibility
- [Tailwind CSS Theme Configuration](https://tailwindcss.com/docs/theme) - Custom color palettes, v4 @theme syntax
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design) - Mobile-first patterns
- [shadcn/ui Dark Mode](https://ui.shadcn.com/docs/dark-mode/next) - next-themes integration
- [Resend Next.js Documentation](https://resend.com/docs/send-with-nextjs) - Email API setup
- [React Email Documentation](https://react.email) - Email template components

### Secondary (MEDIUM confidence)

- [WorkOS: Top 5 authentication solutions for Next.js 2026](https://workos.com/blog/top-authentication-solutions-nextjs-2026) - Auth library comparison
- [Clerk: Complete Authentication Guide for Next.js App Router](https://clerk.com/articles/complete-authentication-guide-for-nextjs-app-router) - RBAC patterns
- [Medium: Clerk vs Supabase Auth vs NextAuth.js Production Reality](https://medium.com/better-dev-nextjs-react/clerk-vs-supabase-auth-vs-nextauth-js-the-production-reality-nobody-tells-you-a4b8f0993e1b) - Library tradeoffs
- [Knock: Top 9 React notification libraries 2026](https://knock.app/blog/the-top-notification-libraries-for-react) - Sonner vs alternatives
- [LogRocket: Password hashing in Node.js with bcrypt](https://blog.logrocket.com/password-hashing-node-js-bcrypt/) - Bcrypt best practices
- [TheLinuxCode: npm bcrypt in 2026](https://thelinuxcode.com/npm-bcrypt-in-2026-password-hashing-that-fails-closed-and-how-to-ship-it-safely/) - Cost factor recommendations
- [Prisma Documentation: Models](https://www.prisma.io/docs/orm/prisma-schema/data-model/models) - Enum syntax, schema patterns
- [Medium: Shadcn/ui Sonner Guide](https://medium.com/@rivainasution/shadcn-ui-react-series-part-19-sonner-modern-toast-notifications-done-right-903757c5681f) - Toast implementation
- [FreeCodeCamp: React Email + Resend Guide](https://www.freecodecamp.org/news/create-and-send-email-templates-using-react-email-and-resend-in-nextjs/) - Email template patterns

### Tertiary (LOW confidence)

- Various Medium articles on authentication implementation - useful for patterns but not authoritative on security
- GitHub discussions on RBAC and invite flows - community solutions, not official recommendations

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official documentation and established community consensus (2025-2026)
- Architecture: HIGH - Patterns from Next.js official docs and Auth.js documentation
- Pitfalls: MEDIUM - Combination of official migration guides and community experiences (validated against docs)
- Code examples: HIGH - All examples sourced from official documentation or verified libraries
- Open questions: MEDIUM - Based on requirement analysis and common implementation decisions

**Research date:** 2026-02-13
**Valid until:** 2026-03-15 (30 days - relatively stable ecosystem)

**Notes:**
- Next.js 16 release in late 2025 introduced breaking changes (middleware → proxy) - verify project Next.js version before planning
- Prisma v7 changes to seeding are recent (2025) - older tutorials will show auto-seeding that no longer works
- Auth.js v5 is production-ready but still marked as beta - stable enough for use, API is settling
- Caribbean color palette needs user validation - provided example colors are representative but should be confirmed with design requirements
