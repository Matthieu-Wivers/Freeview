import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  apiRequest,
  asArray,
  asObject,
  buildQuery,
} from '../../services/apiClient.js';

function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

function textResponse(payload, init = {}) {
  return new Response(payload, {
    status: 200,
    headers: { 'content-type': 'text/plain' },
    ...init,
  });
}

describe('apiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn(() => Promise.resolve(jsonResponse({ ok: true })));
  });

  it('normalizes relative paths, sends JSON bodies and includes credentials', async () => {
    await expect(
      apiRequest('/games/import', {
        method: 'POST',
        body: { pgn: '[Event "Test"]\n\n1. e4 e5 *' },
      }),
    ).resolves.toEqual({ ok: true });

    expect(fetch).toHaveBeenCalledWith('/api/games/import', {
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({ pgn: '[Event "Test"]\n\n1. e4 e5 *' }),
    });
  });

  it('does not double-prefix /api paths and supports absolute URLs', async () => {
    fetch.mockImplementation(() => Promise.resolve(jsonResponse({ ok: true })));

    await apiRequest('/api/health');
    await apiRequest('https://example.com/external');

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      '/api/health',
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'https://example.com/external',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('does not force content-type for strings or FormData', async () => {
    fetch.mockImplementation(() => Promise.resolve(new Response(null, { status: 204 })));

    await apiRequest('/raw', { method: 'POST', body: 'plain text' });

    expect(fetch).toHaveBeenCalledWith('/api/raw', {
      credentials: 'include',
      headers: {},
      method: 'POST',
      body: 'plain text',
    });

    const formData = new FormData();
    formData.set('file', new Blob(['pgn']), 'game.pgn');

    await apiRequest('/upload', { method: 'POST', body: formData });

    expect(fetch).toHaveBeenLastCalledWith('/api/upload', {
      credentials: 'include',
      headers: {},
      method: 'POST',
      body: formData,
    });
  });

  it('parses text responses when the payload is not JSON', async () => {
    fetch.mockResolvedValueOnce(textResponse('plain response'));

    await expect(apiRequest('/text')).resolves.toBe('plain response');
  });

  it('throws an ApiError with the server payload on failed responses', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse(
        { error: 'INVALID_PGN', message: 'PGN invalide.' },
        { status: 400 },
      ),
    );

    await expect(apiRequest('/games/import')).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'PGN invalide.',
      payload: {
        error: 'INVALID_PGN',
        message: 'PGN invalide.',
      },
    });
  });

  it('extracts arrays from common API response envelopes', () => {
    expect(asArray([{ id: 1 }])).toEqual([{ id: 1 }]);
    expect(asArray({ data: [{ id: 1 }] })).toEqual([{ id: 1 }]);
    expect(asArray({ items: [{ id: 2 }] })).toEqual([{ id: 2 }]);
    expect(asArray({ results: [{ id: 3 }] })).toEqual([{ id: 3 }]);
    expect(asArray({ games: [{ id: 4 }] }, ['games'])).toEqual([{ id: 4 }]);
    expect(asArray({ data: { comments: [{ id: 5 }] } }, ['comments'])).toEqual([{ id: 5 }]);
    expect(asArray({ nope: true })).toEqual([]);
  });

  it('extracts objects from common API response envelopes', () => {
    expect(asObject({ id: 1 })).toEqual({ id: 1 });
    expect(asObject({ data: { id: 2 } })).toEqual({ id: 2 });
    expect(asObject({ user: { id: 3 } }, ['user'])).toEqual({ id: 3 });
    expect(asObject({ data: { sharedGame: { id: 4 } } }, ['sharedGame'])).toEqual({ id: 4 });
    expect(asObject(null)).toEqual({});
    expect(asObject([{ id: 1 }])).toEqual({});
  });

  it('builds query strings while omitting empty values', () => {
    expect(buildQuery({ limit: 10, offset: 0, q: 'sicilian', empty: '', nil: null })).toBe(
      '?limit=10&offset=0&q=sicilian',
    );
    expect(buildQuery({})).toBe('');
  });

  it('exposes ApiError as a typed client error', () => {
    const error = new ApiError('Boom', 500, { detail: 'server' });

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      name: 'ApiError',
      message: 'Boom',
      status: 500,
      payload: { detail: 'server' },
    });
  });
});
