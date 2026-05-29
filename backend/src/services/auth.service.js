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

function createHttpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function assertValidEmail(email) {
  const normalized = String(email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw createHttpError(400, 'INVALID_EMAIL', 'Email invalide.');
  }
  return normalized;
}

function assertValidPassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw createHttpError(400, 'WEAK_PASSWORD', 'Le mot de passe doit contenir au moins 8 caractères.');
  }
}

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

export async function registerWithEmailPassword({ email, password, username }) {
  assertValidEmail(email);
  assertValidPassword(password);

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await createUserWithEmailPassword({ email, passwordHash, username });

  return {
    user,
    token: signAuthToken(user),
  };
}

export async function loginWithEmailPassword({ email, password }) {
  assertValidEmail(email);

  const authAccount = await findEmailAuthAccount(email);
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