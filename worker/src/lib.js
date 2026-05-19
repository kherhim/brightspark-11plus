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

// Map a Stripe price id → our plan name using env config.
export function planFromPrice(env, priceId) {
  if (priceId && priceId === env.PRICE_ONEOFF) return "oneoff";
  if (priceId && priceId === env.PRICE_FAMILY) return "family";
  if (priceId && priceId === env.PRICE_ANNUAL) return "annual";
  return null;
}

// Entitlement granted for a plan (one-off windows; no subscriptions).
export function entitlementFor(plan, env, nowMs = Date.now()) {
  const days = {
    oneoff: Number(env.ACCESS_DAYS_ONEOFF || 1095),
    family: Number(env.ACCESS_DAYS_FAMILY || 1095),
    annual: Number(env.ACCESS_DAYS_ANNUAL || 365),
  }[plan];
  if (!days) return null;
  return {
    plan,
    status: "active",
    seats: plan === "family" ? Number(env.FAMILY_SEATS || 3) : 1,
    valid_until: nowMs + days * 86400000,
  };
}

export function isEntitlementActive(row, nowMs = Date.now()) {
  return !!(
    row &&
    row.status === "active" &&
    typeof row.valid_until === "number" &&
    row.valid_until > nowMs
  );
}

// Verify a Stripe webhook signature header ("t=...,v1=...") against the
// raw request body. Constant-time compare; rejects stale timestamps.
export async function verifyStripeSignature(
  payload,
  sigHeader,
  secret,
  toleranceSec = 300,
  nowSec = Math.floor(Date.now() / 1000)
) {
  if (!sigHeader || !secret) return false;
  const parts = Object.fromEntries(
    String(sigHeader)
      .split(",")
      .map((kv) => kv.split("=").map((x) => x.trim()))
  );
  const t = Number(parts.t);
  const v1 = parts.v1;
  if (!t || !v1) return false;
  if (Math.abs(nowSec - t) > toleranceSec) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`${t}.${payload}`)
  );
  const expected = [...new Uint8Array(mac)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
  return timingSafeEqualHex(expected, v1);
}

export function timingSafeEqualHex(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length)
    return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function normaliseEmail(e) {
  return String(e || "")
    .trim()
    .toLowerCase();
}

export function isEmail(e) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e || ""));
}

// x-www-form-urlencoded body builder (Stripe API expects this).
export function formBody(obj) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj))
    if (v !== undefined && v !== null) p.append(k, String(v));
  return p.toString();
}
