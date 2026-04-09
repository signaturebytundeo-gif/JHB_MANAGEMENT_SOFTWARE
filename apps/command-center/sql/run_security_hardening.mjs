/**
 * Run security hardening SQL against Supabase.
 * Uses the direct PostgreSQL connection (not pooler) since we need
 * DDL operations (ALTER TABLE, CREATE POLICY) that pgbouncer may block.
 *
 * Usage: node sql/run_security_hardening.mjs
 */
import { config } from 'dotenv';
import pg from 'pg';

config({ path: '.env.local' });
config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('No DATABASE_URL or DIRECT_URL found in .env.local');
  process.exit(1);
}

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  console.log('Connected to database.\n');

  // =========================================================================
  // STEP 1: AUDIT — Show current state
  // =========================================================================
  console.log('=' .repeat(70));
  console.log('STEP 1: AUDIT — Tables with RLS DISABLED');
  console.log('=' .repeat(70));

  const auditRls = await client.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public' AND rowsecurity = false
    ORDER BY tablename
  `);
  if (auditRls.rows.length === 0) {
    console.log('  All tables already have RLS enabled.\n');
  } else {
    console.log(`  Found ${auditRls.rows.length} tables WITHOUT RLS:`);
    auditRls.rows.forEach(r => console.log(`    - ${r.tablename}`));
    console.log();
  }

  const auditCols = await client.query(`
    SELECT c.table_name, c.column_name,
      CASE
        WHEN c.column_name ILIKE '%password%' THEN 'CREDENTIAL'
        WHEN c.column_name ILIKE '%token%'    THEN 'SECRET'
        WHEN c.column_name ILIKE '%secret%'   THEN 'SECRET'
        WHEN c.column_name ILIKE '%stripe%'   THEN 'PAYMENT_SECRET'
        WHEN c.column_name ILIKE '%easypost%' THEN 'INTEGRATION_SECRET'
        WHEN c.column_name ILIKE '%email%'    THEN 'PII'
        WHEN c.column_name ILIKE '%phone%'    THEN 'PII'
        WHEN c.column_name ILIKE '%address%'  THEN 'PII'
        ELSE 'OTHER'
      END AS severity
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND (
        c.column_name ILIKE '%password%' OR c.column_name ILIKE '%token%'
        OR c.column_name ILIKE '%secret%' OR c.column_name ILIKE '%email%'
        OR c.column_name ILIKE '%phone%' OR c.column_name ILIKE '%address%'
        OR c.column_name ILIKE '%stripe%' OR c.column_name ILIKE '%easypost%'
        OR c.column_name ILIKE '%label_data%'
      )
    ORDER BY severity, c.table_name
  `);
  console.log(`  Found ${auditCols.rows.length} sensitive columns:`);
  auditCols.rows.forEach(r =>
    console.log(`    [${r.severity}] ${r.table_name}.${r.column_name}`)
  );
  console.log();

  // =========================================================================
  // STEP 2: ENABLE RLS ON ALL TABLES
  // =========================================================================
  console.log('=' .repeat(70));
  console.log('STEP 2: ENABLE RLS on all public tables');
  console.log('=' .repeat(70));

  const allTables = auditRls.rows.length > 0
    ? auditRls.rows.map(r => r.tablename)
    : [];

  // Get ALL public tables (not just unprotected ones) for policy creation
  const allPublicTables = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  const tableNames = allPublicTables.rows.map(r => r.tablename);

  // Enable RLS on tables that don't have it
  for (const tbl of allTables) {
    await client.query(`ALTER TABLE "${tbl}" ENABLE ROW LEVEL SECURITY`);
    console.log(`  RLS enabled: ${tbl}`);
  }
  if (allTables.length === 0) {
    console.log('  Nothing to do — all tables already have RLS.');
  }
  console.log();

  // =========================================================================
  // STEP 3: CREATE service_role POLICIES + FORCE RLS
  // =========================================================================
  console.log('=' .repeat(70));
  console.log('STEP 3: Create service_role policies + FORCE RLS');
  console.log('=' .repeat(70));

  for (const tbl of tableNames) {
    // Drop existing policy if present (safe re-run)
    await client.query(`DROP POLICY IF EXISTS "service_role_full_access" ON "${tbl}"`);

    // Create permissive policy for service_role
    await client.query(`
      CREATE POLICY "service_role_full_access" ON "${tbl}"
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true)
    `);

    // Force RLS even for table owner
    await client.query(`ALTER TABLE "${tbl}" FORCE ROW LEVEL SECURITY`);

    console.log(`  Policy + FORCE RLS: ${tbl}`);
  }
  console.log();

  // =========================================================================
  // STEP 4: REVOKE SENSITIVE COLUMNS
  // =========================================================================
  console.log('=' .repeat(70));
  console.log('STEP 4: Revoke sensitive columns from anon/authenticated');
  console.log('=' .repeat(70));

  const revokes = [
    // CREDENTIALS & SECRETS
    ['User', 'password'],
    ['InviteToken', 'token'],
    ['MagicLinkToken', 'token'],
    ['Shipment', 'stripePaymentIntentId'],
    ['Shipment', 'easypostShipmentId'],
    ['Shipment', 'labelData'],
    ['WebsiteOrder', 'stripeEventId'],
    // PII - emails
    ['User', 'email'],
    ['Customer', 'email'],
    ['InviteToken', 'email'],
    ['MagicLinkToken', 'email'],
    ['CoPackerPartner', 'email'],
    ['Lead', 'email'],
    // PII - phones
    ['Customer', 'phone'],
    ['CoPackerPartner', 'phone'],
    ['Lead', 'phone'],
    ['Shipment', 'recipientPhone'],
    // PII - addresses
    ['Customer', 'billingAddress'],
    ['Customer', 'shippingAddress'],
    ['Shipment', 'recipientName'],
    ['Shipment', 'recipientEmail'],
    ['Shipment', 'addressLine1'],
    ['Shipment', 'addressLine2'],
    ['WebsiteOrder', 'shippingAddressLine1'],
    ['WebsiteOrder', 'shippingAddressLine2'],
    ['WebsiteOrder', 'shippingCity'],
    ['WebsiteOrder', 'shippingState'],
    ['WebsiteOrder', 'shippingZip'],
    ['WebsiteOrder', 'shippingCountry'],
    ['CoPackerPartner', 'address'],
    // FINANCIAL
    ['Invoice', 'paymentLink'],
    ['Expense', 'bankAuthorizationRef'],
  ];

  let revokeCount = 0;
  for (const [tbl, col] of revokes) {
    try {
      await client.query(`REVOKE SELECT ("${col}") ON "${tbl}" FROM anon, authenticated`);
      revokeCount++;
      console.log(`  Revoked: ${tbl}.${col}`);
    } catch (err) {
      // Column might not exist if schema differs
      console.log(`  Skipped: ${tbl}.${col} (${err.message.split('\n')[0]})`);
    }
  }
  console.log(`\n  Total columns revoked: ${revokeCount}`);
  console.log();

  // =========================================================================
  // STEP 5: VALIDATION
  // =========================================================================
  console.log('=' .repeat(70));
  console.log('STEP 5: VALIDATION');
  console.log('=' .repeat(70));

  // 5A: Any tables still without RLS?
  const checkRls = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND rowsecurity = false
    ORDER BY tablename
  `);
  if (checkRls.rows.length === 0) {
    console.log('  [PASS] All public tables have RLS enabled.');
  } else {
    console.log(`  [FAIL] ${checkRls.rows.length} tables still without RLS:`);
    checkRls.rows.forEach(r => console.log(`    - ${r.tablename}`));
  }

  // 5B: Confirm FORCE RLS
  const checkForce = await client.query(`
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relforcerowsecurity = false
    ORDER BY c.relname
  `);
  if (checkForce.rows.length === 0) {
    console.log('  [PASS] All tables have FORCE RLS enabled.');
  } else {
    console.log(`  [WARN] ${checkForce.rows.length} tables without FORCE RLS:`);
    checkForce.rows.forEach(r => console.log(`    - ${r.relname}`));
  }

  // 5C: Policy count
  const policyCount = await client.query(`
    SELECT count(*) as cnt FROM pg_policies WHERE schemaname = 'public'
  `);
  console.log(`  [INFO] Total active policies: ${policyCount.rows[0].cnt}`);

  // 5D: Smoke test — try reading as anon
  console.log('\n  Smoke test (reading as anon role):');
  try {
    await client.query('SET ROLE anon');
    try {
      await client.query('SELECT * FROM "User" LIMIT 1');
      console.log('  [FAIL] anon can read "User" table!');
    } catch {
      console.log('  [PASS] anon blocked from "User" table.');
    }
    try {
      await client.query('SELECT * FROM "Customer" LIMIT 1');
      console.log('  [FAIL] anon can read "Customer" table!');
    } catch {
      console.log('  [PASS] anon blocked from "Customer" table.');
    }
    try {
      await client.query('SELECT * FROM "Shipment" LIMIT 1');
      console.log('  [FAIL] anon can read "Shipment" table!');
    } catch {
      console.log('  [PASS] anon blocked from "Shipment" table.');
    }
    await client.query('RESET ROLE');
  } catch (err) {
    console.log(`  [SKIP] Could not switch to anon role: ${err.message.split('\n')[0]}`);
    try { await client.query('RESET ROLE'); } catch {}
  }

  console.log('\n' + '=' .repeat(70));
  console.log('SECURITY HARDENING COMPLETE');
  console.log('=' .repeat(70));
}

run()
  .catch(err => {
    console.error('\nFATAL:', err.message);
    process.exit(1);
  })
  .finally(() => client.end());
