-- AlterTable
ALTER TABLE "WebsiteOrder" ADD COLUMN "stripeEventId" TEXT;

-- CreateUniqueIndex
CREATE UNIQUE INDEX "WebsiteOrder_stripeEventId_key" ON "WebsiteOrder"("stripeEventId");
