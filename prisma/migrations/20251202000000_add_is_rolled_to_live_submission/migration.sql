-- AlterTable
ALTER TABLE "LiveSubmission" ADD COLUMN "isRolled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "LiveSubmission_isRolled_idx" ON "LiveSubmission"("isRolled");

