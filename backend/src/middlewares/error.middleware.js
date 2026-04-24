import { env } from '../utils/env.utils.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route inconnue: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(error, _req, res, _next) {
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'PAYLOAD_TOO_LARGE',
      message: 'Le corps de la requête est trop volumineux.',
    });
  }

  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({
      error: 'INVALID_JSON',
      message: 'JSON invalide.',
    });
  }

  const status = Number.isInteger(error?.status) ? error.status : 500;
  const safeStatus = status >= 400 && status <= 599 ? status : 500;

  const payload = {
    error: error?.code ?? (safeStatus === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
    message: safeStatus === 500 && env.nodeEnv === 'production'
      ? 'Erreur interne du serveur.'
      : error?.message ?? 'Erreur interne du serveur.',
  };

  if (env.nodeEnv !== 'production' && error?.stack) {
    payload.stack = error.stack;
  }

  return res.status(safeStatus).json(payload);
}
