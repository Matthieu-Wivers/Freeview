-- =====================================================================
-- Freeview - Moderation actions
-- File: db/initdb/002_07_moderation_actions.sql
--
-- Purpose:
-- - Keep an audit trail of admin moderation actions.
-- - Useful for the CDA dossier and for debugging moderation decisions.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  admin_id UUID NOT NULL
    REFERENCES users(id)
    ON DELETE RESTRICT,

  report_id UUID
    REFERENCES reports(id)
    ON DELETE SET NULL,

  target_type TEXT NOT NULL,

  shared_game_id UUID
    REFERENCES shared_games(id)
    ON DELETE CASCADE,

  comment_id UUID
    REFERENCES comments(id)
    ON DELETE CASCADE,

  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT moderation_actions_target_type_check
    CHECK (target_type IN ('shared_game', 'comment')),

  CONSTRAINT moderation_actions_exactly_one_target_check
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

  CONSTRAINT moderation_actions_action_check
    CHECK (action IN ('hide', 'restore', 'delete', 'mark_pending_review', 'reject_report', 'resolve_report')),

  CONSTRAINT moderation_actions_reason_length_check
    CHECK (reason IS NULL OR char_length(reason) <= 1000)
);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_admin_id
ON moderation_actions(admin_id);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_report_id
ON moderation_actions(report_id)
WHERE report_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_moderation_actions_shared_game_id
ON moderation_actions(shared_game_id)
WHERE shared_game_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_moderation_actions_comment_id
ON moderation_actions(comment_id)
WHERE comment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_moderation_actions_created_at
ON moderation_actions(created_at DESC);

COMMIT;
