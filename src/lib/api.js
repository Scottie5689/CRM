export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);

export async function api(method, url, body) {
  const hasBody = method !== 'GET' && method !== 'DELETE';
  let res;
  try {
    res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: hasBody ? { 'Content-Type': 'application/json' } : {},
      body: hasBody ? JSON.stringify(body ?? {}) : undefined
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Is it running?");
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (res.status === 401 && url !== '/api/login') {
    onUnauthorized();
    throw new ApiError(401, 'Your session has ended. Please sign in again.');
  }
  if (!res.ok) throw new ApiError(res.status, data?.error || `Request failed (${res.status})`);
  return data;
}
