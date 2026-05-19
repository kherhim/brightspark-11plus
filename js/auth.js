// Passwordless magic-link auth client. Every call degrades gracefully:
// with no backend (or offline) it resolves to "not authenticated" and the
// app stays in free mode — it never throws into the UI.

import { hasBackend, apiUrl } from "./config.js";

const SESSION_KEY = "bs.session";

export function getSession() {
  try {
    return window.localStorage.getItem(SESSION_KEY) || null;
  } catch (e) {
    return _mem.session;
  }
}

const _mem = { session: null }; // fallback if localStorage is blocked

export function setSession(token) {
  _mem.session = token || null;
  try {
    if (token) window.localStorage.setItem(SESSION_KEY, token);
    else window.localStorage.removeItem(SESSION_KEY);
  } catch (e) {
    /* in-memory only */
  }
}

export function isSignedIn() {
  return !!getSession();
}

async function post(path, body, auth) {
  if (!hasBackend()) return { ok: false, offline: true };
  try {
    const headers = { "content-type": "application/json" };
    if (auth && getSession()) headers.Authorization = "Bearer " + getSession();
    const r = await fetch(apiUrl(path), {
      method: "POST",
      headers,
      body: JSON.stringify(body || {}),
    });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  } catch (e) {
    return { ok: false, offline: true };
  }
}

// Ask for a sign-in link. Always resolves ok-ish (server never reveals
// whether the address exists).
export async function requestLink(email) {
  return post("/auth/request", { email });
}

// Exchange a magic token for a session. Stores the session on success.
export async function verifyToken(token) {
  const res = await post("/auth/verify", { token });
  if (res.ok && res.data && res.data.session) {
    setSession(res.data.session);
    return { ok: true, email: res.data.email };
  }
  return { ok: false };
}

// Who am I + entitlement. Returns a safe "free" shape when no session /
// no backend / offline.
export async function me() {
  const FREE = { authenticated: false, paid: false };
  if (!hasBackend() || !getSession()) return FREE;
  try {
    const r = await fetch(apiUrl("/me"), {
      headers: { Authorization: "Bearer " + getSession() },
    });
    if (r.status === 401) {
      setSession(null);
      return FREE;
    }
    if (!r.ok) return FREE;
    return await r.json();
  } catch (e) {
    return FREE;
  }
}

export async function logout() {
  await post("/logout", {}, true);
  setSession(null);
}

// Start Stripe Checkout for a plan; returns a redirect URL or a reason.
export async function startCheckout(plan) {
  const res = await post("/checkout", { plan }, true);
  if (res.ok && res.data && res.data.url)
    return { ok: true, url: res.data.url };
  if (res.status === 403 && res.data && res.data.disabled)
    return { ok: false, disabled: true };
  if (res.status === 401) return { ok: false, unauthorized: true };
  return { ok: false };
}
