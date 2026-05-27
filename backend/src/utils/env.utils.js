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

function parseBoolean(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  return raw === '1' || raw.toLowerCase() === 'true';
}

function readRequiredSecret(name, minLength = 16) {
  const value = process.env[name];
  if (!value || value.length < minLength) {
    throw new Error(
      `Missing or weak environment variable ${name}: set a secret value of at least ${minLength} characters.`,
    );
  }

  return value;
}

const nodeEnv = process.env.NODE_ENV || 'production';

const parsedEnv = {
  port: parseInteger('PORT', 3000, { min: 1, max: 65535 }),
  nodeEnv,

  stockfishPath: process.env.STOCKFISH_PATH || '/usr/local/bin/stockfish',

  maxConcurrentAnalyses: parseInteger('MAX_CONCURRENT_ANALYSES', 1, { min: 1, max: 4 }),
  maxQueueSize: parseInteger('MAX_QUEUE_SIZE', 16, { min: 0, max: 500 }),

  stockfishThreads: parseInteger('STOCKFISH_THREADS', 3, { min: 1, max: 1024 }),
  stockfishHashMb: parseInteger('STOCKFISH_HASH_MB', 512, { min: 16, max: 1048576 }),

  stockfishSearchMode: parseEnum('STOCKFISH_SEARCH_MODE', 'depth', [
    'depth',
    'nodes',
    'movetime',
  ]),
  stockfishDefaultDepth: parseInteger('STOCKFISH_DEFAULT_DEPTH', 26, { min: 1, max: 99 }),
  stockfishMaxDepth: parseInteger('STOCKFISH_MAX_DEPTH', 30, { min: 1, max: 99 }),

  stockfishDefaultNodes: parseInteger('STOCKFISH_DEFAULT_NODES', 20_000_000, {
    min: 1_000,
    max: 2_000_000_000,
  }),
  stockfishMaxNodes: parseInteger('STOCKFISH_MAX_NODES', 200_000_000, {
    min: 1_000,
    max: 2_000_000_000,
  }),

  stockfishHardTimeoutMs: parseInteger('STOCKFISH_HARD_TIMEOUT_MS', 60_000, {
    min: 1_000,
    max: 600_000,
  }),

  maxMovetimeMs: parseInteger('MAX_MOVETIME_MS', 90_000, { min: 50, max: 600_000 }),
  defaultMovetimeMs: parseInteger('DEFAULT_MOVETIME_MS', 20_000, { min: 50, max: 600_000 }),

  maxMultiPv: parseInteger('MAX_MULTIPV', 3, { min: 1, max: 10 }),
  maxStreamPositions: parseInteger('MAX_STREAM_POSITIONS', 160, { min: 1, max: 1000 }),

  syzygyPath: (process.env.SYZYGY_PATH || '').trim(),
  syzygyProbeDepth: parseInteger('SYZYGY_PROBE_DEPTH', 1, { min: 1, max: 100 }),

  trustProxy: process.env.TRUST_PROXY === '1' ? 1 : false,

  apiAdminToken: readRequiredSecret('API_ADMIN_TOKEN'),
  internalGatewayToken: readRequiredSecret('INTERNAL_GATEWAY_TOKEN'),

  databaseUrl: process.env.DATABASE_URL || 'postgres://freeview:freeview@freeview-db:5432/freeview',

  authJwtSecret: readRequiredSecret('AUTH_JWT_SECRET', 32),
  authCookieName: process.env.AUTH_COOKIE_NAME || 'freeview_session',
  authCookieSecure: parseBoolean('AUTH_COOKIE_SECURE', nodeEnv === 'production'),
  authCookieMaxAgeSeconds: parseInteger('AUTH_COOKIE_MAX_AGE_SECONDS', 60 * 60 * 24 * 7, {
    min: 300,
    max: 60 * 60 * 24 * 30,
  }),

  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || '',
  frontendAuthSuccessUrl: process.env.FRONTEND_AUTH_SUCCESS_URL || '/login?google=success',
  frontendAuthErrorUrl: process.env.FRONTEND_AUTH_ERROR_URL || '/login?error=google',
};

if (parsedEnv.stockfishDefaultDepth > parsedEnv.stockfishMaxDepth) {
  throw new Error('STOCKFISH_DEFAULT_DEPTH must be <= STOCKFISH_MAX_DEPTH.');
}

export const env = Object.freeze({
  ...parsedEnv,
  googleSsoEnabled: Boolean(
    parsedEnv.googleClientId
      && parsedEnv.googleClientSecret
      && parsedEnv.googleRedirectUri,
  ),
});
