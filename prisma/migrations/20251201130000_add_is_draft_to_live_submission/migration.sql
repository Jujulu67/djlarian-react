-- AlterTable
ALTER TABLE "LiveSubmission" ADD COLUMN "isDraft" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "LiveSubmission_userId_isDraft_idx" ON "LiveSubmission"("userId", "isDraft");

