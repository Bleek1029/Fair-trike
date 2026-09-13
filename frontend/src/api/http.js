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
export async function rawRequest(method, url, { body, isForm, token, timeoutMs = 15000 } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal,
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

  if (!response.ok) {
    throw new ApiError(data.message || 'Request failed', {
      status: response.status,
      code: data.code || 'HTTP',
    });
  }
  return data;
}