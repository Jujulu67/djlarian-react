-- Drop the unique index on token if it exists
-- This resolves the "index row size exceeds maximum" error for large tokens (like Google OAuth tokens)
DROP INDEX IF EXISTS "MergeToken_token_key";
