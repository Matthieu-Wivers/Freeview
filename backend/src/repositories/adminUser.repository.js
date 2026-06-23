import { pool } from '../db/pool.js';

function toAdminUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    emailVerified: row.email_verified,
    role: row.role ?? 'USER',
    username: row.username,
    bio: row.bio ?? '',
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
    disabledAt: row.disabled_at,
  };
}

export async function listUsersForAdmin({ limit, offset, search }) {
  const values = [limit, offset];
  let searchSql = '';

  if (search) {
    values.push(`%${search}%`);
    searchSql = `
      WHERE u.email ILIKE $3
         OR up.username ILIKE $3`;
  }

  const queryResult = await pool.query(
    `SELECT
       u.id,
       u.email,
       u.email_verified,
       u.role,
       u.created_at,
       u.updated_at,
       u.last_login_at,
       u.disabled_at,
       up.username,
       up.bio,
       up.avatar_url
     FROM users u
     JOIN user_profiles up ON up.user_id = u.id
     ${searchSql}
     ORDER BY u.created_at DESC
     LIMIT $1 OFFSET $2`,
    values,
  );

  return queryResult.rows.map(toAdminUser);
}

export async function findUserForAdmin(userId) {
  const queryResult = await pool.query(
    `SELECT
       u.id,
       u.email,
       u.email_verified,
       u.role,
       u.created_at,
       u.updated_at,
       u.last_login_at,
       u.disabled_at,
       up.username,
       up.bio,
       up.avatar_url
     FROM users u
     JOIN user_profiles up ON up.user_id = u.id
     WHERE u.id = $1
     LIMIT 1`,
    [userId],
  );

  return toAdminUser(queryResult.rows[0]);
}

export async function updateUserRoleRecord(userId, role) {
  const queryResult = await pool.query(
    `UPDATE users
     SET role = $2
     WHERE id = $1
     RETURNING id`,
    [userId, role],
  );

  if (queryResult.rowCount === 0) {
    return null;
  }

  return findUserForAdmin(userId);
}

export async function updateUserDisabledStatusRecord(userId, disabled) {
  const queryResult = await pool.query(
    `UPDATE users
     SET disabled_at = CASE WHEN $2 THEN COALESCE(disabled_at, now()) ELSE NULL END
     WHERE id = $1
     RETURNING id`,
    [userId, disabled],
  );

  if (queryResult.rowCount === 0) {
    return null;
  }

  return findUserForAdmin(userId);
}
