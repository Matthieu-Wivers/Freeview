import { beforeEach, describe, expect, it, vi } from 'vitest';

const commentRepository = vi.hoisted(() => ({
  findCommentForViewer: vi.fn(),
}));

const sharedGameRepository = vi.hoisted(() => ({
  findSharedGameForViewer: vi.fn(),
}));

const reportRepository = vi.hoisted(() => ({
  createCommentReportRecord: vi.fn(),
  createSharedGameReportRecord: vi.fn(),
  findReportById: vi.fn(),
  listReportsForAdmin: vi.fn(),
  updateReportStatusRecord: vi.fn(),
}));

vi.mock('../../repositories/comment.repository.js', () => commentRepository);
vi.mock('../../repositories/sharedGame.repository.js', () => sharedGameRepository);
vi.mock('../../repositories/report.repository.js', () => reportRepository);

import {
  createReport,
  listAdminReports,
  updateAdminReport,
} from '../../services/report.service.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_ID = '22222222-2222-4222-8222-222222222222';
const SHARED_GAME_ID = '33333333-3333-4333-8333-333333333333';
const COMMENT_ID = '44444444-4444-4444-8444-444444444444';
const REPORT_ID = '55555555-5555-4555-8555-555555555555';

describe('report.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a shared game report when the target is visible to the user', async () => {
    const report = { id: REPORT_ID };
    sharedGameRepository.findSharedGameForViewer.mockResolvedValue({ id: SHARED_GAME_ID });
    reportRepository.createSharedGameReportRecord.mockResolvedValue(report);

    await expect(createReport(USER_ID, {
      targetType: 'shared_game',
      sharedGameId: SHARED_GAME_ID,
      reason: 'Abusive title',
      details: 'Please review this shared game.',
    })).resolves.toBe(report);

    expect(reportRepository.createSharedGameReportRecord).toHaveBeenCalledWith({
      reporterId: USER_ID,
      sharedGameId: SHARED_GAME_ID,
      reason: 'Abusive title',
      details: 'Please review this shared game.',
    });
  });

  it('creates a comment report only for visible comments', async () => {
    const report = { id: REPORT_ID };
    commentRepository.findCommentForViewer.mockResolvedValue({ id: COMMENT_ID, moderationStatus: 'visible' });
    reportRepository.createCommentReportRecord.mockResolvedValue(report);

    await expect(createReport(USER_ID, {
      target_type: 'comment',
      targetId: COMMENT_ID,
      reason: 'Spam',
      details: 'Repeated message',
    })).resolves.toBe(report);

    expect(reportRepository.createCommentReportRecord).toHaveBeenCalledWith({
      reporterId: USER_ID,
      commentId: COMMENT_ID,
      reason: 'Spam',
      details: 'Repeated message',
    });
  });

  it('validates report payloads', async () => {
    await expect(createReport(USER_ID, { targetType: 'profile', reason: 'bad' })).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_TARGET_TYPE',
    });

    await expect(createReport(USER_ID, { targetType: 'shared_game', reason: 'no' })).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_REASON',
    });
  });

  it('throws 404 when the shared game target is unavailable', async () => {
    sharedGameRepository.findSharedGameForViewer.mockResolvedValue(null);

    await expect(createReport(USER_ID, {
      targetType: 'shared_game',
      sharedGameId: SHARED_GAME_ID,
      reason: 'Abusive title',
    })).rejects.toMatchObject({
      status: 404,
      code: 'SHARED_GAME_NOT_FOUND',
    });
  });

  it('throws 404 when the comment target is unavailable or hidden', async () => {
    commentRepository.findCommentForViewer.mockResolvedValue({ id: COMMENT_ID, moderationStatus: 'hidden' });

    await expect(createReport(USER_ID, {
      targetType: 'comment',
      commentId: COMMENT_ID,
      reason: 'Spam',
    })).rejects.toMatchObject({
      status: 404,
      code: 'COMMENT_NOT_FOUND',
    });
  });

  it('lists reports with pagination and optional status', async () => {
    const rows = [{ id: REPORT_ID }];
    reportRepository.listReportsForAdmin.mockResolvedValue(rows);

    await expect(listAdminReports({ limit: '20', offset: '5', status: 'open' })).resolves.toBe(rows);

    expect(reportRepository.listReportsForAdmin).toHaveBeenCalledWith({
      limit: 20,
      offset: 5,
      status: 'open',
    });
  });

  it('rejects invalid report status filters', async () => {
    await expect(listAdminReports({ status: 'archived' })).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_REPORT_STATUS',
    });
  });

  it('updates an admin report status after checking the report exists', async () => {
    const updated = { id: REPORT_ID, status: 'reviewed' };
    reportRepository.findReportById.mockResolvedValue({ id: REPORT_ID });
    reportRepository.updateReportStatusRecord.mockResolvedValue(updated);

    await expect(updateAdminReport(ADMIN_ID, REPORT_ID, { status: 'reviewed' })).resolves.toBe(updated);

    expect(reportRepository.updateReportStatusRecord).toHaveBeenCalledWith(REPORT_ID, {
      status: 'reviewed',
      reviewedBy: ADMIN_ID,
    });
  });

  it('rejects invalid admin report status transitions', async () => {
    await expect(updateAdminReport(ADMIN_ID, REPORT_ID, { status: 'open' })).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_REPORT_STATUS',
    });

    await expect(updateAdminReport(ADMIN_ID, REPORT_ID, { status: 'archived' })).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_REPORT_STATUS',
    });
  });

  it('throws 404 when updating an unknown report', async () => {
    reportRepository.findReportById.mockResolvedValue(null);

    await expect(updateAdminReport(ADMIN_ID, REPORT_ID, { status: 'reviewed' })).rejects.toMatchObject({
      status: 404,
      code: 'REPORT_NOT_FOUND',
    });
  });
});
