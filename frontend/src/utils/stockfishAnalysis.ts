import type {
  CandidateMove,
  GameReview,
  MoveReview,
  ParsedGame,
  ReviewCategory,
  SandboxFeedback,
} from '../types/chess';
import {
  CATEGORY_ACCURACY,
  CATEGORY_COMMENTS,
  CATEGORY_LABELS,
  PIECE_VALUES,
} from './constants';
import { average, clamp } from './format';
import { createChessFromFen } from './chess';
import { stockfish, type EngineResult } from '../engine/stockfish';

type Turn = 'w' | 'b';

function scoreForMover(scoreWhite: number, turn: Turn): number {
  return turn === 'w' ? scoreWhite : -scoreWhite;
}

function getMaterialBalanceWhite(fen: string): number {
  const chess = createChessFromFen(fen);
  const board = chess.board();

  let total = 0;

  for (const row of board) {
    for (const piece of row) {
      if (!piece) continue;
      const value = PIECE_VALUES[piece.type] ?? 0;
      total += piece.color === 'w' ? value : -value;
    }
  }

  return total;
}

function getMaterialForMover(fen: string, turn: Turn): number {
  const whiteBalance = getMaterialBalanceWhite(fen);
  return turn === 'w' ? whiteBalance : -whiteBalance;
}

function getBestGapForMover(
  lines: EngineResult['lines'],
  bestScoreWhite: number,
  turn: Turn,
): number {
  const sorted = [...lines].sort((a, b) => a.multipv - b.multipv);
  const bestScoreForMover = scoreForMover(sorted[0]?.scoreWhite ?? bestScoreWhite, turn);
  const second = sorted[1];

  if (!second) return 0;

  return bestScoreForMover - scoreForMover(second.scoreWhite, turn);
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

function classifyMove(args: {
  ply: number;
  loss: number;
  isExactBest: boolean;
  theoryStillOpen: boolean;
  moverMaterialBefore: number;
  moverMaterialAfter: number;
  bestGap: number;
  bestScoreForMover: number;
  actualScoreForMover: number;
}): ReviewCategory {
  const {
    ply,
    loss,
    isExactBest,
    theoryStillOpen,
    moverMaterialBefore,
    moverMaterialAfter,
    bestGap,
    bestScoreForMover,
    actualScoreForMover,
  } = args;

  const sacrificedMaterial = moverMaterialBefore - moverMaterialAfter;
  const hasRealSacrifice = sacrificedMaterial >= 1.75;
  const canStillBeTheory = theoryStillOpen && ply <= 12;

  if (canStillBeTheory && isExactBest && loss <= 0.03) {
    return 'theory';
  }

  const isBrilliantLike =
    !canStillBeTheory &&
    isExactBest &&
    loss <= 0.05 &&
    hasRealSacrifice &&
    bestGap >= 0.5 &&
    bestScoreForMover > -1.5 &&
    bestScoreForMover < 4.5;

  if (isBrilliantLike) {
    return 'best';
  }

  const missedWinningChance =
    !isExactBest &&
    bestScoreForMover >= 1.8 &&
    actualScoreForMover < 0.9 &&
    actualScoreForMover > -2.5 &&
    loss >= 0.9;

  if (missedWinningChance) {
    return 'miss';
  }

  if (isExactBest || loss <= 0.08) return 'excellent';
  if (loss <= 0.22) return 'good';
  if (loss <= 0.55) return 'inaccuracy';
  if (loss <= 1.5 || actualScoreForMover > -3) return 'mistake';
  return 'blunder';
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

  const beforePositionSet = new Set(game.moves.map((move) => move.fenBefore));
  const analysisByFen = new Map<string, EngineResult>();

  for (const fen of positions) {
    if (analysisByFen.has(fen)) continue;

    const multiPv = beforePositionSet.has(fen) ? 3 : 1;
    const analysis = await analyzePosition(fen, multiPv);
    analysisByFen.set(fen, analysis);
  }

  const evaluations: number[] = [];
  const initialAnalysis = analysisByFen.get(game.moves[0].fenBefore);
  evaluations.push(initialAnalysis?.bestScoreWhite ?? 0);

  let theoryStillOpen = true;

  for (const move of game.moves) {
    const before = analysisByFen.get(move.fenBefore);
    const after = analysisByFen.get(move.fenAfter);

    if (!before || !after) {
      throw new Error('Analyse Stockfish incomplète pour une ou plusieurs positions.');
    }

    const turnBefore = createChessFromFen(move.fenBefore).turn();
    const bestSan = uciToSan(move.fenBefore, before.bestUci);

    const rawLoss =
      turnBefore === 'w'
        ? before.bestScoreWhite - after.bestScoreWhite
        : after.bestScoreWhite - before.bestScoreWhite;

    const loss = Math.max(rawLoss, 0);
    const isExactBest = move.uci === before.bestUci;
    const bestGap = getBestGapForMover(before.lines, before.bestScoreWhite, turnBefore);
    const bestScoreForMover = scoreForMover(before.bestScoreWhite, turnBefore);
    const actualScoreForMover = scoreForMover(after.bestScoreWhite, turnBefore);
    const moverMaterialBefore = getMaterialForMover(move.fenBefore, turnBefore);
    const moverMaterialAfter = getMaterialForMover(move.fenAfter, turnBefore);

    const category = classifyMove({
      ply: move.ply,
      loss,
      isExactBest,
      theoryStillOpen,
      moverMaterialBefore,
      moverMaterialAfter,
      bestGap,
      bestScoreForMover,
      actualScoreForMover,
    });

    if (theoryStillOpen && category !== 'theory') {
      theoryStillOpen = false;
    }

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
      loss: Number(loss.toFixed(2)),
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
    multiPv: 3,
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

  const rawLoss =
    turnBefore === 'w'
      ? before.bestScoreWhite - after.bestScoreWhite
      : after.bestScoreWhite - before.bestScoreWhite;

  const loss = Math.max(rawLoss, 0);
  const isExactBest = uci === before.bestUci;
  const bestGap = getBestGapForMover(before.lines, before.bestScoreWhite, turnBefore);
  const bestScoreForMover = scoreForMover(before.bestScoreWhite, turnBefore);
  const actualScoreForMover = scoreForMover(after.bestScoreWhite, turnBefore);
  const moverMaterialBefore = getMaterialForMover(fenBefore, turnBefore);
  const moverMaterialAfter = getMaterialForMover(fenAfter, turnBefore);

  const category = classifyMove({
    ply: 99,
    loss,
    isExactBest,
    theoryStillOpen: false,
    moverMaterialBefore,
    moverMaterialAfter,
    bestGap,
    bestScoreForMover,
    actualScoreForMover,
  });

  return {
    san,
    uci,
    bestSan: uciToSan(fenBefore, before.bestUci),
    bestUci: before.bestUci,
    loss: Number(loss.toFixed(2)),
    category,
    comment: CATEGORY_COMMENTS[category],
    accuracy: clamp(CATEGORY_ACCURACY[category], 0, 100),
  };
}