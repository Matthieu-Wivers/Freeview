-- =====================================================================
-- Freeview - Shared games stats view
--
-- Purpose:
-- - Provide a convenient read model for the community feed.
-- - This does not change stored data; it only creates or updates a view.
-- =====================================================================

BEGIN;

CREATE OR REPLACE VIEW shared_games_with_stats AS
SELECT
  sg.id,
  sg.game_id,
  sg.user_id,
  up.username,
  sg.title,
  sg.description,
  sg.visibility,
  sg.moderation_status,
  sg.created_at,
  sg.updated_at,
  sg.deleted_at,
  g.white_player,
  g.black_player,
  g.result,
  g.played_at,
  COALESCE(like_counts.like_count, 0)::INTEGER AS like_count,
  COALESCE(comment_counts.comment_count, 0)::INTEGER AS comment_count
FROM shared_games sg
JOIN games g
  ON g.id = sg.game_id
LEFT JOIN user_profiles up
  ON up.user_id = sg.user_id
LEFT JOIN (
  SELECT
    shared_game_id,
    COUNT(*) AS like_count
  FROM game_likes
  GROUP BY shared_game_id
) like_counts
  ON like_counts.shared_game_id = sg.id
LEFT JOIN (
  SELECT
    shared_game_id,
    COUNT(*) AS comment_count
  FROM comments
  WHERE moderation_status = 'visible'
    AND deleted_at IS NULL
  GROUP BY shared_game_id
) comment_counts
  ON comment_counts.shared_game_id = sg.id;

COMMIT;
