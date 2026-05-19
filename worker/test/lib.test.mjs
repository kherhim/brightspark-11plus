// Worker core-logic tests — plain `node --test`, no miniflare/wrangler
// needed (lib.js uses only Web Crypto / standard globals, present in
// Node 18+). Endpoint/E2E is covered manually via `wrangler dev` + the
// Stripe CLI in test mode (see worker/README.md).

import test from "node:test";
import assert from "node:assert/strict";
import {
  randomId,
  sha256hex,
  allowedOrigin,
  corsHeaders,
  parseBearer,
  planFromPrice,
  entitlementFor,
  isEntitlementActive,
  verifyStripeSignature,
  timingSafeEqualHex,
  normaliseEmail,
  isEmail,
  formBody,
} from "../src/lib.js";

const enc = new TextEncoder();

test("randomId: url-safe, unique, sized", () => {
  const a = randomId(),
    b = randomId();
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9_-]+$/);
  assert.ok(a.length >= 20);
});

test("sha256hex: known vector", async () => {
  assert.equal(
    await sha256hex("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
  );
});

test("allowedOrigin: CSV allow-list", () => {
  const csv = "https://a.com, https://b.com";
  assert.equal(allowedOrigin("https://b.com", csv), "https://b.com");
  assert.equal(allowedOrigin("https://evil.com", csv), null);
  assert.equal(allowedOrigin(null, csv), null);
  assert.equal(corsHeaders(null)["access-control-allow-origin"], undefined);
  assert.equal(
    corsHeaders("https://a.com")["access-control-allow-origin"],
    "https://a.com"
  );
});

test("parseBearer", () => {
  assert.equal(parseBearer("Bearer abc.def"), "abc.def");
  assert.equal(parseBearer("bearer X"), "X");
  assert.equal(parseBearer("Basic x"), null);
  assert.equal(parseBearer(null), null);
});

test("planFromPrice + entitlementFor + isEntitlementActive", () => {
  const env = {
    PRICE_ONEOFF: "p_one",
    PRICE_FAMILY: "p_fam",
    PRICE_ANNUAL: "p_ann",
    ACCESS_DAYS_ONEOFF: "1095",
    ACCESS_DAYS_ANNUAL: "365",
    FAMILY_SEATS: "3",
  };
  assert.equal(planFromPrice(env, "p_fam"), "family");
  assert.equal(planFromPrice(env, "nope"), null);

  const now = 1_700_000_000_000;
  const one = entitlementFor("oneoff", env, now);
  assert.equal(one.status, "active");
  assert.equal(one.seats, 1);
  assert.equal(one.valid_until, now + 1095 * 86400000);

  const fam = entitlementFor("family", env, now);
  assert.equal(fam.seats, 3);

  assert.equal(entitlementFor("bogus", env, now), null);

  assert.equal(isEntitlementActive(one, now), true);
  assert.equal(isEntitlementActive(one, one.valid_until + 1), false);
  assert.equal(isEntitlementActive({ status: "none" }), false);
  assert.equal(isEntitlementActive(null), false);
});

test("verifyStripeSignature: valid, tampered, stale", async () => {
  const secret = "whsec_test";
  const payload = JSON.stringify({ id: "evt_1", type: "x" });
  const t = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${payload}`));
  const hex = [...new Uint8Array(mac)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");

  assert.equal(
    await verifyStripeSignature(payload, `t=${t},v1=${hex}`, secret),
    true,
    "valid signature"
  );
  assert.equal(
    await verifyStripeSignature(payload + "x", `t=${t},v1=${hex}`, secret),
    false,
    "tampered payload"
  );
  assert.equal(
    await verifyStripeSignature(payload, `t=${t - 9999},v1=${hex}`, secret),
    false,
    "stale timestamp"
  );
  assert.equal(
    await verifyStripeSignature(payload, "garbage", secret),
    false,
    "malformed header"
  );
  assert.equal(
    await verifyStripeSignature(payload, `t=${t},v1=${hex}`, ""),
    false,
    "no secret"
  );
});

test("timingSafeEqualHex", () => {
  assert.equal(timingSafeEqualHex("abcd", "abcd"), true);
  assert.equal(timingSafeEqualHex("abcd", "abce"), false);
  assert.equal(timingSafeEqualHex("ab", "abc"), false);
  assert.equal(timingSafeEqualHex(null, null), false);
});

test("email helpers + formBody", () => {
  assert.equal(normaliseEmail("  A@B.COM "), "a@b.com");
  assert.equal(isEmail("a@b.com"), true);
  assert.equal(isEmail("nope"), false);
  const body = formBody({ a: 1, b: "x y", c: undefined });
  assert.equal(body, "a=1&b=x+y");
});
