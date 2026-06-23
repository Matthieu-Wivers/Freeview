import { assertUuid, createHttpError } from '../utils/httpError.utils.js';
import { cleanNullableString, cleanString, parsePagination } from '../utils/request.utils.js';
import { findCommentForViewer } from '../repositories/comment.repository.js';
import { findSharedGameForViewer } from '../repositories/sharedGame.repository.js';
import {
  createCommentReportRecord,
  createSharedGameReportRecord,
  findReportById,
  listReportsForAdmin,
  updateReportStatusRecord,
} from '../repositories/report.repository.js';

const TARGET_TYPES = new Set(['shared_game', 'comment']);
const REPORT_STATUSES = new Set(['open', 'reviewed', 'rejected', 'action_taken']);

function normalizeReportPayload(payload = {}) {
  const targetType = cleanString(payload.targetType ?? payload.target_type, { maxLength: 40 });
  const reason = cleanString(payload.reason, { maxLength: 120 });
  const details = cleanNullableString(payload.details, { maxLength: 1000 });

  if (!TARGET_TYPES.has(targetType)) {
    throw createHttpError(400, 'INVALID_TARGET_TYPE', 'Type de cible invalide.');
  }

  if (reason.length < 3) {
    throw createHttpError(400, 'INVALID_REASON', 'La raison du signalement doit contenir au moins 3 caractères.');
  }

  return { targetType, reason, details };
}

export async function createReport(userId, payload) {
  const normalized = normalizeReportPayload(payload);

  if (normalized.targetType === 'shared_game') {
    const sharedGameId = assertUuid(payload.sharedGameId ?? payload.shared_game_id ?? payload.targetId, 'sharedGameId');
    const sharedGame = await findSharedGameForViewer(sharedGameId, { viewerId: userId, viewerRole: 'USER' });

    if (!sharedGame) {
      throw createHttpError(404, 'SHARED_GAME_NOT_FOUND', 'Publication introuvable.');
    }

    return createSharedGameReportRecord({
      reporterId: userId,
      sharedGameId,
      reason: normalized.reason,
      details: normalized.details,
    });
  }

  const commentId = assertUuid(payload.commentId ?? payload.comment_id ?? payload.targetId, 'commentId');
  const comment = await findCommentForViewer(commentId, userId);

  if (!comment || comment.moderationStatus !== 'visible') {
    throw createHttpError(404, 'COMMENT_NOT_FOUND', 'Commentaire introuvable.');
  }

  return createCommentReportRecord({
    reporterId: userId,
    commentId,
    reason: normalized.reason,
    details: normalized.details,
  });
}

export async function listAdminReports(query) {
  const pagination = parsePagination(query);
  const status = cleanString(query.status ?? '', { maxLength: 30 });

  if (status && !REPORT_STATUSES.has(status)) {
    throw createHttpError(400, 'INVALID_REPORT_STATUS', 'Statut de signalement invalide.');
  }

  return listReportsForAdmin({ ...pagination, status });
}

export async function updateAdminReport(adminId, reportId, payload) {
  const id = assertUuid(reportId, 'reportId');
  const status = cleanString(payload.status, { maxLength: 30 });

  if (!REPORT_STATUSES.has(status) || status === 'open') {
    throw createHttpError(400, 'INVALID_REPORT_STATUS', 'Nouveau statut de signalement invalide.');
  }

  const existing = await findReportById(id);

  if (!existing) {
    throw createHttpError(404, 'REPORT_NOT_FOUND', 'Signalement introuvable.');
  }

  return updateReportStatusRecord(id, { status, reviewedBy: adminId });
}
