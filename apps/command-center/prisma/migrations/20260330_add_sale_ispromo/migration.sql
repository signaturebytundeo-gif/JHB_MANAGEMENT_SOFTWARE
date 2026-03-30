-- Add isPromo flag to Sale for tracking promotional giveaways
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "isPromo" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "Sale_isPromo_idx" ON "Sale" ("isPromo");
