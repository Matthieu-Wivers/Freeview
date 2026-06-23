import { env } from '../utils/env.utils.js';

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

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route inconnue: ${req.method} ${req.originalUrl}`,
  });
}

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

  if (safeStatus >= 500) {
    console.error('Unhandled API error:', {
      request: {
        method: req?.method,
        path: req?.originalUrl,
      },
      error: formatErrorForLogs(error),
    });
  }

  const payload = {
    error: error?.code ?? (safeStatus === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
    message:
      safeStatus === 500 && env.nodeEnv === 'production'
        ? 'Erreur interne du serveur.'
        : error?.message ?? 'Erreur interne du serveur.',
  };

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