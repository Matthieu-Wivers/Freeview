const BAD_CATEGORIES = new Set(['inaccuracy', 'miss', 'mistake', 'blunder']);

export function getSharedReview(sharedGame) {
  return (
    sharedGame?.review ??
    sharedGame?.reviewPayload ??
    sharedGame?.review_payload ??
    sharedGame?.analysis ??
    null
  );
}

export function getSharedReviewSummary(sharedGame) {
  return (
    sharedGame?.analysisSummary ??
    sharedGame?.analysis_summary ??
    sharedGame?.summary ??
    getSharedReview(sharedGame)?.summary ??
    null
  );
}

export function hasSharedReview(sharedGame) {
  const review = getSharedReview(sharedGame);
  return Boolean(review?.moveReviews?.length);
}

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

export function getAverageAccuracy(review) {
  const white = Number(review?.accuracyWhite ?? 0);
  const black = Number(review?.accuracyBlack ?? 0);

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

export function getCriticalMoves(review, limit = 8) {
  return [...(review?.moveReviews ?? [])]
    .filter((move) => BAD_CATEGORIES.has(move.category))
    .sort((a, b) => Number(b.loss ?? 0) - Number(a.loss ?? 0))
    .slice(0, limit);
}

export function buildReviewTitle(game) {
  const white = game?.headers?.White ?? 'White';
  const black = game?.headers?.Black ?? 'Black';
  const result = game?.headers?.Result ? ` ${game.headers.Result}` : '';

  return `${white} vs ${black}${result} review`;
}

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
      playedSan: move.playedSan,
      bestSan: move.bestSan,
      category: move.category,
      label: move.label,
      loss: move.loss,
      comment: move.comment,
    })),
  };
}

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