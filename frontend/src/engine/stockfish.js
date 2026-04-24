class StockfishHttpError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'StockfishHttpError';
    this.status = status;
    this.code = code;
  }
}

function messageFromStatus(status, fallback) {
  if (status === 400) {
    return fallback || 'FEN invalide.';
  }

  if (status === 429) {
    return 'Trop de requêtes Stockfish. Réessaie dans quelques instants.';
  }

  if (status === 503) {
    return 'Le serveur Stockfish est occupé. Réessaie dans quelques instants.';
  }

  return fallback || 'Erreur Stockfish côté serveur.';
}

async function readErrorPayload(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeAnalysisResponse(payload) {
  const lines = Array.isArray(payload?.lines)
    ? payload.lines
      .map((line) => ({
        multipv: Number(line.multipv ?? 1),
        uci: String(line.uci ?? ''),
        scoreWhite: Number(line.scoreWhite ?? 0),
      }))
      .filter((line) => line.uci)
    : [];

  return {
    bestUci: String(payload?.bestUci ?? lines[0]?.uci ?? ''),
    bestScoreWhite: Number(payload?.bestScoreWhite ?? lines[0]?.scoreWhite ?? 0),
    lines,
  };
}

class StockfishClient {
  constructor() {
    this.queue = Promise.resolve();
  }

  enqueue(job) {
    const run = this.queue.then(job, job);
    this.queue = run.then(() => undefined, () => undefined);
    return run;
  }

  analyze(fen, _turn, options = {}) {
    const {
      movetime = 120,
      multiPv = 1,
      searchTimeoutMs = Math.max(5000, Number(movetime) + 3000),
    } = options;

    return this.enqueue(async () => {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), searchTimeoutMs);

      try {
        const response = await fetch('/api/stockfish/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'same-origin',
          signal: controller.signal,
          body: JSON.stringify({
            fen,
            movetime,
            multiPv,
          }),
        });

        if (!response.ok) {
          const payload = await readErrorPayload(response);
          throw new StockfishHttpError(
            messageFromStatus(response.status, payload?.message),
            response.status,
            payload?.error,
          );
        }

        return normalizeAnalysisResponse(await response.json());
      } catch (error) {
        if (error?.name === 'AbortError') {
          throw new Error(`Stockfish a dépassé le temps limite (${searchTimeoutMs} ms).`);
        }

        throw error;
      } finally {
        window.clearTimeout(timer);
      }
    });
  }
}

export const stockfish = new StockfishClient();
