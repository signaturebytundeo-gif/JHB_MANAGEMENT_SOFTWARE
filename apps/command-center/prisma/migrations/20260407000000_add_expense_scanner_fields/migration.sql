-- Manual migration: add Claude vision receipt-scanner fields to Expense
-- Applied via prisma db execute (shadow DB workaround — see STATE.md decision 21-01)
-- Note: receiptUrl already exists; only the 3 new scanner fields are added here.

ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "lineItems" JSONB;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "scanConfidence" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "documentType" TEXT;
