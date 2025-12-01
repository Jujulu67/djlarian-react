-- CreateTable
CREATE TABLE "AdminSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminSettings_key_key" ON "AdminSettings"("key");

-- CreateIndex
CREATE INDEX "AdminSettings_key_idx" ON "AdminSettings"("key");

