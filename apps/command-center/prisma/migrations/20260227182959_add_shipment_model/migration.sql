-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'US',
    "weight" DECIMAL NOT NULL,
    "length" DECIMAL,
    "width" DECIMAL,
    "height" DECIMAL,
    "serviceCode" TEXT NOT NULL DEFAULT '03',
    "shipFromLocationId" TEXT,
    "trackingNumber" TEXT,
    "labelData" TEXT,
    "labelFormat" TEXT,
    "shippingCost" DECIMAL,
    "stripePaymentIntentId" TEXT,
    "orderNotes" TEXT,
    "items" TEXT,
    "createdById" TEXT NOT NULL,
    "shippedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Shipment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Shipment_shipFromLocationId_fkey" FOREIGN KEY ("shipFromLocationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Shipment_status_idx" ON "Shipment"("status");

-- CreateIndex
CREATE INDEX "Shipment_trackingNumber_idx" ON "Shipment"("trackingNumber");

-- CreateIndex
CREATE INDEX "Shipment_stripePaymentIntentId_idx" ON "Shipment"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Shipment_createdAt_idx" ON "Shipment"("createdAt");
