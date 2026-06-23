import { assertUuid, createHttpError } from '../utils/httpError.utils.js';
import { cleanNullableString, cleanString, parsePagination } from '../utils/request.utils.js';
import { findReportById } from '../repositories/report.repository.js';
import {
  findModerationComment,
  findModerationSharedGame,
  listModerationActions,
  moderateCommentRecord,
  moderateSharedGameRecord,
} from '../repositories/moderation.repository.js';

const MODERATION_STATUSES = new Set(['visible', 'hidden', 'pending_review', 'deleted']);

function actionFromStatus(status) {
  if (status === 'visible') {
    return 'restore';
  }

  if (status === 'hidden') {
    return 'hide';
  }

  if (status === 'pending_review') {
    return 'mark_pending_review';
  }

  return 'delete';
}

async function normalizeModerationPayload(payload = {}) {
  const moderationStatus = cleanString(
    payload.moderationStatus ?? payload.moderation_status ?? payload.status,
    { maxLength: 30 },
  );

  if (!MODERATION_STATUSES.has(moderationStatus)) {
    throw createHttpError(400, 'INVALID_MODERATION_STATUS', 'Statut de modération invalide.');
  }

  const reason = cleanNullableString(payload.reason, { maxLength: 1000 });
  const reportId = payload.reportId ?? payload.report_id
    ? assertUuid(payload.reportId ?? payload.report_id, 'reportId')
    : null;

  let reportStatus = null;

  if (reportId) {
    const report = await findReportById(reportId);

    if (!report) {
      throw createHttpError(404, 'REPORT_NOT_FOUND', 'Signalement introuvable.');
    }

    reportStatus = moderationStatus === 'visible' ? 'reviewed' : 'action_taken';
  }

  return {
    moderationStatus,
    reason,
    reportId,
    reportStatus,
    action: actionFromStatus(moderationStatus),
  };
}

export async function moderateSharedGame(adminId, sharedGameId, payload) {
  const id = assertUuid(sharedGameId, 'sharedGameId');
  const target = await findModerationSharedGame(id);

  if (!target) {
    throw createHttpError(404, 'SHARED_GAME_NOT_FOUND', 'Publication introuvable.');
  }

  const normalized = await normalizeModerationPayload(payload);

  const moderated = await moderateSharedGameRecord({
    sharedGameId: id,
    adminId,
    reportId: normalized.reportId,
    action: normalized.action,
    previousStatus: target.moderationStatus,
    newStatus: normalized.moderationStatus,
    reason: normalized.reason,
    reportStatus: normalized.reportStatus,
  });

  return {
    id: moderated.id,
    moderationStatus: moderated.moderation_status,
    deletedAt: moderated.deleted_at,
  };
}

export async function moderateComment(adminId, commentId, payload) {
  const id = assertUuid(commentId, 'commentId');
  const target = await findModerationComment(id);

  if (!target) {
    throw createHttpError(404, 'COMMENT_NOT_FOUND', 'Commentaire introuvable.');
  }

  const normalized = await normalizeModerationPayload(payload);

  const moderated = await moderateCommentRecord({
    commentId: id,
    adminId,
    reportId: normalized.reportId,
    action: normalized.action,
    previousStatus: target.moderationStatus,
    newStatus: normalized.moderationStatus,
    reason: normalized.reason,
    reportStatus: normalized.reportStatus,
  });

  return {
    id: moderated.id,
    moderationStatus: moderated.moderation_status,
    deletedAt: moderated.deleted_at,
  };
}

export async function getModerationActions(query) {
  return listModerationActions(parsePagination(query));
}
