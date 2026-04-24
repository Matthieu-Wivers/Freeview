import express from 'express';
import helmet from 'helmet';
import { env } from './utils/env.utils.js';
import { requireGatewayOrLocalAdmin } from './middlewares/security.middleware.js';
import { apiRateLimiter } from './middlewares/rateLimit.middleware.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import healthRoutes from './routes/health.routes.js';
import stockfishRoutes from './routes/stockfish.routes.js';

const app = express();

app.set('trust proxy', env.trustProxy);
app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: false,
}));

app.use('/api', requireGatewayOrLocalAdmin);
app.use(express.json({ limit: '64kb' }));
app.use('/api', apiRateLimiter);

app.use('/api/health', healthRoutes);
app.use('/api/stockfish', stockfishRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
