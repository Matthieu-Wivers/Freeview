process.env.NODE_ENV = 'test';

process.env.PORT = process.env.PORT || '3000';

process.env.FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgres://freeview_test:freeview_test@localhost:5432/freeview_test';

process.env.AUTH_JWT_SECRET =
  process.env.AUTH_JWT_SECRET ||
  'test-auth-jwt-secret-with-more-than-32-characters';

process.env.API_ADMIN_TOKEN =
  process.env.API_ADMIN_TOKEN ||
  'test-api-admin-token-with-more-than-16-characters';

process.env.INTERNAL_GATEWAY_TOKEN =
  process.env.INTERNAL_GATEWAY_TOKEN ||
  'test-internal-gateway-token-with-more-than-16-characters';

process.env.AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'freeview_session';
process.env.AUTH_COOKIE_MAX_AGE_SECONDS = process.env.AUTH_COOKIE_MAX_AGE_SECONDS || '604800';

process.env.STOCKFISH_PATH = process.env.STOCKFISH_PATH || '/usr/local/bin/stockfish';
process.env.STOCKFISH_THREADS = process.env.STOCKFISH_THREADS || '1';
process.env.STOCKFISH_HASH_MB = process.env.STOCKFISH_HASH_MB || '64';

process.env.MAX_CONCURRENT_ANALYSES = process.env.MAX_CONCURRENT_ANALYSES || '1';
process.env.MAX_QUEUE_SIZE = process.env.MAX_QUEUE_SIZE || '16';
process.env.MAX_STREAM_POSITIONS = process.env.MAX_STREAM_POSITIONS || '160';
process.env.DEFAULT_MOVETIME_MS = process.env.DEFAULT_MOVETIME_MS || '120';
process.env.MAX_MULTIPV = process.env.MAX_MULTIPV || '3';