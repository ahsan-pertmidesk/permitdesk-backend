-- RenameTable: PermitApplication -> PermitApplicationsCatalog (align with module name, preserve data)
-- Idempotent: no-op if table was already renamed (e.g. by a previous migration run)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'PermitApplication'
  ) THEN
    ALTER TABLE "PermitApplication" RENAME TO "PermitApplicationsCatalog";
    ALTER INDEX "PermitApplication_pkey" RENAME TO "PermitApplicationsCatalog_pkey";
    ALTER INDEX "PermitApplication_state_city_key" RENAME TO "PermitApplicationsCatalog_state_city_key";
  END IF;
END $$;
