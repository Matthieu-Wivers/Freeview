import { describe, expect, it, vi } from 'vitest';

import { requireAdmin } from '../../middlewares/admin.middleware.js';

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

describe('admin.middleware', () => {
  it('rejects unauthenticated requests', () => {
    const req = {};
    const res = createResponse();
    const next = vi.fn();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'UNAUTHENTICATED',
      message: 'Connexion requise.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects non-admin users', () => {
    const req = { user: { id: 'user-1', role: 'USER' } };
    const res = createResponse();
    const next = vi.fn();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'ADMIN_REQUIRED',
      message: 'Accès administrateur requis.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('continues for admin users', () => {
    const req = { user: { id: 'admin-1', role: 'ADMIN' } };
    const res = createResponse();
    const next = vi.fn();

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
