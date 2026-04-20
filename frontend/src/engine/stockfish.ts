type Turn = 'w' | 'b';

export type EngineLine = {
  multipv: number;
  uci: string;
  scoreWhite: number;
};

export type EngineResult = {
  bestUci: string;
  bestScoreWhite: number;
  lines: EngineLine[];
};

type AnalyzeOptions = {
  movetime?: number;
  multiPv?: number;
  readyTimeoutMs?: number;
  searchTimeoutMs?: number;
};

function toWhiteScore(raw: string, turn: Turn): number | null {
  const mate = raw.match(/score mate (-?\d+)/);
  if (mate) {
    const v = Number(mate[1]);
    const score = v > 0 ? 1000 - Math.abs(v) : -1000 + Math.abs(v);
    return turn === 'w' ? score : -score;
  }

  const cp = raw.match(/score cp (-?\d+)/);
  if (!cp) return null;

  const pawns = Number(cp[1]) / 100;
  return turn === 'w' ? pawns : -pawns;
}

class StockfishClient {
  private worker: Worker | null = null;
  private ready = false;
  private queue: Promise<void> = Promise.resolve();

  private readonly workerUrl = `./src/public/stockfish/stockfish-18-lite-single.js`;

  constructor() {
    this.createWorker();
  }

  private createWorker() {
    this.worker?.terminate();
    this.ready = false;

    this.worker = new Worker(this.workerUrl);

    this.worker.addEventListener('error', (event) => {
      console.error('Stockfish worker error:', event);
      this.ready = false;
    });

    this.worker.postMessage('uci');
    this.worker.postMessage('isready');
  }

  private resetWorker() {
    this.createWorker();
  }

  private getWorker(): Worker {
    if (!this.worker) {
      this.createWorker();
    }
    return this.worker!;
  }

  private enqueue<T>(job: () => Promise<T>): Promise<T> {
    const run = this.queue.then(job, job);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async waitUntilReady(timeoutMs = 10_000): Promise<void> {
    if (this.ready) return;

    const worker = this.getWorker();
    worker.postMessage('isready');

    await new Promise<void>((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        window.clearTimeout(timer);
        worker.removeEventListener('message', onMessage as EventListener);
        worker.removeEventListener('error', onError as EventListener);
      };

      const onMessage = (e: MessageEvent<string>) => {
        if (e.data !== 'readyok' || settled) return;
        settled = true;
        cleanup();
        this.ready = true;
        resolve();
      };

      const onError = () => {
        if (settled) return;
        settled = true;
        cleanup();
        this.resetWorker();
        reject(new Error('Stockfish a échoué pendant l’initialisation du worker.'));
      };

      const timer = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        this.resetWorker();
        reject(new Error('Stockfish n’a pas répondu à temps à isready.'));
      }, timeoutMs);

      worker.addEventListener('message', onMessage as EventListener);
      worker.addEventListener('error', onError as EventListener);
    });
  }

  analyze(
    fen: string,
    turn: Turn,
    options: AnalyzeOptions = {},
  ): Promise<EngineResult> {
    const {
      movetime = 120,
      multiPv = 1,
      readyTimeoutMs = 10_000,
      searchTimeoutMs = Math.max(2_500, movetime + 1_500),
    } = options;

    return this.enqueue(async () => {
      await this.waitUntilReady(readyTimeoutMs);

      const worker = this.getWorker();

      return new Promise<EngineResult>((resolve, reject) => {
        const lines = new Map<number, EngineLine>();
        let settled = false;

        const cleanup = () => {
          window.clearTimeout(timer);
          worker.removeEventListener('message', onMessage as EventListener);
          worker.removeEventListener('error', onError as EventListener);
        };

        const fail = (message: string, restart = false) => {
          if (settled) return;
          settled = true;
          cleanup();
          if (restart) {
            this.resetWorker();
          }
          reject(new Error(message));
        };

        const succeed = (bestmoveLine: string) => {
          if (settled) return;
          settled = true;
          cleanup();

          const sorted = [...lines.values()].sort((a, b) => a.multipv - b.multipv);
          const fallbackBestUci = bestmoveLine.split(' ')[1] ?? '';

          resolve({
            bestUci: sorted[0]?.uci ?? fallbackBestUci,
            bestScoreWhite: sorted[0]?.scoreWhite ?? 0,
            lines: sorted,
          });
        };

        const onMessage = (e: MessageEvent<string>) => {
          const text = String(e.data ?? '');

          if (text.startsWith('info ') && text.includes(' pv ')) {
            const multipv = Number(text.match(/ multipv (\d+)/)?.[1] ?? '1');
            const uci = text.match(/ pv ([a-h][1-8][a-h][1-8][qrbn]?)/)?.[1];
            const scoreWhite = toWhiteScore(text, turn);

            if (uci && scoreWhite !== null) {
              lines.set(multipv, { multipv, uci, scoreWhite });
            }
            return;
          }

          if (text.startsWith('bestmove ')) {
            succeed(text);
          }
        };

        const onError = () => {
          fail('Le worker Stockfish a rencontré une erreur.', true);
        };

        const timer = window.setTimeout(() => {
          try {
            worker.postMessage('stop');
          } catch {
            // ignore
          }
          fail(`Stockfish a dépassé le temps limite (${searchTimeoutMs} ms).`);
        }, searchTimeoutMs);

        worker.addEventListener('message', onMessage as EventListener);
        worker.addEventListener('error', onError as EventListener);

        worker.postMessage(`setoption name MultiPV value ${multiPv}`);
        worker.postMessage(`position fen ${fen}`);
        worker.postMessage(`go movetime ${movetime}`);
      });
    });
  }
}

export const stockfish = new StockfishClient();