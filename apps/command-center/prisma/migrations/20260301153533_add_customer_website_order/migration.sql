-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WebsiteOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "items" TEXT NOT NULL,
    "shippingCost" DECIMAL NOT NULL,
    "orderTotal" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "orderDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WebsiteOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_lastName_idx" ON "Customer"("lastName");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteOrder_orderId_key" ON "WebsiteOrder"("orderId");

-- CreateIndex
CREATE INDEX "WebsiteOrder_status_idx" ON "WebsiteOrder"("status");

-- CreateIndex
CREATE INDEX "WebsiteOrder_orderDate_idx" ON "WebsiteOrder"("orderDate");

-- CreateIndex
CREATE INDEX "WebsiteOrder_customerId_idx" ON "WebsiteOrder"("customerId");
