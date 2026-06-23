-- =====================================================================
-- Freeview - Community schema migration
--
-- Purpose:
-- - Verify that the existing Freeview base schema is present.
-- - Keep the current database behavior intact.
-- - Create only missing shared helpers, without replacing existing ones.
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION 'Missing required table: public.users. Run 001_schema.sql before the community migrations.';
  END IF;

  IF to_regclass('public.user_profiles') IS NULL THEN
    RAISE EXCEPTION 'Missing required table: public.user_profiles. Run 001_schema.sql before the community migrations.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'update_updated_at_column'
  ) THEN
    EXECUTE '
      CREATE FUNCTION public.update_updated_at_column()
      RETURNS TRIGGER AS $func$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $func$ LANGUAGE plpgsql;
    ';
  END IF;
END;
$$;

COMMIT;
