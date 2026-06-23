import { pool } from '../db/pool.js';

export async function likeSharedGameRecord(sharedGameId, userId) {
  const queryResult = await pool.query(
    `INSERT INTO game_likes (shared_game_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (shared_game_id, user_id) DO NOTHING
     RETURNING id`,
    [sharedGameId, userId],
  );

  return queryResult.rowCount > 0;
}

export async function unlikeSharedGameRecord(sharedGameId, userId) {
  const queryResult = await pool.query(
    `DELETE FROM game_likes
     WHERE shared_game_id = $1
       AND user_id = $2`,
    [sharedGameId, userId],
  );

  return queryResult.rowCount > 0;
}

export async function getSharedGameLikeStats(sharedGameId, userId = null) {
  const queryResult = await pool.query(
    `SELECT
       COUNT(gl.id)::INTEGER AS like_count,
       EXISTS (
         SELECT 1
         FROM game_likes current_like
         WHERE current_like.shared_game_id = $1
           AND current_like.user_id = $2
       ) AS liked_by_me
     FROM game_likes gl
     WHERE gl.shared_game_id = $1`,
    [sharedGameId, userId],
  );

  const row = queryResult.rows[0] ?? {};

  return {
    sharedGameId,
    likeCount: Number(row.like_count ?? 0),
    likedByMe: Boolean(row.liked_by_me),
  };
}
