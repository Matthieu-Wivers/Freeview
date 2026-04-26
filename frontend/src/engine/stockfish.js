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

function parseSsePacket(packet) {
  let event = 'message';
  const dataLines = [];

  for (const line of packet.split(/\r?\n/)) {
    if (!line || line.startsWith(':')) {
      continue;
    }

    const separatorIndex = line.indexOf(':');
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex);
    const rawValue = separatorIndex === -1 ? '' : line.slice(separatorIndex + 1);
    const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue;

    if (field === 'event') {
      event = value;
    }

    if (field === 'data') {
      dataLines.push(value);
    }
  }

  const rawData = dataLines.join('\n');

  return {
    event,
    data: rawData ? JSON.parse(rawData) : null,
  };
}

async function readSseStream(response, onEvent) {
  if (!response.body) {
    throw new Error('Le navigateur ne supporte pas le streaming de réponse HTTP.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    let separatorIndex;
    while ((separatorIndex = buffer.search(/\r?\n\r?\n/)) !== -1) {
      const packet = buffer.slice(0, separatorIndex);
      const match = buffer.slice(separatorIndex).match(/^\r?\n\r?\n/);
      buffer = buffer.slice(separatorIndex + (match?.[0]?.length ?? 2));

      if (packet.trim()) {
        onEvent(parseSsePacket(packet));
      }
    }
  }

  const tail = decoder.decode();
  if (tail) {
    buffer += tail;
  }

  if (buffer.trim()) {
    onEvent(parseSsePacket(buffer));
  }
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

  analyzeMany(positions, options = {}) {
    const normalizedPositions = positions.map((position, index) => ({
      id: String(position.id ?? index),
      fen: position.fen,
      movetime: position.movetime ?? 120,
      multiPv: position.multiPv ?? 1,
    }));

    const {
      onPosition,
      searchTimeoutMs = Math.max(15000, normalizedPositions.length * 5000),
    } = options;

    return this.enqueue(async () => {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), searchTimeoutMs);
      const resultById = new Map();
      let doneReceived = false;

      try {
        const response = await fetch('/api/stockfish/analyze-stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          credentials: 'same-origin',
          signal: controller.signal,
          body: JSON.stringify({
            positions: normalizedPositions,
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

        await readSseStream(response, ({ event, data }) => {
          if (event === 'position') {
            const result = normalizeAnalysisResponse(data?.result);
            resultById.set(String(data.id), result);
            onPosition?.({
              id: String(data.id),
              index: Number(data.index ?? resultById.size - 1),
              total: Number(data.total ?? normalizedPositions.length),
              fen: data.fen,
              result,
            });
            return;
          }

          if (event === 'done') {
            doneReceived = true;
            return;
          }

          if (event === 'error') {
            throw new StockfishHttpError(
              messageFromStatus(data?.status, data?.message),
              data?.status ?? 500,
              data?.error,
            );
          }
        });

        if (!doneReceived) {
          throw new Error('Le flux Stockfish SSE s’est terminé avant le message de fin.');
        }

        return normalizedPositions.map((position) => {
          const result = resultById.get(position.id);

          if (!result) {
            throw new Error('Analyse Stockfish incomplète pour une ou plusieurs positions.');
          }

          return result;
        });
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
