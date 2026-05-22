// Client config. The whole monetisation backend is OPT-IN from here:
// while API_BASE is empty the app makes ZERO backend calls and behaves
// exactly like the free, no-account, local-first app that is live today.
// The owner sets API_BASE to the deployed Worker URL at cutover (Stage C)
// — that single change "switches on" accounts/paywall.

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

// Payments only show when the backend explicitly says they're enabled.
export function paymentsEnabled() {
  return !!(_serverConfig && _serverConfig.paymentsEnabled);
}

// Free-for-all launch era: while true, every premium subject and feature
// is open to all users with no account or payment. Fails OPEN — if the
// server config has not loaded (offline, or a Worker blip) we default to
// the era being ON, so a transient outage never downgrades users to the
// restricted free tier. The Worker's /config can only ever turn it OFF.
// When the era ends (the monetisation launch) flip BOTH the Worker's
// FREE_ERA var and this default, so the fail-safe then points at "paid".
const FREE_ERA_DEFAULT = true;

export function freeEra() {
  if (_serverConfig && typeof _serverConfig.freeEra === "boolean")
    return _serverConfig.freeEra;
  return FREE_ERA_DEFAULT;
}

// Fetch the public, secret-free server config. Safe to call always:
// returns null (and the app stays in free mode) if there is no backend
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
