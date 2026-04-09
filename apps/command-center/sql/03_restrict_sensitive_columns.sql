-- ============================================================================
-- STEP 4: RESTRICT SENSITIVE COLUMNS
-- ============================================================================
-- Even with RLS blocking PostgREST, defense-in-depth means we also revoke
-- column-level SELECT on sensitive data for `anon` and `authenticated`.
--
-- If RLS is ever misconfigured or a permissive policy is accidentally added,
-- these column revokes act as a second barrier.
-- ============================================================================

-- ============================================================================
-- 4A: CREDENTIALS & SECRETS — Highest severity
-- These columns must NEVER be readable via the API.
-- ============================================================================

-- User.password (bcrypt hash — no API consumer should ever see this)
REVOKE SELECT (password) ON "User" FROM anon, authenticated;

-- InviteToken.token (bearer token — grants account creation rights)
REVOKE SELECT (token) ON "InviteToken" FROM anon, authenticated;

-- MagicLinkToken.token (bearer token — grants login access)
REVOKE SELECT (token) ON "MagicLinkToken" FROM anon, authenticated;

-- Shipment: third-party integration secrets
REVOKE SELECT ("stripePaymentIntentId") ON "Shipment" FROM anon, authenticated;
REVOKE SELECT ("easypostShipmentId")    ON "Shipment" FROM anon, authenticated;
REVOKE SELECT ("labelData")             ON "Shipment" FROM anon, authenticated;

-- WebsiteOrder: Stripe event ID (can be used to replay/query Stripe)
REVOKE SELECT ("stripeEventId") ON "WebsiteOrder" FROM anon, authenticated;

-- ============================================================================
-- 4B: PII — Personal Identifiable Information
-- Emails, phones, addresses should not leak via API.
-- ============================================================================

-- User PII
REVOKE SELECT (email) ON "User" FROM anon, authenticated;

-- Customer PII
REVOKE SELECT (email)           ON "Customer" FROM anon, authenticated;
REVOKE SELECT (phone)           ON "Customer" FROM anon, authenticated;
REVOKE SELECT ("billingAddress")  ON "Customer" FROM anon, authenticated;
REVOKE SELECT ("shippingAddress") ON "Customer" FROM anon, authenticated;

-- Shipment recipient PII
REVOKE SELECT ("recipientName")  ON "Shipment" FROM anon, authenticated;
REVOKE SELECT ("recipientEmail") ON "Shipment" FROM anon, authenticated;
REVOKE SELECT ("recipientPhone") ON "Shipment" FROM anon, authenticated;
REVOKE SELECT ("addressLine1")   ON "Shipment" FROM anon, authenticated;
REVOKE SELECT ("addressLine2")   ON "Shipment" FROM anon, authenticated;

-- WebsiteOrder shipping address PII
REVOKE SELECT ("shippingAddressLine1") ON "WebsiteOrder" FROM anon, authenticated;
REVOKE SELECT ("shippingAddressLine2") ON "WebsiteOrder" FROM anon, authenticated;
REVOKE SELECT ("shippingCity")         ON "WebsiteOrder" FROM anon, authenticated;
REVOKE SELECT ("shippingState")        ON "WebsiteOrder" FROM anon, authenticated;
REVOKE SELECT ("shippingZip")          ON "WebsiteOrder" FROM anon, authenticated;
REVOKE SELECT ("shippingCountry")      ON "WebsiteOrder" FROM anon, authenticated;

-- CoPackerPartner contact PII
REVOKE SELECT (email)   ON "CoPackerPartner" FROM anon, authenticated;
REVOKE SELECT (phone)   ON "CoPackerPartner" FROM anon, authenticated;
REVOKE SELECT (address) ON "CoPackerPartner" FROM anon, authenticated;

-- InviteToken + MagicLinkToken emails
REVOKE SELECT (email) ON "InviteToken"    FROM anon, authenticated;
REVOKE SELECT (email) ON "MagicLinkToken" FROM anon, authenticated;

-- Lead PII
REVOKE SELECT (email) ON "Lead" FROM anon, authenticated;
REVOKE SELECT (phone) ON "Lead" FROM anon, authenticated;

-- ============================================================================
-- 4C: FINANCIAL DATA
-- Payment links and bank references should not leak.
-- ============================================================================

REVOKE SELECT ("paymentLink")        ON "Invoice" FROM anon, authenticated;
REVOKE SELECT ("bankAuthorizationRef") ON "Expense" FROM anon, authenticated;

-- ============================================================================
-- NOTE: These REVOKEs apply to the `anon` and `authenticated` Supabase roles.
-- The `postgres` superuser and `service_role` are NOT affected.
-- Prisma (which connects as `postgres`) continues to read all columns.
-- ============================================================================
