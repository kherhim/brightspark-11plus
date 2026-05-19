// Integration test for the Worker request router — drives src/index.js
// end to end with in-memory D1/KV fakes (no wrangler/Cloudflare/Stripe
// network). Exercises the full magic-link → session → entitlement →
// Stripe-webhook flow plus the security edges.

import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const enc = new TextEncoder();

function makeEnv(overrides = {}) {
  const accounts = new Map(); // email -> row
  const sessions = new Map(); // session_id -> row
  const entitlements = new Map(); // account_id -> row
  const events = new Set(); // stripe event ids
  const kv = new Map();
  const byId = (id) =>
    [...accounts.values()].find((a) => a.account_id === id) || null;

  const DB = {
    prepare(sql) {
      return {
        bind(...p) {
          return {
            async first() {
              if (sql.includes("FROM accounts WHERE email"))
                return accounts.has(p[0])
                  ? { account_id: accounts.get(p[0]).account_id }
                  : null;
              if (sql.includes("FROM sessions s JOIN accounts a")) {
                const s = sessions.get(p[0]);
                if (!s) return null;
                const a = byId(s.account_id);
                return {
                  account_id: s.account_id,
                  expires_at: s.expires_at,
                  email: a && a.email,
                };
              }
              if (sql.includes("FROM entitlements WHERE account_id")) {
                const e = entitlements.get(p[0]);
                return e
                  ? {
                      plan: e.plan,
                      status: e.status,
                      seats: e.seats,
                      valid_until: e.valid_until,
                    }
                  : null;
              }
              if (sql.includes("FROM stripe_events"))
                return events.has(p[0]) ? { event_id: p[0] } : null;
              return null;
            },
            async run() {
              if (sql.includes("INSERT INTO accounts"))
                accounts.set(p[1], {
                  account_id: p[0],
                  email: p[1],
                  created_at: p[2],
                  consent_at: p[3],
                  consent_version: p[4],
                });
              else if (sql.includes("INSERT INTO entitlements"))
                entitlements.set(p[0], {
                  account_id: p[0],
                  plan: null,
                  status: "none",
                  seats: 1,
                  valid_until: null,
                });
              else if (sql.includes("INSERT INTO sessions"))
                sessions.set(p[0], {
                  session_id: p[0],
                  account_id: p[1],
                  created_at: p[2],
                  expires_at: p[3],
                });
              else if (sql.includes("DELETE FROM sessions"))
                sessions.delete(p[0]);
              else if (sql.includes("INSERT INTO stripe_events"))
                events.add(p[0]);
              else if (sql.includes("UPDATE entitlements SET"))
                entitlements.set(p[6], {
                  account_id: p[6],
                  plan: p[0],
                  status: p[1],
                  seats: p[2],
                  valid_until: p[3],
                  stripe_customer: p[4],
                });
              return { success: true };
            },
          };
        },
      };
    },
  };

  const KV = {
    async get(k) {
      return kv.has(k) ? kv.get(k) : null;
    },
    async put(k, v) {
      kv.set(k, v);
    },
    async delete(k) {
      kv.delete(k);
    },
  };

  return {
    DB,
    KV,
    _state: { accounts, sessions, entitlements, events, kv },
    ALLOWED_ORIGIN: "http://localhost:8000",
    MAGIC_LINK_BASE: "http://localhost:8000/app.html",
    CONSENT_VERSION: "2026-05-19",
    EMAIL_PROVIDER: "console",
    EMAIL_FROM: "x <no-reply@example.com>",
    PRICE_ONEOFF: "price_one",
    PRICE_FAMILY: "price_fam",
    PRICE_ANNUAL: "price_ann",
    ACCESS_DAYS_ONEOFF: "1095",
    ACCESS_DAYS_FAMILY: "1095",
    ACCESS_DAYS_ANNUAL: "365",
    FAMILY_SEATS: "3",
    PAYMENTS_ENABLED: "false",
    STRIPE_WEBHOOK_SECRET: "whsec_test",
    STRIPE_SECRET: "sk_test_unused",
    ...overrides,
  };
}

const ORIGIN = "http://localhost:8000";
const req = (path, opts = {}) =>
  new Request("https://api.test" + path, {
    headers: { Origin: ORIGIN, ...(opts.headers || {}) },
    ...opts,
  });

async function stripeSig(payload, secret) {
  const t = Math.floor(Date.now() / 1000);
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
  const hex = [...new Uint8Array(mac)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
  return `t=${t},v1=${hex}`;
}

test("GET /health", async () => {
  const r = await worker.fetch(req("/health"), makeEnv());
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
});

test("GET /config: secret-free, payments off", async () => {
  const r = await worker.fetch(req("/config"), makeEnv());
  const j = await r.json();
  assert.equal(j.cloud, true);
  assert.equal(j.paymentsEnabled, false);
  assert.equal(JSON.stringify(j).includes("whsec"), false);
});

test("CORS: preflight allowed vs blocked", async () => {
  const ok = await worker.fetch(
    req("/me", { method: "OPTIONS" }),
    makeEnv()
  );
  assert.equal(ok.status, 204);
  assert.equal(
    ok.headers.get("access-control-allow-origin"),
    ORIGIN
  );
  const bad = await worker.fetch(
    new Request("https://api.test/me", {
      method: "OPTIONS",
      headers: { Origin: "https://evil.com" },
    }),
    makeEnv()
  );
  assert.equal(bad.status, 403);
});

test("GET /me without session → 401 free shape", async () => {
  const r = await worker.fetch(req("/me"), makeEnv());
  assert.equal(r.status, 401);
  assert.deepEqual(await r.json(), { authenticated: false, paid: false });
});

test("webhook with bad signature → 400", async () => {
  const r = await worker.fetch(
    req("/stripe/webhook", {
      method: "POST",
      headers: { "Stripe-Signature": "t=1,v1=bad" },
      body: JSON.stringify({ id: "evt_x", type: "x" }),
    }),
    makeEnv()
  );
  assert.equal(r.status, 400);
});

test("full flow: magic-link → session → /me → webhook → paid (idempotent)", async () => {
  const env = makeEnv();
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(" "));
  try {
    // 1. request a link
    let r = await worker.fetch(
      req("/auth/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "Parent@Example.com" }),
      }),
      env
    );
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { ok: true });
  } finally {
    console.log = orig;
  }
  const line = logs.find((l) => l.includes("[magic-link]"));
  assert.ok(line, "magic link printed by console transport");
  const token = line.split("#/verify/")[1].trim();
  assert.ok(token && token.length > 10, "token extracted");

  // 2. verify → session
  let r = await worker.fetch(
    req("/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    }),
    env
  );
  let j = await r.json();
  assert.equal(r.status, 200);
  assert.ok(j.session, "session issued");
  assert.equal(j.email, "parent@example.com", "email normalised");
  const session = j.session;
  const accountId = env._state.sessions.get(session).account_id;
  assert.ok(env._state.entitlements.get(accountId), "entitlement row created");

  // 3. token is single-use
  r = await worker.fetch(
    req("/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    }),
    env
  );
  assert.equal(r.status, 400, "reused token rejected");

  // 4. /me authenticated but not paid
  const auth = { Authorization: "Bearer " + session };
  r = await worker.fetch(req("/me", { headers: auth }), env);
  j = await r.json();
  assert.equal(r.status, 200);
  assert.equal(j.authenticated, true);
  assert.equal(j.paid, false);

  // 5. checkout disabled while PAYMENTS_ENABLED=false
  r = await worker.fetch(
    req("/checkout", {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({ plan: "oneoff" }),
    }),
    env
  );
  assert.equal(r.status, 403);
  assert.equal((await r.json()).disabled, true);

  // 6. Stripe webhook grants entitlement (server→server: no Origin)
  const payload = JSON.stringify({
    id: "evt_1",
    type: "checkout.session.completed",
    data: {
      object: {
        client_reference_id: accountId,
        customer: "cus_1",
        metadata: { account_id: accountId, plan: "oneoff" },
      },
    },
  });
  const sig = await stripeSig(payload, env.STRIPE_WEBHOOK_SECRET);
  r = await worker.fetch(
    new Request("https://api.test/stripe/webhook", {
      method: "POST",
      headers: { "Stripe-Signature": sig },
      body: payload,
    }),
    env
  );
  assert.equal(r.status, 200);
  const ent = env._state.entitlements.get(accountId);
  assert.equal(ent.status, "active");
  assert.equal(ent.plan, "oneoff");
  assert.ok(ent.valid_until > Date.now());

  // 7. /me now paid — cross-device by construction (any session on this
  //    account would see it; entitlement is account-keyed, not device).
  r = await worker.fetch(req("/me", { headers: auth }), env);
  j = await r.json();
  assert.equal(j.paid, true);
  assert.equal(j.plan, "oneoff");

  // 8. idempotent replay — same event id processed once
  r = await worker.fetch(
    new Request("https://api.test/stripe/webhook", {
      method: "POST",
      headers: { "Stripe-Signature": sig },
      body: payload,
    }),
    env
  );
  assert.equal(r.status, 200);
  assert.equal(env._state.events.size, 1, "event recorded once");

  // 9. logout invalidates the session
  r = await worker.fetch(
    req("/logout", { method: "POST", headers: auth }),
    env
  );
  assert.equal(r.status, 200);
  r = await worker.fetch(req("/me", { headers: auth }), env);
  assert.equal(r.status, 401, "session gone after logout");
});
