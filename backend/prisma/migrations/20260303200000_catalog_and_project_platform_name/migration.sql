-- Add platformName to PermitApplicationsCatalog (default empty string)
ALTER TABLE "PermitApplicationsCatalog" ADD COLUMN IF NOT EXISTS "platformName" TEXT NOT NULL DEFAULT '';

-- Add platformName to Project (set from catalog on create, not editable)
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "platformName" TEXT NOT NULL DEFAULT '';

-- Allow duplicate emails on Project
DROP INDEX IF EXISTS "Project_email_key";
