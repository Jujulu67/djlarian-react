-- Créer la nouvelle table Notification générique
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "metadata" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "projectId" TEXT,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Migrer les données de MilestoneNotification vers Notification
INSERT INTO "Notification" ("id", "userId", "type", "title", "message", "metadata", "isRead", "createdAt", "readAt", "projectId")
SELECT 
    "id",
    "userId",
    'MILESTONE' as "type",
    'Jalon ' || "milestoneType" || ' atteint' as "title",
    'Le projet a atteint le jalon ' || "milestoneType" as "message",
    json_object('milestoneType', "milestoneType") as "metadata",
    "isRead",
    "createdAt",
    "readAt",
    "projectId"
FROM "MilestoneNotification";

-- Créer les index
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_projectId_idx" ON "Notification"("projectId");
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");
CREATE INDEX "Notification_type_idx" ON "Notification"("type");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- Supprimer l'ancienne table
DROP TABLE "MilestoneNotification";

