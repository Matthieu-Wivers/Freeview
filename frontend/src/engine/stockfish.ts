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
  private worker: Worker;
  private ready = false;
  private queue = Promise.resolve();

  constructor() {
    const workerUrl = `${import.meta.env.BASE_URL}stockfish/stockfish-18-lite-single.js`;
    this.worker = new Worker(workerUrl);

    this.worker.postMessage('uci');
    this.worker.postMessage('isready');

    this.worker.addEventListener('message', (e: MessageEvent<string>) => {
      if (e.data === 'readyok') {
        this.ready = true;
      }
    });
  }

  private enqueue<T>(job: () => Promise<T>): Promise<T> {
    const run = this.queue.then(job, job);
    this.queue = run.then(() => undefined, () => undefined);
    return run;
  }

  async waitUntilReady(): Promise<void> {
    if (this.ready) return;

    await new Promise<void>((resolve) => {
      const listener = (e: MessageEvent<string>) => {
        if (e.data === 'readyok') {
          this.worker.removeEventListener('message', listener as EventListener);
          this.ready = true;
          resolve();
        }
      };

      this.worker.addEventListener('message', listener as EventListener);
    });
  }

  analyze(fen: string, turn: Turn, depth = 12, multiPv = 3): Promise<EngineResult> {
    return this.enqueue(async () => {
      await this.waitUntilReady();

      return new Promise<EngineResult>((resolve) => {
        const lines = new Map<number, EngineLine>();

        const listener = (e: MessageEvent<string>) => {
          const text = e.data;

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
            this.worker.removeEventListener('message', listener as EventListener);

            const sorted = [...lines.values()].sort((a, b) => a.multipv - b.multipv);

            resolve({
              bestUci: sorted[0]?.uci ?? text.split(' ')[1] ?? '',
              bestScoreWhite: sorted[0]?.scoreWhite ?? 0,
              lines: sorted,
            });
          }
        };

        this.worker.addEventListener('message', listener as EventListener);
        this.worker.postMessage('stop');
        this.worker.postMessage('ucinewgame');
        this.worker.postMessage(`setoption name MultiPV value ${multiPv}`);
        this.worker.postMessage(`position fen ${fen}`);
        this.worker.postMessage(`go depth ${depth}`);
      });
    });
  }
}

export const stockfish = new StockfishClient();