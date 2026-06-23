import { pool } from '../db/pool.js';

function toSharedGame(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    gameId: row.game_id,
    userId: row.user_id,
    username: row.username ?? null,
    title: row.title,
    description: row.description,
    visibility: row.visibility,
    moderationStatus: row.moderation_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    whitePlayer: row.white_player ?? null,
    blackPlayer: row.black_player ?? null,
    result: row.result ?? null,
    playedAt: row.played_at ?? null,
    pgn: row.pgn ?? undefined,
    likeCount: Number(row.like_count ?? 0),
    commentCount: Number(row.comment_count ?? 0),
    likedByMe: Boolean(row.liked_by_me),
  };
}

export async function createSharedGameRecord({ gameId, userId, title, description, visibility }) {
  const queryResult = await pool.query(
    `INSERT INTO shared_games (game_id, user_id, title, description, visibility)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [gameId, userId, title, description, visibility],
  );

  return findSharedGameForViewer(queryResult.rows[0].id, { viewerId: userId, viewerRole: 'USER' });
}

export async function listPublicSharedGames({ limit, offset, search, viewerId }) {
  const values = [limit, offset, viewerId ?? null];
  let searchSql = '';

  if (search) {
    values.push(`%${search}%`);
    searchSql = `
      AND (
        sg.title ILIKE $4
        OR sg.description ILIKE $4
        OR up.username ILIKE $4
        OR g.white_player ILIKE $4
        OR g.black_player ILIKE $4
      )`;
  }

  const queryResult = await pool.query(
    `SELECT
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
       g.white_player,
       g.black_player,
       g.result,
       g.played_at,
       COALESCE(likes.like_count, 0)::INTEGER AS like_count,
       COALESCE(comments.comment_count, 0)::INTEGER AS comment_count,
       EXISTS (
         SELECT 1
         FROM game_likes gl
         WHERE gl.shared_game_id = sg.id
           AND gl.user_id = $3
       ) AS liked_by_me
     FROM shared_games sg
     JOIN games g ON g.id = sg.game_id AND g.deleted_at IS NULL
     LEFT JOIN user_profiles up ON up.user_id = sg.user_id
     LEFT JOIN (
       SELECT shared_game_id, COUNT(*) AS like_count
       FROM game_likes
       GROUP BY shared_game_id
     ) likes ON likes.shared_game_id = sg.id
     LEFT JOIN (
       SELECT shared_game_id, COUNT(*) AS comment_count
       FROM comments
       WHERE moderation_status = 'visible'
         AND deleted_at IS NULL
       GROUP BY shared_game_id
     ) comments ON comments.shared_game_id = sg.id
     WHERE sg.visibility = 'public'
       AND sg.moderation_status = 'visible'
       AND sg.deleted_at IS NULL
       ${searchSql}
     ORDER BY sg.created_at DESC
     LIMIT $1 OFFSET $2`,
    values,
  );

  return queryResult.rows.map(toSharedGame);
}

export async function listSharedGamesByUserId(userId, { limit, offset }) {
  const queryResult = await pool.query(
    `SELECT
       sg.*,
       up.username,
       g.white_player,
       g.black_player,
       g.result,
       g.played_at,
       COALESCE(likes.like_count, 0)::INTEGER AS like_count,
       COALESCE(comments.comment_count, 0)::INTEGER AS comment_count,
       EXISTS (
         SELECT 1
         FROM game_likes gl
         WHERE gl.shared_game_id = sg.id
           AND gl.user_id = $1
       ) AS liked_by_me
     FROM shared_games sg
     JOIN games g ON g.id = sg.game_id AND g.deleted_at IS NULL
     LEFT JOIN user_profiles up ON up.user_id = sg.user_id
     LEFT JOIN (
       SELECT shared_game_id, COUNT(*) AS like_count
       FROM game_likes
       GROUP BY shared_game_id
     ) likes ON likes.shared_game_id = sg.id
     LEFT JOIN (
       SELECT shared_game_id, COUNT(*) AS comment_count
       FROM comments
       WHERE moderation_status = 'visible'
         AND deleted_at IS NULL
       GROUP BY shared_game_id
     ) comments ON comments.shared_game_id = sg.id
     WHERE sg.user_id = $1
       AND sg.deleted_at IS NULL
     ORDER BY sg.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );

  return queryResult.rows.map(toSharedGame);
}

export async function findSharedGameForViewer(sharedGameId, { viewerId = null, viewerRole = null } = {}) {
  const queryResult = await pool.query(
    `SELECT
       sg.*,
       up.username,
       g.pgn,
       g.white_player,
       g.black_player,
       g.result,
       g.played_at,
       COALESCE(likes.like_count, 0)::INTEGER AS like_count,
       COALESCE(comments.comment_count, 0)::INTEGER AS comment_count,
       EXISTS (
         SELECT 1
         FROM game_likes gl
         WHERE gl.shared_game_id = sg.id
           AND gl.user_id = $2
       ) AS liked_by_me
     FROM shared_games sg
     JOIN games g ON g.id = sg.game_id AND g.deleted_at IS NULL
     LEFT JOIN user_profiles up ON up.user_id = sg.user_id
     LEFT JOIN (
       SELECT shared_game_id, COUNT(*) AS like_count
       FROM game_likes
       GROUP BY shared_game_id
     ) likes ON likes.shared_game_id = sg.id
     LEFT JOIN (
       SELECT shared_game_id, COUNT(*) AS comment_count
       FROM comments
       WHERE moderation_status = 'visible'
         AND deleted_at IS NULL
       GROUP BY shared_game_id
     ) comments ON comments.shared_game_id = sg.id
     WHERE sg.id = $1
       AND sg.deleted_at IS NULL
       AND (
         sg.visibility = 'public'
         OR sg.visibility = 'unlisted'
         OR sg.user_id = $2
         OR $3 = 'ADMIN'
       )
       AND (
         sg.moderation_status = 'visible'
         OR sg.user_id = $2
         OR $3 = 'ADMIN'
       )
     LIMIT 1`,
    [sharedGameId, viewerId, viewerRole],
  );

  return toSharedGame(queryResult.rows[0]);
}

export async function findSharedGameById(sharedGameId) {
  const queryResult = await pool.query(
    `SELECT sg.*
     FROM shared_games sg
     JOIN games g ON g.id = sg.game_id AND g.deleted_at IS NULL
     WHERE sg.id = $1
       AND sg.deleted_at IS NULL
     LIMIT 1`,
    [sharedGameId],
  );

  return queryResult.rows[0] ?? null;
}

export async function findCommentableSharedGame(sharedGameId) {
  const queryResult = await pool.query(
    `SELECT sg.*
     FROM shared_games sg
     JOIN games g ON g.id = sg.game_id AND g.deleted_at IS NULL
     WHERE sg.id = $1
       AND sg.deleted_at IS NULL
       AND sg.moderation_status = 'visible'
       AND sg.visibility IN ('public', 'unlisted')
     LIMIT 1`,
    [sharedGameId],
  );

  return queryResult.rows[0] ?? null;
}

export async function updateOwnedSharedGameRecord(sharedGameId, userId, { title, description, visibility }) {
  const queryResult = await pool.query(
    `UPDATE shared_games
     SET title = $3,
         description = $4,
         visibility = $5
     WHERE id = $1
       AND user_id = $2
       AND deleted_at IS NULL
     RETURNING id`,
    [sharedGameId, userId, title, description, visibility],
  );

  if (queryResult.rowCount === 0) {
    return null;
  }

  return findSharedGameForViewer(sharedGameId, { viewerId: userId, viewerRole: 'USER' });
}

export async function deleteOwnedSharedGameRecord(sharedGameId, userId) {
  const queryResult = await pool.query(
    `UPDATE shared_games
     SET moderation_status = 'deleted',
         deleted_at = now()
     WHERE id = $1
       AND user_id = $2
       AND deleted_at IS NULL
     RETURNING id`,
    [sharedGameId, userId],
  );

  return queryResult.rowCount > 0;
}
