import { beforeEach, describe, expect, it, vi } from 'vitest';

const envMock = vi.hoisted(() => ({
  env: {
    authCookieName: 'freeview_session',
  },
}));

const authService = vi.hoisted(() => ({
  verifyAuthToken: vi.fn(),
}));

vi.mock('../../utils/env.utils.js', () => envMock);
vi.mock('../../services/auth.service.js', () => authService);

import { getAuthTokenFromRequest, requireAuth } from '../../middlewares/auth.middleware.js';

function createReq(headers = {}) {
  return {
    get: vi.fn((name) => headers[name.toLowerCase()] ?? headers[name] ?? ''),
  };
}

function createRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

describe('auth.middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts bearer tokens before cookies', () => {
    const req = createReq({
      authorization: 'Bearer bearer-token',
      cookie: 'freeview_session=cookie-token',
    });

    expect(getAuthTokenFromRequest(req)).toBe('bearer-token');
  });

  it('extracts encoded cookie tokens when no bearer token exists', () => {
    const req = createReq({
      cookie: 'theme=dark; freeview_session=token%2Ewith%2Edots; other=value',
    });

    expect(getAuthTokenFromRequest(req)).toBe('token.with.dots');
  });

  it('attaches the verified user and calls next', async () => {
    const user = { id: 'user-1', role: 'USER' };
    authService.verifyAuthToken.mockResolvedValue(user);
    const req = createReq({ authorization: 'Bearer valid-token' });
    const res = createRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(authService.verifyAuthToken).toHaveBeenCalledWith('valid-token');
    expect(req.user).toBe(user);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when the token is missing or invalid', async () => {
    authService.verifyAuthToken.mockResolvedValue(null);
    const req = createReq({ authorization: 'Bearer invalid-token' });
    const res = createRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'UNAUTHENTICATED',
      message: 'Connexion requise.',
    });
  });
});
