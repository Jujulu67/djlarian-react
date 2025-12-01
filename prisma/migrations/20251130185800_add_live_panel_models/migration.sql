-- CreateTable
CREATE TABLE "LiveSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LiveSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LiveItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserLiveItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isActivated" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" DATETIME,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserLiveItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserLiveItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "LiveItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserTicket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LiveSubmission_userId_idx" ON "LiveSubmission"("userId");

-- CreateIndex
CREATE INDEX "LiveSubmission_status_idx" ON "LiveSubmission"("status");

-- CreateIndex
CREATE INDEX "LiveSubmission_createdAt_idx" ON "LiveSubmission"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LiveItem_type_key" ON "LiveItem"("type");

-- CreateIndex
CREATE INDEX "LiveItem_type_idx" ON "LiveItem"("type");

-- CreateIndex
CREATE INDEX "LiveItem_isActive_idx" ON "LiveItem"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "UserLiveItem_userId_itemId_key" ON "UserLiveItem"("userId", "itemId");

-- CreateIndex
CREATE INDEX "UserLiveItem_userId_idx" ON "UserLiveItem"("userId");

-- CreateIndex
CREATE INDEX "UserLiveItem_itemId_idx" ON "UserLiveItem"("itemId");

-- CreateIndex
CREATE INDEX "UserLiveItem_isActivated_idx" ON "UserLiveItem"("isActivated");

-- CreateIndex
CREATE INDEX "UserTicket_userId_idx" ON "UserTicket"("userId");

-- CreateIndex
CREATE INDEX "UserTicket_expiresAt_idx" ON "UserTicket"("expiresAt");

