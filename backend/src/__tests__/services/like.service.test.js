import { beforeEach, describe, expect, it, vi } from 'vitest';

const sharedGameRepository = vi.hoisted(() => ({
  findCommentableSharedGame: vi.fn(),
}));

const likeRepository = vi.hoisted(() => ({
  getSharedGameLikeStats: vi.fn(),
  likeSharedGameRecord: vi.fn(),
  unlikeSharedGameRecord: vi.fn(),
}));

vi.mock('../../repositories/sharedGame.repository.js', () => sharedGameRepository);
vi.mock('../../repositories/like.repository.js', () => likeRepository);

import {
  getLikesForSharedGame,
  likeSharedGame,
  unlikeSharedGame,
} from '../../services/like.service.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const SHARED_GAME_ID = '33333333-3333-4333-8333-333333333333';

const STATS = {
  likeCount: 4,
  likedByViewer: true,
};

describe('like.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('likes an accessible shared game and returns fresh stats', async () => {
    sharedGameRepository.findCommentableSharedGame.mockResolvedValue({ id: SHARED_GAME_ID });
    likeRepository.getSharedGameLikeStats.mockResolvedValue(STATS);

    await expect(likeSharedGame(USER_ID, SHARED_GAME_ID)).resolves.toBe(STATS);

    expect(sharedGameRepository.findCommentableSharedGame).toHaveBeenCalledWith(SHARED_GAME_ID);
    expect(likeRepository.likeSharedGameRecord).toHaveBeenCalledWith(SHARED_GAME_ID, USER_ID);
    expect(likeRepository.getSharedGameLikeStats).toHaveBeenCalledWith(SHARED_GAME_ID, USER_ID);
  });

  it('unlikes an accessible shared game and returns fresh stats', async () => {
    sharedGameRepository.findCommentableSharedGame.mockResolvedValue({ id: SHARED_GAME_ID });
    likeRepository.getSharedGameLikeStats.mockResolvedValue({ likeCount: 3, likedByViewer: false });

    await expect(unlikeSharedGame(USER_ID, SHARED_GAME_ID)).resolves.toEqual({
      likeCount: 3,
      likedByViewer: false,
    });

    expect(likeRepository.unlikeSharedGameRecord).toHaveBeenCalledWith(SHARED_GAME_ID, USER_ID);
  });

  it('reads public like stats with anonymous viewer context', async () => {
    sharedGameRepository.findCommentableSharedGame.mockResolvedValue({ id: SHARED_GAME_ID });
    likeRepository.getSharedGameLikeStats.mockResolvedValue({ likeCount: 9, likedByViewer: false });

    await getLikesForSharedGame(SHARED_GAME_ID, null);

    expect(likeRepository.getSharedGameLikeStats).toHaveBeenCalledWith(SHARED_GAME_ID, null);
  });

  it('reads public like stats with authenticated viewer context', async () => {
    sharedGameRepository.findCommentableSharedGame.mockResolvedValue({ id: SHARED_GAME_ID });
    likeRepository.getSharedGameLikeStats.mockResolvedValue(STATS);

    await getLikesForSharedGame(SHARED_GAME_ID, { id: USER_ID });

    expect(likeRepository.getSharedGameLikeStats).toHaveBeenCalledWith(SHARED_GAME_ID, USER_ID);
  });

  it('throws 404 when the target shared game is not commentable', async () => {
    sharedGameRepository.findCommentableSharedGame.mockResolvedValue(null);

    await expect(likeSharedGame(USER_ID, SHARED_GAME_ID)).rejects.toMatchObject({
      status: 404,
      code: 'SHARED_GAME_NOT_FOUND',
    });

    expect(likeRepository.likeSharedGameRecord).not.toHaveBeenCalled();
  });

  it('validates shared game ids before touching repositories', async () => {
    await expect(likeSharedGame(USER_ID, 'not-a-uuid')).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_ID',
    });

    expect(sharedGameRepository.findCommentableSharedGame).not.toHaveBeenCalled();
  });
});
