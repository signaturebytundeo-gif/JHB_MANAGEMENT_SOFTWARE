-- ============================================================================
-- STEP 6: VALIDATION — Run AFTER applying 01, 02, and 03
-- Confirms both vulnerabilities are resolved.
-- ============================================================================

-- 6A: Confirm RLS is ENABLED on ALL public tables
-- Expected: zero rows. Any row returned = still vulnerable.
SELECT
  tablename AS "VULNERABLE TABLE (RLS DISABLED)",
  'RUN: ALTER TABLE "' || tablename || '" ENABLE ROW LEVEL SECURITY;' AS fix
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;

-- 6B: Confirm RLS is FORCED on all tables (defense-in-depth)
-- Expected: all tables show relforcerowsecurity = true
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'  -- ordinary tables only
ORDER BY c.relname;

-- 6C: List ALL active policies — should ONLY be service_role_full_access
-- Any policy granting anon/authenticated = potential hole
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 6D: Verify sensitive columns are revoked from anon/authenticated
-- This checks column-level privileges. Expected: no rows for anon/authenticated
-- on sensitive columns.
SELECT
  grantee,
  table_name,
  column_name,
  privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
  AND column_name IN (
    'password', 'token', 'email', 'phone',
    'billingAddress', 'shippingAddress',
    'recipientName', 'recipientEmail', 'recipientPhone',
    'addressLine1', 'addressLine2',
    'shippingAddressLine1', 'shippingAddressLine2',
    'shippingCity', 'shippingState', 'shippingZip', 'shippingCountry',
    'stripePaymentIntentId', 'stripeEventId',
    'easypostShipmentId', 'labelData',
    'paymentLink', 'bankAuthorizationRef'
  )
  AND privilege_type = 'SELECT'
ORDER BY table_name, column_name;

-- 6E: Quick smoke test — try to read as `anon` role
-- Expected: ERROR or empty result set
-- (Run each one separately to test)
--
-- SET ROLE anon;
-- SELECT * FROM "User" LIMIT 1;        -- should fail
-- SELECT * FROM "Customer" LIMIT 1;    -- should fail
-- SELECT * FROM "Shipment" LIMIT 1;    -- should fail
-- RESET ROLE;
