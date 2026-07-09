import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMiddleware = vi.hoisted(() => ({
  getAuthTokenFromRequest: vi.fn(),
}));

const authService = vi.hoisted(() => ({
  verifyAuthToken: vi.fn(),
}));

vi.mock('../../middlewares/auth.middleware.js', () => authMiddleware);
vi.mock('../../services/auth.service.js', () => authService);

import { optionalAuth } from '../../middlewares/optionalAuth.middleware.js';

describe('optionalAuth.middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets req.user from a valid optional token', async () => {
    const user = { id: 'user-1' };
    authMiddleware.getAuthTokenFromRequest.mockReturnValue('token');
    authService.verifyAuthToken.mockResolvedValue(user);
    const req = {};
    const next = vi.fn();

    await optionalAuth(req, {}, next);

    expect(req.user).toBe(user);
    expect(next).toHaveBeenCalledOnce();
  });

  it('sets req.user to null when no token exists', async () => {
    authMiddleware.getAuthTokenFromRequest.mockReturnValue(null);
    const req = {};
    const next = vi.fn();

    await optionalAuth(req, {}, next);

    expect(req.user).toBeNull();
    expect(authService.verifyAuthToken).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it('continues anonymously when token parsing fails', async () => {
    authMiddleware.getAuthTokenFromRequest.mockImplementation(() => {
      throw new Error('Invalid cookie');
    });
    const req = {};
    const next = vi.fn();

    await optionalAuth(req, {}, next);

    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalledOnce();
  });
});
