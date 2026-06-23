-- =====================================================================
-- Freeview - Shared games
--
-- Purpose:
-- - Publish saved games with a title, description and visibility.
-- - Support moderation without deleting user data immediately.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS shared_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  game_id UUID NOT NULL
    REFERENCES games(id)
    ON DELETE CASCADE,

  user_id UUID NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,

  visibility TEXT NOT NULL DEFAULT 'public',
  moderation_status TEXT NOT NULL DEFAULT 'visible',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT shared_games_title_length_check
    CHECK (char_length(title) BETWEEN 3 AND 120),

  CONSTRAINT shared_games_description_length_check
    CHECK (description IS NULL OR char_length(description) <= 2000),

  CONSTRAINT shared_games_visibility_check
    CHECK (visibility IN ('public', 'private', 'unlisted')),

  CONSTRAINT shared_games_moderation_status_check
    CHECK (moderation_status IN ('visible', 'hidden', 'pending_review', 'deleted')),

  CONSTRAINT shared_games_deleted_status_check
    CHECK (
      deleted_at IS NULL
      OR moderation_status = 'deleted'
    )
);

CREATE INDEX IF NOT EXISTS idx_shared_games_game_id
ON shared_games(game_id);

CREATE INDEX IF NOT EXISTS idx_shared_games_user_id
ON shared_games(user_id);

CREATE INDEX IF NOT EXISTS idx_shared_games_public_feed
ON shared_games(created_at DESC)
WHERE visibility = 'public'
  AND moderation_status = 'visible'
  AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_shared_games_user_created_at
ON shared_games(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shared_games_moderation_status
ON shared_games(moderation_status, created_at DESC);

DROP TRIGGER IF EXISTS update_shared_games_updated_at ON shared_games;
CREATE TRIGGER update_shared_games_updated_at
BEFORE UPDATE ON shared_games
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMIT;
