import { env } from '../utils/env.utils.js';
import { verifyAuthToken } from '../services/auth.service.js';

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

export function getAuthTokenFromRequest(req) {
  const bearerToken = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearerToken) {
    return bearerToken;
  }

  const cookies = parseCookies(req.get('cookie'));
  return cookies[env.authCookieName];
}

export async function requireAuth(req, res, next) {
  const token = getAuthTokenFromRequest(req);
  const user = token ? await verifyAuthToken(token) : null;

  if (!user) {
    return res.status(401).json({
      error: 'UNAUTHENTICATED',
      message: 'Connexion requise.',
    });
  }

  req.user = user;
  return next();
}
