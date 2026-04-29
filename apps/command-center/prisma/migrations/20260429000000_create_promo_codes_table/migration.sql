-- CreateTable: promo_codes (previously missing from schema)
-- This table was manually created in production but lost during deployment
-- Adding proper migration to ensure it persists across deployments

CREATE TABLE "promo_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR NOT NULL,
    "discount_type" VARCHAR NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "assigned_to" VARCHAR NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "max_uses" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promo_codes_code_key" ON "promo_codes"("code");

-- CreateIndex
CREATE INDEX "promo_codes_assigned_to_idx" ON "promo_codes"("assigned_to");

-- CreateIndex
CREATE INDEX "promo_codes_is_active_idx" ON "promo_codes"("is_active");

-- CreateIndex
CREATE INDEX "promo_codes_expires_at_idx" ON "promo_codes"("expires_at");

-- Add constraint for discount_type validation
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_discount_type_check"
CHECK ("discount_type" IN ('percentage', 'fixed'));

-- Add constraint for positive discount_value
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_discount_value_check"
CHECK ("discount_value" > 0);

-- Add constraint for non-negative usage_count
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_usage_count_check"
CHECK ("usage_count" >= 0);