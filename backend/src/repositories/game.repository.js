import { pool } from '../db/pool.js';

function toGame(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    pgn: row.pgn,
    whitePlayer: row.white_player,
    blackPlayer: row.black_player,
    result: row.result,
    playedAt: row.played_at,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createGameRecord({
  userId,
  pgn,
  whitePlayer,
  blackPlayer,
  result,
  playedAt,
  source,
}) {
  const queryResult = await pool.query(
    `INSERT INTO games (
       user_id,
       pgn,
       white_player,
       black_player,
       result,
       played_at,
       source
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [userId, pgn, whitePlayer, blackPlayer, result, playedAt, source],
  );

  return toGame(queryResult.rows[0]);
}

export async function listGamesByUserId(userId, { limit, offset }) {
  const queryResult = await pool.query(
    `SELECT *
     FROM games
     WHERE user_id = $1
       AND deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );

  return queryResult.rows.map(toGame);
}

export async function findGameById(gameId) {
  const queryResult = await pool.query(
    `SELECT *
     FROM games
     WHERE id = $1
       AND deleted_at IS NULL
     LIMIT 1`,
    [gameId],
  );

  return toGame(queryResult.rows[0]);
}

export async function findOwnedGameById(gameId, userId) {
  const queryResult = await pool.query(
    `SELECT *
     FROM games
     WHERE id = $1
       AND user_id = $2
       AND deleted_at IS NULL
     LIMIT 1`,
    [gameId, userId],
  );

  return toGame(queryResult.rows[0]);
}

export async function updateOwnedGameRecord(gameId, userId, { pgn, whitePlayer, blackPlayer, result, playedAt, source }) {
  const queryResult = await pool.query(
    `UPDATE games
     SET pgn = $3,
         white_player = $4,
         black_player = $5,
         result = $6,
         played_at = $7,
         source = $8
     WHERE id = $1
       AND user_id = $2
       AND deleted_at IS NULL
     RETURNING *`,
    [gameId, userId, pgn, whitePlayer, blackPlayer, result, playedAt, source],
  );

  return toGame(queryResult.rows[0]);
}

export async function deleteOwnedGameRecord(gameId, userId) {
  const queryResult = await pool.query(
    `DELETE FROM games
     WHERE id = $1
       AND user_id = $2
     RETURNING id`,
    [gameId, userId],
  );

  return queryResult.rowCount > 0;
}
