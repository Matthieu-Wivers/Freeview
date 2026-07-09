import { beforeEach, describe, expect, it, vi } from 'vitest';

const gameRepository = vi.hoisted(() => ({
  createGameRecord: vi.fn(),
  deleteOwnedGameRecord: vi.fn(),
  findGameById: vi.fn(),
  findOwnedGameById: vi.fn(),
  listGamesByUserId: vi.fn(),
  updateOwnedGameRecord: vi.fn(),
}));

vi.mock('../../repositories/game.repository.js', () => gameRepository);

import {
  deleteMyGame,
  getGameForOwnerOrAdmin,
  getMyGame,
  importGame,
  listMyGames,
  updateMyGame,
} from '../../services/game.service.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';
const GAME_ID = '33333333-3333-4333-8333-333333333333';
const VALID_PGN = `
[Event "Freeview Test Game"]
[Site "Local"]
[Date "2026.07.09"]
[White "Matthieu"]
[Black "Stockfish"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0
`;

describe('game.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes an imported PGN before creating the game record', async () => {
    const createdGame = { id: GAME_ID, userId: USER_ID, whitePlayer: 'Matthieu' };
    gameRepository.createGameRecord.mockResolvedValue(createdGame);

    await expect(
      importGame(USER_ID, {
        pgn: VALID_PGN,
        source: 'lichess',
      }),
    ).resolves.toBe(createdGame);

    expect(gameRepository.createGameRecord).toHaveBeenCalledWith({
      userId: USER_ID,
      pgn: expect.stringContaining('[Event "Freeview Test Game"]'),
      whitePlayer: 'Matthieu',
      blackPlayer: 'Stockfish',
      result: '1-0',
      playedAt: '2026-07-09T00:00:00.000Z',
      source: 'lichess',
    });
  });

  it('rejects a payload that does not look like a PGN', async () => {
    await expect(importGame(USER_ID, { pgn: 'hello world' })).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_PGN',
    });
    expect(gameRepository.createGameRecord).not.toHaveBeenCalled();
  });

  it.each([
    [{ pgn: VALID_PGN, result: '2-0' }, 'INVALID_RESULT'],
    [{ pgn: VALID_PGN, source: 'unknown-platform' }, 'INVALID_SOURCE'],
    [{ pgn: VALID_PGN, playedAt: 'not-a-date' }, 'INVALID_PLAYED_AT'],
  ])('rejects invalid normalized fields with %s', async (payload, expectedCode) => {
    await expect(importGame(USER_ID, payload)).rejects.toMatchObject({
      status: 400,
      code: expectedCode,
    });
  });

  it('lists user games with sanitized pagination', async () => {
    const games = [{ id: GAME_ID }];
    gameRepository.listGamesByUserId.mockResolvedValue(games);

    await expect(listMyGames(USER_ID, { limit: '999', offset: '-8' })).resolves.toBe(games);

    expect(gameRepository.listGamesByUserId).toHaveBeenCalledWith(USER_ID, {
      limit: 100,
      offset: 0,
    });
  });

  it('loads an owned game by id and throws 404 when it does not exist', async () => {
    gameRepository.findOwnedGameById.mockResolvedValueOnce({ id: GAME_ID, userId: USER_ID });
    await expect(getMyGame(USER_ID, GAME_ID)).resolves.toEqual({ id: GAME_ID, userId: USER_ID });

    gameRepository.findOwnedGameById.mockResolvedValueOnce(null);
    await expect(getMyGame(USER_ID, GAME_ID)).rejects.toMatchObject({
      status: 404,
      code: 'GAME_NOT_FOUND',
    });
  });

  it('allows owner and admin to read a game, but blocks another regular user', async () => {
    gameRepository.findGameById.mockResolvedValue({ id: GAME_ID, userId: USER_ID });

    await expect(getGameForOwnerOrAdmin({ id: USER_ID, role: 'USER' }, GAME_ID)).resolves.toEqual({
      id: GAME_ID,
      userId: USER_ID,
    });
    await expect(getGameForOwnerOrAdmin({ id: OTHER_USER_ID, role: 'ADMIN' }, GAME_ID)).resolves.toEqual({
      id: GAME_ID,
      userId: USER_ID,
    });
    await expect(getGameForOwnerOrAdmin({ id: OTHER_USER_ID, role: 'USER' }, GAME_ID)).rejects.toMatchObject({
      status: 403,
      code: 'GAME_FORBIDDEN',
    });
  });

  it('merges existing game data when updating a partial payload', async () => {
    gameRepository.findOwnedGameById.mockResolvedValue({
      id: GAME_ID,
      userId: USER_ID,
      pgn: VALID_PGN,
      whitePlayer: 'Matthieu',
      blackPlayer: 'Stockfish',
      result: '1-0',
      playedAt: '2026-07-09T00:00:00.000Z',
      source: 'pgn_import',
    });
    gameRepository.updateOwnedGameRecord.mockResolvedValue({ id: GAME_ID, result: '1/2-1/2' });

    await expect(updateMyGame(USER_ID, GAME_ID, { result: '1/2-1/2' })).resolves.toEqual({
      id: GAME_ID,
      result: '1/2-1/2',
    });

    expect(gameRepository.updateOwnedGameRecord).toHaveBeenCalledWith(
      GAME_ID,
      USER_ID,
      expect.objectContaining({
        whitePlayer: 'Matthieu',
        blackPlayer: 'Stockfish',
        result: '1/2-1/2',
        source: 'pgn_import',
      }),
    );
  });

  it('throws 404 when deleting a missing owned game', async () => {
    gameRepository.deleteOwnedGameRecord.mockResolvedValue(false);

    await expect(deleteMyGame(USER_ID, GAME_ID)).rejects.toMatchObject({
      status: 404,
      code: 'GAME_NOT_FOUND',
    });
  });
});
