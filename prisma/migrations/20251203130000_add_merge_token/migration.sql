-- CreateTable
CREATE TABLE "MergeToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "MergeToken_token_key" ON "MergeToken"("token");

-- CreateIndex
CREATE INDEX "MergeToken_email_idx" ON "MergeToken"("email");

-- CreateIndex
CREATE INDEX "MergeToken_expiresAt_idx" ON "MergeToken"("expiresAt");

