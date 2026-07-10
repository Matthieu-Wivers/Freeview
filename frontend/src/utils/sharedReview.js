/**
 * Pure domain helpers for sharing a Stockfish review.
 *
 * These functions contain no React state or network access, making the review
 * compatibility and summary rules independently unit-testable.
 */
const BAD_CATEGORIES = new Set(['inaccuracy', 'miss', 'mistake', 'blunder']);

/**
 * Reads the canonical review while supporting payload names used by older API versions.
 */
export function getSharedReview(sharedGame) {
  return (
    sharedGame?.review ??
    sharedGame?.reviewPayload ??
    sharedGame?.review_payload ??
    sharedGame?.analysis ??
    null
  );
}

/**
 * Resolves a precomputed summary and falls back to a summary embedded in the review.
 */
export function getSharedReviewSummary(sharedGame) {
  return (
    sharedGame?.analysisSummary ??
    sharedGame?.analysis_summary ??
    sharedGame?.summary ??
    getSharedReview(sharedGame)?.summary ??
    null
  );
}

/**
 * Detects meaningful review data instead of relying on object truthiness.
 */
export function hasSharedReview(sharedGame) {
  const review = getSharedReview(sharedGame);
  const summary = getSharedReviewSummary(sharedGame);

  return Boolean(
    review?.moveReviews?.length ||
    summary?.criticalMoves?.length ||
    summary?.averageAccuracy !== undefined ||
    summary?.accuracyWhite !== undefined ||
    summary?.accuracyBlack !== undefined ||
    review?.accuracyWhite !== undefined ||
    review?.accuracyBlack !== undefined,
  );
}

/**
 * Counts known and future move categories without mutating the source review.
 */
export function countReviewCategories(review) {
  const counts = {
    theory: 0,
    best: 0,
    excellent: 0,
    good: 0,
    inaccuracy: 0,
    miss: 0,
    mistake: 0,
    blunder: 0,
  };

  for (const move of review?.moveReviews ?? []) {
    const category = move.category ?? 'good';
    counts[category] = (counts[category] ?? 0) + 1;
  }

  return counts;
}

/**
 * Computes an average from available player values and tolerates partial analyses.
 */
export function getAverageAccuracy(review) {
  const white = Number(review?.accuracyWhite ?? review?.whiteAccuracy);
  const black = Number(review?.accuracyBlack ?? review?.blackAccuracy);

  if (!Number.isFinite(white) && !Number.isFinite(black)) {
    return 0;
  }

  if (!Number.isFinite(white)) {
    return black;
  }

  if (!Number.isFinite(black)) {
    return white;
  }

  return (white + black) / 2;
}

/**
 * Returns the highest-loss problematic moves as a new, bounded array.
 */
export function getCriticalMoves(review, limit = 8) {
  return [...(review?.moveReviews ?? [])]
    .filter((move) => BAD_CATEGORIES.has(move.category))
    .sort((a, b) => Number(b.loss ?? 0) - Number(a.loss ?? 0))
    .slice(0, limit);
}

/**
 * Builds a deterministic default title from PGN headers.
 */
export function buildReviewTitle(game) {
  const white = game?.headers?.White ?? 'White';
  const black = game?.headers?.Black ?? 'Black';
  const result = game?.headers?.Result ? ` ${game.headers.Result}` : '';

  return `${white} vs ${black}${result} review`;
}

/**
 * Produces the compact JSONB summary displayed in community cards.
 * Only the fields required for listing are copied from the full review payload.
 */
export function buildReviewSummary(game, review) {
  const categoryCounts = countReviewCategories(review);
  const criticalMoves = getCriticalMoves(review, 5);

  return {
    white: game?.headers?.White ?? 'White',
    black: game?.headers?.Black ?? 'Black',
    result: game?.headers?.Result ?? '*',
    moveCount: game?.moves?.length ?? 0,
    accuracyWhite: Number(review?.accuracyWhite ?? 0),
    accuracyBlack: Number(review?.accuracyBlack ?? 0),
    averageAccuracy: getAverageAccuracy(review),
    averageLossWhite: Number(review?.averageLossWhite ?? 0),
    averageLossBlack: Number(review?.averageLossBlack ?? 0),
    finalEvaluation: Number(review?.finalEvaluation ?? 0),
    categoryCounts,
    criticalMoves: criticalMoves.map((move) => ({
      ply: move.ply,
      moveNumber: move.moveNumber ?? (move.ply ? Math.ceil(Number(move.ply) / 2) : null),
      playedSan: move.playedSan ?? move.san ?? move.move ?? null,
      san: move.san ?? move.playedSan ?? move.move ?? null,
      bestSan: move.bestSan ?? null,
      bestMove: move.bestMove ?? null,
      category: move.category,
      label: move.label,
      loss: move.loss,
      comment: move.comment,
    })),
  };
}

/**
 * Builds an editable default description for the share form.
 */
export function buildReviewDescription(game, review) {
  const summary = buildReviewSummary(game, review);
  const criticalCount =
    summary.categoryCounts.inaccuracy +
    summary.categoryCounts.miss +
    summary.categoryCounts.mistake +
    summary.categoryCounts.blunder;

  return [
    `${summary.white} vs ${summary.black} (${summary.result})`,
    `Average accuracy: ${Math.round(summary.averageAccuracy)}%`,
    `Critical moves found: ${criticalCount}`,
    '',
    'I shared this review to discuss the key moments, mistakes and best move suggestions.',
  ].join('\n');
}
