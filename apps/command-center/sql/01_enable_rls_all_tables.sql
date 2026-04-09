-- ============================================================================
-- STEP 2: ENABLE RLS ON ALL PUBLIC TABLES
-- ============================================================================
-- WHY: Without RLS, Supabase PostgREST exposes every table to the `anon`
-- and `authenticated` API roles. Enabling RLS with NO permissive policies
-- means PostgREST returns zero rows (deny-by-default).
--
-- SAFE: Your app uses Prisma via the `postgres` superuser role, which
-- BYPASSES RLS entirely. Prisma operations are unaffected.
--
-- ALSO SAFE: Supabase Dashboard uses the `service_role` key internally,
-- which also bypasses RLS — you can still browse data in the dashboard.
-- ============================================================================

-- User & Authentication
ALTER TABLE "User"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InviteToken"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MagicLinkToken" ENABLE ROW LEVEL SECURITY;

-- Product & Pricing
ALTER TABLE "Product"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PricingTier"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VolumeDiscount"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FrequencyDiscount"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PromotionalPricing" ENABLE ROW LEVEL SECURITY;

-- Location & Channels
ALTER TABLE "Location"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SalesChannel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MarketEvent"  ENABLE ROW LEVEL SECURITY;

-- Subscription & Approval
ALTER TABLE "SubscriptionPlan"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApprovalThreshold"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SubscriptionMember"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DistributorAgreement"  ENABLE ROW LEVEL SECURITY;

-- Production & QC
ALTER TABLE "CoPackerPartner" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Batch"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QCTest"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BatchAllocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RawMaterial"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BatchMaterial"   ENABLE ROW LEVEL SECURITY;

-- Inventory
ALTER TABLE "InventoryMovement"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PackagingMaterial"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockAdjustment"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryTransaction" ENABLE ROW LEVEL SECURITY;

-- Sales
ALTER TABLE "Sale" ENABLE ROW LEVEL SECURITY;

-- Shipping
ALTER TABLE "Shipment" ENABLE ROW LEVEL SECURITY;

-- Customer & Orders
ALTER TABLE "Customer"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebsiteOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderLineItem" ENABLE ROW LEVEL SECURITY;

-- Invoicing
ALTER TABLE "Invoice"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceLineItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoicePayment" ENABLE ROW LEVEL SECURITY;

-- Finance
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Budget"  ENABLE ROW LEVEL SECURITY;

-- CRM
ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;

-- Documents
ALTER TABLE "Document"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentVersion" ENABLE ROW LEVEL SECURITY;

-- Marketplace
ALTER TABLE "MarketplaceSync" ENABLE ROW LEVEL SECURITY;
