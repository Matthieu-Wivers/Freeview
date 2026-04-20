import type {
  CandidateMove,
  GameReview,
  MoveReview,
  ParsedGame,
  SandboxFeedback,
} from '../types/chess';
import { CATEGORY_ACCURACY, CATEGORY_COMMENTS, CATEGORY_LABELS } from './constants';
import { average, clamp } from './format';
import { createChessFromFen } from './chess';
import { stockfish } from '../engine/stockfish';

function classifyMove(loss: number, ply: number) {
  if (ply <= 10 && loss <= 0.12) return 'theory' as const;
  if (loss <= 0.08) return 'best' as const;
  if (loss <= 0.28) return 'excellent' as const;
  if (loss <= 0.65) return 'good' as const;
  if (loss <= 1.2) return 'inaccuracy' as const;
  if (loss <= 2.2) return 'mistake' as const;
  return 'blunder' as const;
}

function uciToSan(fen: string, uci: string): string {
  const chess = createChessFromFen(fen);
  const move = chess.move({
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: (uci[4] as 'q' | 'r' | 'b' | 'n' | undefined) ?? undefined,
  });
  return move?.san ?? uci;
}

function buildSuggestions(
  fen: string,
  lines: Array<{ uci: string; scoreWhite: number }>,
): CandidateMove[] {
  return lines.slice(0, 3).map((line) => ({
    uci: line.uci,
    san: uciToSan(fen, line.uci),
    from: line.uci.slice(0, 2),
    to: line.uci.slice(2, 4),
    scoreWhite: line.scoreWhite,
  }));
}

export async function analyzeGameWithStockfish(game: ParsedGame): Promise<GameReview> {
  const moveReviews: MoveReview[] = [];
  const evaluations: number[] = [0];

  for (const move of game.moves) {
    const turnBefore = createChessFromFen(move.fenBefore).turn();
    const turnAfter = createChessFromFen(move.fenAfter).turn();

    const before = await stockfish.analyze(move.fenBefore, turnBefore, 12, 3);
    const after = await stockfish.analyze(move.fenAfter, turnAfter, 12, 1);

    const bestSan = uciToSan(move.fenBefore, before.bestUci);
    const loss =
      turnBefore === 'w'
        ? before.bestScoreWhite - after.bestScoreWhite
        : after.bestScoreWhite - before.bestScoreWhite;

    const category = classifyMove(Math.max(loss, 0), move.ply);

    moveReviews.push({
      ply: move.ply,
      playedSan: move.san,
      playedUci: move.uci,
      bestSan,
      bestUci: before.bestUci,
      scoreBefore: evaluations[evaluations.length - 1] ?? 0,
      scoreAfter: after.bestScoreWhite,
      bestScoreWhite: before.bestScoreWhite,
      actualScoreWhite: after.bestScoreWhite,
      loss: Number(Math.max(loss, 0).toFixed(2)),
      category,
      label: CATEGORY_LABELS[category],
      comment: CATEGORY_COMMENTS[category],
      accuracy: CATEGORY_ACCURACY[category],
      suggestions: buildSuggestions(move.fenBefore, before.lines),
    });

    evaluations.push(after.bestScoreWhite);
  }

  const whiteAccuracies = moveReviews.filter((_, i) => i % 2 === 0).map((r) => r.accuracy);
  const blackAccuracies = moveReviews.filter((_, i) => i % 2 === 1).map((r) => r.accuracy);
  const whiteLosses = moveReviews.filter((_, i) => i % 2 === 0).map((r) => r.loss);
  const blackLosses = moveReviews.filter((_, i) => i % 2 === 1).map((r) => r.loss);

  return {
    moveReviews,
    accuracyWhite: average(whiteAccuracies),
    accuracyBlack: average(blackAccuracies),
    averageLossWhite: average(whiteLosses),
    averageLossBlack: average(blackLosses),
    evaluations,
    finalEvaluation: evaluations[evaluations.length - 1] ?? 0,
  };
}

export async function analyzeSandboxMoveWithStockfish(
  fenBefore: string,
  fenAfter: string,
  uci: string,
  san: string,
): Promise<SandboxFeedback> {
  const turnBefore = createChessFromFen(fenBefore).turn();
  const turnAfter = createChessFromFen(fenAfter).turn();

  const before = await stockfish.analyze(fenBefore, turnBefore, 12, 3);
  const after = await stockfish.analyze(fenAfter, turnAfter, 12, 1);

  const loss =
    turnBefore === 'w'
      ? before.bestScoreWhite - after.bestScoreWhite
      : after.bestScoreWhite - before.bestScoreWhite;

  const category = classifyMove(Math.max(loss, 0), 99);

  return {
    san,
    uci,
    bestSan: uciToSan(fenBefore, before.bestUci),
    bestUci: before.bestUci,
    loss: Number(Math.max(loss, 0).toFixed(2)),
    category,
    comment: CATEGORY_COMMENTS[category],
    accuracy: clamp(CATEGORY_ACCURACY[category], 0, 100),
  };
}