import { assertUuid, createHttpError } from '../utils/httpError.utils.js';
import { findCommentableSharedGame } from '../repositories/sharedGame.repository.js';
import { getSharedGameLikeStats, likeSharedGameRecord, unlikeSharedGameRecord } from '../repositories/like.repository.js';

async function assertLikeableSharedGame(sharedGameId) {
  const sharedGame = await findCommentableSharedGame(sharedGameId);

  if (!sharedGame) {
    throw createHttpError(404, 'SHARED_GAME_NOT_FOUND', 'Publication introuvable ou non accessible.');
  }
}

export async function likeSharedGame(userId, sharedGameId) {
  const id = assertUuid(sharedGameId, 'sharedGameId');
  await assertLikeableSharedGame(id);
  await likeSharedGameRecord(id, userId);
  return getSharedGameLikeStats(id, userId);
}

export async function unlikeSharedGame(userId, sharedGameId) {
  const id = assertUuid(sharedGameId, 'sharedGameId');
  await assertLikeableSharedGame(id);
  await unlikeSharedGameRecord(id, userId);
  return getSharedGameLikeStats(id, userId);
}

export async function getLikesForSharedGame(sharedGameId, viewer) {
  const id = assertUuid(sharedGameId, 'sharedGameId');
  await assertLikeableSharedGame(id);
  return getSharedGameLikeStats(id, viewer?.id ?? null);
}
