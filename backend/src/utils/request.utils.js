const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function cleanString(value, { defaultValue = '', maxLength = 10_000 } = {}) {
  const cleaned = String(value ?? defaultValue).trim();
  return cleaned.slice(0, maxLength);
}

export function cleanNullableString(value, { maxLength = 10_000 } = {}) {
  const cleaned = cleanString(value, { defaultValue: '', maxLength });
  return cleaned || null;
}

export function parsePagination(query = {}) {
  const rawLimit = Number(query.limit ?? DEFAULT_LIMIT);
  const rawOffset = Number(query.offset ?? 0);

  const limit = Number.isFinite(rawLimit)
    ? Math.min(MAX_LIMIT, Math.max(1, Math.trunc(rawLimit)))
    : DEFAULT_LIMIT;

  const offset = Number.isFinite(rawOffset)
    ? Math.max(0, Math.trunc(rawOffset))
    : 0;

  return { limit, offset };
}

export function parseBooleanQuery(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();

  if (['1', 'true', 'yes', 'enabled'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'disabled'].includes(normalized)) {
    return false;
  }

  return null;
}
