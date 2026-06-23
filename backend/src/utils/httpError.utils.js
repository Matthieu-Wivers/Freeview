export function createHttpError(status, code, message, details = undefined) {
  const error = new Error(message);
  error.name = 'HttpError';
  error.status = status;
  error.code = code;

  if (details !== undefined) {
    error.details = details;
  }

  return error;
}

export function assertUuid(value, fieldName = 'id') {
  const cleaned = String(value ?? '').trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(cleaned)) {
    throw createHttpError(400, 'INVALID_ID', `${fieldName} invalide.`);
  }

  return cleaned;
}

export function isUniqueViolation(error) {
  return error?.code === '23505';
}

export function isForeignKeyViolation(error) {
  return error?.code === '23503';
}
