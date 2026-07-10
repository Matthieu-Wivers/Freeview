/**
 * Express application composition root.
 *
 * This file wires cross-cutting security middleware before feature routes,
 * then registers the final 404 and error handlers. Middleware order is part
 * of the application's security contract and must be reviewed when changed.
 */
import express from 'express';
import helmet from 'helmet';

import { env } from './utils/env.utils.js';
import { requireGatewayOrLocalAdmin } from './middlewares/security.middleware.js';
import { apiRateLimiter } from './middlewares/rateLimit.middleware.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';

import healthRoutes from './routes/health.routes.js';
import stockfishRoutes from './routes/stockfish.routes.js';
import authRoutes from './routes/auth.routes.js';
import gameRoutes from './routes/game.routes.js';
import sharedGameRoutes from './routes/sharedGame.routes.js';
import sharedGameCommentRoutes from './routes/sharedGameComment.routes.js';
import likeRoutes from './routes/like.routes.js';
import commentRoutes from './routes/comment.routes.js';
import reportRoutes from './routes/report.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();

// Trust only the proxy configuration explicitly provided by the environment.
// Express uses this setting when resolving req.ip and secure cookie behavior.
app.set('trust proxy', env.trustProxy);
app.disable('x-powered-by');

// Helmet applies secure HTTP response headers. CSP is intentionally delegated
// to the frontend/Nginx deployment because the SPA has its own asset policy.
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);

// Reject direct API traffic before parsing request bodies or executing routes.
// Production requests are expected to pass through the trusted gateway.
app.use('/api', requireGatewayOrLocalAdmin);
// The body limit reduces memory pressure and constrains abusive JSON payloads.
app.use(express.json({ limit: '64kb' }));
// Apply a global abuse-control baseline; sensitive endpoints may add stricter limits.
app.use('/api', apiRateLimiter);

// Feature routers remain thin HTTP entry points. Business rules live in services
// and persistence details remain isolated in repositories.
app.use('/api/health', healthRoutes);
app.use('/api/stockfish', stockfishRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/shared-games', sharedGameCommentRoutes);
app.use('/api/shared-games', likeRoutes);
app.use('/api/shared-games', sharedGameRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

// Terminal handlers must be registered after every feature route.
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
