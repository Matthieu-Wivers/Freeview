import { beforeEach, describe, expect, it, vi } from 'vitest';

const envMock = vi.hoisted(() => ({
  env: {
    apiAdminToken: 'admin-token-secret',
    internalGatewayToken: 'gateway-token-secret',
  },
}));

vi.mock('../../utils/env.utils.js', () => envMock);

import { requireGatewayOrLocalAdmin } from '../../middlewares/security.middleware.js';

function createReq({ headers = {}, ip = '203.0.113.10', remoteAddress = '203.0.113.10' } = {}) {
  return {
    ip,
    socket: { remoteAddress },
    connection: { remoteAddress },
    get: vi.fn((name) => headers[name.toLowerCase()] ?? headers[name] ?? ''),
  };
}

function createRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

describe('security.middleware', () => {
  let next;

  beforeEach(() => {
    next = vi.fn();
  });

  it('allows requests coming from the internal gateway', () => {
    const req = createReq({ headers: { 'x-internal-gateway': 'gateway-token-secret' } });
    const res = createRes();

    requireGatewayOrLocalAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows localhost admin bearer calls for controlled maintenance scripts', () => {
    const req = createReq({
      ip: '::ffff:127.0.0.1',
      remoteAddress: '::ffff:127.0.0.1',
      headers: { authorization: 'Bearer admin-token-secret' },
    });
    const res = createRes();

    requireGatewayOrLocalAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects external calls without a valid gateway token', () => {
    const req = createReq({ headers: { authorization: 'Bearer admin-token-secret' } });
    const res = createRes();

    requireGatewayOrLocalAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'FORBIDDEN',
      message: 'Accès API refusé.',
    });
  });

  it('does not accept partial or malformed gateway tokens', () => {
    const req = createReq({ headers: { 'x-internal-gateway': 'gateway-token' } });
    const res = createRes();

    requireGatewayOrLocalAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
