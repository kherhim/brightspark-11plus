// Brightspark Prep Worker: optional magic-link accounts. Minimal by
// design — no progress sync, no benchmarking, no AI (deferred). The
// service is free and takes no payments: payment code was removed and is
// archived at git tag payments-archive-2026-11. The static site only talks
// to this when js/config.js has an API base AND the user has a session;
// otherwise the app is the free, no-backend experience.

import {
  randomId, sha256hex, json, allowedOrigin, corsHeaders, parseBearer,
  isEntitlementActive, normaliseEmail, isEmail,
} from "./lib.js";

const SESSION_TTL_MS = 60 * 86400000; // 60 days
const MAGIC_TTL_S = 900; // 15 min, single-use
import { environment, emailTransportReady, reserveEmail } from "./auth-security.js";

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
    const reqOrigin = request.headers.get("Origin");
    const origin = allowedOrigin(reqOrigin, env.ALLOWED_ORIGIN);
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS")
      return new Response(null, { status: origin ? 204 : 403, headers: cors });

    // Browser calls must come from an allowed origin.
    if (reqOrigin && !origin)
      return json({ error: "origin_not_allowed" }, 403);

    try {
      const res = await route(path, request, env);
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      return res;
    } catch (e) {
      return json({ error: "server_error" }, 500, cors);
    }
  },
};

async function route(path, request, env) {
  const m = request.method;

  if (path === "/health" && m === "GET") return json({ ok: true });

  // Public, secret-free config the client mirrors to decide what to show.
  if (path === "/config" && m === "GET")
    return json({
      cloud: true,
      // Always true: older cached clients read this and would otherwise
      // re-lock premium content. Everything is free; nothing is gated.
      freeEra: true,
      consentVersion: env.CONSENT_VERSION || null,
    });

  if (path === "/auth/request" && m === "POST")
    return authRequest(request, env);
  if (path === "/auth/verify" && m === "POST") return authVerify(request, env);
  if (path === "/me" && m === "GET") return me(request, env);
  if (path === "/logout" && m === "POST") return logout(request, env);

  return json({ error: "not_found" }, 404);
}

// --- auth ----------------------------------------------------------------

async function authRequest(request, env) {
  const { email } = await safeJson(request);
  const addr = normaliseEmail(email);
  // Never reveal whether an address exists; always answer ok.
  if (!isEmail(addr)) return json({ ok: true });

  if (!emailTransportReady(request, env))
    return json({ error: "email_unavailable" }, 503);
  if (!await reserveEmail(request, env, addr)) return json({ ok: true });

  const token = randomId(24);
  const tokenHash = await sha256hex(token);
  await env.DB.prepare(
    "INSERT INTO magic_tokens (environment,token_hash,email,expires_at) VALUES (?,?,?,?)"
  ).bind(environment(env), tokenHash, addr, Date.now() + MAGIC_TTL_S * 1000).run();
  const link = `${env.MAGIC_LINK_BASE}#/verify/${encodeURIComponent(token)}`;
  try {
    await sendMagicLink(request, env, addr, link);
  } catch (e) {
    await env.DB.prepare("DELETE FROM magic_tokens WHERE environment=? AND token_hash=?")
      .bind(environment(env), tokenHash).run();
    return json({ error: "email_unavailable" }, 503);
  }
  return json({ ok: true });
}

async function authVerify(request, env) {
  const { token } = await safeJson(request);
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{32}$/.test(token))
    return json({ error: "bad_token" }, 400);
  const now = Date.now();
  // DELETE ... RETURNING atomically consumes an unexpired, environment-bound token.
  const row = await env.DB.prepare(
    "DELETE FROM magic_tokens WHERE environment=? AND token_hash=? AND expires_at>? RETURNING email"
  ).bind(environment(env), await sha256hex(token), now).first();
  if (!row) return json({ error: "bad_token" }, 400);
  const { email } = row;
  const session = "ses_" + randomId(24);
  // Upsert + session creation in one transaction, including simultaneous first sign-ins.
  await env.DB.batch([
    env.DB.prepare("INSERT INTO accounts (account_id,email,created_at,consent_at,consent_version) VALUES (?,?,?,?,?) ON CONFLICT(email) DO NOTHING")
      .bind("acc_" + randomId(12), email, now, now, env.CONSENT_VERSION || null),
    env.DB.prepare("INSERT INTO entitlements (account_id,status,seats,updated_at) SELECT account_id,'none',1,? FROM accounts WHERE email=? ON CONFLICT(account_id) DO NOTHING")
      .bind(now, email),
    env.DB.prepare("INSERT INTO sessions (session_id,account_id,created_at,expires_at,environment) SELECT ?,account_id,?,?,? FROM accounts WHERE email=?")
      .bind(session, now, now + SESSION_TTL_MS, environment(env), email),
  ]);

  return json({ ok: true, session, email });
}

async function sessionAccount(request, env) {
  const sid = parseBearer(request.headers.get("Authorization"));
  if (!sid) return null;
  const row = await env.DB.prepare(
    "SELECT s.account_id, s.expires_at, a.email FROM sessions s JOIN accounts a ON a.account_id = s.account_id WHERE s.session_id = ? AND s.environment = ?"
  )
    .bind(sid, environment(env))
    .first();
  if (!row || row.expires_at <= Date.now()) return null;
  return { sid, accountId: row.account_id, email: row.email };
}

async function me(request, env) {
  const s = await sessionAccount(request, env);
  if (!s) return json({ authenticated: false, paid: false }, 401);
  const ent = await env.DB.prepare(
    "SELECT plan,status,seats,valid_until FROM entitlements WHERE account_id = ?"
  )
    .bind(s.accountId)
    .first();
  const paid = isEntitlementActive(ent);
  return json({
    authenticated: true,
    email: s.email,
    paid,
    plan: paid ? ent.plan : null,
    seats: paid ? ent.seats : 0,
    valid_until: paid ? ent.valid_until : null,
  });
}

async function logout(request, env) {
  const sid = parseBearer(request.headers.get("Authorization"));
  if (sid)
    await env.DB.prepare("DELETE FROM sessions WHERE session_id = ? AND environment = ?")
      .bind(sid, environment(env))
      .run();
  return json({ ok: true });
}

// --- helpers -------------------------------------------------------------

async function safeJson(request) {
  try {
    return await request.json();
  } catch (e) {
    return {};
  }
}

async function sendMagicLink(request, env, email, link) {
  if (env.EMAIL_PROVIDER === "resend" && env.EMAIL_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.EMAIL_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: email,
        subject: "Your Brightspark Prep sign-in link",
        text: `Tap to sign in (valid 15 minutes):\n\n${link}\n\nIf you didn't request this, ignore this email.`,
      }),
    });
    if (!response.ok) throw new Error("Email delivery failed");
    return;
  }
  if (!emailTransportReady(request, env)) throw new Error("Email unavailable");
  // Dev/console transport — link appears in `wrangler dev` logs.
  console.log(`[magic-link] ${email} -> ${link}`);
}
