/**
 * Central API error translation.
 *
 * Controllers and services can throw structured errors while this middleware
 * converts them into stable HTTP responses. Production responses intentionally
 * omit stack traces and database metadata.
 */
import { env } from '../utils/env.utils.js';

// Preserve operational diagnostics in server logs without exposing them to clients.
function formatErrorForLogs(error) {
  return {
    name: error?.name,
    code: error?.code,
    status: error?.status,
    message: error?.message,
    detail: error?.detail,
    hint: error?.hint,
    schema: error?.schema,
    table: error?.table,
    column: error?.column,
    constraint: error?.constraint,
    routine: error?.routine,
    stack: error?.stack,
  };
}

/**
 * Returns a predictable payload for every unmatched route.
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route inconnue: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Maps known parser errors and application errors to safe JSON responses.
 * The four-argument signature is required for Express error middleware.
 */
export function errorHandler(error, req, res, _next) {
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

  // Server-side failures are logged with request context for incident diagnosis.
if (safeStatus >= 500) {
    console.error('Unhandled API error:', {
      request: {
        method: req?.method,
        path: req?.originalUrl,
      },
      error: formatErrorForLogs(error),
    });
  }

  // Never disclose internal exception messages for production HTTP 500 responses.
const payload = {
    error: error?.code ?? (safeStatus === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
    message: safeStatus === 500 && env.nodeEnv === 'production'
      ? 'Erreur interne du serveur.'
      : error?.message ?? 'Erreur interne du serveur.',
  };

  // Rich diagnostics are limited to development environments.
if (env.nodeEnv !== 'production') {
    if (error?.stack) {
      payload.stack = error.stack;
    }

    if (error?.detail) {
      payload.detail = error.detail;
    }

    if (error?.hint) {
      payload.hint = error.hint;
    }

    if (error?.table) {
      payload.table = error.table;
    }

    if (error?.column) {
      payload.column = error.column;
    }

    if (error?.constraint) {
      payload.constraint = error.constraint;
    }
  }

  return res.status(safeStatus).json(payload);
}
