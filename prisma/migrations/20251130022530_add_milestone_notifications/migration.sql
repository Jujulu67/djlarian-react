-- CreateTable
CREATE TABLE "MilestoneNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "milestoneType" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" DATETIME,
    CONSTRAINT "MilestoneNotification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MilestoneNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MilestoneNotification_userId_idx" ON "MilestoneNotification"("userId");

-- CreateIndex
CREATE INDEX "MilestoneNotification_projectId_idx" ON "MilestoneNotification"("projectId");

-- CreateIndex
CREATE INDEX "MilestoneNotification_isRead_idx" ON "MilestoneNotification"("isRead");

-- CreateIndex
CREATE UNIQUE INDEX "MilestoneNotification_projectId_milestoneType_key" ON "MilestoneNotification"("projectId", "milestoneType");

