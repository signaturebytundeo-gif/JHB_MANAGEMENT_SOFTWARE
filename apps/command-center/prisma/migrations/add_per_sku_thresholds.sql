-- Migration: Add per-SKU reorder and critical thresholds to Product table
-- Date: 2026-04-25
-- Purpose: Enable customizable reorder and critical thresholds per product instead of hardcoded values

-- Add the new threshold columns
ALTER TABLE "Product"
ADD COLUMN "reorderThreshold" INTEGER DEFAULT 20,
ADD COLUMN "criticalThreshold" INTEGER DEFAULT 10;

-- Update existing products to use sensible defaults based on their current reorderPoint
UPDATE "Product"
SET
  "reorderThreshold" = CASE
    WHEN "reorderPoint" > 0 THEN "reorderPoint"
    ELSE 20
  END,
  "criticalThreshold" = CASE
    WHEN "reorderPoint" > 0 THEN GREATEST("reorderPoint" / 2, 5)
    ELSE 10
  END;

-- Add comment for documentation
COMMENT ON COLUMN "Product"."reorderThreshold" IS 'Quantity threshold to trigger REORDER stock level alerts';
COMMENT ON COLUMN "Product"."criticalThreshold" IS 'Quantity threshold to trigger CRITICAL stock level alerts';
COMMENT ON COLUMN "Product"."reorderPoint" IS 'Legacy field - use reorderThreshold instead';