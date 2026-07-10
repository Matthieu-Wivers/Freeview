/**
 * Authentication and profile business service.
 *
 * This layer validates untrusted input, hashes passwords, issues constrained
 * JWTs and delegates persistence to the user repository. HTTP cookie options
 * remain the controller's responsibility.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { env } from '../utils/env.utils.js';
import {
  createUserWithEmailPassword,
  findEmailAuthAccount,
  findOrCreateGoogleUser,
  findUserById,
  recordLogin,
  updateUserProfileById,
} from '../repositories/user.repository.js';

// Structured errors keep HTTP translation centralized in error.middleware.js.
function createHttpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

/**
 * Normalizes and validates an email address before any account lookup or write.
 * @returns {string} Lowercase, trimmed email.
 */
function assertValidEmail(email) {
  const normalized = String(email ?? '').trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw createHttpError(400, 'INVALID_EMAIL', 'Email invalide.');
  }

  return normalized;
}

// Password policy is enforced server-side; client-side checks are only UX.
function assertValidPassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw createHttpError(400, 'WEAK_PASSWORD', 'Le mot de passe doit contenir au moins 8 caractères.');
  }
}

/**
 * Creates a short, identity-only JWT.
 *
 * Issuer and audience claims prevent a valid token from being reused by an
 * unrelated service. Authorization still relies on the fresh database user
 * loaded during token verification.
 */
export function signAuthToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      username: user.username,
    },
    env.authJwtSecret,
    {
      expiresIn: env.authCookieMaxAgeSeconds,
      issuer: 'freeview-api',
      audience: 'freeview-web',
    },
  );
}

/**
 * Verifies cryptographic and contextual JWT claims, then reloads the user.
 * Invalid, expired or malformed tokens deliberately resolve to null.
 */
export async function verifyAuthToken(token) {
  try {
    const payload = jwt.verify(token, env.authJwtSecret, {
      issuer: 'freeview-api',
      audience: 'freeview-web',
    });

    return findUserById(payload.sub);
  } catch {
    return null;
  }
}

/**
 * Registers an email/password account and returns the initial session token.
 * The clear-text password is never passed to the repository.
 */
export async function registerWithEmailPassword({ email, password, username }) {
  const normalizedEmail = assertValidEmail(email);
  assertValidPassword(password);

  // Cost factor 12 balances interactive login latency with offline attack resistance.
const passwordHash = await bcrypt.hash(password, 12);
  const user = await createUserWithEmailPassword({
    email: normalizedEmail,
    passwordHash,
    username,
  });

  return {
    user,
    token: signAuthToken(user),
  };
}

/**
 * Authenticates without revealing whether the email or password was incorrect.
 */
export async function loginWithEmailPassword({ email, password }) {
  const normalizedEmail = assertValidEmail(email);
  const authAccount = await findEmailAuthAccount(normalizedEmail);

  // Use the same public error for unknown accounts and invalid passwords.
if (!authAccount) {
    throw createHttpError(401, 'INVALID_CREDENTIALS', 'Email or password incorrect.');
  }

  const ok = await bcrypt.compare(String(password ?? ''), authAccount.passwordHash);

  if (!ok) {
    throw createHttpError(401, 'INVALID_CREDENTIALS', 'Email or password incorrect.');
  }

  const user = await recordLogin(authAccount.user.id);

  return {
    user,
    token: signAuthToken(user),
  };
}

/**
 * Delegates provider-account linking to the repository, then issues the same
 * application JWT used by password authentication.
 */
export async function loginWithGoogleProfile(profile) {
  const user = await findOrCreateGoogleUser(profile);

  return {
    user,
    token: signAuthToken(user),
  };
}

function assertValidUsername(username) {
  const cleaned = String(username ?? '').trim();

  if (cleaned.length < 3 || cleaned.length > 32) {
    throw createHttpError(400, 'INVALID_USERNAME', 'Username must be between 3 and 32 characters.');
  }

  return cleaned;
}

function assertValidBio(bio) {
  const cleaned = String(bio ?? '').trim();

  if (cleaned.length > 500) {
    throw createHttpError(400, 'BIO_TOO_LONG', 'Bio must be 500 characters or less.');
  }

  return cleaned || null;
}

// Restrict profile images to web URLs; schemes such as javascript: are rejected.
function assertValidAvatarUrl(avatarUrl) {
  const cleaned = String(avatarUrl ?? '').trim();

  if (!cleaned) {
    return null;
  }

  try {
    const url = new URL(cleaned);

    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Invalid protocol');
    }

    return url.toString();
  } catch {
    throw createHttpError(400, 'INVALID_AVATAR_URL', 'Invalid avatar URL.');
  }
}

/**
 * Validates the complete profile update before executing a single database write.
 */
export async function updateUserProfile(userId, payload) {
  const username = assertValidUsername(payload.username);
  const bio = assertValidBio(payload.bio);
  const avatarUrl = assertValidAvatarUrl(payload.avatarUrl);

  return updateUserProfileById(userId, {
    username,
    bio,
    avatarUrl,
  });
}
