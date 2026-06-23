import { getAuthTokenFromRequest } from './auth.middleware.js';
import { verifyAuthToken } from '../services/auth.service.js';

export async function optionalAuth(req, _res, next) {
  try {
    const token = getAuthTokenFromRequest(req);
    req.user = token ? await verifyAuthToken(token) : null;
    return next();
  } catch {
    req.user = null;
    return next();
  }
}
