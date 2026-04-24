import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { env } from '../utils/env.utils.js';
import { extractMultiPv, extractPvMove, scoreWhiteFromInfoLine } from '../utils/score.utils.js';

class StockfishError extends Error {
  constructor(message, status = 500, code = 'STOCKFISH_ERROR') {
    super(message);
    this.name = 'StockfishError';
    this.status = status;
    this.code = code;
  }
}

function safeKill(processRef) {
  if (!processRef || processRef.killed) {
    return;
  }

  try {
    processRef.kill('SIGKILL');
  } catch {
    // Process already gone.
  }
}

function buildFallbackLines(bestUci, lines) {
  const sorted = [...lines.values()].sort((a, b) => a.multipv - b.multipv);

  if (sorted.length > 0) {
    return sorted;
  }

  if (!bestUci || bestUci === '(none)') {
    return [];
  }

  return [{ multipv: 1, uci: bestUci, scoreWhite: 0 }];
}

export function analyzeWithStockfish({ fen, turn, movetime, multiPv }) {
  const timeoutMs = Math.max(3000, movetime + 2500);

  return new Promise((resolve, reject) => {
    const child = spawn(env.stockfishPath, [], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const lines = new Map();
    const stderrChunks = [];
    let settled = false;
    let searchStarted = false;
    let uciReady = false;

    const fail = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      safeKill(child);
      reject(error);
    };

    const succeed = (bestUci) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      safeKill(child);

      const sortedLines = buildFallbackLines(bestUci, lines);
      const bestLine = sortedLines[0];

      resolve({
        bestUci: bestLine?.uci ?? bestUci ?? '',
        bestScoreWhite: bestLine?.scoreWhite ?? 0,
        lines: sortedLines,
      });
    };

    const send = (command) => {
      if (child.stdin.destroyed || settled) {
        return;
      }

      child.stdin.write(`${command}\n`);
    };

    const startSearch = () => {
      if (searchStarted) {
        return;
      }

      searchStarted = true;
      send('ucinewgame');
      send(`position fen ${fen}`);
      send(`go movetime ${movetime}`);
    };

    const timer = setTimeout(() => {
      fail(new StockfishError('Stockfish a dépassé le temps limite de sécurité.', 504, 'STOCKFISH_TIMEOUT'));
    }, timeoutMs);

    child.once('error', (error) => {
      fail(new StockfishError(`Impossible de lancer Stockfish: ${error.message}`, 500, 'STOCKFISH_SPAWN_FAILED'));
    });

    child.once('exit', (code, signal) => {
      if (!settled && code !== 0) {
        const stderr = stderrChunks.join('').slice(0, 500);
        const suffix = stderr ? ` ${stderr}` : '';
        fail(new StockfishError(`Stockfish s’est arrêté trop tôt (${signal ?? code}).${suffix}`, 500, 'STOCKFISH_EXITED'));
      }
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      stderrChunks.push(chunk);
    });

    const stdout = createInterface({ input: child.stdout });

    stdout.on('line', (line) => {
      if (settled) {
        return;
      }

      if (line === 'uciok') {
        uciReady = true;
        send('setoption name Threads value 1');
        send('setoption name Hash value 32');
        send(`setoption name MultiPV value ${multiPv}`);
        send('isready');
        return;
      }

      if (uciReady && line === 'readyok') {
        startSearch();
        return;
      }

      if (line.startsWith('info ') && line.includes(' pv ')) {
        const uci = extractPvMove(line);
        const scoreWhite = scoreWhiteFromInfoLine(line, turn);
        const multipv = extractMultiPv(line);

        if (uci && scoreWhite !== null) {
          lines.set(multipv, { multipv, uci, scoreWhite });
        }

        return;
      }

      if (line.startsWith('bestmove ')) {
        succeed(line.split(/\s+/)[1] ?? '');
      }
    });

    send('uci');
  });
}
