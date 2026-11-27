// ── Typed API error ---- ──
export class ApiError extends Error {
  constructor(message, { status = 0, code = 'NETWORK' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// Low-level fetch wrapper: JSON handling, timeout, typed failures.
export async function rawRequest(method, url, { body, isForm, token, query, timeoutMs = 15000 } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  // Append query string if provided
  let finalUrl = url;
  if (query && Object.keys(query).length > 0) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    }
    const sep = url.includes('?') ? '&' : '?';
    finalUrl = `${url}${sep}${qs.toString()}`;
  }

  const safeHeaders = { ...headers };
  if (safeHeaders.Authorization) safeHeaders.Authorization = 'Bearer [REDACTED]';
  const safeBody = body ? JSON.stringify(redactBody(body)) : undefined;
  console.log('🌐 API Request:', { method, url: finalUrl, headers: safeHeaders, body: safeBody });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(finalUrl, {
      method,
      headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal,
      credentials: 'include',
    });
  } catch (err) {
    const aborted = err.name === 'AbortError';
    throw new ApiError(aborted ? 'Request timed out. Please try again.' : 'Network error. Check your connection.', {
      status: 0,
      code: aborted ? 'TIMEOUT' : 'NETWORK',
    });
  } finally {
    clearTimeout(timer);
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  console.log('🌐 API Response:', { status: response.status, ok: response.ok, data: redactBody(data) });

  if (!response.ok) {
    throw new ApiError(data.message || 'Request failed', {
      status: response.status,
      code: data.code || 'HTTP',
    });
  }
  return data;
}

/** Redact sensitive fields from request/response bodies before logging. */
function redactBody(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  const out = { ...obj };
  const secrets = ['password', 'current_password', 'new_password', 'accessToken', 'refreshToken', 'token', 'code'];
  for (const key of secrets) {
    if (key in out) out[key] = '[REDACTED]';
  }
  return out;
}