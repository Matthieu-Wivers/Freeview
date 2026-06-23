-- =====================================================================
-- Freeview - Comments
-- File: db/initdb/002_05_comments.sql
--
-- Purpose:
-- - Store comments on shared games.
-- - Keep soft deletion and moderation statuses for CDA traceability.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  shared_game_id UUID NOT NULL
    REFERENCES shared_games(id)
    ON DELETE CASCADE,

  user_id UUID NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

  content TEXT NOT NULL,
  moderation_status TEXT NOT NULL DEFAULT 'visible',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT comments_content_length_check
    CHECK (char_length(trim(content)) BETWEEN 1 AND 1000),

  CONSTRAINT comments_moderation_status_check
    CHECK (moderation_status IN ('visible', 'hidden', 'pending_review', 'deleted')),

  CONSTRAINT comments_deleted_status_check
    CHECK (
      deleted_at IS NULL
      OR moderation_status = 'deleted'
    )
);

CREATE INDEX IF NOT EXISTS idx_comments_shared_game_id
ON comments(shared_game_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_comments_user_id
ON comments(user_id);

CREATE INDEX IF NOT EXISTS idx_comments_visible_by_shared_game
ON comments(shared_game_id, created_at ASC)
WHERE moderation_status = 'visible'
  AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_comments_moderation_status
ON comments(moderation_status, created_at DESC);

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMIT;
