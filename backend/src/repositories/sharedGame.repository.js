/**
 * PostgreSQL repository for shared reviews.
 *
 * The repository contains SQL and row mapping only. Validation and authorization
 * intent originate in the service layer, while SQL still applies defense-in-depth
 * ownership, visibility, moderation and soft-delete predicates.
 */
import { pool } from '../db/pool.js';

/**
 * Normalizes pg JSONB output and tolerates serialized values from test doubles.
 * Invalid stored JSON is represented as null rather than crashing list endpoints.
 */
function parseJsonColumn(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  return null;
}

// Explicit serialization makes the values compatible with the ::jsonb parameters.
function stringifyJson(value) {
  if (!value) {
    return null;
  }

  return JSON.stringify(value);
}

/**
 * Maps database naming to the API model.
 * Temporary camelCase and snake_case aliases preserve compatibility with existing
 * frontend consumers while the application converges on one naming convention.
 */
function toSharedGame(row) {
  if (!row) {
    return null;
  }

  const review = parseJsonColumn(row.review);
  const analysisSummary = parseJsonColumn(row.analysis_summary);

  return {
    id: row.id,
    gameId: row.game_id,
    game_id: row.game_id,
    userId: row.user_id,
    user_id: row.user_id,
    username: row.username ?? null,
    title: row.title,
    description: row.description,
    visibility: row.visibility,
    moderationStatus: row.moderation_status,
    moderation_status: row.moderation_status,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
    deletedAt: row.deleted_at,
    deleted_at: row.deleted_at,
    reviewedAt: row.reviewed_at,
    reviewed_at: row.reviewed_at,
    review,
    reviewPayload: review,
    review_payload: review,
    analysis: review,
    analysisSummary,
    analysis_summary: analysisSummary,
    summary: analysisSummary,
    whitePlayer: row.white_player ?? null,
    white_player: row.white_player ?? null,
    blackPlayer: row.black_player ?? null,
    black_player: row.black_player ?? null,
    result: row.result ?? null,
    playedAt: row.played_at ?? null,
    played_at: row.played_at ?? null,
    pgn: row.pgn ?? undefined,
    likeCount: Number(row.like_count ?? 0),
    like_count: Number(row.like_count ?? 0),
    likesCount: Number(row.like_count ?? 0),
    likes_count: Number(row.like_count ?? 0),
    commentCount: Number(row.comment_count ?? 0),
    comment_count: Number(row.comment_count ?? 0),
    commentsCount: Number(row.comment_count ?? 0),
    comments_count: Number(row.comment_count ?? 0),
    likedByMe: Boolean(row.liked_by_me),
    liked_by_me: Boolean(row.liked_by_me),
  };
}

/**
 * Returns one of three static ORDER BY fragments.
 * The service allowlists sort values; no arbitrary user input is interpolated.
 */
function getOrderSql(sort) {
  if (sort === 'popular') {
    return 'like_count DESC, comment_count DESC, sg.created_at DESC';
  }

  if (sort === 'commented') {
    return 'comment_count DESC, like_count DESC, sg.created_at DESC';
  }

  return 'sg.created_at DESC';
}

/**
 * Inserts a normalized publication with parameterized values and returns the
 * viewer-aware representation used by the API.
 */
export async function createSharedGameRecord({
  gameId,
  userId,
  title,
  description,
  visibility,
  review,
  analysisSummary,
  reviewedAt,
}) {
  const queryResult = await pool.query(
    `
      INSERT INTO shared_games (
        game_id,
        user_id,
        title,
        description,
        visibility,
        review,
        analysis_summary,
        reviewed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)
      RETURNING id
    `,
    [
      gameId,
      userId,
      title,
      description,
      visibility,
      stringifyJson(review),
      stringifyJson(analysisSummary),
      reviewedAt ?? null,
    ],
  );

  return findSharedGameForViewer(queryResult.rows[0].id, {
    viewerId: userId,
    viewerRole: 'USER',
  });
}

/**
 * Lists only public, visible and non-deleted publications.
 * Search input is still passed as a SQL parameter; only the static sort fragment
 * is interpolated.
 */
export async function listPublicSharedGames({
  limit,
  offset,
  search,
  sort = 'latest',
  viewerId,
}) {
  const values = [limit, offset, viewerId ?? null];
  let searchSql = '';

  // Add the optional predicate and its matching parameter together to keep indexes aligned.
if (search) {
    values.push(`%${search}%`);
    searchSql = `
      AND (
        sg.title ILIKE $4
        OR sg.description ILIKE $4
        OR up.username ILIKE $4
        OR g.white_player ILIKE $4
        OR g.black_player ILIKE $4
      )
    `;
  }

  const queryResult = await pool.query(
    `
      SELECT
        sg.id,
        sg.game_id,
        sg.user_id,
        sg.title,
        sg.description,
        sg.visibility,
        sg.moderation_status,
        sg.created_at,
        sg.updated_at,
        sg.deleted_at,
        sg.review,
        sg.analysis_summary,
        sg.reviewed_at,
        up.username,
        g.pgn,
        g.white_player,
        g.black_player,
        g.result,
        g.played_at,
        COALESCE(likes.like_count, 0)::INTEGER AS like_count,
        COALESCE(comments.comment_count, 0)::INTEGER AS comment_count,
        EXISTS (
          SELECT 1
          FROM game_likes gl
          WHERE gl.shared_game_id = sg.id
            AND gl.user_id = $3
        ) AS liked_by_me
      FROM shared_games sg
      JOIN games g
        ON g.id = sg.game_id
        AND g.deleted_at IS NULL
      LEFT JOIN user_profiles up
        ON up.user_id = sg.user_id
      LEFT JOIN (
        SELECT shared_game_id, COUNT(*) AS like_count
        FROM game_likes
        GROUP BY shared_game_id
      ) likes
        ON likes.shared_game_id = sg.id
      LEFT JOIN (
        SELECT shared_game_id, COUNT(*) AS comment_count
        FROM comments
        WHERE moderation_status = 'visible'
          AND deleted_at IS NULL
        GROUP BY shared_game_id
      ) comments
        ON comments.shared_game_id = sg.id
      WHERE sg.visibility = 'public'
        AND sg.moderation_status = 'visible'
        AND sg.deleted_at IS NULL
        ${searchSql}
      ORDER BY ${getOrderSql(sort)}
      LIMIT $1
      OFFSET $2
    `,
    values,
  );

  return queryResult.rows.map(toSharedGame);
}

/**
 * Lists a user's own non-deleted publications, including private or moderated ones.
 */
export async function listSharedGamesByUserId(
  userId,
  { limit, offset, sort = 'latest' },
) {
  const queryResult = await pool.query(
    `
      SELECT
        sg.id,
        sg.game_id,
        sg.user_id,
        sg.title,
        sg.description,
        sg.visibility,
        sg.moderation_status,
        sg.created_at,
        sg.updated_at,
        sg.deleted_at,
        sg.review,
        sg.analysis_summary,
        sg.reviewed_at,
        up.username,
        g.pgn,
        g.white_player,
        g.black_player,
        g.result,
        g.played_at,
        COALESCE(likes.like_count, 0)::INTEGER AS like_count,
        COALESCE(comments.comment_count, 0)::INTEGER AS comment_count,
        EXISTS (
          SELECT 1
          FROM game_likes gl
          WHERE gl.shared_game_id = sg.id
            AND gl.user_id = $1
        ) AS liked_by_me
      FROM shared_games sg
      JOIN games g
        ON g.id = sg.game_id
        AND g.deleted_at IS NULL
      LEFT JOIN user_profiles up
        ON up.user_id = sg.user_id
      LEFT JOIN (
        SELECT shared_game_id, COUNT(*) AS like_count
        FROM game_likes
        GROUP BY shared_game_id
      ) likes
        ON likes.shared_game_id = sg.id
      LEFT JOIN (
        SELECT shared_game_id, COUNT(*) AS comment_count
        FROM comments
        WHERE moderation_status = 'visible'
          AND deleted_at IS NULL
        GROUP BY shared_game_id
      ) comments
        ON comments.shared_game_id = sg.id
      WHERE sg.user_id = $1
        AND sg.deleted_at IS NULL
      ORDER BY ${getOrderSql(sort)}
      LIMIT $2
      OFFSET $3
    `,
    [userId, limit, offset],
  );

  return queryResult.rows.map(toSharedGame);
}

/**
 * Applies row-level read rules in SQL:
 * - public and unlisted posts are readable when moderation permits;
 * - owners can inspect their own posts;
 * - administrators can inspect moderated content.
 */
export async function findSharedGameForViewer(
  sharedGameId,
  { viewerId = null, viewerRole = null } = {},
) {
  const queryResult = await pool.query(
    `
      SELECT
        sg.id,
        sg.game_id,
        sg.user_id,
        sg.title,
        sg.description,
        sg.visibility,
        sg.moderation_status,
        sg.created_at,
        sg.updated_at,
        sg.deleted_at,
        sg.review,
        sg.analysis_summary,
        sg.reviewed_at,
        up.username,
        g.pgn,
        g.white_player,
        g.black_player,
        g.result,
        g.played_at,
        COALESCE(likes.like_count, 0)::INTEGER AS like_count,
        COALESCE(comments.comment_count, 0)::INTEGER AS comment_count,
        EXISTS (
          SELECT 1
          FROM game_likes gl
          WHERE gl.shared_game_id = sg.id
            AND gl.user_id = $2
        ) AS liked_by_me
      FROM shared_games sg
      JOIN games g
        ON g.id = sg.game_id
        AND g.deleted_at IS NULL
      LEFT JOIN user_profiles up
        ON up.user_id = sg.user_id
      LEFT JOIN (
        SELECT shared_game_id, COUNT(*) AS like_count
        FROM game_likes
        GROUP BY shared_game_id
      ) likes
        ON likes.shared_game_id = sg.id
      LEFT JOIN (
        SELECT shared_game_id, COUNT(*) AS comment_count
        FROM comments
        WHERE moderation_status = 'visible'
          AND deleted_at IS NULL
        GROUP BY shared_game_id
      ) comments
        ON comments.shared_game_id = sg.id
      WHERE sg.id = $1
        AND sg.deleted_at IS NULL
        AND (
          sg.visibility = 'public'
          OR sg.visibility = 'unlisted'
          OR sg.user_id = $2
          OR $3 = 'ADMIN'
        )
        AND (
          sg.moderation_status = 'visible'
          OR sg.user_id = $2
          OR $3 = 'ADMIN'
        )
      LIMIT 1
    `,
    [sharedGameId, viewerId, viewerRole],
  );

  return toSharedGame(queryResult.rows[0]);
}

/**
 * Internal lookup that still excludes soft-deleted publications and games.
 */
export async function findSharedGameById(sharedGameId) {
  const queryResult = await pool.query(
    `
      SELECT
        sg.id,
        sg.game_id,
        sg.user_id,
        sg.title,
        sg.description,
        sg.visibility,
        sg.moderation_status,
        sg.created_at,
        sg.updated_at,
        sg.deleted_at,
        sg.review,
        sg.analysis_summary,
        sg.reviewed_at,
        g.pgn,
        g.white_player,
        g.black_player,
        g.result,
        g.played_at
      FROM shared_games sg
      JOIN games g
        ON g.id = sg.game_id
        AND g.deleted_at IS NULL
      WHERE sg.id = $1
        AND sg.deleted_at IS NULL
      LIMIT 1
    `,
    [sharedGameId],
  );

  return queryResult.rows[0] ?? null;
}

/**
 * Returns only visible public/unlisted targets, preventing comments on private,
 * moderated or deleted content.
 */
export async function findCommentableSharedGame(sharedGameId) {
  const queryResult = await pool.query(
    `
      SELECT
        sg.id,
        sg.game_id,
        sg.user_id,
        sg.title,
        sg.description,
        sg.visibility,
        sg.moderation_status,
        sg.created_at,
        sg.updated_at,
        sg.deleted_at,
        sg.review,
        sg.analysis_summary,
        sg.reviewed_at
      FROM shared_games sg
      JOIN games g
        ON g.id = sg.game_id
        AND g.deleted_at IS NULL
      WHERE sg.id = $1
        AND sg.deleted_at IS NULL
        AND sg.moderation_status = 'visible'
        AND sg.visibility IN ('public', 'unlisted')
      LIMIT 1
    `,
    [sharedGameId],
  );

  return queryResult.rows[0] ?? null;
}

/**
 * Performs the ownership check inside the UPDATE statement to avoid a
 * time-of-check/time-of-use gap between authorization and persistence.
 */
export async function updateOwnedSharedGameRecord(
  sharedGameId,
  userId,
  { title, description, visibility, review, analysisSummary, reviewedAt },
) {
  const queryResult = await pool.query(
    `
      UPDATE shared_games
      SET
        title = $3,
        description = $4,
        visibility = $5,
        review = $6::jsonb,
        analysis_summary = $7::jsonb,
        reviewed_at = $8,
        updated_at = now()
      WHERE id = $1
        AND user_id = $2
        AND deleted_at IS NULL
      RETURNING id
    `,
    [
      sharedGameId,
      userId,
      title,
      description,
      visibility,
      stringifyJson(review),
      stringifyJson(analysisSummary),
      reviewedAt ?? null,
    ],
  );

  if (queryResult.rowCount === 0) {
    return null;
  }

  return findSharedGameForViewer(sharedGameId, {
    viewerId: userId,
    viewerRole: 'USER',
  });
}

/**
 * Soft-deletes an owned publication while preserving reports and audit history.
 */
export async function deleteOwnedSharedGameRecord(sharedGameId, userId) {
  const queryResult = await pool.query(
    `
      UPDATE shared_games
      SET
        moderation_status = 'deleted',
        deleted_at = now(),
        updated_at = now()
      WHERE id = $1
        AND user_id = $2
        AND deleted_at IS NULL
      RETURNING id
    `,
    [sharedGameId, userId],
  );

  return queryResult.rowCount > 0;
}
