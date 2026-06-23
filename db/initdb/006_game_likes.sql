-- =====================================================================
-- Freeview - Game likes
-- File: db/initdb/002_04_game_likes.sql
--
-- Purpose:
-- - Store likes on shared games.
-- - Enforce one like per user per shared game.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS game_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  shared_game_id UUID NOT NULL
    REFERENCES shared_games(id)
    ON DELETE CASCADE,

  user_id UUID NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT game_likes_unique_user_shared_game
    UNIQUE (shared_game_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_game_likes_shared_game_id
ON game_likes(shared_game_id);

CREATE INDEX IF NOT EXISTS idx_game_likes_user_id
ON game_likes(user_id);

COMMIT;
