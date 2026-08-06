// Shared helpers for talking to the REST API and holding the session
// (JWT + user profile) in memory + sessionStorage for this tab.
//
// Note: sessionStorage is used (not localStorage) so a signed-in session
// doesn't silently persist forever on shared machines; it clears when the
// tab closes, same as most conferencing apps' "guest" sessions.

const API_BASE = ''; // same-origin: server serves the client statically

const Session = {
  KEY: 'signal_session',

  save(token, user) {
    sessionStorage.setItem(Session.KEY, JSON.stringify({ token, user }));
  },

  get() {
    const raw = sessionStorage.getItem(Session.KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  clear() {
    sessionStorage.removeItem(Session.KEY);
  },

  requireOrRedirect() {
    const session = Session.get();
    if (!session) {
      window.location.href = 'index.html';
      return null;
    }
    return session;
  },
};

async function apiRequest(path, { method = 'GET', body, isForm = false, auth = true } = {}) {
  const headers = {};
  if (!isForm) headers['Content-Type'] = 'application/json';

  if (auth) {
    const session = Session.get();
    if (session?.token) headers['Authorization'] = `Bearer ${session.token}`;
  }

  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON response (e.g. file download uses its own handling elsewhere)
  }

  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}
