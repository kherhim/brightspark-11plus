// Client config. The optional accounts backend is OPT-IN from here:
// while API_BASE is empty the app makes ZERO backend calls and behaves
// exactly like the free, no-account, local-first app. Setting API_BASE to
// the deployed Worker URL switches on optional sign-in. The service is
// free and takes no payments; nothing in the app is gated.

export const API_BASE = "https://brightspark-worker-production.brightspark.workers.dev"; // live Worker — Stage C cutover

let _serverConfig = null; // mirror of GET /config once fetched

export function hasBackend() {
  return typeof API_BASE === "string" && API_BASE.length > 0;
}

export function apiUrl(path) {
  return API_BASE.replace(/\/+$/, "") + path;
}

export function setServerConfig(c) {
  _serverConfig = c || null;
}

export function serverConfig() {
  return _serverConfig;
}

// Fetch the public, secret-free server config. Safe to call always:
// returns null (and the app works without accounts) if there is no backend
// or it is unreachable.
export async function loadServerConfig() {
  if (!hasBackend()) return null;
  try {
    const r = await fetch(apiUrl("/config"), { method: "GET" });
    if (!r.ok) return null;
    _serverConfig = await r.json();
    return _serverConfig;
  } catch (e) {
    return null;
  }
}
