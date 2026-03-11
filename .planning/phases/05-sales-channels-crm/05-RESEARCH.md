# Phase 5: Sales Channels & CRM - Research

**Researched:** 2026-03-11
**Domain:** CRM data modeling, pricing calculation logic, subscription lifecycle, lead pipeline — all within the existing Next.js 16 + Prisma 7 + shadcn/ui stack
**Confidence:** HIGH

---

## Summary

Phase 5 is a **data model extension + UI buildout** phase, not a new library integration phase. The entire technology decision is locked: Next.js 16 App Router, Prisma 7.4 + Neon PostgreSQL, shadcn/ui, Tailwind v4, Zod v4, `useActionState`, custom modal overlays. The research focus is therefore on schema gaps, business logic patterns, and UI architecture for the new CRM domain.

The existing `Customer` model is a thin Stripe-webhook-derived record (email, firstName, lastName, phone, orderCount, totalSpent). It has no customer type, payment terms, credit limit, or addresses. The existing `SubscriptionPlan` model exists as a reference table but no `SubscriptionMember` tracking model exists. The `VolumeDiscount` and `FrequencyDiscount` models exist as reference tables but are not yet wired to `Order` creation. No `DistributorAgreement`, `Lead`, or `PromotionalPricing` models exist.

Phase 5 therefore requires: (1) schema migrations to extend `Customer` and add new models, (2) a pricing calculation utility that composes tiers + volume + frequency + promotional discounts at order-creation time, (3) new UI sections under `/dashboard/customers` (now expanded to a full CRM) and a new `/dashboard/leads` section or CRM sub-tab, (4) Resend-based renewal reminder email for CRM-08, and (5) follow-up reminder display logic for CRM-11.

**Primary recommendation:** Build Phase 5 as schema-first. Extend the Customer model, add four new models (DistributorAgreement, SubscriptionMember, Lead, PromotionalPricing), write a pure `calculateOrderPrice` utility function, then build pages and actions incrementally following the established `page.tsx` (async Server Component) + `client.tsx` (useActionState) pattern.

---

## Codebase Inventory — What Already Exists

This is a codebase-first research phase. All claims below are verified by reading source files.

### Schema Models Relevant to Phase 5

| Model | Current State | Phase 5 Status |
|-------|--------------|----------------|
| `Customer` | email, firstName, lastName, phone, orderCount, totalSpent — linked to WebsiteOrder and Order | **Must extend** with type, paymentTerms, creditLimit, billingAddress, shippingAddress |
| `PricingTier` | productId, tierName, unitPrice, casePrice — "Wholesale Cash", "Wholesale Net 30", "Retail" seeded | Already correct — PRICE-09 satisfied in schema |
| `VolumeDiscount` | minCases, maxCases, discountPercent — seeded data NOT confirmed (seed file searched, no VolumeDiscount seed found) | **Must seed** 6-10 cases = 5%, 11+ = 10% |
| `FrequencyDiscount` | frequency, discountPercent — seed NOT confirmed | **Must seed** quarterly = 2%, annual = 5% |
| `SubscriptionPlan` | name, billingCycle, price, includedProducts, loyaltyReward — reference table only | **Must add** `SubscriptionMember` tracking model |
| `Order` | channelId, customerId, paymentMethod, orderType, lineItems — fully implemented | Use as-is; pricing enrichment happens at line-item creation |
| `OrderLineItem` | orderId, productId, quantity, unitPrice, totalPrice | Add optional `discountApplied` and `discountReason` fields |
| `SalesChannel` | All 9 seeded: Amazon, Restaurant Retail, Wholesale/Distribution, Farmers Markets, E-commerce/Website, Etsy, Subscription/Membership, Catering, Events/Tailgates | No changes needed |

### Existing Enums to Reuse

| Enum | Relevant Values |
|------|----------------|
| `ChannelType` | ONLINE, RETAIL, WHOLESALE, MARKETPLACE, SUBSCRIPTION, EVENT |
| `OperatorOrderType` | STANDARD, CATERING, FARMERS_MARKET |
| `PaymentMethod` | NET_30, CASH, SQUARE, STRIPE, etc. |

### New Enums Needed

```prisma
enum CustomerType {
  RETAIL
  WHOLESALE
  DISTRIBUTOR
  RESTAURANT
  SUBSCRIPTION
  EVENT
}

enum SubscriptionStatus {
  ACTIVE
  PAUSED
  CANCELLED
  EXPIRED
}

enum LeadStage {
  LEAD
  CONTACTED
  MEETING
  PROPOSAL
  NEGOTIATION
  CLOSED
}
```

### Existing Actions

| File | Relevant Functions |
|------|--------------------|
| `actions/customers.ts` | `getCustomers`, `getCustomerById`, `getCustomerMetrics` — basic read-only |
| `actions/operator-orders.ts` | `createOperatorOrder` — does NOT yet apply volume/frequency discounts |
| `actions/sales.ts` | `createSale`, `updateSale` |

### Existing Routes

| Route | Current State |
|-------|--------------|
| `/dashboard/customers` | List view with search, metrics, expandable rows. No create/edit forms yet. |
| `/dashboard/orders/new` | Order creation form — doesn't show discount calculation |
| `/dashboard/finance` | Invoice/AR aging — no pricing settings |

### Existing UI Patterns (locked decisions)

- **Modal:** `fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4` with `useActionState` form inside — confirmed in `SaleEditModal.tsx`
- **Tabs:** Client component with `useState<activeTab>` + border-bottom indicator — confirmed in `OrdersTabs`
- **Form actions:** `useActionState(serverAction, undefined)` + `useFormStatus` submit button
- **Toast:** `sonner` toast library — `import { toast } from 'sonner'`
- **Table:** shadcn `Table` components from `@/components/ui/table`
- **Select:** Radix `@radix-ui/react-select` via shadcn wrapper
- **Email:** `resend` library, inline HTML strings (no React Email), `lib/emails/` directory pattern

---

## Standard Stack

No new libraries are required for Phase 5. All tooling is already installed.

### Core (already installed)
| Library | Version | Purpose | Phase 5 Use |
|---------|---------|---------|-------------|
| prisma | 7.4.0 | ORM + migration | Schema extensions, new models |
| @prisma/client | 7.4.0 | DB client | All actions |
| zod | 4.3.6 | Validation | New validators for CRM forms |
| next | 16.1.6 | Framework | New routes/pages |
| date-fns | 4.1.0 | Date math | Renewal reminders (30 days before), loyalty tracking (6 months) |
| resend | 6.9.2 | Email delivery | CRM-08 renewal reminder |
| sonner | 2.0.7 | Toast notifications | Form success/error feedback |
| lucide-react | 0.564.0 | Icons | CRM UI icons |

### No New Installs Required

All CRM functionality is achievable with the existing stack. The only "complexity" is business logic that must be written as pure TypeScript functions.

---

## Schema Changes Required

### 1. Extend Customer Model

```prisma
// Add to Customer model:
customerType      CustomerType      @default(RETAIL)
company           String?
paymentTerms      String?           // "net_30", "net_15", "cash", etc.
creditLimit       Decimal?
billingAddress    String?
shippingAddress   String?
city              String?
state             String?
zip               String?
notes             String?
```

### 2. Add DistributorAgreement Model

```prisma
model DistributorAgreement {
  id               String   @id @default(cuid())
  customerId       String
  territory        String
  commissionRate   Decimal  // percentage
  startDate        DateTime
  endDate          DateTime?
  status           String   @default("active") // "active", "expired", "terminated"
  notes            String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  customer Customer @relation(fields: [customerId], references: [id])

  @@index([customerId])
  @@index([status])
}
```

### 3. Add SubscriptionMember Model

```prisma
model SubscriptionMember {
  id               String             @id @default(cuid())
  customerId       String
  planId           String
  status           SubscriptionStatus @default(ACTIVE)
  startDate        DateTime
  renewalDate      DateTime?
  cancelledAt      DateTime?
  loyaltyMonths    Int                @default(0) // count of paid months
  loyaltyRewardAt  DateTime?          // when 6-month reward was earned
  notes            String?
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt

  customer SubscriptionPlan @relation(fields: [planId], references: [id])
  plan     Customer         @relation(fields: [customerId], references: [id])

  @@index([customerId])
  @@index([status])
  @@index([renewalDate])
}
```

### 4. Add Lead Model

```prisma
model Lead {
  id            String    @id @default(cuid())
  name          String
  company       String?
  email         String?
  phone         String?
  source        String?   // "referral", "cold", "event", etc.
  stage         LeadStage @default(LEAD)
  notes         String?
  followUpAt    DateTime?
  closedAt      DateTime?
  assignedToId  String?
  createdById   String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  assignedTo User? @relation("LeadAssignee", fields: [assignedToId], references: [id])
  createdBy  User  @relation("LeadCreator", fields: [createdById], references: [id])

  @@index([stage])
  @@index([followUpAt])
  @@index([assignedToId])
}
```

### 5. Add PromotionalPricing Model

```prisma
model PromotionalPricing {
  id              String   @id @default(cuid())
  productId       String
  name            String
  discountPercent Decimal?
  fixedPrice      Decimal?
  startDate       DateTime
  endDate         DateTime
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  product Product @relation(fields: [productId], references: [id])

  @@index([productId])
  @@index([startDate])
  @@index([endDate])
  @@index([isActive])
}
```

### 6. Extend OrderLineItem

Add optional fields for discount tracking:

```prisma
// Add to OrderLineItem:
discountPercent   Decimal?
discountReason    String?   // "volume", "frequency", "promotional"
```

### 7. Seed VolumeDiscount and FrequencyDiscount

The models exist but seed data was NOT found in `prisma/seed.ts`. Must add:

```typescript
// VolumeDiscount seeding
await prisma.volumeDiscount.upsert({
  where: { id: 'vol-tier-1' }, // use deterministic IDs
  // minCases: 6, maxCases: 10, discountPercent: 5
});
await prisma.volumeDiscount.upsert({
  // minCases: 11, maxCases: null, discountPercent: 10
});

// FrequencyDiscount seeding
await prisma.frequencyDiscount.upsert({
  // frequency: "quarterly", discountPercent: 2
});
await prisma.frequencyDiscount.upsert({
  // frequency: "annual", discountPercent: 5
});
```

Note: `VolumeDiscount` has no `@@id` field for upsert anchor — may need `@id @default(cuid())` already present (confirmed in schema). Use a migration + fresh seed run.

---

## Architecture Patterns

### Recommended New File Structure

```
src/app/
├── (dashboard)/dashboard/
│   ├── customers/
│   │   ├── page.tsx           # Server component — passes data to client
│   │   ├── client.tsx         # Existing — will need tabs added
│   │   ├── [id]/
│   │   │   └── page.tsx       # Customer detail: profile + purchase history + LTV
│   │   ├── new/
│   │   │   └── page.tsx       # Create customer form
│   │   ├── subscriptions/
│   │   │   └── page.tsx       # Subscription member list + lifecycle
│   │   ├── distributors/
│   │   │   └── page.tsx       # Distributor agreements + territory
│   │   └── leads/
│   │       └── page.tsx       # Lead pipeline kanban or table

src/app/actions/
│   ├── crm-customers.ts       # Extended customer CRUD (not overwriting customers.ts)
│   ├── crm-subscriptions.ts   # SubscriptionMember actions
│   ├── crm-distributors.ts    # DistributorAgreement actions
│   ├── crm-leads.ts           # Lead pipeline actions
│   └── pricing.ts             # Pricing calculation + promotional pricing CRUD

src/lib/
│   ├── utils/
│   │   └── pricing.ts         # calculateOrderPrice pure function
│   └── validators/
│       ├── crm-customers.ts
│       ├── crm-subscriptions.ts
│       ├── crm-leads.ts
│       └── pricing.ts

src/components/
│   ├── crm/
│   │   ├── CustomerForm.tsx
│   │   ├── CustomerDetail.tsx
│   │   ├── SubscriptionMemberList.tsx
│   │   ├── DistributorList.tsx
│   │   ├── LeadPipeline.tsx
│   │   └── LeadEditModal.tsx
│   └── pricing/
│       └── PriceCalculator.tsx  # Order form price breakdown widget
```

### Pattern 1: Pricing Calculation Utility

**What:** Pure function that composes pricing tier + volume discount + frequency discount + active promotional pricing.
**When to use:** Call from `createOperatorOrder` server action before persisting line items.

```typescript
// Source: project-specific, follows existing utils/fifo.ts pattern
// src/lib/utils/pricing.ts

export type PriceCalculation = {
  basePrice: number;
  discountPercent: number;
  discountReason: string | null;
  finalPrice: number;
};

export async function calculateLineItemPrice(
  productId: string,
  tierName: string,     // "Wholesale Cash" | "Wholesale Net 30" | "Retail"
  caseQuantity: number, // number of CASES
  frequencyDiscount: 'quarterly' | 'annual' | null,
  tx: typeof db
): Promise<PriceCalculation> {
  // 1. Fetch base price from PricingTier
  // 2. Check active PromotionalPricing (date range overlaps today)
  // 3. If no promo, check VolumeDiscount by caseQuantity
  // 4. If no volume, apply FrequencyDiscount if provided
  // 5. Return breakdown for OrderLineItem.discountPercent + discountReason
}
```

**Key rule:** Promotional pricing takes precedence over volume and frequency discounts. Volume and frequency discounts are NOT stacked — only the higher discount applies.

### Pattern 2: Customer Detail Page with Tabs

**What:** Server component fetches customer + related orders + distributor agreement + subscription status, passes to client tabs component.
**When to use:** `/dashboard/customers/[id]` route.

```typescript
// Source: follows existing /dashboard/orders/[id]/page.tsx pattern
// page.tsx
export default async function CustomerDetailPage({ params }) {
  const customer = await getCustomerById(params.id); // includes relations
  if (!customer) notFound();
  return <CustomerDetailClient customer={customer} />;
}
```

### Pattern 3: Subscription Renewal Reminder

**What:** Server action `sendRenewalReminders()` queries SubscriptionMember where `renewalDate` is within 30 days and `status = ACTIVE` and no reminder sent. Sends via Resend. Called from a cron-like manual trigger or from finance page load.
**Implementation:** Add `renewalReminderSentAt DateTime?` field to `SubscriptionMember`. Check before sending.

```typescript
// Source: follows existing lib/emails/customer-emails.ts pattern
// lib/emails/crm-emails.ts
export async function sendRenewalReminderEmail(data: {
  customerEmail: string;
  customerFirstName: string;
  planName: string;
  renewalDate: Date;
}): Promise<{ success: boolean; error?: string }>
```

**Note on CRM-08:** There is no cron job infrastructure in this app. The simplest approach is a "Send Renewal Reminders" button on the subscriptions page that calls the server action once. This is consistent with how `flagOverdueInvoices()` is called on the finance page load.

### Pattern 4: Lead Pipeline

**What:** Table view with stage filter (not a drag-and-drop kanban — no DnD library is installed and it would be hand-rolling). Follow-up reminders display as a "Due Today" badge.
**When to use:** `/dashboard/customers/leads` or a new dedicated `/dashboard/leads` route.

**Implementation:** Stage filter using `useState` on the client component, same pattern as the tabs/search on the customers page.

### Anti-Patterns to Avoid

- **Do not use React Hook Form.** `@hookform/resolvers` and `react-hook-form` are in `package.json` but every existing form uses `useActionState`. Follow `useActionState`.
- **Do not use Radix Dialog.** Custom `fixed inset-0` modal overlays are the established pattern.
- **Do not stack volume + frequency discounts.** The business rule is: promotional pricing wins if active, otherwise the higher of volume or frequency discount applies. Never add them together.
- **Do not add `caseQuantity` to `Order`.** The Order's `lineItems.quantity` is already in units. Calculate discount by dividing `quantity / product.unitsPerCase` to get case count.
- **Do not overwrite `actions/customers.ts`.** The existing functions serve the website customer view. Add `actions/crm-customers.ts` for operator CRM functions.
- **Do not use a kanban drag-and-drop library for leads.** No DnD is installed; a filtered table is correct.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email rendering | Custom template engine | Inline HTML strings in Resend (existing pattern) | Already proven in `customer-emails.ts` |
| Date math (30-day reminders, 6-month loyalty) | Manual millisecond math | `date-fns` `addMonths`, `addDays`, `isBefore`, `differenceInMonths` | Already installed, handles DST/month edge cases |
| Decimal precision in pricing | JavaScript floating point | Prisma `Decimal` type + `Number()` conversion at boundaries | Decimal is already used on all money fields |
| Search/filter | Server-side DB query per keystroke | Client-side filter on loaded data (existing pattern) | The existing customers page already loads all records and filters client-side |
| Pagination | Custom offset pagination | Match existing pattern (load all, no pagination on small datasets) | All existing lists load full datasets |

**Key insight:** Every "complex" problem in Phase 5 has an established solution already in use elsewhere in the codebase. The risk is diverging from those patterns, not the problems themselves.

---

## Common Pitfalls

### Pitfall 1: Units vs. Cases in Volume Discount Calculation

**What goes wrong:** `OrderLineItem.quantity` stores units. `VolumeDiscount.minCases` expects cases. If you compare them directly, the 5% tier triggers at 6 units (a tiny order) instead of 6 cases.
**Why it happens:** The schema mixes unit quantities (line items) and case thresholds (discounts).
**How to avoid:** Always divide `quantity / product.unitsPerCase` before looking up the volume discount. If `unitsPerCase` is null (TBD packaging), skip the volume discount calculation and set `discountReason = null`.
**Warning signs:** Volume discounts applying on very small orders.

### Pitfall 2: SubscriptionMember Relation Direction Error

**What goes wrong:** The `SubscriptionMember` model has both `customerId` and `planId` foreign keys. Prisma requires explicitly naming both sides of a relation when a model has multiple relations to the same table.
**Why it happens:** Easy to write `customer Customer` and `plan SubscriptionPlan` without naming the back-relation on the `Customer` and `SubscriptionPlan` models.
**How to avoid:** Add named `@relation` attributes on both sides: `subscriptionMembers SubscriptionMember[] @relation("CustomerSubscriptions")` on `Customer`, and match in `SubscriptionMember`.
**Warning signs:** `Error: The relation field customer on model SubscriptionMember is missing an opposite relation field on model Customer.`

### Pitfall 3: Lead User Relations Ambiguity

**What goes wrong:** `Lead` has both `createdById` and `assignedToId` pointing to `User`. Without explicit `@relation` names, Prisma throws an ambiguous relation error.
**Why it happens:** Same as pitfall 2 — multiple FK columns to the same model require explicit naming.
**How to avoid:** Use `@relation("LeadCreator")` and `@relation("LeadAssignee")` on both sides.
**Warning signs:** `Error: Ambiguous relation detected.`

### Pitfall 4: Discount Stacking

**What goes wrong:** Volume discount (10%) + frequency discount (5%) applied together = 15% off. The correct behavior is to apply only the higher one (10%).
**Why it happens:** It's tempting to add all applicable discounts.
**How to avoid:** In `calculateLineItemPrice`, use `Math.max(volumeDiscount, frequencyDiscount)`. Apply promotional pricing as a separate override that supersedes all other discounts.
**Warning signs:** Order totals being lower than expected on large annual orders.

### Pitfall 5: Customer Extend vs. Create Pattern

**What goes wrong:** Adding many fields to `Customer` in a single migration breaks the existing `getCustomers` return type used by the customers page, causing TypeScript errors.
**Why it happens:** `getCustomers` returns `db.customer.findMany(...)` and the caller `CustomerRow` type is manually typed.
**How to avoid:** Make all new fields `optional` (nullable with `?`). Update `CustomerRow` type in `client.tsx` to include the new optional fields after migration.
**Warning signs:** TypeScript errors on `customer.customerType` — property doesn't exist.

### Pitfall 6: Renewal Reminder Without Idempotency

**What goes wrong:** Calling `sendRenewalReminders()` twice sends duplicate emails.
**Why it happens:** No check for whether a reminder was already sent.
**How to avoid:** Add `renewalReminderSentAt DateTime?` to `SubscriptionMember`. Check `renewalReminderSentAt IS NULL` before sending and update the field atomically in `db.$transaction`.
**Warning signs:** Customers reporting duplicate emails.

---

## Code Examples

Verified patterns from codebase:

### useActionState Form Pattern (from SaleEditModal.tsx)

```typescript
// Source: src/components/sales/SaleEditModal.tsx
'use client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving...' : 'Save Changes'}
    </Button>
  );
}

// In parent component:
const [state, formAction] = useActionState(serverAction, undefined);

// useEffect for toast on success:
useEffect(() => {
  if (state?.success) {
    toast.success('Saved!');
    onClose();
  }
}, [state]);

return (
  <form action={formAction}>
    {/* fields */}
    <SubmitButton />
  </form>
);
```

### Custom Modal Overlay Pattern (from SaleEditModal.tsx)

```typescript
// Source: src/components/sales/SaleEditModal.tsx
return (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div className="bg-background border rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Edit Sale</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <form action={formAction} className="p-4 space-y-4">
        {/* form fields */}
      </form>
    </div>
  </div>
);
```

### Server Action with Zod v4 Pattern (from operator-orders.ts)

```typescript
// Source: src/app/actions/operator-orders.ts
'use server';
import { z } from 'zod';

const schema = z.object({
  channelId: z.string().min(1, 'Required'),
  // ...
});

export async function createCustomer(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const validated = schema.safeParse({
    channelId: formData.get('channelId'),
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as Record<string, string[]> };
  }
  // ... db.customer.create
  revalidatePath('/dashboard/customers');
  return { success: true };
}
```

### date-fns Subscription Date Math

```typescript
// Source: date-fns 4.1.0 official docs
import { addMonths, addDays, isBefore, differenceInMonths } from 'date-fns';

// Check 30-day renewal window
const thirtyDaysOut = addDays(new Date(), 30);
const isDueForReminder = isBefore(member.renewalDate, thirtyDaysOut);

// Check 6-month loyalty
const monthsActive = differenceInMonths(new Date(), member.startDate);
const hasEarnedLoyaltyReward = monthsActive >= 6;
```

### Tab Pattern (from orders/tabs.tsx)

```typescript
// Source: src/app/(dashboard)/dashboard/orders/tabs.tsx
'use client';
import { useState, type ReactNode } from 'react';

export function CRMTabs({ profiles, subscriptions, distributors, leads }: Props) {
  const [activeTab, setActiveTab] = useState<'profiles' | 'subscriptions' | 'distributors' | 'leads'>('profiles');

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b overflow-x-auto">
        {['profiles', 'subscriptions', 'distributors', 'leads'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'border-caribbean-green text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      {activeTab === 'profiles' && profiles}
      {/* etc */}
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| React Hook Form (installed but unused) | `useActionState` + `useFormStatus` | Every form in the codebase follows useActionState |
| Radix Dialog (not installed) | `fixed inset-0` custom overlay | Established in SaleEditModal and Phase 4 order forms |
| `OrderStatus` enum on WebsiteOrder | Separate `OperatorOrderStatus` on `Order` | Pattern established in Phase 4 — keep CRM enums separate too |
| `customers.ts` actions (website-facing) | New `crm-customers.ts` actions (operator-facing) | Avoid breaking existing website customer flow |

---

## Open Questions

1. **Where does the Customers section live in the nav?**
   - What we know: `Sidebar.tsx` already has a `Customers` nav item linking to `/dashboard/customers`. The current customers page is a simple website-customer list.
   - What's unclear: Does Phase 5 replace the existing customers page, or does it add sub-routes alongside it?
   - Recommendation: Expand `/dashboard/customers` into a tabbed CRM hub (Profiles, Subscriptions, Distributors, Leads). The existing customer list becomes the "Profiles" tab. No sidebar change needed.

2. **Should VolumeDiscount use case quantity or unit quantity?**
   - What we know: `VolumeDiscount.minCases` field name implies cases. `OrderLineItem.quantity` is in units. `Product.unitsPerCase` is nullable.
   - What's unclear: If `unitsPerCase` is null, volume discount cannot be calculated.
   - Recommendation: Skip volume discount calculation when `unitsPerCase` is null and log a warning. Always use `Math.floor(quantity / unitsPerCase)` for case count.

3. **Renewal reminders: manual trigger or automatic?**
   - What we know: No cron job infrastructure exists. The finance page calls `flagOverdueInvoices()` on every load.
   - What's unclear: Whether a button trigger is acceptable or if a proper cron (Vercel Cron Jobs) should be set up.
   - Recommendation: Build as a manual "Send Reminders" button for Phase 5. Document the Vercel Cron path as a future enhancement. This matches the existing `flagOverdueInvoices` precedent exactly.

4. **Distributor commission tracking: calculation or manual entry?**
   - What we know: CRM-05 says "track distributor performance metrics and commissions." No existing commission calculation logic exists.
   - What's unclear: Whether commissions should auto-calculate from orders or be manually entered.
   - Recommendation: Manual entry for Phase 5 — store `commissionRate` on `DistributorAgreement` and show calculated amounts on the detail view using `ORDER total * commissionRate`. No auto-trigger needed.

---

## Sources

### Primary (HIGH confidence)
- Direct source code reading — `prisma/schema.prisma`, all relevant action files, component files, seed.ts
- `apps/command-center/package.json` — confirmed all installed dependencies and versions
- `src/components/sales/SaleEditModal.tsx` — confirmed modal and useActionState patterns
- `src/app/(dashboard)/dashboard/orders/tabs.tsx` — confirmed tab pattern
- `src/lib/emails/customer-emails.ts` — confirmed Resend email pattern
- `src/components/layout/Sidebar.tsx` — confirmed nav items and routing structure

### Secondary (MEDIUM confidence)
- date-fns 4.x official documentation — `addMonths`, `addDays`, `differenceInMonths`, `isBefore` APIs (verified in prior phases, same v4 API)
- Prisma 7.x relation naming requirements — `@relation("name")` required for ambiguous multi-FK models (well-established Prisma behavior)

### Tertiary (LOW confidence — flag for validation)
- VolumeDiscount and FrequencyDiscount seed data absence: searched `seed.ts` for these model names, found no `prisma.volumeDiscount.upsert` or `prisma.frequencyDiscount.upsert` calls. This means the tables exist but are empty. Confirm by checking current DB state before Phase 5 begins.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all versions confirmed from package.json
- Schema changes: HIGH — directly derived from existing schema gaps identified by reading schema.prisma
- Architecture patterns: HIGH — all patterns confirmed by reading actual implementation files
- Business logic (pricing): HIGH — rules are explicit in requirements; pitfalls are deduced from schema structure
- Seed data gaps: MEDIUM — searched seed.ts but did not execute DB queries to confirm current state

**Research date:** 2026-03-11
**Valid until:** 2026-04-10 (30 days — stable stack, no fast-moving dependencies)
