-- Manual migration: Add expense enhancements for auto-event linking and templates
-- Applied via prisma db execute (shadow DB workaround — see STATE.md decision 21-01)

-- Add new fields to Expense table for auto-event linking
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod";
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "eventId" TEXT;

-- Add foreign key constraint for eventId
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "MarketEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS "Expense_source_idx" ON "Expense"("source");
CREATE INDEX IF NOT EXISTS "Expense_eventId_idx" ON "Expense"("eventId");

-- Create ExpenseTemplate table
CREATE TABLE "ExpenseTemplate" (
    "id" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "subcategory" TEXT,
    "description" TEXT NOT NULL,
    "paymentMethod" "PaymentMethod",
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceFrequency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseTemplate_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint to prevent duplicate templates
CREATE UNIQUE INDEX "ExpenseTemplate_vendor_category_description_key" ON "ExpenseTemplate"("vendor", "category", "description");

-- Add indexes for ExpenseTemplate
CREATE INDEX "ExpenseTemplate_vendor_idx" ON "ExpenseTemplate"("vendor");
CREATE INDEX "ExpenseTemplate_category_idx" ON "ExpenseTemplate"("category");