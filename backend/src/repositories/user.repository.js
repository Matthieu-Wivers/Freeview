import { pool, withTransaction } from '../db/pool.js';

const DEFAULT_RATINGS = ['bullet', 'blitz', 'rapid', 'classical', 'puzzle'];

export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

export function normalizeUsername(username) {
  return String(username ?? '').trim().toLowerCase();
}

function toPublicUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    emailVerified: row.email_verified,
    username: row.username,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

function createHttpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function cleanUsernameBase(value) {
  const cleaned = String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .slice(0, 24);

  if (cleaned.length >= 3) {
    return cleaned;
  }

  return 'player';
}

async function findAvailableUsername(client, requestedUsername, email) {
  const fromEmail = normalizeEmail(email).split('@')[0];
  const base = cleanUsernameBase(requestedUsername || fromEmail || 'player');

  for (let i = 0; i < 50; i += 1) {
    const suffix = i === 0 ? '' : String(i + 1);
    const maxBaseLength = 32 - suffix.length;
    const username = `${base.slice(0, maxBaseLength)}${suffix}`;
    const usernameNormalized = normalizeUsername(username);

    const existing = await client.query(
      'SELECT 1 FROM user_profiles WHERE username_normalized = $1 LIMIT 1',
      [usernameNormalized],
    );

    if (existing.rowCount === 0) {
      return { username, usernameNormalized };
    }
  }

  throw createHttpError(409, 'USERNAME_UNAVAILABLE', 'Nom d’utilisateur indisponible.');
}

async function insertDefaultRatings(client, userId) {
  await Promise.all(DEFAULT_RATINGS.map((ratingType) => client.query(
    'INSERT INTO user_ratings (user_id, rating_type) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [userId, ratingType],
  )));
}

export async function findUserById(userId) {
  const result = await pool.query(
    `SELECT u.id, u.email, u.email_verified, u.created_at, u.last_login_at,
            p.username, p.avatar_url
       FROM users u
       JOIN user_profiles p ON p.user_id = u.id
      WHERE u.id = $1
        AND u.disabled_at IS NULL`,
    [userId],
  );

  return toPublicUser(result.rows[0]);
}

export async function findEmailAuthAccount(email) {
  const result = await pool.query(
    `SELECT u.id, u.email, u.email_verified, u.created_at, u.last_login_at,
            p.username, p.avatar_url,
            a.password_hash
       FROM users u
       JOIN auth_accounts a ON a.user_id = u.id
       JOIN user_profiles p ON p.user_id = u.id
      WHERE u.email_normalized = $1
        AND a.provider = 'email'
        AND u.disabled_at IS NULL`,
    [normalizeEmail(email)],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    user: toPublicUser(row),
    passwordHash: row.password_hash,
  };
}

export async function recordLogin(userId) {
  await pool.query('UPDATE users SET last_login_at = now() WHERE id = $1', [userId]);
  return findUserById(userId);
}

export async function createUserWithEmailPassword({ email, passwordHash, username }) {
  const emailOriginal = String(email ?? '').trim();
  const emailNormalized = normalizeEmail(emailOriginal);

  return withTransaction(async (client) => {
    const existing = await client.query(
      'SELECT 1 FROM users WHERE email_normalized = $1 LIMIT 1',
      [emailNormalized],
    );

    if (existing.rowCount > 0) {
      throw createHttpError(409, 'EMAIL_ALREADY_USED', 'Un compte existe déjà avec cet email.');
    }

    const createdUser = await client.query(
      `INSERT INTO users (email, email_normalized, email_verified)
       VALUES ($1, $2, false)
       RETURNING id`,
      [emailOriginal, emailNormalized],
    );

    const userId = createdUser.rows[0].id;
    const availableUsername = await findAvailableUsername(client, username, emailOriginal);

    await client.query(
      `INSERT INTO auth_accounts (user_id, provider, password_hash)
       VALUES ($1, 'email', $2)`,
      [userId, passwordHash],
    );

    await client.query(
      `INSERT INTO user_profiles (user_id, username, username_normalized)
       VALUES ($1, $2, $3)`,
      [userId, availableUsername.username, availableUsername.usernameNormalized],
    );

    await insertDefaultRatings(client, userId);

    return userId;
  }).then(recordLogin);
}

export async function findOrCreateGoogleUser({ googleSub, email, emailVerified, name, avatarUrl }) {
  const emailOriginal = String(email ?? '').trim();
  const emailNormalized = normalizeEmail(emailOriginal);

  if (!googleSub || !emailNormalized) {
    throw createHttpError(400, 'INVALID_GOOGLE_PROFILE', 'Profil Google incomplet.');
  }

  return withTransaction(async (client) => {
    const existingGoogle = await client.query(
      `SELECT u.id
         FROM users u
         JOIN auth_accounts a ON a.user_id = u.id
        WHERE a.provider = 'google'
          AND a.provider_user_id = $1
          AND u.disabled_at IS NULL`,
      [googleSub],
    );

    if (existingGoogle.rows[0]?.id) {
      const userId = existingGoogle.rows[0].id;
      await client.query(
        `UPDATE users
            SET email_verified = users.email_verified OR $2,
                last_login_at = now()
          WHERE id = $1`,
        [userId, Boolean(emailVerified)],
      );
      if (avatarUrl) {
        await client.query(
          'UPDATE user_profiles SET avatar_url = COALESCE(avatar_url, $2) WHERE user_id = $1',
          [userId, avatarUrl],
        );
      }
      return userId;
    }

    const existingByEmail = await client.query(
      'SELECT id FROM users WHERE email_normalized = $1 AND disabled_at IS NULL LIMIT 1',
      [emailNormalized],
    );

    let userId = existingByEmail.rows[0]?.id;

    if (!userId) {
      const createdUser = await client.query(
        `INSERT INTO users (email, email_normalized, email_verified, last_login_at)
         VALUES ($1, $2, $3, now())
         RETURNING id`,
        [emailOriginal, emailNormalized, Boolean(emailVerified)],
      );

      userId = createdUser.rows[0].id;
      const availableUsername = await findAvailableUsername(client, name, emailOriginal);

      await client.query(
        `INSERT INTO user_profiles (user_id, username, username_normalized, avatar_url)
         VALUES ($1, $2, $3, $4)`,
        [userId, availableUsername.username, availableUsername.usernameNormalized, avatarUrl || null],
      );

      await insertDefaultRatings(client, userId);
    } else {
      await client.query(
        `UPDATE users
            SET email_verified = users.email_verified OR $2,
                last_login_at = now()
          WHERE id = $1`,
        [userId, Boolean(emailVerified)],
      );
    }

    await client.query(
      `INSERT INTO auth_accounts (user_id, provider, provider_user_id)
       VALUES ($1, 'google', $2)`,
      [userId, googleSub],
    );

    return userId;
  }).then(findUserById);
}
