import { beforeEach, describe, expect, it, vi } from 'vitest';

const gameRepository = vi.hoisted(() => ({
  findOwnedGameById: vi.fn(),
}));

const sharedGameRepository = vi.hoisted(() => ({
  createSharedGameRecord: vi.fn(),
  deleteOwnedSharedGameRecord: vi.fn(),
  findSharedGameForViewer: vi.fn(),
  listPublicSharedGames: vi.fn(),
  listSharedGamesByUserId: vi.fn(),
  updateOwnedSharedGameRecord: vi.fn(),
}));

vi.mock('../../repositories/game.repository.js', () => gameRepository);
vi.mock('../../repositories/sharedGame.repository.js', () => sharedGameRepository);

import {
  createSharedGame,
  deleteSharedGame,
  getSharedGame,
  listCommunitySharedGames,
  listMySharedGames,
  updateSharedGame,
} from '../../services/sharedGame.service.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const GAME_ID = '22222222-2222-4222-8222-222222222222';
const SHARED_GAME_ID = '33333333-3333-4333-8333-333333333333';

const REVIEW_PAYLOAD = {
  header: {
    white: 'Matthieu',
    black: 'Stockfish',
    result: '1-0',
  },
  moves: [
    {
      ply: 1,
      san: 'e4',
      category: 'best',
    },
  ],
};

const ANALYSIS_SUMMARY = {
  whiteAccuracy: 91.4,
  blackAccuracy: 82.1,
  totalMistakes: 2,
};

describe('sharedGame.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('creates a shared game only when the source game belongs to the user', async () => {
    gameRepository.findOwnedGameById.mockResolvedValue({ id: GAME_ID, userId: USER_ID });
    sharedGameRepository.createSharedGameRecord.mockResolvedValue({ id: SHARED_GAME_ID });

    await expect(
      createSharedGame(USER_ID, {
        game_id: GAME_ID,
        title: 'My annotated game',
        description: 'Sharp tactical line.',
        visibility: 'unlisted',
      }),
    ).resolves.toEqual({ id: SHARED_GAME_ID });

    expect(sharedGameRepository.createSharedGameRecord).toHaveBeenCalledWith({
      gameId: GAME_ID,
      userId: USER_ID,
      title: 'My annotated game',
      description: 'Sharp tactical line.',
      visibility: 'unlisted',
      review: null,
      analysisSummary: null,
      reviewedAt: null,
    });
  });

  it('creates a shared review with sanitized JSON payload and reviewed date', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-09T10:00:00.000Z'));

    gameRepository.findOwnedGameById.mockResolvedValue({ id: GAME_ID, userId: USER_ID });
    sharedGameRepository.createSharedGameRecord.mockResolvedValue({ id: SHARED_GAME_ID });

    await createSharedGame(USER_ID, {
      gameId: GAME_ID,
      title: 'Community review',
      description: '',
      visibility: 'public',
      review: JSON.stringify(REVIEW_PAYLOAD),
      summary: ANALYSIS_SUMMARY,
    });

    expect(sharedGameRepository.createSharedGameRecord).toHaveBeenCalledWith({
      gameId: GAME_ID,
      userId: USER_ID,
      title: 'Community review',
      description: null,
      visibility: 'public',
      review: REVIEW_PAYLOAD,
      analysisSummary: ANALYSIS_SUMMARY,
      reviewedAt: '2026-07-09T10:00:00.000Z',
    });
  });

  it('rejects sharing a game that is missing or owned by someone else', async () => {
    gameRepository.findOwnedGameById.mockResolvedValue(null);

    await expect(
      createSharedGame(USER_ID, { gameId: GAME_ID, title: 'Hidden game' }),
    ).rejects.toMatchObject({
      status: 404,
      code: 'GAME_NOT_FOUND',
    });

    expect(sharedGameRepository.createSharedGameRecord).not.toHaveBeenCalled();
  });

  it.each([
    [{ gameId: GAME_ID, title: 'no' }, 'INVALID_TITLE'],
    [{ gameId: GAME_ID, title: 'Valid title', visibility: 'friends-only' }, 'INVALID_VISIBILITY'],
    [{ gameId: GAME_ID, title: 'Valid title', review: 'not-json' }, 'INVALID_REVIEW'],
    [{ gameId: GAME_ID, title: 'Valid title', analysisSummary: [] }, 'INVALID_ANALYSISSUMMARY'],
    [{ gameId: GAME_ID, title: 'Valid title', reviewedAt: 'invalid-date', review: REVIEW_PAYLOAD }, 'INVALID_REVIEWED_AT'],
  ])('validates public payload fields: %#', async (payload, expectedCode) => {
    gameRepository.findOwnedGameById.mockResolvedValue({ id: GAME_ID, userId: USER_ID });

    await expect(createSharedGame(USER_ID, payload)).rejects.toMatchObject({
      status: 400,
      code: expectedCode,
    });
  });

  it('lists community games with pagination, viewer context, sanitized search and sort', async () => {
    const rows = [{ id: SHARED_GAME_ID }];
    sharedGameRepository.listPublicSharedGames.mockResolvedValue(rows);

    await expect(
      listCommunitySharedGames(
        { limit: '12', offset: '2', q: '  Sicilian  ', sort: 'popular' },
        { id: USER_ID },
      ),
    ).resolves.toBe(rows);

    expect(sharedGameRepository.listPublicSharedGames).toHaveBeenCalledWith({
      limit: 12,
      offset: 2,
      search: 'Sicilian',
      sort: 'popular',
      viewerId: USER_ID,
    });
  });

  it('falls back to latest sort for unknown community sort values', async () => {
    sharedGameRepository.listPublicSharedGames.mockResolvedValue([]);

    await listCommunitySharedGames({ sort: 'random', search: '  London  ' }, null);

    expect(sharedGameRepository.listPublicSharedGames).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: 'latest',
        search: 'London',
        viewerId: null,
      }),
    );
  });

  it('lists the current user shared games with safe pagination and default sort', async () => {
    sharedGameRepository.listSharedGamesByUserId.mockResolvedValue([{ id: SHARED_GAME_ID }]);

    await listMySharedGames(USER_ID, { limit: '0', offset: '-40' });

    expect(sharedGameRepository.listSharedGamesByUserId).toHaveBeenCalledWith(USER_ID, {
      limit: 1,
      offset: 0,
      sort: 'latest',
    });
  });

  it('returns a shared game visible to the current viewer and propagates viewer role', async () => {
    sharedGameRepository.findSharedGameForViewer.mockResolvedValue({
      id: SHARED_GAME_ID,
      visibility: 'private',
    });

    await expect(getSharedGame(SHARED_GAME_ID, { id: USER_ID, role: 'ADMIN' })).resolves.toEqual({
      id: SHARED_GAME_ID,
      visibility: 'private',
    });

    expect(sharedGameRepository.findSharedGameForViewer).toHaveBeenCalledWith(SHARED_GAME_ID, {
      viewerId: USER_ID,
      viewerRole: 'ADMIN',
    });
  });

  it('throws 404 when a shared game is not visible to the viewer', async () => {
    sharedGameRepository.findSharedGameForViewer.mockResolvedValue(null);

    await expect(getSharedGame(SHARED_GAME_ID, null)).rejects.toMatchObject({
      status: 404,
      code: 'SHARED_GAME_NOT_FOUND',
    });
  });

  it('updates only an owned shared game and preserves existing fields', async () => {
    sharedGameRepository.findSharedGameForViewer.mockResolvedValue({
      id: SHARED_GAME_ID,
      userId: USER_ID,
      title: 'Old title',
      description: 'Old description',
      visibility: 'public',
      review: REVIEW_PAYLOAD,
      analysisSummary: ANALYSIS_SUMMARY,
      reviewedAt: '2026-07-09T09:00:00.000Z',
    });
    sharedGameRepository.updateOwnedSharedGameRecord.mockResolvedValue({ id: SHARED_GAME_ID });

    await expect(updateSharedGame(USER_ID, SHARED_GAME_ID, { title: 'New title' })).resolves.toEqual({
      id: SHARED_GAME_ID,
    });

    expect(sharedGameRepository.updateOwnedSharedGameRecord).toHaveBeenCalledWith(
      SHARED_GAME_ID,
      USER_ID,
      {
        title: 'New title',
        description: 'Old description',
        visibility: 'public',
        review: REVIEW_PAYLOAD,
        analysisSummary: ANALYSIS_SUMMARY,
        reviewedAt: '2026-07-09T09:00:00.000Z',
      },
    );
  });

  it('throws 404 when deleting an unknown shared game', async () => {
    sharedGameRepository.deleteOwnedSharedGameRecord.mockResolvedValue(false);

    await expect(deleteSharedGame(USER_ID, SHARED_GAME_ID)).rejects.toMatchObject({
      status: 404,
      code: 'SHARED_GAME_NOT_FOUND',
    });
  });
});