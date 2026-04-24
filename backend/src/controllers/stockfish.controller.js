import { env } from '../utils/env.utils.js';
import { parseFen } from '../utils/fen.utils.js';
import { analyzeWithStockfish } from '../services/stockfish.service.js';
import { AnalysisQueue } from '../services/queue.service.js';

const analysisQueue = new AnalysisQueue({
  maxConcurrent: env.maxConcurrentAnalyses,
  maxQueueSize: env.maxQueueSize,
});

function clampInteger(value, fallback, min, max) {
  const number = Number(value ?? fallback);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.trunc(number)));
}

export async function analyzeStockfish(req, res, next) {
  try {
    const parsedFen = parseFen(req.body?.fen);

    if (!parsedFen.ok) {
      return res.status(400).json({
        error: 'INVALID_FEN',
        message: parsedFen.message,
      });
    }

    const movetime = clampInteger(req.body?.movetime, env.defaultMovetimeMs, 50, env.maxMovetimeMs);
    const multiPv = clampInteger(req.body?.multiPv, 1, 1, env.maxMultiPv);

    const result = await analysisQueue.enqueue(() => analyzeWithStockfish({
      fen: parsedFen.fen,
      turn: parsedFen.turn,
      movetime,
      multiPv,
    }));

    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export function getQueueStats() {
  return analysisQueue.getStats();
}
