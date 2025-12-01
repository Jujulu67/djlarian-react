-- AlterTable
ALTER TABLE "LiveSubmission" ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "LiveSubmission_isPinned_idx" ON "LiveSubmission"("isPinned");

