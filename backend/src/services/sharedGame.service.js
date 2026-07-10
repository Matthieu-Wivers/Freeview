/**
 * Shared-review business service.
 *
 * This layer owns validation, authorization and compatibility normalization.
 * It prevents controllers from containing business rules and prevents raw
 * request data from reaching SQL repositories.
 */
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

// Allowlists constrain values later used by visibility and ordering logic.
const VISIBILITIES = new Set(['public', 'private', 'unlisted']);
const SORTS = new Set(['latest', 'popular', 'commented']);

/**
 * Accepts API objects or serialized JSON, rejects arrays and caps the serialized
 * size before the value is persisted in PostgreSQL JSONB.
 */
function normalizeJsonObject(value, fieldName, { maxLength = 250_000 } = {}) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  let parsed = value;

  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw createHttpError(400, `INVALID_${fieldName.toUpperCase()}`, `${fieldName} must be valid JSON.`);
    }
  }

  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw createHttpError(400, `INVALID_${fieldName.toUpperCase()}`, `${fieldName} must be a JSON object.`);
  }

  // Measure the persisted representation, not the JavaScript object reference.
const serialized = JSON.stringify(parsed);

  if (serialized.length > maxLength) {
    throw createHttpError(
      400,
      `INVALID_${fieldName.toUpperCase()}_SIZE`,
      `${fieldName} is too large.`,
    );
  }

  return parsed;
}

/**
 * Keeps review metadata internally consistent: no review means no review date,
 * while a newly supplied review receives a server-generated timestamp.
 */
function normalizeReviewedAt(payload, existing, review) {
  const rawValue = payload.reviewedAt ?? payload.reviewed_at ?? existing.reviewedAt ?? existing.reviewed_at;

  if (!review) {
    return null;
  }

  if (!rawValue) {
    return new Date().toISOString();
  }

  const reviewedAt = new Date(rawValue);

  if (Number.isNaN(reviewedAt.getTime())) {
    throw createHttpError(400, 'INVALID_REVIEWED_AT', 'reviewedAt must be a valid date.');
  }

  return reviewedAt.toISOString();
}

/**
 * Produces the only payload shape accepted by the repository.
 * Legacy snake_case aliases are supported at this boundary and not propagated
 * into the service's internal naming convention.
 */
function normalizeSharedGamePayload(payload = {}, existing = {}) {
  const title = cleanString(payload.title ?? existing.title, { maxLength: 120 });
  const description = cleanNullableString(payload.description ?? existing.description, { maxLength: 4000 });
  const visibility = cleanString(payload.visibility ?? existing.visibility ?? 'public', { maxLength: 20 });

  if (title.length < 3) {
    throw createHttpError(400, 'INVALID_TITLE', 'Title must contain between 3 and 120 characters.');
  }

  if (!VISIBILITIES.has(visibility)) {
    throw createHttpError(400, 'INVALID_VISIBILITY', 'Invalid visibility.');
  }

  const review = normalizeJsonObject(
    payload.review ??
      payload.reviewPayload ??
      payload.review_payload ??
      payload.analysis ??
      existing.review,
    'review',
  );

  const analysisSummary = normalizeJsonObject(
    payload.analysisSummary ??
      payload.analysis_summary ??
      payload.summary ??
      existing.analysisSummary ??
      existing.analysis_summary,
    'analysisSummary',
    { maxLength: 50_000 },
  );

  const reviewedAt = normalizeReviewedAt(payload, existing, review);

  return {
    title,
    description,
    visibility,
    review,
    analysisSummary,
    reviewedAt,
  };
}

// Dynamic SQL ordering is safe only because the value is reduced to this allowlist.
function normalizeSort(value) {
  const sort = cleanString(value ?? 'latest', { maxLength: 30 });
  return SORTS.has(sort) ? sort : 'latest';
}

/**
 * Creates a publication only when the referenced game belongs to the caller.
 */
export async function createSharedGame(userId, payload) {
  const gameId = assertUuid(payload.gameId ?? payload.game_id, 'gameId');
  const game = await findOwnedGameById(gameId, userId);

  // A single 404 avoids leaking whether a game exists but belongs to another user.
if (!game) {
    throw createHttpError(404, 'GAME_NOT_FOUND', 'Game not found or not allowed.');
  }

  const normalized = normalizeSharedGamePayload(payload);

  return createSharedGameRecord({
    gameId,
    userId,
    ...normalized,
  });
}

/**
 * Sanitizes pagination, search and sort criteria before querying public content.
 */
export async function listCommunitySharedGames(query, viewer) {
  const pagination = parsePagination(query);
  const search = cleanString(query.search ?? query.q ?? '', { maxLength: 120 });
  const sort = normalizeSort(query.sort);

  return listPublicSharedGames({
    ...pagination,
    search,
    sort,
    viewerId: viewer?.id ?? null,
  });
}

export async function listMySharedGames(userId, query) {
  const pagination = parsePagination(query);
  const sort = normalizeSort(query.sort);

  return listSharedGamesByUserId(userId, {
    ...pagination,
    sort,
  });
}

/**
 * Delegates visibility and moderation filtering to a viewer-aware repository query.
 */
export async function getSharedGame(sharedGameId, viewer) {
  const id = assertUuid(sharedGameId, 'sharedGameId');
  const sharedGame = await findSharedGameForViewer(id, {
    viewerId: viewer?.id ?? null,
    viewerRole: viewer?.role ?? null,
  });

  if (!sharedGame) {
    throw createHttpError(404, 'SHARED_GAME_NOT_FOUND', 'Shared review not found.');
  }

  return sharedGame;
}

/**
 * Enforces ownership before replacing the normalized publication fields.
 */
export async function updateSharedGame(userId, sharedGameId, payload) {
  const id = assertUuid(sharedGameId, 'sharedGameId');
  const existing = await findSharedGameForViewer(id, {
    viewerId: userId,
    viewerRole: 'USER',
  });

  if (!existing || existing.userId !== userId) {
    throw createHttpError(404, 'SHARED_GAME_NOT_FOUND', 'Shared review not found.');
  }

  const normalized = normalizeSharedGamePayload(payload, existing);

  return updateOwnedSharedGameRecord(id, userId, normalized);
}

/**
 * Requests a soft delete so moderation and audit relationships remain intact.
 */
export async function deleteSharedGame(userId, sharedGameId) {
  const id = assertUuid(sharedGameId, 'sharedGameId');
  const deleted = await deleteOwnedSharedGameRecord(id, userId);

  if (!deleted) {
    throw createHttpError(404, 'SHARED_GAME_NOT_FOUND', 'Shared review not found.');
  }
}
