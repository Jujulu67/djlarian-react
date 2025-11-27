-- Migration: Add Image table to store blob URLs and reduce Advanced Operations
-- This migration is safe and does not cause data loss
-- Created: 2025-01-XX

-- Create Image table
CREATE TABLE IF NOT EXISTS "Image" (
    "id" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "blobUrl" TEXT,
    "blobUrlOriginal" TEXT,
    "size" INTEGER,
    "contentType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- Create unique index on imageId
CREATE UNIQUE INDEX IF NOT EXISTS "Image_imageId_key" ON "Image"("imageId");

-- Create index on imageId for faster lookups
CREATE INDEX IF NOT EXISTS "Image_imageId_idx" ON "Image"("imageId");

-- Add comment
COMMENT ON TABLE "Image" IS 'Stores blob URLs to avoid expensive list() operations. Reduces Blob Advanced Operations usage.';

