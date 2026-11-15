// Pure, dependency-free helpers for the Brightspark Worker. Everything
// here uses only Web Crypto / standard globals (available both in
// Cloudflare Workers and in Node 18+), so it is unit-testable with plain
// `node --test` — no miniflare/wrangler needed for the core logic.

const enc = new TextEncoder();

// URL-safe random id (default ~144 bits).
export function randomId(bytes = 18) {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function sha256hex(s) {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(String(s)));
  return [...new Uint8Array(d)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

// CSV allow-list → the exact echoed origin (or null if not allowed).
export function allowedOrigin(reqOrigin, allowedCsv) {
  if (!reqOrigin) return null;
  const list = String(allowedCsv || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(reqOrigin) ? reqOrigin : null;
}

export function corsHeaders(origin) {
  return origin
    ? {
        "access-control-allow-origin": origin,
        "access-control-allow-methods": "GET,POST,OPTIONS",
        "access-control-allow-headers": "content-type,authorization",
        "access-control-max-age": "86400",
        vary: "Origin",
      }
    : {};
}

export function parseBearer(authHeader) {
  const m = /^Bearer\s+(.+)$/i.exec(authHeader || "");
  return m ? m[1].trim() : null;
}

export function isEntitlementActive(row, nowMs = Date.now()) {
  return !!(
    row &&
    row.status === "active" &&
    typeof row.valid_until === "number" &&
    row.valid_until > nowMs
  );
}

export function normaliseEmail(e) {
  return String(e || "")
    .trim()
    .toLowerCase();
}

export function isEmail(e) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e || ""));
}
