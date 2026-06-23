-- =====================================================================
-- Freeview - Games
-- File: db/initdb/002_02_games.sql
--
-- Purpose:
-- - Store chess games imported or created by authenticated users.
-- - A game is private by default and becomes visible through shared_games.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

  pgn TEXT NOT NULL,

  white_player TEXT,
  black_player TEXT,
  result TEXT,
  played_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'manual',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT games_pgn_length_check
    CHECK (char_length(pgn) BETWEEN 20 AND 50000),

  CONSTRAINT games_result_check
    CHECK (
      result IS NULL
      OR result IN ('1-0', '0-1', '1/2-1/2', '*')
    ),

  CONSTRAINT games_source_check
    CHECK (source IN ('manual', 'pgn_import', 'chesscom', 'lichess'))
);

CREATE INDEX IF NOT EXISTS idx_games_user_id
ON games(user_id);

CREATE INDEX IF NOT EXISTS idx_games_created_at
ON games(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_games_user_created_at
ON games(user_id, created_at DESC);

DROP TRIGGER IF EXISTS update_games_updated_at ON games;
CREATE TRIGGER update_games_updated_at
BEFORE UPDATE ON games
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMIT;
