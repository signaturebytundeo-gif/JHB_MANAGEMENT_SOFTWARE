ALTER TABLE "WebsiteOrder" ADD COLUMN IF NOT EXISTS "reorderReminderSentAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "WebsiteOrder_reorderReminderSentAt_idx" ON "WebsiteOrder"("reorderReminderSentAt");
