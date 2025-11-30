-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Notification" ADD COLUMN "deletedAt" DATETIME;

-- CreateIndex
CREATE INDEX "Notification_isArchived_idx" ON "Notification"("isArchived");

