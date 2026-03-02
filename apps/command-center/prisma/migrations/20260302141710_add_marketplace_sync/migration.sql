-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('WEBSITE', 'AMAZON', 'ETSY');

-- CreateEnum
CREATE TYPE "SyncPlatform" AS ENUM ('SQUARE', 'AMAZON', 'ETSY');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- AlterTable
ALTER TABLE "WebsiteOrder" ADD COLUMN     "source" "OrderSource" NOT NULL DEFAULT 'WEBSITE';

-- CreateTable
CREATE TABLE "MarketplaceSync" (
    "id" TEXT NOT NULL,
    "platform" "SyncPlatform" NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "recordsFound" INTEGER NOT NULL DEFAULT 0,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "recordsSkipped" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "errorDetails" TEXT,
    "triggeredById" TEXT,

    CONSTRAINT "MarketplaceSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplaceSync_platform_idx" ON "MarketplaceSync"("platform");

-- CreateIndex
CREATE INDEX "MarketplaceSync_status_idx" ON "MarketplaceSync"("status");

-- CreateIndex
CREATE INDEX "MarketplaceSync_startedAt_idx" ON "MarketplaceSync"("startedAt");

-- CreateIndex
CREATE INDEX "WebsiteOrder_source_idx" ON "WebsiteOrder"("source");

-- AddForeignKey
ALTER TABLE "MarketplaceSync" ADD CONSTRAINT "MarketplaceSync_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
