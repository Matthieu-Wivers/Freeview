import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createComment,
  createReport,
  createSharedGame,
  deleteGame,
  getCurrentUser,
  getSharedGame,
  importGame,
  likeSharedGame,
  listAdminReports,
  listMyGames,
  listSharedGames,
  moderateComment,
  moderateSharedGame,
  updateAdminUserStatus,
  updateComment,
  updateCurrentUser,
  updateSharedGame,
} from '../../services/freeviewApi';

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status });
}

describe('freeviewApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: true })));
  });

  it('maps current user calls to the auth API and unwraps the user envelope', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ user: { id: 'user-1' } }));
    await expect(getCurrentUser()).resolves.toEqual({ id: 'user-1' });
    expect(fetch.mock.calls[0][0]).toBe('/api/auth/me');

    fetch.mockResolvedValueOnce(jsonResponse({ data: { user: { username: 'Wivers' } } }));
    await expect(updateCurrentUser({ username: 'Wivers' })).resolves.toEqual({ username: 'Wivers' });
    expect(fetch.mock.calls[1][0]).toBe('/api/auth/me');
    expect(fetch.mock.calls[1][1]).toMatchObject({ method: 'PATCH' });
  });

  it('maps game endpoints and unwraps payloads', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ games: [{ id: 'game-1' }] }));
    await expect(listMyGames()).resolves.toEqual([{ id: 'game-1' }]);
    expect(fetch.mock.calls[0][0]).toBe('/api/games/me');

    fetch.mockResolvedValueOnce(jsonResponse({ game: { id: 'game-2' } }));
    await expect(importGame({ pgn: '1. e4 e5' })).resolves.toEqual({ id: 'game-2' });
    expect(fetch.mock.calls[1][0]).toBe('/api/games/import');
    expect(fetch.mock.calls[1][1]).toMatchObject({ method: 'POST' });

    await deleteGame('game-2');
    expect(fetch.mock.calls[2][0]).toBe('/api/games/game-2');
    expect(fetch.mock.calls[2][1]).toMatchObject({ method: 'DELETE' });
  });

  it('maps shared game list/detail/create/update endpoints', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ sharedGames: [{ id: 'shared-1' }] }));
    await expect(listSharedGames({ search: 'mate', limit: 10 })).resolves.toEqual([
      { id: 'shared-1' },
    ]);
    expect(fetch.mock.calls[0][0]).toBe('/api/shared-games?search=mate&limit=10');

    fetch.mockResolvedValueOnce(jsonResponse({ sharedGame: { id: 'shared-1' } }));
    await expect(getSharedGame('shared-1')).resolves.toEqual({ id: 'shared-1' });
    expect(fetch.mock.calls[1][0]).toBe('/api/shared-games/shared-1');

    fetch.mockResolvedValueOnce(jsonResponse({ shared_game: { id: 'shared-2' } }));
    await expect(
      createSharedGame({ gameId: 'game-1', title: 'Review', visibility: 'public' }),
    ).resolves.toEqual({ id: 'shared-2' });
    expect(fetch.mock.calls[2][0]).toBe('/api/shared-games');
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toMatchObject({
      gameId: 'game-1',
      game_id: 'game-1',
      title: 'Review',
    });

    fetch.mockResolvedValueOnce(jsonResponse({ sharedGame: { id: 'shared-2', title: 'Updated' } }));
    await expect(updateSharedGame('shared-2', { title: 'Updated' })).resolves.toMatchObject({
      title: 'Updated',
    });
    expect(fetch.mock.calls[3][0]).toBe('/api/shared-games/shared-2');
    expect(fetch.mock.calls[3][1]).toMatchObject({ method: 'PATCH' });
  });

  it('maps social interactions and comment endpoints', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ like: { liked: true } }));
    await expect(likeSharedGame('shared-1')).resolves.toEqual({ liked: true });
    expect(fetch.mock.calls[0][0]).toBe('/api/shared-games/shared-1/like');

    fetch.mockResolvedValueOnce(jsonResponse({ comment: { id: 'comment-1' } }));
    await expect(createComment('shared-1', 'Nice review')).resolves.toEqual({ id: 'comment-1' });
    expect(fetch.mock.calls[1][0]).toBe('/api/shared-games/shared-1/comments');
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ content: 'Nice review' });

    fetch.mockResolvedValueOnce(jsonResponse({ comment: { id: 'comment-1', content: 'Updated' } }));
    await expect(updateComment('comment-1', 'Updated')).resolves.toEqual({
      id: 'comment-1',
      content: 'Updated',
    });
    expect(fetch.mock.calls[2][0]).toBe('/api/comments/comment-1');
  });

  it('maps reporting and admin moderation endpoints', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ report: { id: 'report-1' } }));
    await expect(createReport({ sharedGameId: 'shared-1', reason: 'spam' })).resolves.toEqual({
      id: 'report-1',
    });
    expect(fetch.mock.calls[0][0]).toBe('/api/reports');

    fetch.mockResolvedValueOnce(jsonResponse({ reports: [{ id: 'report-1' }] }));
    await expect(listAdminReports({ status: 'open' })).resolves.toEqual([{ id: 'report-1' }]);
    expect(fetch.mock.calls[1][0]).toBe('/api/admin/reports?status=open');

    fetch.mockResolvedValueOnce(jsonResponse({ shared_game: { id: 'shared-1' } }));
    await expect(moderateSharedGame('shared-1', 'hidden')).resolves.toEqual({ id: 'shared-1' });
    expect(fetch.mock.calls[2][0]).toBe('/api/admin/shared-games/shared-1/moderation');
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({
      moderation_status: 'hidden',
      moderationStatus: 'hidden',
    });

    fetch.mockResolvedValueOnce(jsonResponse({ comment: { id: 'comment-1' } }));
    await expect(moderateComment('comment-1', 'hidden')).resolves.toEqual({ id: 'comment-1' });
    expect(fetch.mock.calls[3][0]).toBe('/api/admin/comments/comment-1/moderation');

    fetch.mockResolvedValueOnce(jsonResponse({ user: { id: 'user-1', disabled: true } }));
    await expect(updateAdminUserStatus('user-1', { disabled: true })).resolves.toEqual({
      id: 'user-1',
      disabled: true,
    });
    expect(fetch.mock.calls[4][0]).toBe('/api/admin/users/user-1/status');
  });
});
