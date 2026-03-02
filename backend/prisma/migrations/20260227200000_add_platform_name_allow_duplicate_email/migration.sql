-- Add platformName column (default empty string)
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "platformName" TEXT NOT NULL DEFAULT '';

-- Allow duplicate emails: drop unique constraint on email (if exists)
DROP INDEX IF EXISTS "Project_email_key";
