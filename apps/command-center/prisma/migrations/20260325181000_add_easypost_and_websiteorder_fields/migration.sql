-- Manual migration: add EasyPost fields to Shipment and shipping address fields to WebsiteOrder
-- Applied via prisma db execute (shadow DB workaround — see STATE.md decision 21-01)

ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "easypostShipmentId" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "websiteOrderId" TEXT;

ALTER TABLE "WebsiteOrder" ADD COLUMN IF NOT EXISTS "shippingAddressLine1" TEXT;
ALTER TABLE "WebsiteOrder" ADD COLUMN IF NOT EXISTS "shippingAddressLine2" TEXT;
ALTER TABLE "WebsiteOrder" ADD COLUMN IF NOT EXISTS "shippingCity" TEXT;
ALTER TABLE "WebsiteOrder" ADD COLUMN IF NOT EXISTS "shippingState" TEXT;
ALTER TABLE "WebsiteOrder" ADD COLUMN IF NOT EXISTS "shippingZip" TEXT;
ALTER TABLE "WebsiteOrder" ADD COLUMN IF NOT EXISTS "shippingCountry" TEXT DEFAULT 'US';

CREATE INDEX IF NOT EXISTS "Shipment_websiteOrderId_idx" ON "Shipment"("websiteOrderId");

ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_websiteOrderId_fkey"
  FOREIGN KEY ("websiteOrderId") REFERENCES "WebsiteOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
