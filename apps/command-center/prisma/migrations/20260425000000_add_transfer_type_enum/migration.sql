-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('RESTOCK', 'FULFILLMENT', 'ADJUSTMENT', 'RETURN');

-- AlterTable
ALTER TABLE "InventoryMovement" ADD COLUMN "transferType" "TransferType";
ALTER TABLE "InventoryMovement" ADD COLUMN "orderReference" TEXT;