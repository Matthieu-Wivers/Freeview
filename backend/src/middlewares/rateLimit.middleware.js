/**
 * Global API rate limiter.
 *
 * This is a general abuse-control layer. Authentication and compute-intensive
 * routes can additionally define endpoint-specific policies.
 */
import rateLimit from 'express-rate-limit';

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  // Emit standardized RateLimit headers so clients can adapt their retry behavior.
standardHeaders: true,
  // Avoid duplicate legacy X-RateLimit-* headers.
legacyHeaders: false,
  message: {
    error: 'RATE_LIMITED',
    message: 'Trop de requêtes. Réessaie dans quelques instants.',
  },
});
