/**
 * API gateway security boundary.
 *
 * The public deployment reaches Express through Nginx, which injects an
 * internal gateway secret. A localhost-only bearer path exists for controlled
 * administrative diagnostics and still requires a separate secret.
 */
import crypto from 'node:crypto';

import { env } from '../utils/env.utils.js';

/**
 * Compares secrets without a content-dependent early exit.
 *
 * Node requires buffers of equal length for timingSafeEqual, therefore the
 * length check is a required safety guard rather than a normal comparison.
 */
function timingSafeEqualString(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

// IPv4 addresses may be represented as IPv4-mapped IPv6 values by Node.
function normalizeIp(ip) {
  return String(ip ?? '').replace(/^::ffff:/, '');
}

/**
 * Checks every address exposed by Express/Node because proxy configuration
 * can affect which property contains the effective remote address.
 */
function isLocalhost(req) {
  const candidates = [
    req.ip,
    req.socket?.remoteAddress,
    req.connection?.remoteAddress,
  ].map(normalizeIp);

  return candidates.some((ip) => ip === '127.0.0.1' || ip === '::1');
}

// A malformed or missing Authorization header is treated as an invalid secret.
function hasValidAdminBearer(req) {
  const header = req.get('authorization') ?? '';
  const token = header.match(/^Bearer\s+(.+)$/i)?.[1];

  return timingSafeEqualString(token, env.apiAdminToken);
}

/**
 * Allows requests from the trusted reverse proxy or authenticated localhost
 * administration. All other requests fail closed with HTTP 403.
 */
export function requireGatewayOrLocalAdmin(req, res, next) {
  const gatewayToken = req.get('x-internal-gateway');

  if (timingSafeEqualString(gatewayToken, env.internalGatewayToken)) {
    return next();
  }

  // Local network origin alone is insufficient: the dedicated admin token is mandatory.
if (isLocalhost(req) && hasValidAdminBearer(req)) {
    return next();
  }

  return res.status(403).json({
    error: 'FORBIDDEN',
    message: 'Accès API refusé.',
  });
}
