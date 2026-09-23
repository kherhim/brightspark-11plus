// Brightspark Prep monetisation Worker: magic-link auth, entitlement and
// Stripe Checkout. Minimal by design — no progress sync, no benchmarking,
// no AI (deferred). The static site only talks to this when js/config.js
// has an API base AND the user has a session; otherwise the app is the
// free, no-backend experience exactly as before.

import {
  randomId, sha256hex, json, allowedOrigin, corsHeaders, parseBearer,
  entitlementFor, isEntitlementActive, verifyStripeSignature,
  normaliseEmail, isEmail, formBody,
} from "./lib.js";

const SESSION_TTL_MS = 60 * 86400000; // 60 days
const MAGIC_TTL_S = 900; // 15 min, single-use
import { environment, emailTransportReady, reserveEmail } from "./auth-security.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const reqOrigin = request.headers.get("Origin");
    const origin = allowedOrigin(reqOrigin, env.ALLOWED_ORIGIN);
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS")
      return new Response(null, { status: origin ? 204 : 403, headers: cors });

    // Browser calls must come from an allowed origin (webhook is server→server).
    if (reqOrigin && !origin && path !== "/stripe/webhook")
      return json({ error: "origin_not_allowed" }, 403);

    try {
      const res = await route(path, request, env, url);
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      return res;
    } catch (e) {
      return json({ error: "server_error" }, 500, cors);
    }
  },
};

async function route(path, request, env, url) {
  const m = request.method;

  if (path === "/health" && m === "GET") return json({ ok: true });

  // Public, secret-free config the client mirrors to decide what to show.
  if (path === "/config" && m === "GET")
    return json({
      cloud: true,
      paymentsEnabled: String(env.PAYMENTS_ENABLED) === "true",
      freeEra: String(env.FREE_ERA) === "true",
      consentVersion: env.CONSENT_VERSION || null,
      plans: [
        { id: "oneoff", label: "11+ Access" },
        { id: "family", label: "Family" },
        { id: "annual", label: "Annual" },
      ],
    });

  if (path === "/auth/request" && m === "POST")
    return authRequest(request, env);
  if (path === "/auth/verify" && m === "POST") return authVerify(request, env);
  if (path === "/me" && m === "GET") return me(request, env);
  if (path === "/logout" && m === "POST") return logout(request, env);
  if (path === "/checkout" && m === "POST") return checkout(request, env, url);
  if (path === "/stripe/webhook" && m === "POST")
    return stripeWebhook(request, env);

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

// --- payments ------------------------------------------------------------

async function checkout(request, env, url) {
  if (String(env.PAYMENTS_ENABLED) !== "true")
    return json({ disabled: true }, 403);
  const s = await sessionAccount(request, env);
  if (!s) return json({ error: "unauthorized" }, 401);
  const { plan } = await safeJson(request);
  if (!["oneoff", "family", "annual"].includes(plan)) return json({ error: "bad_plan" }, 400);
  const priceId = {
    oneoff: env.PRICE_ONEOFF,
    family: env.PRICE_FAMILY,
    annual: env.PRICE_ANNUAL,
  }[plan];
  if (!priceId) return json({ error: "bad_plan" }, 400);

  const base = env.MAGIC_LINK_BASE; // app.html
  const body = formBody({
    mode: "payment",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": 1,
    client_reference_id: s.accountId,
    customer_email: s.email,
    "automatic_tax[enabled]": "true",
    success_url: `${base}#/account/paid`,
    cancel_url: `${base}#/account/cancelled`,
    "metadata[account_id]": s.accountId,
    "metadata[plan]": plan,
  });
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await r.json();
  if (!r.ok) return json({ error: "stripe_error" }, 502);
  return json({ url: data.url });
}

async function stripeWebhook(request, env) {
  const raw = await request.text();
  const ok = await verifyStripeSignature(
    raw,
    request.headers.get("Stripe-Signature"),
    env.STRIPE_WEBHOOK_SECRET
  );
  if (!ok) return json({ error: "bad_signature" }, 400);

  const event = JSON.parse(raw);
  if (!event || typeof event.id !== "string" ||
      !["true", "false"].includes(String(env.STRIPE_LIVE_MODE)) ||
      event.livemode !== (String(env.STRIPE_LIVE_MODE) === "true"))
    return json({ error: "bad_event" }, 400);
  const relevant = ["checkout.session.completed", "checkout.session.async_payment_succeeded"];
  if (!relevant.includes(event.type)) return json({ received: true });
  const sess = event.data?.object;
  if (!sess || sess.livemode !== event.livemode || sess.mode !== "payment")
    return json({ error: "bad_checkout" }, 400);
  // Completed may mean a delayed payment is still unpaid. Its later async
  // success is processed separately; no entitlement is granted in the meantime.
  if (sess.payment_status !== "paid") return json({ received: true });
  const accountId = sess.metadata?.account_id || sess.client_reference_id;
  const plan = sess.metadata?.plan;
  const ent = entitlementFor(plan, env);
  if (typeof accountId !== "string" || typeof sess.id !== "string" || !ent ||
      (sess.client_reference_id && sess.client_reference_id !== accountId))
    return json({ error: "bad_checkout" }, 400);
  const seen = await env.DB.prepare("SELECT event_id FROM stripe_events WHERE event_id=?")
    .bind(event.id).first();
  if (seen) return json({ received: true });
  const now = Date.now();
  // Batch is a D1 transaction. A failed grant rolls back both deduplication
  // records. changes() gates the update on this transaction's new checkout.
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO checkout_fulfillments
      (environment,checkout_id,account_id,event_id,fulfilled_at) VALUES (?,?,?,?,?)
      ON CONFLICT(environment,checkout_id) DO NOTHING`)
      .bind(environment(env), sess.id, accountId, event.id, now),
    env.DB.prepare(`INSERT INTO entitlements
      (account_id,plan,status,seats,valid_until,stripe_customer,updated_at)
      SELECT ?,?,?,?,?,?,? WHERE changes()=1
      ON CONFLICT(account_id) DO UPDATE SET plan=excluded.plan,status=excluded.status,
      seats=excluded.seats,valid_until=excluded.valid_until,
      stripe_customer=excluded.stripe_customer,updated_at=excluded.updated_at`)
      .bind(accountId, ent.plan, ent.status, ent.seats, ent.valid_until, sess.customer || null, now),
    env.DB.prepare("INSERT INTO stripe_events (event_id,type,received_at) VALUES (?,?,?) ON CONFLICT(event_id) DO NOTHING")
      .bind(event.id, event.type, now),
  ]);
  return json({ received: true });
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
