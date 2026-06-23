import { assertUuid, createHttpError } from '../utils/httpError.utils.js';
import { cleanNullableString, cleanString, parsePagination } from '../utils/request.utils.js';
import { findOwnedGameById } from '../repositories/game.repository.js';
import {
  createSharedGameRecord,
  deleteOwnedSharedGameRecord,
  findSharedGameForViewer,
  listPublicSharedGames,
  listSharedGamesByUserId,
  updateOwnedSharedGameRecord,
} from '../repositories/sharedGame.repository.js';

const VISIBILITIES = new Set(['public', 'private', 'unlisted']);

function normalizeSharedGamePayload(payload = {}, existing = {}) {
  const title = cleanString(payload.title ?? existing.title, { maxLength: 120 });
  const description = cleanNullableString(payload.description ?? existing.description, { maxLength: 2000 });
  const visibility = cleanString(payload.visibility ?? existing.visibility ?? 'public', { maxLength: 20 });

  if (title.length < 3) {
    throw createHttpError(400, 'INVALID_TITLE', 'Le titre doit contenir entre 3 et 120 caractères.');
  }

  if (!VISIBILITIES.has(visibility)) {
    throw createHttpError(400, 'INVALID_VISIBILITY', 'Visibilité invalide.');
  }

  return { title, description, visibility };
}

export async function createSharedGame(userId, payload) {
  const gameId = assertUuid(payload.gameId ?? payload.game_id, 'gameId');
  const game = await findOwnedGameById(gameId, userId);

  if (!game) {
    throw createHttpError(404, 'GAME_NOT_FOUND', 'Partie introuvable ou non autorisée.');
  }

  const normalized = normalizeSharedGamePayload(payload);
  return createSharedGameRecord({ gameId, userId, ...normalized });
}

export async function listCommunitySharedGames(query, viewer) {
  const pagination = parsePagination(query);
  const search = cleanString(query.search ?? query.q ?? '', { maxLength: 120 });

  return listPublicSharedGames({
    ...pagination,
    search,
    viewerId: viewer?.id ?? null,
  });
}

export async function listMySharedGames(userId, query) {
  return listSharedGamesByUserId(userId, parsePagination(query));
}

export async function getSharedGame(sharedGameId, viewer) {
  const id = assertUuid(sharedGameId, 'sharedGameId');
  const sharedGame = await findSharedGameForViewer(id, {
    viewerId: viewer?.id ?? null,
    viewerRole: viewer?.role ?? null,
  });

  if (!sharedGame) {
    throw createHttpError(404, 'SHARED_GAME_NOT_FOUND', 'Publication introuvable.');
  }

  return sharedGame;
}

export async function updateSharedGame(userId, sharedGameId, payload) {
  const id = assertUuid(sharedGameId, 'sharedGameId');
  const existing = await findSharedGameForViewer(id, { viewerId: userId, viewerRole: 'USER' });

  if (!existing || existing.userId !== userId) {
    throw createHttpError(404, 'SHARED_GAME_NOT_FOUND', 'Publication introuvable.');
  }

  const normalized = normalizeSharedGamePayload(payload, existing);
  return updateOwnedSharedGameRecord(id, userId, normalized);
}

export async function deleteSharedGame(userId, sharedGameId) {
  const id = assertUuid(sharedGameId, 'sharedGameId');
  const deleted = await deleteOwnedSharedGameRecord(id, userId);

  if (!deleted) {
    throw createHttpError(404, 'SHARED_GAME_NOT_FOUND', 'Publication introuvable.');
  }
}
