// Discard bearer credentials left by older versions.
try { localStorage.removeItem('marketos_auth_token'); } catch { /* Storage can be disabled. */ }

export async function apiFetch(path, options = {}) {
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers,
  });

  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  }

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = data?.code || 'API_ERROR';
    throw err;
  }

  return data;
}
