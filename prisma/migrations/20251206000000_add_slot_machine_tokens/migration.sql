-- CreateTable
CREATE TABLE "UserSlotMachineTokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL DEFAULT 100,
    "lastResetDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalSpins" INTEGER NOT NULL DEFAULT 0,
    "totalWins" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserSlotMachineTokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSlotMachineTokens_userId_key" ON "UserSlotMachineTokens"("userId");

-- CreateIndex
CREATE INDEX "UserSlotMachineTokens_userId_idx" ON "UserSlotMachineTokens"("userId");

-- CreateIndex
CREATE INDEX "UserSlotMachineTokens_lastResetDate_idx" ON "UserSlotMachineTokens"("lastResetDate");

