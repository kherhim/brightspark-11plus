// Worker core-logic tests — plain `node --test`, no miniflare/wrangler
// needed (lib.js uses only Web Crypto / standard globals, present in
// Node 18+). The request router is covered by index.test.mjs.

import test from "node:test";
import assert from "node:assert/strict";
import {
  randomId,
  sha256hex,
  allowedOrigin,
  corsHeaders,
  parseBearer,
  isEntitlementActive,
  normaliseEmail,
  isEmail,
} from "../src/lib.js";

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

test("isEntitlementActive: active, expired, none", () => {
  const now = 1_700_000_000_000;
  const row = { status: "active", valid_until: now + 1000 };
  assert.equal(isEntitlementActive(row, now), true);
  assert.equal(isEntitlementActive(row, now + 1001), false);
  assert.equal(isEntitlementActive({ status: "none" }), false);
  assert.equal(isEntitlementActive(null), false);
});

test("payment helpers are gone", async () => {
  const lib = await import("../src/lib.js");
  for (const name of ["planFromPrice", "entitlementFor", "verifyStripeSignature", "formBody"])
    assert.equal(lib[name], undefined, name);
});

test("email helpers", () => {
  assert.equal(normaliseEmail("  A@B.COM "), "a@b.com");
  assert.equal(isEmail("a@b.com"), true);
  assert.equal(isEmail("nope"), false);
});
