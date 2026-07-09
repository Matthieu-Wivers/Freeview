import { describe, expect, it, vi } from 'vitest';

import { errorHandler, notFoundHandler } from '../../middlewares/error.middleware.js';

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

describe('error.middleware', () => {
  it('returns a normalized 404 for unknown routes', () => {
    const res = createResponse();

    notFoundHandler({ method: 'GET', originalUrl: '/missing' }, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'NOT_FOUND',
      message: 'Route inconnue: GET /missing',
    });
  });

  it('returns 413 for oversized bodies', () => {
    const res = createResponse();

    errorHandler({ type: 'entity.too.large' }, {}, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({
      error: 'PAYLOAD_TOO_LARGE',
      message: 'Le corps de la requête est trop volumineux.',
    });
  });

  it('returns 400 for invalid JSON syntax errors', () => {
    const res = createResponse();
    const error = new SyntaxError('Unexpected token');
    error.body = '{invalid';

    errorHandler(error, {}, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'INVALID_JSON',
      message: 'JSON invalide.',
    });
  });

  it('uses explicit HTTP error metadata when available', () => {
    const res = createResponse();
    const error = new Error('Forbidden action');
    error.status = 403;
    error.code = 'FORBIDDEN_ACTION';

    errorHandler(error, {}, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'FORBIDDEN_ACTION',
      message: 'Forbidden action',
    }));
  });

  it('falls back to a safe 500 response for invalid status codes', () => {
    const res = createResponse();
    const error = new Error('Broken');
    error.status = 700;

    errorHandler(error, {}, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'INTERNAL_ERROR',
      message: 'Broken',
    }));
  });
});
