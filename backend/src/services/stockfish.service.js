import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

import { env } from '../utils/env.utils.js';
import {
  extractInfoStats,
  extractMultiPv,
  extractPvMove,
  extractPvMoves,
  scoreWhiteFromInfoLine,
} from '../utils/score.utils.js';

class StockfishError extends Error {
  constructor(message, status = 500, code = 'STOCKFISH_ERROR') {
    super(message);
    this.name = 'StockfishError';
    this.status = status;
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

function buildFallbackLines(bestUci, lines) {
  const sorted = [...lines.values()].sort((a, b) => a.multipv - b.multipv);

  if (sorted.length > 0) {
    return sorted;
  }

  if (!bestUci || bestUci === '(none)') {
    return [];
  }

  return [
    {
      multipv: 1,
      uci: bestUci,
      pv: [bestUci],
      scoreWhite: 0,
      depth: null,
      seldepth: null,
      nodes: null,
      nps: null,
      hashfull: null,
      timeMs: null,
    },
  ];
}

function buildGoCommand({ depth, nodes, movetime }) {
  if (env.stockfishSearchMode === 'nodes') {
    const requestedNodes = clampInteger(
      nodes,
      env.stockfishDefaultNodes,
      1_000,
      env.stockfishMaxNodes,
    );

    return {
      command: `go nodes ${requestedNodes}`,
      requestedNodes,
      requestedDepth: null,
      requestedMovetimeMs: null,
    };
  }

  if (env.stockfishSearchMode === 'movetime') {
    const requestedMovetimeMs = clampInteger(
      movetime,
      env.defaultMovetimeMs,
      50,
      env.maxMovetimeMs,
    );

    return {
      command: `go movetime ${requestedMovetimeMs}`,
      requestedNodes: null,
      requestedDepth: null,
      requestedMovetimeMs,
    };
  }

  const requestedDepth = clampInteger(
    depth,
    env.stockfishDefaultDepth,
    1,
    env.stockfishMaxDepth,
  );

  return {
    command: `go depth ${requestedDepth} movetime ${env.stockfishHardTimeoutMs}`,
    requestedNodes: null,
    requestedDepth,
    requestedMovetimeMs: env.stockfishHardTimeoutMs,
  };
}

class StockfishEngine {
  constructor() {
    this.child = null;
    this.stdout = null;
    this.waiters = [];
    this.currentSearch = null;
    this.stderrChunks = [];
    this.idName = null;
    this.dead = false;
    this.stopping = false;

    this.start();
    this.readyPromise = this.initialize();
  }

  start() {
    this.child = spawn(env.stockfishPath, [], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.child.stderr.setEncoding('utf8');
    this.child.stderr.on('data', (chunk) => {
      this.stderrChunks.push(chunk);
      this.stderrChunks = this.stderrChunks.slice(-20);
    });

    this.stdout = createInterface({
      input: this.child.stdout,
      crlfDelay: Infinity,
    });

    this.stdout.on('line', (line) => this.handleLine(line));

    this.child.once('error', (error) => {
      this.dead = true;
      this.rejectAll(
        new StockfishError(
          `Impossible de lancer Stockfish: ${error.message}`,
          500,
          'STOCKFISH_SPAWN_FAILED',
        ),
      );
    });

    this.child.once('exit', (code, signal) => {
      if (this.stopping) {
        return;
      }

      this.dead = true;

      const stderr = this.stderrChunks.join('').slice(-800);
      const suffix = stderr ? ` ${stderr}` : '';

      this.rejectAll(
        new StockfishError(
          `Stockfish s’est arrêté trop tôt (${signal ?? code}).${suffix}`,
          500,
          'STOCKFISH_EXITED',
        ),
      );
    });
  }

  send(command) {
    if (!this.child || this.child.stdin.destroyed || this.dead) {
      throw new StockfishError('Stockfish n’est pas disponible.', 503, 'STOCKFISH_NOT_READY');
    }

    this.child.stdin.write(`${command}\n`);
  }

  removeWaiter(waiter) {
    const index = this.waiters.indexOf(waiter);

    if (index !== -1) {
      this.waiters.splice(index, 1);
    }

    clearTimeout(waiter.timer);
  }

  waitFor(predicate, timeoutMs, code, message) {
    return new Promise((resolve, reject) => {
      const waiter = {
        predicate,
        resolve,
        reject,
        timer: null,
      };

      waiter.timer = setTimeout(() => {
        this.removeWaiter(waiter);
        reject(new StockfishError(message, 504, code));
      }, timeoutMs);

      this.waiters.push(waiter);
    });
  }

  async waitUntilReady(timeoutMs = 15_000) {
    const ready = this.waitFor(
      (line) => line === 'readyok',
      timeoutMs,
      'STOCKFISH_READY_TIMEOUT',
      'Stockfish n’a pas répondu à isready.',
    );

    this.send('isready');

    return ready;
  }

  async initialize() {
    const uciOk = this.waitFor(
      (line) => {
        if (line.startsWith('id name ')) {
          this.idName = line.slice('id name '.length).trim();
        }

        return line === 'uciok';
      },
      15_000,
      'STOCKFISH_UCI_TIMEOUT',
      'Stockfish n’a pas répondu à uci.',
    );

    this.send('uci');
    await uciOk;

    this.send(`setoption name Threads value ${env.stockfishThreads}`);
    this.send(`setoption name Hash value ${env.stockfishHashMb}`);
    this.send('setoption name MultiPV value 1');
    this.send('setoption name UCI_ShowWDL value true');

    if (env.syzygyPath) {
      this.send(`setoption name SyzygyPath value ${env.syzygyPath}`);
      this.send(`setoption name SyzygyProbeDepth value ${env.syzygyProbeDepth}`);
    }

    await this.waitUntilReady();

    return true;
  }

  handleLine(line) {
    for (const waiter of [...this.waiters]) {
      let matched = false;

      try {
        matched = waiter.predicate(line);
      } catch (error) {
        this.removeWaiter(waiter);
        waiter.reject(error);
        continue;
      }

      if (matched) {
        this.removeWaiter(waiter);
        waiter.resolve(line);
        return;
      }
    }

    if (this.currentSearch) {
      this.handleSearchLine(line);
    }
  }

  handleSearchLine(line) {
    const search = this.currentSearch;

    if (!search) {
      return;
    }

    if (line.startsWith('info ')) {
      const stats = extractInfoStats(line);

      if (stats.depth !== null) {
        search.lastStats = stats;
      }

      if (!line.includes(' pv ')) {
        return;
      }

      const uci = extractPvMove(line);
      const scoreWhite = scoreWhiteFromInfoLine(line, search.turn);
      const multipv = extractMultiPv(line);
      const pv = extractPvMoves(line);

      if (uci && scoreWhite !== null) {
        search.lines.set(multipv, {
          multipv,
          uci,
          pv,
          scoreWhite,
          depth: stats.depth,
          seldepth: stats.seldepth,
          nodes: stats.nodes,
          nps: stats.nps,
          hashfull: stats.hashfull,
          timeMs: stats.timeMs,
        });
      }

      return;
    }

    if (line.startsWith('bestmove ')) {
      const bestUci = line.split(/\s+/)[1] ?? '';
      search.finish(bestUci);
    }
  }

  async analyze({ fen, turn, depth, nodes, movetime, multiPv }) {
    await this.readyPromise;

    if (this.dead) {
      throw new StockfishError('Stockfish n’est plus disponible.', 503, 'STOCKFISH_DEAD');
    }

    if (this.currentSearch) {
      throw new StockfishError(
        'Stockfish est déjà en cours d’analyse. Garde MAX_CONCURRENT_ANALYSES=1.',
        503,
        'STOCKFISH_BUSY',
      );
    }

    const requestedMultiPv = clampInteger(multiPv, 1, 1, env.maxMultiPv);
    const go = buildGoCommand({ depth, nodes, movetime });

    this.send(`setoption name MultiPV value ${requestedMultiPv}`);
    await this.waitUntilReady();

    return new Promise((resolve, reject) => {
      const lines = new Map();

      const safetyTimeoutMs = Math.max(
        env.stockfishHardTimeoutMs + 10_000,
        Number(movetime ?? 0) + 10_000,
        20_000,
      );

      const timer = setTimeout(() => {
        try {
          this.send('stop');
        } catch {
          // Ignore.
        }

        const error = new StockfishError(
          'Stockfish a dépassé le temps limite de sécurité.',
          504,
          'STOCKFISH_TIMEOUT',
        );

        this.currentSearch = null;
        this.dispose();
        reject(error);
      }, safetyTimeoutMs);

      const finish = (bestUci) => {
        clearTimeout(timer);

        const sortedLines = buildFallbackLines(bestUci, lines);
        const bestLine = sortedLines[0];

        this.currentSearch = null;

        resolve({
          engine: this.idName || 'Stockfish',
          search: {
            mode: env.stockfishSearchMode,
            command: go.command,
            requestedDepth: go.requestedDepth,
            requestedNodes: go.requestedNodes,
            requestedMovetimeMs: go.requestedMovetimeMs,
            multiPv: requestedMultiPv,
            achievedDepth: bestLine?.depth ?? this.currentSearch?.lastStats?.depth ?? null,
            nodes: bestLine?.nodes ?? this.currentSearch?.lastStats?.nodes ?? null,
            nps: bestLine?.nps ?? this.currentSearch?.lastStats?.nps ?? null,
            timeMs: bestLine?.timeMs ?? this.currentSearch?.lastStats?.timeMs ?? null,
          },
          bestUci: bestLine?.uci ?? bestUci ?? '',
          bestScoreWhite: bestLine?.scoreWhite ?? 0,
          lines: sortedLines,
        });
      };

      const fail = (error) => {
        clearTimeout(timer);
        this.currentSearch = null;
        reject(error);
      };

      this.currentSearch = {
        turn,
        lines,
        lastStats: null,
        finish,
        fail,
      };

      try {
        this.send(`position fen ${fen}`);
        this.send(go.command);
      } catch (error) {
        fail(error);
      }
    });
  }

  rejectAll(error) {
    for (const waiter of [...this.waiters]) {
      this.removeWaiter(waiter);
      waiter.reject(error);
    }

    if (this.currentSearch) {
      this.currentSearch.fail(error);
    }
  }

  dispose() {
    this.stopping = true;
    this.dead = true;

    try {
      this.child?.stdin?.write('quit\n');
    } catch {
      // Ignore.
    }

    try {
      this.child?.kill('SIGKILL');
    } catch {
      // Ignore.
    }
  }
}

let engine = null;
let analysisChain = Promise.resolve();

function getEngine() {
  if (!engine || engine.dead) {
    engine = new StockfishEngine();
  }

  return engine;
}

export function analyzeWithStockfish(options) {
  const task = async () => getEngine().analyze(options);

  const result = analysisChain.then(task, task);

  analysisChain = result.catch(() => {});

  return result;
}