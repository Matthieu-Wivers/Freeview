import { pool } from '../db/pool.js';

function toReport(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    reporterId: row.reporter_id,
    reporterUsername: row.reporter_username ?? null,
    targetType: row.target_type,
    sharedGameId: row.shared_game_id,
    sharedGameTitle: row.shared_game_title ?? null,
    commentId: row.comment_id,
    commentContent: row.comment_content ?? null,
    reason: row.reason,
    details: row.details,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewerUsername: row.reviewer_username ?? null,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

export async function createSharedGameReportRecord({ reporterId, sharedGameId, reason, details }) {
  const queryResult = await pool.query(
    `INSERT INTO reports (reporter_id, target_type, shared_game_id, reason, details)
     VALUES ($1, 'shared_game', $2, $3, $4)
     RETURNING *`,
    [reporterId, sharedGameId, reason, details],
  );

  return toReport(queryResult.rows[0]);
}

export async function createCommentReportRecord({ reporterId, commentId, reason, details }) {
  const queryResult = await pool.query(
    `INSERT INTO reports (reporter_id, target_type, comment_id, reason, details)
     VALUES ($1, 'comment', $2, $3, $4)
     RETURNING *`,
    [reporterId, commentId, reason, details],
  );

  return toReport(queryResult.rows[0]);
}

export async function listReportsForAdmin({ limit, offset, status }) {
  const values = [limit, offset];
  let statusSql = '';

  if (status) {
    values.push(status);
    statusSql = 'WHERE r.status = $3';
  }

  const queryResult = await pool.query(
    `SELECT
       r.*,
       reporter.username AS reporter_username,
       reviewer.username AS reviewer_username,
       sg.title AS shared_game_title,
       c.content AS comment_content
     FROM reports r
     LEFT JOIN user_profiles reporter ON reporter.user_id = r.reporter_id
     LEFT JOIN user_profiles reviewer ON reviewer.user_id = r.reviewed_by
     LEFT JOIN shared_games sg ON sg.id = r.shared_game_id
     LEFT JOIN comments c ON c.id = r.comment_id
     ${statusSql}
     ORDER BY
       CASE WHEN r.status = 'open' THEN 0 ELSE 1 END,
       r.created_at DESC
     LIMIT $1 OFFSET $2`,
    values,
  );

  return queryResult.rows.map(toReport);
}

export async function findReportById(reportId) {
  const queryResult = await pool.query(
    `SELECT *
     FROM reports
     WHERE id = $1
     LIMIT 1`,
    [reportId],
  );

  return queryResult.rows[0] ?? null;
}

export async function updateReportStatusRecord(reportId, { status, reviewedBy }) {
  const queryResult = await pool.query(
    `UPDATE reports
     SET status = $2,
         reviewed_by = $3,
         reviewed_at = now()
     WHERE id = $1
     RETURNING *`,
    [reportId, status, reviewedBy],
  );

  return toReport(queryResult.rows[0]);
}
