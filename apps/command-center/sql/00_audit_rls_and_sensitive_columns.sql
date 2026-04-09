-- ============================================================================
-- STEP 1: AUDIT — Run this FIRST in Supabase SQL Editor
-- Lists all public tables with RLS disabled + sensitive columns exposed
-- ============================================================================

-- 1A: Tables with RLS DISABLED
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;

-- 1B: Sensitive columns exposed via PostgREST
-- Matches columns likely to contain PII, secrets, or credentials
SELECT
  c.table_name,
  c.column_name,
  c.data_type,
  CASE
    WHEN c.column_name ILIKE '%password%'   THEN 'CREDENTIAL'
    WHEN c.column_name ILIKE '%token%'      THEN 'SECRET'
    WHEN c.column_name ILIKE '%secret%'     THEN 'SECRET'
    WHEN c.column_name ILIKE '%api_key%'    THEN 'SECRET'
    WHEN c.column_name ILIKE '%email%'      THEN 'PII'
    WHEN c.column_name ILIKE '%phone%'      THEN 'PII'
    WHEN c.column_name ILIKE '%ssn%'        THEN 'PII'
    WHEN c.column_name ILIKE '%dob%'        THEN 'PII'
    WHEN c.column_name ILIKE '%address%'    THEN 'PII'
    WHEN c.column_name ILIKE '%label_data%' THEN 'SENSITIVE_BLOB'
    WHEN c.column_name ILIKE '%stripe%'     THEN 'PAYMENT_SECRET'
    WHEN c.column_name ILIKE '%easypost%'   THEN 'INTEGRATION_SECRET'
  END AS sensitivity_class
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND (
    c.column_name ILIKE '%password%'
    OR c.column_name ILIKE '%token%'
    OR c.column_name ILIKE '%secret%'
    OR c.column_name ILIKE '%api_key%'
    OR c.column_name ILIKE '%email%'
    OR c.column_name ILIKE '%phone%'
    OR c.column_name ILIKE '%ssn%'
    OR c.column_name ILIKE '%dob%'
    OR c.column_name ILIKE '%address%'
    OR c.column_name ILIKE '%label_data%'
    OR c.column_name ILIKE '%stripe%'
    OR c.column_name ILIKE '%easypost%'
  )
ORDER BY
  sensitivity_class,
  c.table_name,
  c.column_name;
