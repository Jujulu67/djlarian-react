-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Notification" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Notification_isArchived_idx" ON "Notification"("isArchived");

