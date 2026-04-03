-- AlterTable: add cursorData column to MarketplaceSync for resumable pagination
ALTER TABLE "MarketplaceSync" ADD COLUMN "cursorData" TEXT;
