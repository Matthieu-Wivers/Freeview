import { beforeEach, describe, expect, it, vi } from 'vitest';

const reportRepository = vi.hoisted(() => ({
  findReportById: vi.fn(),
}));

const moderationRepository = vi.hoisted(() => ({
  findModerationComment: vi.fn(),
  findModerationSharedGame: vi.fn(),
  listModerationActions: vi.fn(),
  moderateCommentRecord: vi.fn(),
  moderateSharedGameRecord: vi.fn(),
}));

vi.mock('../../repositories/report.repository.js', () => reportRepository);
vi.mock('../../repositories/moderation.repository.js', () => moderationRepository);

import {
  getModerationActions,
  moderateComment,
  moderateSharedGame,
} from '../../services/moderation.service.js';

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const SHARED_GAME_ID = '22222222-2222-4222-8222-222222222222';
const COMMENT_ID = '33333333-3333-4333-8333-333333333333';
const REPORT_ID = '44444444-4444-4444-8444-444444444444';

describe('moderation.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('moderates a shared game and maps visible status to restore action', async () => {
    moderationRepository.findModerationSharedGame.mockResolvedValue({
      id: SHARED_GAME_ID,
      moderationStatus: 'hidden',
    });
    moderationRepository.moderateSharedGameRecord.mockResolvedValue({
      id: SHARED_GAME_ID,
      moderation_status: 'visible',
      deleted_at: null,
    });

    await expect(moderateSharedGame(ADMIN_ID, SHARED_GAME_ID, {
      status: 'visible',
      reason: 'Restored after review',
    })).resolves.toEqual({
      id: SHARED_GAME_ID,
      moderationStatus: 'visible',
      deletedAt: null,
    });

    expect(moderationRepository.moderateSharedGameRecord).toHaveBeenCalledWith({
      sharedGameId: SHARED_GAME_ID,
      adminId: ADMIN_ID,
      reportId: null,
      action: 'restore',
      previousStatus: 'hidden',
      newStatus: 'visible',
      reason: 'Restored after review',
      reportStatus: null,
    });
  });

  it.each([
    ['hidden', 'hide', 'action_taken'],
    ['pending_review', 'mark_pending_review', 'action_taken'],
    ['deleted', 'delete', 'action_taken'],
    ['visible', 'restore', 'reviewed'],
  ])('moderates a comment with %s status and linked report', async (status, action, reportStatus) => {
    reportRepository.findReportById.mockResolvedValue({ id: REPORT_ID });
    moderationRepository.findModerationComment.mockResolvedValue({
      id: COMMENT_ID,
      moderationStatus: 'visible',
    });
    moderationRepository.moderateCommentRecord.mockResolvedValue({
      id: COMMENT_ID,
      moderation_status: status,
      deleted_at: status === 'deleted' ? '2026-07-09T10:00:00.000Z' : null,
    });

    await moderateComment(ADMIN_ID, COMMENT_ID, {
      moderation_status: status,
      report_id: REPORT_ID,
      reason: 'Moderation reason',
    });

    expect(moderationRepository.moderateCommentRecord).toHaveBeenCalledWith({
      commentId: COMMENT_ID,
      adminId: ADMIN_ID,
      reportId: REPORT_ID,
      action,
      previousStatus: 'visible',
      newStatus: status,
      reason: 'Moderation reason',
      reportStatus,
    });
  });

  it('throws 404 when the shared game moderation target is missing', async () => {
    moderationRepository.findModerationSharedGame.mockResolvedValue(null);

    await expect(moderateSharedGame(ADMIN_ID, SHARED_GAME_ID, { status: 'hidden' })).rejects.toMatchObject({
      status: 404,
      code: 'SHARED_GAME_NOT_FOUND',
    });
  });

  it('throws 404 when the comment moderation target is missing', async () => {
    moderationRepository.findModerationComment.mockResolvedValue(null);

    await expect(moderateComment(ADMIN_ID, COMMENT_ID, { status: 'hidden' })).rejects.toMatchObject({
      status: 404,
      code: 'COMMENT_NOT_FOUND',
    });
  });

  it('rejects invalid moderation statuses before writing', async () => {
    moderationRepository.findModerationSharedGame.mockResolvedValue({
      id: SHARED_GAME_ID,
      moderationStatus: 'visible',
    });

    await expect(moderateSharedGame(ADMIN_ID, SHARED_GAME_ID, { status: 'archived' })).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_MODERATION_STATUS',
    });

    expect(moderationRepository.moderateSharedGameRecord).not.toHaveBeenCalled();
  });

  it('throws 404 when a linked report does not exist', async () => {
    reportRepository.findReportById.mockResolvedValue(null);
    moderationRepository.findModerationComment.mockResolvedValue({
      id: COMMENT_ID,
      moderationStatus: 'visible',
    });

    await expect(moderateComment(ADMIN_ID, COMMENT_ID, {
      status: 'hidden',
      reportId: REPORT_ID,
    })).rejects.toMatchObject({
      status: 404,
      code: 'REPORT_NOT_FOUND',
    });
  });

  it('lists moderation actions with sanitized pagination', async () => {
    const rows = [{ id: 'action-1' }];
    moderationRepository.listModerationActions.mockResolvedValue(rows);

    await expect(getModerationActions({ limit: '30', offset: '-3' })).resolves.toBe(rows);

    expect(moderationRepository.listModerationActions).toHaveBeenCalledWith({
      limit: 30,
      offset: 0,
    });
  });
});
