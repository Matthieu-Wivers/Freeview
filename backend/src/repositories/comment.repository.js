import { pool } from '../db/pool.js';

function toComment(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    sharedGameId: row.shared_game_id,
    userId: row.user_id,
    username: row.username ?? null,
    avatarUrl: row.avatar_url ?? null,
    content: row.content,
    moderationStatus: row.moderation_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    canEdit: Boolean(row.can_edit),
  };
}

export async function createCommentRecord({ sharedGameId, userId, content }) {
  const queryResult = await pool.query(
    `INSERT INTO comments (shared_game_id, user_id, content)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [sharedGameId, userId, content],
  );

  return findCommentForViewer(queryResult.rows[0].id, userId);
}

export async function listVisibleCommentsBySharedGameId(sharedGameId, viewerId = null) {
  const queryResult = await pool.query(
    `SELECT
       c.*,
       up.username,
       up.avatar_url,
       c.user_id = $2 AS can_edit
     FROM comments c
     JOIN user_profiles up ON up.user_id = c.user_id
     WHERE c.shared_game_id = $1
       AND c.moderation_status = 'visible'
       AND c.deleted_at IS NULL
     ORDER BY c.created_at ASC`,
    [sharedGameId, viewerId],
  );

  return queryResult.rows.map(toComment);
}

export async function findCommentForViewer(commentId, viewerId = null) {
  const queryResult = await pool.query(
    `SELECT
       c.*,
       up.username,
       up.avatar_url,
       c.user_id = $2 AS can_edit
     FROM comments c
     JOIN user_profiles up ON up.user_id = c.user_id
     WHERE c.id = $1
       AND c.deleted_at IS NULL
     LIMIT 1`,
    [commentId, viewerId],
  );

  return toComment(queryResult.rows[0]);
}

export async function findOwnedComment(commentId, userId) {
  const queryResult = await pool.query(
    `SELECT *
     FROM comments
     WHERE id = $1
       AND user_id = $2
       AND deleted_at IS NULL
     LIMIT 1`,
    [commentId, userId],
  );

  return queryResult.rows[0] ?? null;
}

export async function updateOwnedCommentRecord(commentId, userId, content) {
  const queryResult = await pool.query(
    `UPDATE comments
     SET content = $3
     WHERE id = $1
       AND user_id = $2
       AND deleted_at IS NULL
     RETURNING id`,
    [commentId, userId, content],
  );

  if (queryResult.rowCount === 0) {
    return null;
  }

  return findCommentForViewer(commentId, userId);
}

export async function deleteOwnedCommentRecord(commentId, userId) {
  const queryResult = await pool.query(
    `UPDATE comments
     SET moderation_status = 'deleted',
         deleted_at = now()
     WHERE id = $1
       AND user_id = $2
       AND deleted_at IS NULL
     RETURNING id`,
    [commentId, userId],
  );

  return queryResult.rowCount > 0;
}
