-- =====================================================================
-- Freeview - Reports
-- File: db/initdb/002_06_reports.sql
--
-- Purpose:
-- - Let users report shared games or comments.
-- - Store an admin review workflow.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  reporter_id UUID NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

  target_type TEXT NOT NULL,

  shared_game_id UUID
    REFERENCES shared_games(id)
    ON DELETE CASCADE,

  comment_id UUID
    REFERENCES comments(id)
    ON DELETE CASCADE,

  reason TEXT NOT NULL,
  details TEXT,

  status TEXT NOT NULL DEFAULT 'open',

  reviewed_by UUID
    REFERENCES users(id)
    ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,

  CONSTRAINT reports_target_type_check
    CHECK (target_type IN ('shared_game', 'comment')),

  CONSTRAINT reports_exactly_one_target_check
    CHECK (
      (
        target_type = 'shared_game'
        AND shared_game_id IS NOT NULL
        AND comment_id IS NULL
      )
      OR
      (
        target_type = 'comment'
        AND comment_id IS NOT NULL
        AND shared_game_id IS NULL
      )
    ),

  CONSTRAINT reports_reason_length_check
    CHECK (char_length(trim(reason)) BETWEEN 3 AND 120),

  CONSTRAINT reports_details_length_check
    CHECK (details IS NULL OR char_length(details) <= 1000),

  CONSTRAINT reports_status_check
    CHECK (status IN ('open', 'reviewed', 'rejected', 'action_taken')),

  CONSTRAINT reports_reviewed_consistency_check
    CHECK (
      status = 'open'
      OR reviewed_at IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter_id
ON reports(reporter_id);

CREATE INDEX IF NOT EXISTS idx_reports_status
ON reports(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_shared_game_id
ON reports(shared_game_id)
WHERE shared_game_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reports_comment_id
ON reports(comment_id)
WHERE comment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reports_reviewed_by
ON reports(reviewed_by)
WHERE reviewed_by IS NOT NULL;

COMMIT;
