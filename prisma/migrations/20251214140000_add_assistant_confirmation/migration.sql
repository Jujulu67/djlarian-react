-- CreateTable
-- Table pour l'idempotency des confirmations assistant
-- Permet d'éviter les doubles mutations en cas de double clic ou retry réseau
CREATE TABLE "AssistantConfirmation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "confirmationId" TEXT NOT NULL UNIQUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssistantConfirmation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AssistantConfirmation_userId_confirmationId_key" ON "AssistantConfirmation"("userId", "confirmationId");

-- CreateIndex
CREATE INDEX "AssistantConfirmation_userId_idx" ON "AssistantConfirmation"("userId");

-- CreateIndex
CREATE INDEX "AssistantConfirmation_confirmationId_idx" ON "AssistantConfirmation"("confirmationId");

-- CreateIndex
CREATE INDEX "AssistantConfirmation_createdAt_idx" ON "AssistantConfirmation"("createdAt");
