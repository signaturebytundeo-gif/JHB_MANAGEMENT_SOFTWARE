---
phase: 01-foundation-authentication
plan: 02
subsystem: foundation
tags: [prisma, database, schema, seed, reference-data]
completed: 2026-02-14
duration: 8m

dependency_graph:
  requires:
    - 01-01-PLAN (Next.js foundation)
  provides:
    - prisma-schema
    - database-migrations
    - seeded-reference-data
    - admin-users
  affects:
    - all-subsequent-plans

tech_stack:
  added:
    - Prisma schema with 11 models
    - PostgreSQL database with migrations
    - @prisma/adapter-pg for Prisma v7
    - pg (PostgreSQL client)
    - bcrypt for password hashing
  patterns:
    - Idempotent seed script using upsert operations
    - PrismaPg adapter with connection pooling
    - Prisma client singleton with adapter pattern

key_files:
  created:
    - prisma/schema.prisma: Complete database schema with 11 models and 3 enums
    - prisma/migrations/20260214032652_init/migration.sql: Initial database migration
    - prisma/seed.ts: Idempotent seed script for all reference data
  modified:
    - src/lib/db.ts: Updated to use PrismaPg adapter for Prisma v7
    - prisma.config.ts: Added seed command and datasource configuration
    - package.json: Added @prisma/adapter-pg and pg dependencies

decisions:
  - decision: Use PostgreSQL adapter for Prisma v7 instead of direct connection
    context: Prisma v7 requires either adapter or accelerateUrl for PrismaClient
    rationale: Adapter pattern provides connection pooling and better performance
    alternatives: [Prisma Accelerate (paid), different Prisma version]
    impact: All Prisma client instantiations must use adapter pattern

  - decision: Generate Prisma client to default location (node_modules/@prisma/client)
    context: Custom output path required additional configuration complexity
    rationale: Default location works seamlessly with tsx runner and imports
    alternatives: [Custom output to src/generated/prisma]
    impact: Standard import path "@prisma/client" works everywhere

  - decision: Use bcrypt cost factor 10 for password hashing
    context: Admin users need secure password storage
    rationale: Cost 10 provides good security-performance balance
    alternatives: [Higher cost factors like 12 or 14]
    impact: Password hashing takes ~100ms, acceptable for login flow

  - decision: Set up local PostgreSQL server for development
    context: No database server available on development machine
    rationale: Downloaded and configured portable PostgreSQL binaries to /tmp
    alternatives: [Docker, cloud database, SQLite]
    impact: Development database available at localhost:5432

metrics:
  tasks_completed: 2
  tasks_total: 2
  commits: 2
  files_created: 3
  files_modified: 3
  duration_minutes: 8
---

# Phase 01 Plan 02: Database Schema & Seed Data Summary

**One-liner:** Complete Prisma schema with 11 models (User, Product, PricingTier, VolumeDiscount, FrequencyDiscount, Location, SalesChannel, SubscriptionPlan, ApprovalThreshold, InviteToken, MagicLinkToken) and idempotent seed script populating all reference data from PROJECT.md.

## Overview

Successfully defined the complete Prisma database schema with all foundational models, created and applied the initial migration, and built an idempotent seed script that populates the database with all reference data: 2 admin users, 6 products with pricing tiers, 7 locations, 9 sales channels, 4 subscription plans, 4 approval thresholds, 3 volume discount tiers, and 2 frequency discount tiers.

## Tasks Completed

### Task 1: Define Prisma schema with all foundational models

**Status:** ✅ Complete
**Commit:** eb62ea9
**Duration:** 4 minutes

**What was done:**
- Defined 11 Prisma models: User, Product, PricingTier, VolumeDiscount, FrequencyDiscount, Location, SalesChannel, SubscriptionPlan, ApprovalThreshold, InviteToken, MagicLinkToken
- Created 3 enums: Role (ADMIN, MANAGER, SALES_REP, INVESTOR), LocationType (PRODUCTION, RESTAURANT, WAREHOUSE, FULFILLMENT, MARKET, EVENT), ChannelType (ONLINE, RETAIL, WHOLESALE, MARKETPLACE, SUBSCRIPTION, EVENT)
- Added unique constraints on email, SKU, product names, and [productId, tierName]
- Added indexes on frequently queried fields (email, role, SKU, name, type)
- Applied initial migration creating all tables
- Removed datasource url from schema.prisma (moved to prisma.config.ts for Prisma v7)

**Files created:**
- prisma/schema.prisma: Complete schema with all models and enums
- prisma/migrations/20260214032652_init/migration.sql: SQL migration file

**Verification:**
- ✅ `npx prisma validate` passes without errors
- ✅ `npx prisma migrate dev --name init` creates all tables successfully
- ✅ Schema contains all 11 models and 3 enums
- ✅ Unique constraints enforce data integrity
- ✅ All indexes created for query performance

### Task 2: Create idempotent seed script and populate database

**Status:** ✅ Complete
**Commit:** 890ae07
**Duration:** 4 minutes

**What was done:**
- Created idempotent seed script using upsert operations (no duplicates on reruns)
- Seeded 2 admin users (Anthony and Tunde) with bcrypt hashed passwords (cost 10)
- Seeded 6 products with exact specifications from PROJECT.md:
  - Original Jerk Sauce 2oz (SKU: JHB-OJS-2OZ, 25/case)
  - Original Jerk Sauce 5oz (SKU: JHB-OJS-5OZ, 12/case)
  - Original Jerk Sauce 10oz (SKU: JHB-OJS-10OZ, 12/case)
  - Escovitch/Pikliz 12oz (SKU: JHB-EP-12OZ, 12/case)
  - Original Jerk Sauce 1 gallon (SKU: JHB-OJS-1GAL, 1/case)
  - Original Jerk Sauce 9g sachet (SKU: JHB-OJS-9G, TBD units/case)
- Seeded 12 pricing tiers across products (Wholesale Cash, Wholesale Net 30, Retail)
- Seeded 3 volume discount tiers (1-5 cases 0%, 6-10 cases 5%, 11+ cases 10%)
- Seeded 2 frequency discount tiers (quarterly 2%, annual 5% + priority allocation)
- Seeded 7 locations (Miami Gardens, Broward Blvd, Miramar, Amazon FBA, Main Warehouse, Farmers Markets, Events)
- Seeded 9 sales channels (Amazon, Restaurant Retail, Wholesale, Farmers Markets, E-commerce, Etsy, Subscription, Catering, Events)
- Seeded 4 subscription plans (Standard/Premium Monthly/Annual with correct pricing)
- Seeded 4 approval thresholds (<$150 auto, $150-$500 single member, $500-$2500 dual member, >$2500 dual bank)
- Configured seed command in prisma.config.ts
- Added PostgreSQL adapter for Prisma v7 compatibility
- Updated db.ts to use PrismaPg adapter with connection pooling
- Verified idempotency by running seed twice (no errors or duplicates)

**Files created:**
- prisma/seed.ts: Complete idempotent seed script

**Files modified:**
- prisma.config.ts: Added seed command configuration
- prisma/schema.prisma: Changed generator to prisma-client-js (default location)
- src/lib/db.ts: Added PrismaPg adapter with connection pooling
- package.json: Added @prisma/adapter-pg and pg dependencies

**Verification:**
- ✅ `npx prisma db seed` runs successfully
- ✅ Second run produces no errors or duplicates (idempotent)
- ✅ Database contains 2 users with ADMIN role
- ✅ Database contains 6 products with correct SKUs and specifications
- ✅ Database contains 12 pricing tiers matching PROJECT.md
- ✅ Database contains 7 locations with correct types
- ✅ Database contains 9 sales channels with correct types
- ✅ Database contains 4 subscription plans with correct pricing
- ✅ Database contains 4 approval thresholds matching Operating Agreement
- ✅ Database contains 3 volume discount tiers
- ✅ Database contains 2 frequency discount tiers

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma v7 datasource url configuration**
- **Found during:** Task 1, schema validation
- **Issue:** Prisma v7 no longer supports `url` property in datasource block in schema.prisma
- **Fix:** Removed `url = env("DATABASE_URL")` from schema.prisma, kept configuration in prisma.config.ts
- **Files modified:** prisma/schema.prisma
- **Commit:** eb62ea9

**2. [Rule 3 - Blocking] PostgreSQL database server not available**
- **Found during:** Task 1, attempting to run migration
- **Issue:** No PostgreSQL server running on localhost:5432, no Homebrew or Docker available
- **Fix:** Downloaded and set up portable PostgreSQL 16.6 binaries to /tmp/pgsql, initialized data directory at /tmp/pgdata, started server on port 5432, created jhb_dev database
- **Files modified:** None (external setup)
- **Commit:** N/A (prerequisite setup)

**3. [Rule 3 - Blocking] Prisma v7 requires adapter or accelerateUrl**
- **Found during:** Task 2, running seed script
- **Issue:** Prisma v7 changed PrismaClient constructor requirements - must provide either adapter or accelerateUrl
- **Fix:** Installed @prisma/adapter-pg and pg packages, created PrismaPg adapter with connection pooling in both seed.ts and db.ts
- **Files modified:** prisma/seed.ts, src/lib/db.ts, package.json
- **Commit:** 890ae07

**4. [Rule 3 - Blocking] Custom Prisma client output path incompatibility**
- **Found during:** Task 2, seed script import errors
- **Issue:** Custom output path (src/generated/prisma) caused module resolution issues with tsx runner
- **Fix:** Changed generator to prisma-client-js (default location: node_modules/@prisma/client), regenerated client
- **Files modified:** prisma/schema.prisma
- **Commit:** 890ae07

**5. [Rule 3 - Blocking] Seed command configuration in Prisma v7**
- **Found during:** Task 2, running npx prisma db seed
- **Issue:** Prisma v7 no longer reads seed command from package.json, requires configuration in prisma.config.ts
- **Fix:** Moved seed command from package.json prisma.seed to prisma.config.ts migrations.seed
- **Files modified:** prisma.config.ts, package.json (removed old config)
- **Commit:** 890ae07

## Technical Details

### Database Schema

**11 Models:**
1. User: Authentication and role-based access (ADMIN, MANAGER, SALES_REP, INVESTOR)
2. InviteToken: User invitation system with expiration
3. MagicLinkToken: Passwordless authentication option
4. Product: Product catalog with SKU, size, units per case
5. PricingTier: Multi-tier pricing (Wholesale Cash, Net 30, Retail) per product
6. VolumeDiscount: Case quantity-based discounts (1-5, 6-10, 11+)
7. FrequencyDiscount: Order frequency-based discounts (quarterly, annual)
8. Location: Multi-location inventory tracking (7 locations)
9. SalesChannel: Multi-channel sales tracking (9 channels)
10. SubscriptionPlan: Recurring subscription offerings (4 plans)
11. ApprovalThreshold: Financial approval workflow rules (4 tiers)

**3 Enums:**
- Role: ADMIN, MANAGER, SALES_REP, INVESTOR
- LocationType: PRODUCTION, RESTAURANT, WAREHOUSE, FULFILLMENT, MARKET, EVENT
- ChannelType: ONLINE, RETAIL, WHOLESALE, MARKETPLACE, SUBSCRIPTION, EVENT

### Seeded Reference Data

**Admin Users (2):**
- Anthony Amos Jr. (anthony@jamaicahousebrand.com) - ADMIN role
- Olatunde Ogunjulugbe (tunde@jamaicahousebrand.com) - ADMIN role
- Default password: "JHB2026!" (bcrypt hashed with cost 10)

**Products (6) with Pricing Tiers (12):**
- JHB-OJS-2OZ: Wholesale Cash $3.00/unit ($75/case), Retail $3.75
- JHB-OJS-5OZ: Wholesale Cash $5.00/unit ($60/case), Net 30 $6.25/unit ($75/case), Retail $7.50
- JHB-OJS-10OZ: Wholesale Cash $10.00/unit ($110/case), Net 30 $12.50/unit ($150/case), Retail $13.50
- JHB-EP-12OZ: Wholesale Cash $4.58/unit ($55/case), Retail $7.00
- JHB-OJS-1GAL: Wholesale Cash $80.00, Net 30 $100.00 (intro $50 noted in description)
- JHB-OJS-9G: No pricing yet (TBD packaging)

**Volume Discounts (3):**
- 1-5 cases: 0% (standard price)
- 6-10 cases: 5% discount
- 11+ cases: 10% discount

**Frequency Discounts (2):**
- Quarterly orders: 2% discount
- Annual contracts: 5% discount + priority allocation

**Locations (7):**
- Miami Gardens Restaurant (PRODUCTION)
- Broward Blvd Restaurant (RESTAURANT)
- Miramar Restaurant (RESTAURANT)
- Amazon FBA Warehouse (FULFILLMENT)
- Main Warehouse/Storage (WAREHOUSE)
- Farmers Markets (MARKET)
- Event/Tailgate Locations (EVENT)

**Sales Channels (9):**
- Amazon (MARKETPLACE)
- Restaurant Retail (RETAIL)
- Wholesale/Distribution (WHOLESALE)
- Farmers Markets (EVENT)
- E-commerce/Website (ONLINE)
- Etsy (MARKETPLACE)
- Subscription/Membership (SUBSCRIPTION)
- Catering (WHOLESALE)
- Events/Tailgates (EVENT)

**Subscription Plans (4):**
- Standard Annual: $75/yr - 1x 5oz monthly + gift bottle
- Premium Annual: $125/yr - 1x 10oz monthly + gift bottle
- Standard Monthly: $13/mo - 2x 5oz monthly
- Premium Monthly: $20/mo - 2x 10oz monthly

**Approval Thresholds (4):**
- Under $150: Auto-approve
- $150-$500: Single member approval + notification
- $500-$2,500: Dual member authorization
- Over $2,500: Dual bank authorization

### Prisma v7 Adapter Pattern

**Connection Pooling:**
```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

This pattern provides:
- Connection pooling for better performance
- Compatibility with Prisma v7 requirements
- Singleton pattern in db.ts to prevent multiple connections

## Success Criteria

All criteria met:
- ✅ Prisma schema contains all 11 models and 3 enums
- ✅ Database seeded with complete reference data matching PROJECT.md exactly
- ✅ Seed script is idempotent (runs multiple times safely without errors or duplicates)
- ✅ Migration applied successfully creating all tables
- ✅ 2 admin users created with secure password hashing
- ✅ 6 products with 12 pricing tiers
- ✅ 7 locations, 9 sales channels, 4 subscription plans, 4 approval thresholds
- ✅ 3 volume discount tiers, 2 frequency discount tiers

## Next Steps

Plan 01-03 can now proceed with:
- Authentication implementation (login, registration, sessions)
- Role-based access control using the User model and Role enum
- Protected routes and middleware
- All subsequent features have their data models and reference data ready

The database foundation is complete and all reference data is populated.

## Self-Check

Verifying all claimed artifacts exist:

**Schema files:**
- ✅ FOUND: /Users/rfmstaff/JHB_MANAGEMENT_SOFTWARE/prisma/schema.prisma
- ✅ FOUND: /Users/rfmstaff/JHB_MANAGEMENT_SOFTWARE/prisma/migrations/20260214032652_init/migration.sql
- ✅ FOUND: /Users/rfmstaff/JHB_MANAGEMENT_SOFTWARE/prisma/seed.ts

**Modified files:**
- ✅ FOUND: /Users/rfmstaff/JHB_MANAGEMENT_SOFTWARE/src/lib/db.ts
- ✅ FOUND: /Users/rfmstaff/JHB_MANAGEMENT_SOFTWARE/prisma.config.ts
- ✅ FOUND: /Users/rfmstaff/JHB_MANAGEMENT_SOFTWARE/package.json

**Database verification:**
- ✅ VERIFIED: 2 users in database (Anthony, Tunde)
- ✅ VERIFIED: 6 products with correct SKUs
- ✅ VERIFIED: 12 pricing tiers
- ✅ VERIFIED: 7 locations
- ✅ VERIFIED: 9 sales channels
- ✅ VERIFIED: 4 subscription plans
- ✅ VERIFIED: 4 approval thresholds
- ✅ VERIFIED: 3 volume discounts
- ✅ VERIFIED: 2 frequency discounts

**Commits:**
- ✅ FOUND: eb62ea9 (Task 1: Define Prisma schema with all foundational models)
- ✅ FOUND: 890ae07 (Task 2: Create idempotent seed script and populate database)

## Self-Check: PASSED ✅

All files exist, database is populated with correct data, and commits are verified in git history.
