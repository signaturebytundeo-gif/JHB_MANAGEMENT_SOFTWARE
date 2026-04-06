CREATE TABLE IF NOT EXISTS "RestaurantLead" (
  id TEXT PRIMARY KEY,
  "businessName" TEXT NOT NULL,
  "contactName" TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  "deliveryAddress" TEXT,
  "requestedDate" TEXT,
  "qtyGallon" INTEGER NOT NULL DEFAULT 0,
  "qtyCase" INTEGER NOT NULL DEFAULT 0,
  "qtyEscovitch" INTEGER NOT NULL DEFAULT 0,
  "orderTotal" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "paymentMethod" TEXT,
  notes TEXT,
  "taxCertFileName" TEXT,
  status TEXT NOT NULL DEFAULT 'NEW',
  "assignedTo" TEXT,
  "followUpAt" TIMESTAMP(3),
  "convertedValue" NUMERIC(10,2),
  "lostReason" TEXT,
  "internalNotes" TEXT,
  source TEXT NOT NULL DEFAULT 'restaurant-partners-form',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "RestaurantLead_status_idx" ON "RestaurantLead"(status);
CREATE INDEX IF NOT EXISTS "RestaurantLead_createdAt_idx" ON "RestaurantLead"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "RestaurantLead_email_idx" ON "RestaurantLead"(email);
