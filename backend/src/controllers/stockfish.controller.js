import { env } from '../utils/env.utils.js';
import { parseFen } from '../utils/fen.utils.js';
import { analyzeWithStockfish } from '../services/stockfish.service.js';
import { AnalysisQueue } from '../services/queue.service.js';

const analysisQueue = new AnalysisQueue({
  maxConcurrent: env.maxConcurrentAnalyses,
  maxQueueSize: env.maxQueueSize,
});

class BadRequestError extends Error {
  constructor(message, code = 'BAD_REQUEST') {
    super(message);
    this.name = 'BadRequestError';
    this.status = 400;
    this.code = code;
  }
}

function clampInteger(value, fallback, min, max) {
  const number = Number(value ?? fallback);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.trunc(number)));
}

function normalizePositionRequest(item, index) {
  const parsedFen = parseFen(item?.fen);

  if (!parsedFen.ok) {
    throw new BadRequestError(`Position ${index + 1}: ${parsedFen.message}`, 'INVALID_FEN');
  }

  return {
    id: typeof item?.id === 'string' && item.id.length <= 180 ? item.id : String(index),
    index,
    fen: parsedFen.fen,
    turn: parsedFen.turn,
    movetime: clampInteger(item?.movetime, env.defaultMovetimeMs, 50, env.maxMovetimeMs),
    multiPv: clampInteger(item?.multiPv, 1, 1, env.maxMultiPv),
  };
}

function parseStreamPositions(body) {
  const rawPositions = Array.isArray(body?.positions)
    ? body.positions
    : Array.isArray(body?.fens)
      ? body.fens.map((fen) => ({ fen }))
      : null;

  if (!rawPositions) {
    throw new BadRequestError('Le body doit contenir un tableau positions[].', 'INVALID_POSITIONS');
  }

  if (rawPositions.length === 0) {
    throw new BadRequestError('Le tableau positions[] est vide.', 'EMPTY_POSITIONS');
  }

  if (rawPositions.length > env.maxStreamPositions) {
    throw new BadRequestError(
      `Trop de positions à analyser en une fois. Maximum: ${env.maxStreamPositions}.`,
      'TOO_MANY_POSITIONS',
    );
  }

  return rawPositions.map(normalizePositionRequest);
}

function writeSseEvent(res, event, data) {
  if (res.destroyed || res.writableEnded) {
    return;
  }

  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function setupSseResponse(res) {
  res.status(200);
  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();
}

async function streamPositions(req, res, positions) {
  if (req.aborted || res.destroyed) {
    return;
  }

  let clientClosed = false;

  req.on('close', () => {
    clientClosed = true;
  });

  setupSseResponse(res);

  writeSseEvent(res, 'started', {
    total: positions.length,
    queue: analysisQueue.getStats(),
  });

  for (const position of positions) {
    if (clientClosed || res.destroyed) {
      return;
    }

    try {
      const result = await analyzeWithStockfish(position);

      writeSseEvent(res, 'position', {
        id: position.id,
        index: position.index,
        total: positions.length,
        fen: position.fen,
        result,
      });
    } catch (error) {
      writeSseEvent(res, 'error', {
        id: position.id,
        index: position.index,
        error: error.code || 'STOCKFISH_ERROR',
        message: error.message || 'Erreur Stockfish côté serveur.',
        status: error.status || 500,
      });
      res.end();
      return;
    }
  }

  writeSseEvent(res, 'done', {
    ok: true,
    total: positions.length,
  });

  res.end();
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

export async function analyzeStockfishStream(req, res, next) {
  try {
    const positions = parseStreamPositions(req.body);

    await analysisQueue.enqueue(() => streamPositions(req, res, positions));
  } catch (error) {
    if (res.headersSent) {
      writeSseEvent(res, 'error', {
        error: error.code || 'STREAM_ERROR',
        message: error.message || 'Erreur pendant le flux SSE.',
        status: error.status || 500,
      });
      res.end();
      return;
    }

    next(error);
  }
}

export function getQueueStats() {
  return analysisQueue.getStats();
}
