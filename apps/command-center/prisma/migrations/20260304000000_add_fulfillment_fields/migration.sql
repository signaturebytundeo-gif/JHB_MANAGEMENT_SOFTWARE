-- AlterTable
ALTER TABLE "WebsiteOrder" ADD COLUMN "trackingNumber" TEXT;
ALTER TABLE "WebsiteOrder" ADD COLUMN "carrier" TEXT;
ALTER TABLE "WebsiteOrder" ADD COLUMN "shippedAt" TIMESTAMP(3);
ALTER TABLE "WebsiteOrder" ADD COLUMN "confirmationEmailSentAt" TIMESTAMP(3);
ALTER TABLE "WebsiteOrder" ADD COLUMN "shippingEmailSentAt" TIMESTAMP(3);
