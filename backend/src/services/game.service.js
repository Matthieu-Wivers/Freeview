import { createHttpError, assertUuid } from '../utils/httpError.utils.js';
import { cleanNullableString, cleanString, parsePagination } from '../utils/request.utils.js';
import {
  createGameRecord,
  deleteOwnedGameRecord,
  findGameById,
  findOwnedGameById,
  listGamesByUserId,
  updateOwnedGameRecord,
} from '../repositories/game.repository.js';

const VALID_RESULTS = new Set(['1-0', '0-1', '1/2-1/2', '*']);
const VALID_SOURCES = new Set(['manual', 'pgn_import', 'chesscom', 'lichess']);

function extractPgnHeaders(pgn) {
  const headers = {};
  const regex = /\[([A-Za-z0-9_]+)\s+"([^"]*)"\]/g;
  let match;

  while ((match = regex.exec(pgn)) !== null) {
    headers[match[1].toLowerCase()] = match[2];
  }

  return headers;
}

function parsePgnDate(value) {
  const cleaned = String(value ?? '').trim();

  if (!cleaned || cleaned.includes('?')) {
    return null;
  }

  const isoLike = cleaned.replaceAll('.', '-');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoLike)) {
    return null;
  }

  return `${isoLike}T00:00:00.000Z`;
}

function extractResult(pgn, headers) {
  const headerResult = cleanNullableString(headers.result, { maxLength: 20 });

  if (headerResult && VALID_RESULTS.has(headerResult)) {
    return headerResult;
  }

  const match = pgn.match(/(?:^|\s)(1-0|0-1|1\/2-1\/2|\*)\s*$/);
  return match?.[1] ?? null;
}

function normalizePlayedAt(payload, headers) {
  if (!payload.playedAt) {
    return parsePgnDate(headers.date);
  }

  const parsed = new Date(payload.playedAt);
  if (Number.isNaN(parsed.getTime())) {
    throw createHttpError(400, 'INVALID_PLAYED_AT', 'Date de partie invalide.');
  }

  return parsed.toISOString();
}

function normalizeGamePayload(payload = {}, { partial = false } = {}) {
  const pgn = cleanString(payload.pgn, { maxLength: 50_000 });

  if (!partial || payload.pgn !== undefined) {
    if (pgn.length < 20) {
      throw createHttpError(400, 'INVALID_PGN', 'Le PGN doit contenir au moins 20 caractères.');
    }

    if (!pgn.includes('1.') && !pgn.includes('[Event')) {
      throw createHttpError(400, 'INVALID_PGN', 'Le contenu ne ressemble pas à une partie PGN valide.');
    }
  }

  const headers = extractPgnHeaders(pgn);
  const whitePlayer = cleanNullableString(payload.whitePlayer ?? headers.white, { maxLength: 120 });
  const blackPlayer = cleanNullableString(payload.blackPlayer ?? headers.black, { maxLength: 120 });
  const result = cleanNullableString(payload.result ?? extractResult(pgn, headers), { maxLength: 20 });
  const source = cleanString(payload.source ?? 'pgn_import', { maxLength: 20 });
  const playedAt = normalizePlayedAt(payload, headers);

  if (result && !VALID_RESULTS.has(result)) {
    throw createHttpError(400, 'INVALID_RESULT', 'Résultat de partie invalide.');
  }

  if (!VALID_SOURCES.has(source)) {
    throw createHttpError(400, 'INVALID_SOURCE', 'Source de partie invalide.');
  }

  return {
    pgn,
    whitePlayer,
    blackPlayer,
    result,
    playedAt,
    source,
  };
}

export async function importGame(userId, payload) {
  const normalized = normalizeGamePayload(payload);

  return createGameRecord({
    userId,
    ...normalized,
  });
}

export async function listMyGames(userId, query) {
  return listGamesByUserId(userId, parsePagination(query));
}

export async function getMyGame(userId, gameId) {
  const id = assertUuid(gameId, 'gameId');
  const game = await findOwnedGameById(id, userId);

  if (!game) {
    throw createHttpError(404, 'GAME_NOT_FOUND', 'Partie introuvable.');
  }

  return game;
}

export async function getGameForOwnerOrAdmin(user, gameId) {
  const id = assertUuid(gameId, 'gameId');
  const game = await findGameById(id);

  if (!game) {
    throw createHttpError(404, 'GAME_NOT_FOUND', 'Partie introuvable.');
  }

  if (game.userId !== user.id && user.role !== 'ADMIN') {
    throw createHttpError(403, 'GAME_FORBIDDEN', 'Tu ne peux pas consulter cette partie.');
  }

  return game;
}

export async function updateMyGame(userId, gameId, payload) {
  const id = assertUuid(gameId, 'gameId');
  const existing = await findOwnedGameById(id, userId);

  if (!existing) {
    throw createHttpError(404, 'GAME_NOT_FOUND', 'Partie introuvable.');
  }

  const normalized = normalizeGamePayload({
    pgn: payload.pgn ?? existing.pgn,
    whitePlayer: payload.whitePlayer ?? existing.whitePlayer,
    blackPlayer: payload.blackPlayer ?? existing.blackPlayer,
    result: payload.result ?? existing.result,
    playedAt: payload.playedAt ?? existing.playedAt,
    source: payload.source ?? existing.source,
  });

  return updateOwnedGameRecord(id, userId, normalized);
}

export async function deleteMyGame(userId, gameId) {
  const id = assertUuid(gameId, 'gameId');
  const deleted = await deleteOwnedGameRecord(id, userId);

  if (!deleted) {
    throw createHttpError(404, 'GAME_NOT_FOUND', 'Partie introuvable.');
  }
}