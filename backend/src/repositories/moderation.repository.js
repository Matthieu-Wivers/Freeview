import { pool, withTransaction } from '../db/pool.js';

function toModerationTarget(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    moderationStatus: row.moderation_status,
    deletedAt: row.deleted_at,
  };
}

export async function findModerationSharedGame(sharedGameId) {
  const queryResult = await pool.query(
    `SELECT id, moderation_status, deleted_at
     FROM shared_games
     WHERE id = $1
     LIMIT 1`,
    [sharedGameId],
  );

  return toModerationTarget(queryResult.rows[0]);
}

export async function findModerationComment(commentId) {
  const queryResult = await pool.query(
    `SELECT id, moderation_status, deleted_at
     FROM comments
     WHERE id = $1
     LIMIT 1`,
    [commentId],
  );

  return toModerationTarget(queryResult.rows[0]);
}

export async function moderateSharedGameRecord({
  sharedGameId,
  adminId,
  reportId,
  action,
  previousStatus,
  newStatus,
  reason,
  reportStatus,
}) {
  return withTransaction(async (client) => {
    const moderated = await client.query(
      `UPDATE shared_games
       SET moderation_status = $2,
           deleted_at = CASE WHEN $2 = 'deleted' THEN COALESCE(deleted_at, now()) ELSE NULL END
       WHERE id = $1
       RETURNING *`,
      [sharedGameId, newStatus],
    );

    await client.query(
      `INSERT INTO moderation_actions (
         admin_id,
         report_id,
         target_type,
         shared_game_id,
         action,
         previous_status,
         new_status,
         reason
       )
       VALUES ($1, $2, 'shared_game', $3, $4, $5, $6, $7)`,
      [adminId, reportId, sharedGameId, action, previousStatus, newStatus, reason],
    );

    if (reportId && reportStatus) {
      await client.query(
        `UPDATE reports
         SET status = $2,
             reviewed_by = $3,
             reviewed_at = now()
         WHERE id = $1`,
        [reportId, reportStatus, adminId],
      );
    }

    return moderated.rows[0];
  });
}

export async function moderateCommentRecord({
  commentId,
  adminId,
  reportId,
  action,
  previousStatus,
  newStatus,
  reason,
  reportStatus,
}) {
  return withTransaction(async (client) => {
    const moderated = await client.query(
      `UPDATE comments
       SET moderation_status = $2,
           deleted_at = CASE WHEN $2 = 'deleted' THEN COALESCE(deleted_at, now()) ELSE NULL END
       WHERE id = $1
       RETURNING *`,
      [commentId, newStatus],
    );

    await client.query(
      `INSERT INTO moderation_actions (
         admin_id,
         report_id,
         target_type,
         comment_id,
         action,
         previous_status,
         new_status,
         reason
       )
       VALUES ($1, $2, 'comment', $3, $4, $5, $6, $7)`,
      [adminId, reportId, commentId, action, previousStatus, newStatus, reason],
    );

    if (reportId && reportStatus) {
      await client.query(
        `UPDATE reports
         SET status = $2,
             reviewed_by = $3,
             reviewed_at = now()
         WHERE id = $1`,
        [reportId, reportStatus, adminId],
      );
    }

    return moderated.rows[0];
  });
}

export async function listModerationActions({ limit, offset }) {
  const queryResult = await pool.query(
    `SELECT
       ma.*,
       up.username AS admin_username
     FROM moderation_actions ma
     JOIN user_profiles up ON up.user_id = ma.admin_id
     ORDER BY ma.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  return queryResult.rows.map((row) => ({
    id: row.id,
    adminId: row.admin_id,
    adminUsername: row.admin_username,
    reportId: row.report_id,
    targetType: row.target_type,
    sharedGameId: row.shared_game_id,
    commentId: row.comment_id,
    action: row.action,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    reason: row.reason,
    createdAt: row.created_at,
  }));
}
