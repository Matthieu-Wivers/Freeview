import { assertUuid, createHttpError } from '../utils/httpError.utils.js';
import { cleanString } from '../utils/request.utils.js';
import { findCommentableSharedGame } from '../repositories/sharedGame.repository.js';
import {
  createCommentRecord,
  deleteOwnedCommentRecord,
  findOwnedComment,
  listVisibleCommentsBySharedGameId,
  updateOwnedCommentRecord,
} from '../repositories/comment.repository.js';

function normalizeCommentContent(payload = {}) {
  const content = cleanString(payload.content, { maxLength: 1000 });

  if (content.length < 1) {
    throw createHttpError(400, 'EMPTY_COMMENT', 'Le commentaire ne peut pas être vide.');
  }

  return content;
}

async function assertSharedGameAllowsComments(sharedGameId) {
  const sharedGame = await findCommentableSharedGame(sharedGameId);

  if (!sharedGame) {
    throw createHttpError(404, 'SHARED_GAME_NOT_FOUND', 'Publication introuvable ou non commentable.');
  }
}

export async function createComment(userId, sharedGameId, payload) {
  const id = assertUuid(sharedGameId, 'sharedGameId');
  await assertSharedGameAllowsComments(id);

  const content = normalizeCommentContent(payload);
  return createCommentRecord({ sharedGameId: id, userId, content });
}

export async function listComments(sharedGameId, viewer) {
  const id = assertUuid(sharedGameId, 'sharedGameId');
  await assertSharedGameAllowsComments(id);

  return listVisibleCommentsBySharedGameId(id, viewer?.id ?? null);
}

export async function updateComment(userId, commentId, payload) {
  const id = assertUuid(commentId, 'commentId');
  const existing = await findOwnedComment(id, userId);

  if (!existing) {
    throw createHttpError(404, 'COMMENT_NOT_FOUND', 'Commentaire introuvable.');
  }

  const content = normalizeCommentContent(payload);
  return updateOwnedCommentRecord(id, userId, content);
}

export async function deleteComment(userId, commentId) {
  const id = assertUuid(commentId, 'commentId');
  const deleted = await deleteOwnedCommentRecord(id, userId);

  if (!deleted) {
    throw createHttpError(404, 'COMMENT_NOT_FOUND', 'Commentaire introuvable.');
  }
}
