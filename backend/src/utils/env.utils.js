function parseInteger(
  name,
  fallback,
  { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {},
) {
  const raw = process.env[name];
  const value = raw === undefined || raw === '' ? fallback : Number(raw);

  if (!Number.isInteger(value)) {
    throw new Error(`Invalid environment variable ${name}: expected an integer.`);
  }

  if (value < min || value > max) {
    throw new Error(`Invalid environment variable ${name}: expected ${min} <= value <= ${max}.`);
  }

  return value;
}

function parseEnum(name, fallback, allowedValues) {
  const value = process.env[name] || fallback;

  if (!allowedValues.includes(value)) {
    throw new Error(
      `Invalid environment variable ${name}: expected one of ${allowedValues.join(', ')}.`,
    );
  }

  return value;
}

function readRequiredSecret(name) {
  const value = process.env[name];

  if (!value || value.length < 16) {
    throw new Error(
      `Missing or weak environment variable ${name}: set a secret value of at least 16 characters.`,
    );
  }

  return value;
}

const parsedEnv = {
  port: parseInteger('PORT', 3000, { min: 1, max: 65535 }),
  nodeEnv: process.env.NODE_ENV || 'production',

  stockfishPath: process.env.STOCKFISH_PATH || '/usr/local/bin/stockfish',

  maxConcurrentAnalyses: parseInteger('MAX_CONCURRENT_ANALYSES', 1, { min: 1, max: 4 }),
  maxQueueSize: parseInteger('MAX_QUEUE_SIZE', 32, { min: 0, max: 500 }),

  stockfishThreads: parseInteger('STOCKFISH_THREADS', 2, { min: 1, max: 1024 }),
  stockfishHashMb: parseInteger('STOCKFISH_HASH_MB', 512, { min: 16, max: 1048576 }),

  stockfishSearchMode: parseEnum('STOCKFISH_SEARCH_MODE', 'depth', [
    'depth',
    'nodes',
    'movetime',
  ]),

  stockfishDefaultDepth: parseInteger('STOCKFISH_DEFAULT_DEPTH', 28, { min: 1, max: 99 }),
  stockfishMaxDepth: parseInteger('STOCKFISH_MAX_DEPTH', 35, { min: 1, max: 99 }),

  stockfishDefaultNodes: parseInteger('STOCKFISH_DEFAULT_NODES', 20_000_000, {
    min: 1_000,
    max: 2_000_000_000,
  }),
  stockfishMaxNodes: parseInteger('STOCKFISH_MAX_NODES', 200_000_000, {
    min: 1_000,
    max: 2_000_000_000,
  }),

  stockfishHardTimeoutMs: parseInteger('STOCKFISH_HARD_TIMEOUT_MS', 45_000, {
    min: 1_000,
    max: 600_000,
  }),

  maxMovetimeMs: parseInteger('MAX_MOVETIME_MS', 120_000, { min: 50, max: 600_000 }),
  defaultMovetimeMs: parseInteger('DEFAULT_MOVETIME_MS', 15_000, { min: 50, max: 600_000 }),

  maxMultiPv: parseInteger('MAX_MULTIPV', 3, { min: 1, max: 10 }),
  maxStreamPositions: parseInteger('MAX_STREAM_POSITIONS', 220, { min: 1, max: 1000 }),

  syzygyPath: (process.env.SYZYGY_PATH || '').trim(),
  syzygyProbeDepth: parseInteger('SYZYGY_PROBE_DEPTH', 1, { min: 1, max: 100 }),

  trustProxy: process.env.TRUST_PROXY === '1' ? 1 : false,

  apiAdminToken: readRequiredSecret('API_ADMIN_TOKEN'),
  internalGatewayToken: readRequiredSecret('INTERNAL_GATEWAY_TOKEN'),
};

if (parsedEnv.stockfishDefaultDepth > parsedEnv.stockfishMaxDepth) {
  throw new Error('STOCKFISH_DEFAULT_DEPTH must be <= STOCKFISH_MAX_DEPTH.');
}

export const env = Object.freeze(parsedEnv);