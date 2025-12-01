-- Migration: Add hash fields to Image table for duplicate detection
-- This allows more reliable duplicate detection than just size comparison
-- Safe migration: only adds nullable columns, no data loss

-- Add hash columns (nullable, so existing rows are not affected)
ALTER TABLE "Image" ADD COLUMN "hash" TEXT;
ALTER TABLE "Image" ADD COLUMN "hashOriginal" TEXT;

-- Create index on hash for faster lookups
CREATE INDEX "Image_hash_idx" ON "Image"("hash");

