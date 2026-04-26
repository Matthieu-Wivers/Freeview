function parseInteger(name, fallback, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
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

function readRequiredSecret(name) {
  const value = process.env[name];

  if (!value || value.length < 16) {
    throw new Error(`Missing or weak environment variable ${name}: set a secret value of at least 16 characters.`);
  }

  return value;
}

export const env = Object.freeze({
  port: parseInteger('PORT', 3000, { min: 1, max: 65535 }),
  nodeEnv: process.env.NODE_ENV || 'production',
  stockfishPath: process.env.STOCKFISH_PATH || '/usr/games/stockfish',
  maxConcurrentAnalyses: parseInteger('MAX_CONCURRENT_ANALYSES', 1, { min: 1, max: 4 }),
  maxQueueSize: parseInteger('MAX_QUEUE_SIZE', 8, { min: 0, max: 100 }),
  maxMovetimeMs: parseInteger('MAX_MOVETIME_MS', 500, { min: 50, max: 5000 }),
  defaultMovetimeMs: parseInteger('DEFAULT_MOVETIME_MS', 120, { min: 50, max: 5000 }),
  maxMultiPv: parseInteger('MAX_MULTIPV', 3, { min: 1, max: 10 }),
  maxStreamPositions: parseInteger('MAX_STREAM_POSITIONS', 160, { min: 1, max: 500 }),
  trustProxy: process.env.TRUST_PROXY === '1' ? 1 : false,
  apiAdminToken: readRequiredSecret('API_ADMIN_TOKEN'),
  internalGatewayToken: readRequiredSecret('INTERNAL_GATEWAY_TOKEN'),
});
