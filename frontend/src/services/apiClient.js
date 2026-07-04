const API_BASE_URL = '/api';

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

function isFormData(value) {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

async function readResponse(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function normalizePath(path) {
  if (!path) {
    return API_BASE_URL;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (path.startsWith('/api/')) {
    return path;
  }

  if (path === '/api') {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function apiRequest(path, options = {}) {
  const { body, headers = {}, ...rest } = options;
  const hasBody = body !== undefined && body !== null;
  const shouldSendJson = hasBody && !isFormData(body) && typeof body !== 'string';

  const response = await fetch(normalizePath(path), {
    credentials: 'include',
    headers: {
      ...(shouldSendJson ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: shouldSendJson ? JSON.stringify(body) : body,
    ...rest,
  });

  const payload = await readResponse(response);

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      payload?.detail ||
      `Erreur API ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return payload;
}

export function asArray(payload, keys = []) {
  if (Array.isArray(payload)) {
    return payload;
  }

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }

    if (Array.isArray(payload?.data?.[key])) {
      return payload.data[key];
    }
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  return [];
}

export function asObject(payload, keys = []) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {};
  }

  for (const key of keys) {
    if (payload[key] && typeof payload[key] === 'object') {
      return payload[key];
    }

    if (payload.data?.[key] && typeof payload.data[key] === 'object') {
      return payload.data[key];
    }
  }

  if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    return payload.data;
  }

  return payload;
}

export function buildQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    query.set(key, String(value));
  });

  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}
