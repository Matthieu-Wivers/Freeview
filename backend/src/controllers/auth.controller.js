import crypto from 'node:crypto';

import { env } from '../utils/env.utils.js';
import {
  loginWithEmailPassword,
  loginWithGoogleProfile,
  registerWithEmailPassword,
} from '../services/auth.service.js';

function authCookieOptions() {
  return {
    httpOnly: true,
    secure: env.authCookieSecure,
    sameSite: 'lax',
    maxAge: env.authCookieMaxAgeSeconds * 1000,
    path: '/',
  };
}

function oauthStateCookieName() {
  return `${env.authCookieName}_oauth_state`;
}

function setAuthCookie(res, token) {
  res.cookie(env.authCookieName, token, authCookieOptions());
}

function clearAuthCookie(res) {
  res.clearCookie(env.authCookieName, {
    path: '/',
    httpOnly: true,
    secure: env.authCookieSecure,
    sameSite: 'lax',
  });
}

function parseCookies(cookieHeader) {
  return Object.fromEntries(
    String(cookieHeader ?? '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separatorIndex = part.indexOf('=');
        if (separatorIndex === -1) {
          return [part, ''];
        }
        return [
          decodeURIComponent(part.slice(0, separatorIndex)),
          decodeURIComponent(part.slice(separatorIndex + 1)),
        ];
      }),
  );
}

function redirectWithError(res, errorCode = 'google') {
  const separator = env.frontendAuthErrorUrl.includes('?') ? '&' : '?';
  return res.redirect(`${env.frontendAuthErrorUrl}${separator}reason=${encodeURIComponent(errorCode)}`);
}

export async function register(req, res, next) {
  try {
    const result = await registerWithEmailPassword(req.body ?? {});
    setAuthCookie(res, result.token);
    return res.status(201).json({ user: result.user });
  } catch (error) {
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const result = await loginWithEmailPassword(req.body ?? {});
    setAuthCookie(res, result.token);
    return res.json({ user: result.user });
  } catch (error) {
    return next(error);
  }
}

export function logout(_req, res) {
  clearAuthCookie(res);
  return res.status(204).send();
}

export function me(req, res) {
  return res.json({ user: req.user });
}

export function googleStart(_req, res) {
  if (!env.googleSsoEnabled) {
    return res.status(503).json({
      error: 'GOOGLE_SSO_DISABLED',
      message: 'Google SSO n’est pas configuré côté serveur.',
    });
  }

  const state = crypto.randomBytes(24).toString('hex');

  res.cookie(oauthStateCookieName(), state, {
    httpOnly: true,
    secure: env.authCookieSecure,
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000,
    path: '/api/auth/google',
  });

  const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorizationUrl.searchParams.set('client_id', env.googleClientId);
  authorizationUrl.searchParams.set('redirect_uri', env.googleRedirectUri);
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('scope', 'openid email profile');
  authorizationUrl.searchParams.set('state', state);
  authorizationUrl.searchParams.set('prompt', 'select_account');

  return res.redirect(authorizationUrl.toString());
}

export async function googleCallback(req, res, next) {
  try {
    if (!env.googleSsoEnabled) {
      return redirectWithError(res, 'disabled');
    }

    const { code, state, error } = req.query;
    if (error) {
      return redirectWithError(res, String(error));
    }

    const cookies = parseCookies(req.get('cookie'));
    const expectedState = cookies[oauthStateCookieName()];

    if (!code || !state || !expectedState || state !== expectedState) {
      return redirectWithError(res, 'invalid_state');
    }

    res.clearCookie(oauthStateCookieName(), {
      path: '/api/auth/google',
      httpOnly: true,
      secure: env.authCookieSecure,
      sameSite: 'lax',
    });

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: env.googleClientId,
        client_secret: env.googleClientSecret,
        redirect_uri: env.googleRedirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      return redirectWithError(res, 'token_exchange_failed');
    }

    const tokens = await tokenResponse.json();

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: {
        authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      return redirectWithError(res, 'profile_fetch_failed');
    }

    const profile = await profileResponse.json();
    const result = await loginWithGoogleProfile({
      googleSub: profile.sub,
      email: profile.email,
      emailVerified: profile.email_verified,
      name: profile.name,
      avatarUrl: profile.picture,
    });

    setAuthCookie(res, result.token);
    return res.redirect(env.frontendAuthSuccessUrl);
  } catch (error) {
    return next(error);
  }
}
