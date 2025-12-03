-- Add threadId column for grouping conversations
-- This column is nullable to allow existing notifications without threadId
ALTER TABLE "Notification" ADD COLUMN "threadId" TEXT;

-- Create index for efficient queries
CREATE INDEX "Notification_threadId_idx" ON "Notification"("threadId");

