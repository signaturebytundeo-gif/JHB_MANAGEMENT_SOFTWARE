-- ============================================================================
-- STEP 3: RLS POLICIES — Deny-by-Default + Explicit Service Role Access
-- ============================================================================
-- ARCHITECTURE DECISION:
--
-- Your app does NOT use Supabase JS client (supabase.from('...')).
-- All data access goes through Prisma -> direct PostgreSQL connection as
-- the `postgres` superuser, which BYPASSES RLS automatically.
--
-- Therefore, the correct policy is:
--   1. RLS ON (blocks `anon` and `authenticated` via PostgREST)
--   2. One blanket ALLOW policy per table for `service_role` only
--      (so Supabase Edge Functions, webhooks, and admin tools still work)
--   3. NO policies for `anon` or `authenticated` (deny-by-default)
--
-- This is the tightest possible lockdown. If you later adopt Supabase JS
-- client for any feature (e.g., realtime subscriptions, client-side reads),
-- you'd add targeted policies for `authenticated` on those specific tables.
-- ============================================================================

-- Helper: Drop a policy if it exists (safe re-runs)
-- PostgreSQL doesn't have DROP POLICY IF EXISTS in all versions,
-- so we use a DO block pattern.

-- ============================================================================
-- SERVICE ROLE FULL ACCESS POLICIES
-- The `service_role` is used by Supabase Edge Functions, webhooks,
-- and the Supabase Dashboard's data editor.
-- ============================================================================

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'User', 'InviteToken', 'MagicLinkToken',
    'Product', 'PricingTier', 'VolumeDiscount', 'FrequencyDiscount', 'PromotionalPricing',
    'Location', 'SalesChannel', 'MarketEvent',
    'SubscriptionPlan', 'ApprovalThreshold', 'SubscriptionMember', 'DistributorAgreement',
    'CoPackerPartner', 'Batch', 'QCTest', 'BatchAllocation', 'RawMaterial', 'BatchMaterial',
    'InventoryMovement', 'PackagingMaterial', 'StockAdjustment', 'InventoryTransaction',
    'Sale',
    'Shipment',
    'Customer', 'WebsiteOrder', 'Order', 'OrderLineItem',
    'Invoice', 'InvoiceLineItem', 'InvoicePayment',
    'Expense', 'Budget',
    'Lead',
    'Document', 'DocumentVersion',
    'MarketplaceSync'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    -- Drop existing policy if present (safe re-run)
    EXECUTE format(
      'DROP POLICY IF EXISTS "service_role_full_access" ON %I',
      tbl
    );

    -- Create permissive policy: service_role can do everything
    EXECUTE format(
      'CREATE POLICY "service_role_full_access" ON %I
         FOR ALL
         TO service_role
         USING (true)
         WITH CHECK (true)',
      tbl
    );
  END LOOP;
END $$;

-- ============================================================================
-- EXPLICIT DENY: Force RLS for `anon` and `authenticated` roles
-- ============================================================================
-- By default, RLS ON + no matching policy = deny. But to be defense-in-depth,
-- we also FORCE RLS on the table owner so even if someone misconfigures a
-- role grant, RLS still applies.

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'User', 'InviteToken', 'MagicLinkToken',
    'Product', 'PricingTier', 'VolumeDiscount', 'FrequencyDiscount', 'PromotionalPricing',
    'Location', 'SalesChannel', 'MarketEvent',
    'SubscriptionPlan', 'ApprovalThreshold', 'SubscriptionMember', 'DistributorAgreement',
    'CoPackerPartner', 'Batch', 'QCTest', 'BatchAllocation', 'RawMaterial', 'BatchMaterial',
    'InventoryMovement', 'PackagingMaterial', 'StockAdjustment', 'InventoryTransaction',
    'Sale',
    'Shipment',
    'Customer', 'WebsiteOrder', 'Order', 'OrderLineItem',
    'Invoice', 'InvoiceLineItem', 'InvoicePayment',
    'Expense', 'Budget',
    'Lead',
    'Document', 'DocumentVersion',
    'MarketplaceSync'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    -- FORCE means even the table owner role (usually `postgres`) must pass
    -- RLS checks. However, superusers STILL bypass — this protects against
    -- non-superuser roles that happen to own the table.
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $$;

-- ============================================================================
-- VERIFICATION: Confirm no anon/authenticated policies exist
-- ============================================================================
-- After running this, the ONLY policy on each table should be
-- "service_role_full_access". Run this query to verify:
--
--   SELECT schemaname, tablename, policyname, roles
--   FROM pg_policies
--   WHERE schemaname = 'public'
--   ORDER BY tablename, policyname;
--
-- Expected: one row per table, roles = {service_role}
-- ============================================================================
