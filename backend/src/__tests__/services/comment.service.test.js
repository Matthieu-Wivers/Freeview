import { beforeEach, describe, expect, it, vi } from 'vitest';

const sharedGameRepository = vi.hoisted(() => ({
  findCommentableSharedGame: vi.fn(),
}));

const commentRepository = vi.hoisted(() => ({
  createCommentRecord: vi.fn(),
  deleteOwnedCommentRecord: vi.fn(),
  findOwnedComment: vi.fn(),
  listVisibleCommentsBySharedGameId: vi.fn(),
  updateOwnedCommentRecord: vi.fn(),
}));

vi.mock('../../repositories/sharedGame.repository.js', () => sharedGameRepository);
vi.mock('../../repositories/comment.repository.js', () => commentRepository);

import {
  createComment,
  deleteComment,
  listComments,
  updateComment,
} from '../../services/comment.service.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const SHARED_GAME_ID = '22222222-2222-4222-8222-222222222222';
const COMMENT_ID = '33333333-3333-4333-8333-333333333333';

describe('comment.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a trimmed comment after checking that the shared game is commentable', async () => {
    sharedGameRepository.findCommentableSharedGame.mockResolvedValue({ id: SHARED_GAME_ID });
    commentRepository.createCommentRecord.mockResolvedValue({ id: COMMENT_ID, content: 'Great line' });

    await expect(
      createComment(USER_ID, SHARED_GAME_ID, { content: '  Great line  ' }),
    ).resolves.toEqual({ id: COMMENT_ID, content: 'Great line' });

    expect(commentRepository.createCommentRecord).toHaveBeenCalledWith({
      sharedGameId: SHARED_GAME_ID,
      userId: USER_ID,
      content: 'Great line',
    });
  });

  it('rejects empty comments before writing to the repository', async () => {
    sharedGameRepository.findCommentableSharedGame.mockResolvedValue({ id: SHARED_GAME_ID });

    await expect(createComment(USER_ID, SHARED_GAME_ID, { content: '   ' })).rejects.toMatchObject({
      status: 400,
      code: 'EMPTY_COMMENT',
    });

    expect(commentRepository.createCommentRecord).not.toHaveBeenCalled();
  });

  it('rejects comments on hidden or non-commentable shared games', async () => {
    sharedGameRepository.findCommentableSharedGame.mockResolvedValue(null);

    await expect(createComment(USER_ID, SHARED_GAME_ID, { content: 'Hello' })).rejects.toMatchObject({
      status: 404,
      code: 'SHARED_GAME_NOT_FOUND',
    });
  });

  it('lists visible comments with viewer context', async () => {
    sharedGameRepository.findCommentableSharedGame.mockResolvedValue({ id: SHARED_GAME_ID });
    commentRepository.listVisibleCommentsBySharedGameId.mockResolvedValue([{ id: COMMENT_ID }]);

    await expect(listComments(SHARED_GAME_ID, { id: USER_ID })).resolves.toEqual([{ id: COMMENT_ID }]);

    expect(commentRepository.listVisibleCommentsBySharedGameId).toHaveBeenCalledWith(
      SHARED_GAME_ID,
      USER_ID,
    );
  });

  it('updates only an owned comment', async () => {
    commentRepository.findOwnedComment.mockResolvedValue({ id: COMMENT_ID, userId: USER_ID });
    commentRepository.updateOwnedCommentRecord.mockResolvedValue({
      id: COMMENT_ID,
      content: 'Updated',
    });

    await expect(updateComment(USER_ID, COMMENT_ID, { content: ' Updated ' })).resolves.toEqual({
      id: COMMENT_ID,
      content: 'Updated',
    });

    expect(commentRepository.updateOwnedCommentRecord).toHaveBeenCalledWith(
      COMMENT_ID,
      USER_ID,
      'Updated',
    );
  });

  it('throws 404 when updating or deleting a missing owned comment', async () => {
    commentRepository.findOwnedComment.mockResolvedValue(null);
    await expect(updateComment(USER_ID, COMMENT_ID, { content: 'x' })).rejects.toMatchObject({
      status: 404,
      code: 'COMMENT_NOT_FOUND',
    });

    commentRepository.deleteOwnedCommentRecord.mockResolvedValue(false);
    await expect(deleteComment(USER_ID, COMMENT_ID)).rejects.toMatchObject({
      status: 404,
      code: 'COMMENT_NOT_FOUND',
    });
  });
});
