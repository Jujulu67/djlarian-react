-- Add order column to Project table for drag-and-drop functionality
-- This migration is safe and preserves all existing data

-- Step 1: Add the order column with a default value (safe, no data loss)
ALTER TABLE "Project" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- Step 2: Update existing projects to have sequential order based on creation date
-- This ensures each user's projects are ordered by creation date
-- Works in both SQLite and PostgreSQL
UPDATE "Project" 
SET "order" = (
  SELECT COUNT(*) 
  FROM "Project" p2 
  WHERE (p2."createdAt" < "Project"."createdAt" 
    OR (p2."createdAt" = "Project"."createdAt" AND p2."id" < "Project"."id"))
    AND p2."userId" = "Project"."userId"
);

