-- Add parentId column for thread replies
-- This column is nullable to allow existing notifications without parentId
ALTER TABLE "Notification" ADD COLUMN "parentId" TEXT;

-- Create index for efficient queries
CREATE INDEX "Notification_parentId_idx" ON "Notification"("parentId");

