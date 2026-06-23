-- =====================================================================
-- Freeview migration: add user roles
-- File: db/initdb/002_01_users_role.sql
--
-- Purpose:
-- - Fix existing databases created before the role column existed.
-- - Keep Google login, email login, /api/auth/me and admin APIs compatible.
-- - Safe to run multiple times.
-- =====================================================================

BEGIN;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'USER';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('USER', 'ADMIN'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role);

COMMIT;