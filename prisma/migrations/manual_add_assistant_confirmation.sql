-- Migration manuelle: Ajout de la table AssistantConfirmation pour l'idempotency
-- À exécuter manuellement si la migration Prisma échoue

CREATE TABLE IF NOT EXISTS "AssistantConfirmation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "confirmationId" TEXT NOT NULL UNIQUE,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AssistantConfirmation_userId_confirmationId_key" ON "AssistantConfirmation"("userId", "confirmationId");
CREATE INDEX IF NOT EXISTS "AssistantConfirmation_userId_idx" ON "AssistantConfirmation"("userId");
CREATE INDEX IF NOT EXISTS "AssistantConfirmation_confirmationId_idx" ON "AssistantConfirmation"("confirmationId");
CREATE INDEX IF NOT EXISTS "AssistantConfirmation_createdAt_idx" ON "AssistantConfirmation"("createdAt");

