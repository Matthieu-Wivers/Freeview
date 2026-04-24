import crypto from 'node:crypto';
import { env } from '../utils/env.utils.js';

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

function normalizeIp(ip) {
  return String(ip ?? '').replace(/^::ffff:/, '');
}

function isLocalhost(req) {
  const candidates = [
    req.ip,
    req.socket?.remoteAddress,
    req.connection?.remoteAddress,
  ].map(normalizeIp);

  return candidates.some((ip) => ip === '127.0.0.1' || ip === '::1');
}

function hasValidAdminBearer(req) {
  const header = req.get('authorization') ?? '';
  const token = header.match(/^Bearer\s+(.+)$/i)?.[1];
  return timingSafeEqualString(token, env.apiAdminToken);
}

export function requireGatewayOrLocalAdmin(req, res, next) {
  const gatewayToken = req.get('x-internal-gateway');

  if (timingSafeEqualString(gatewayToken, env.internalGatewayToken)) {
    return next();
  }

  if (isLocalhost(req) && hasValidAdminBearer(req)) {
    return next();
  }

  return res.status(403).json({
    error: 'FORBIDDEN',
    message: 'Accès API refusé.',
  });
}
