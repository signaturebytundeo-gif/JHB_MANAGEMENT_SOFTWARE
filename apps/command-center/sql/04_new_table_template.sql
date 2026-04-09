-- ============================================================================
-- STEP 5: FUTURE-PROOF TEMPLATE
-- Copy this template every time you create a new table via Prisma migration.
-- After running `prisma migrate deploy`, run this SQL in Supabase SQL Editor.
-- ============================================================================

-- Replace "YourNewTable" with the actual Prisma model name (case-sensitive).

-- 1. Enable RLS (deny-by-default for anon/authenticated)
ALTER TABLE "YourNewTable" ENABLE ROW LEVEL SECURITY;

-- 2. Force RLS even for table owner role (defense-in-depth)
ALTER TABLE "YourNewTable" FORCE ROW LEVEL SECURITY;

-- 3. Allow service_role full access (Edge Functions, webhooks, dashboard)
CREATE POLICY "service_role_full_access" ON "YourNewTable"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. (Optional) If this table has sensitive columns, revoke them:
-- REVOKE SELECT (sensitive_column) ON "YourNewTable" FROM anon, authenticated;

-- 5. (Optional) If you need client-side reads via Supabase JS:
-- CREATE POLICY "authenticated_select" ON "YourNewTable"
--   FOR SELECT
--   TO authenticated
--   USING (true);  -- or a row-level filter like (user_id = auth.uid())


-- ============================================================================
-- PRE-DEPLOY CHECKLIST — Run through before every new table goes live
-- ============================================================================
--
--  [ ] RLS enabled:    ALTER TABLE "X" ENABLE ROW LEVEL SECURITY;
--  [ ] RLS forced:     ALTER TABLE "X" FORCE ROW LEVEL SECURITY;
--  [ ] service_role policy created (for Edge Functions / dashboard)
--  [ ] Sensitive columns identified and REVOKEd from anon/authenticated
--  [ ] If PostgREST access needed: explicit policy added for authenticated
--      with narrowest possible filter (auth.uid(), org_id, etc.)
--  [ ] If PostgREST access NOT needed: no anon/authenticated policies (deny)
--  [ ] Verified via audit query (see 05_validation.sql)
--  [ ] Prisma operations tested (unaffected by RLS)
--
-- ============================================================================
