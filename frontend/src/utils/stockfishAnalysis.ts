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
import { stockfish, type EngineResult } from '../engine/stockfish';

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
  if (!uci || uci.length < 4) return uci;

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

async function analyzePosition(fen: string, multiPv = 1): Promise<EngineResult> {
  const turn = createChessFromFen(fen).turn();

  return stockfish.analyze(fen, turn, {
    movetime: 120,
    multiPv,
    readyTimeoutMs: 10000,
    searchTimeoutMs: 3000,
  });
}

export async function analyzeGameWithStockfish(game: ParsedGame): Promise<GameReview> {
  const moveReviews: MoveReview[] = [];

  if (game.moves.length === 0) {
    return {
      moveReviews: [],
      accuracyWhite: 0,
      accuracyBlack: 0,
      averageLossWhite: 0,
      averageLossBlack: 0,
      evaluations: [0],
      finalEvaluation: 0,
    };
  }

  const positions: string[] = [
    game.moves[0].fenBefore,
    ...game.moves.map((move) => move.fenAfter),
  ];

  const analysisByFen = new Map<string, EngineResult>();

  for (const fen of positions) {
    if (analysisByFen.has(fen)) continue;
    const analysis = await analyzePosition(fen, 1);
    analysisByFen.set(fen, analysis);
  }

  const evaluations: number[] = [];
  const initialAnalysis = analysisByFen.get(game.moves[0].fenBefore);
  evaluations.push(initialAnalysis?.bestScoreWhite ?? 0);

  for (const move of game.moves) {
    const before = analysisByFen.get(move.fenBefore);
    const after = analysisByFen.get(move.fenAfter);

    if (!before || !after) {
      throw new Error('Analyse Stockfish incomplète pour une ou plusieurs positions.');
    }

    const turnBefore = createChessFromFen(move.fenBefore).turn();
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
      scoreBefore: before.bestScoreWhite,
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
  const before = await stockfish.analyze(fenBefore, turnBefore, {
    movetime: 150,
    multiPv: 1,
    readyTimeoutMs: 10000,
    searchTimeoutMs: 3500,
  });

  const turnAfter = createChessFromFen(fenAfter).turn();
  const after = await stockfish.analyze(fenAfter, turnAfter, {
    movetime: 150,
    multiPv: 1,
    readyTimeoutMs: 10000,
    searchTimeoutMs: 3500,
  });

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