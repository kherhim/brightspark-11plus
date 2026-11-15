// Integration test for the Worker request router — drives src/index.js
// end to end with real in-memory SQLite behind the D1 API (no Cloudflare or
// email network). Exercises the full magic-link → session → /me → logout flow,
// the security edges, and that the removed payment routes stay gone.

import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

import { makeEnv } from "./helpers/env.mjs";

const ORIGIN = "http://localhost:8000";
const req = (path, opts = {}) =>
  new Request("http://localhost:8787" + path, {
    headers: { Origin: ORIGIN, ...(opts.headers || {}) },
    ...opts,
  });

test("GET /health", async () => {
  const r = await worker.fetch(req("/health"), makeEnv());
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
});

test("GET /config: secret-free, no payment fields", async () => {
  const r = await worker.fetch(req("/config"), makeEnv());
  const j = await r.json();
  assert.deepEqual(Object.keys(j).sort(), ["cloud", "consentVersion", "freeEra"]);
  assert.equal(j.cloud, true);
  assert.equal(j.consentVersion, "2026-05-22");
  assert.equal("paymentsEnabled" in j, false);
  assert.equal("plans" in j, false);
});

test("GET /config: freeEra is always true, even with legacy env vars", async () => {
  const env = makeEnv({ FREE_ERA: "false", PAYMENTS_ENABLED: "true" });
  const j = await (await worker.fetch(req("/config"), env)).json();
  assert.equal(j.freeEra, true);
  assert.equal("paymentsEnabled" in j, false);
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

test("unknown paths return 404", async () => {
  const r = await worker.fetch(req("/nope"), makeEnv());
  assert.equal(r.status, 404);
  assert.deepEqual(await r.json(), { error: "not_found" });
});

test("full flow: magic-link → session → /me → payment routes 404 → logout", async () => {
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

  // 5. payment routes are gone, even for a signed-in, allowed-origin caller
  r = await worker.fetch(
    req("/checkout", {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({ plan: "oneoff" }),
    }),
    env
  );
  assert.equal(r.status, 404);
  r = await worker.fetch(
    req("/stripe/webhook", {
      method: "POST",
      headers: { "Stripe-Signature": "t=1,v1=x" },
      body: JSON.stringify({ id: "evt_1", type: "checkout.session.completed" }),
    }),
    env
  );
  assert.equal(r.status, 404);
  r = await worker.fetch(req("/me", { headers: auth }), env);
  assert.equal((await r.json()).paid, false, "still not paid");
  assert.equal(env._state.entitlements.get(accountId).status, "none");
  assert.equal(env._state.events.size, 0, "no payment events recorded");

  // 9. logout invalidates the session
  r = await worker.fetch(
    req("/logout", { method: "POST", headers: auth }),
    env
  );
  assert.equal(r.status, 200);
  r = await worker.fetch(req("/me", { headers: auth }), env);
  assert.equal(r.status, 401, "session gone after logout");
});
