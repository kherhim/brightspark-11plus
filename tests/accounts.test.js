// Client accounts layer. A backend IS configured (API_BASE set) for
// optional sign-in. The critical guarantee under test: if that backend is
// unreachable, every path still degrades to the no-account experience and
// never throws. Brightspark Prep is free and takes no payments, so there is
// also no client-side checkout or paywall left to reach (archived at git
// tag payments-archive-2026-11). fetch is stubbed below so the suite is
// hermetic — no real network, no production calls.

import { suite, test, assert, assertEq } from "./harness.js";
import * as config from "../js/config.js";
import * as auth from "../js/auth.js";
import * as entitlement from "../js/entitlement.js";

const { hasBackend, apiUrl, loadServerConfig, serverConfig, setServerConfig } = config;
const { getSession, isSignedIn, requestLink, verifyToken, me, logout } = auth;
const { refreshAccount, account } = entitlement;

// Simulate an unreachable backend, then resolve every async path once
// (awaited at import time). Restore fetch afterwards so later assertions
// never touch the network.
const _origFetch = globalThis.fetch;
globalThis.fetch = async () => {
  throw new Error("backend unreachable (simulated in unit test)");
};
const cfgNoBackend = await loadServerConfig();
const meFree = await me();
const reqLink = await requestLink("a@b.com");
const ver = await verifyToken("nope");
let logoutThrew = false;
try {
  await logout();
} catch (e) {
  logoutThrew = true;
}
const refreshed = await refreshAccount();
globalThis.fetch = _origFetch; // restore — later tests don't hit network

suite("accounts: config (backend configured, unreachable)");

test("configured backend, unreachable → no-account mode", () => {
  assertEq(hasBackend(), true, "API_BASE set");
  assert(apiUrl("/me").endsWith("/me"), "apiUrl joins path");
  assertEq(cfgNoBackend, null, "loadServerConfig → null when unreachable");
});

test("server config mirror exposes consent version", () => {
  setServerConfig({ consentVersion: "x" });
  assertEq(serverConfig().consentVersion, "x", "exposes config");
  setServerConfig(null);
  assertEq(serverConfig(), null, "reset");
});

suite("accounts: auth degrades gracefully");

test("no session, no throws, signed-out shapes when backend unreachable", () => {
  assertEq(getSession(), null, "no session");
  assertEq(isSignedIn(), false, "not signed in");
  assertEq(reqLink.ok, false, "requestLink not ok offline");
  assertEq(ver.ok, false, "verifyToken not ok offline");
  assertEq(meFree.authenticated, false, "me() unauthenticated");
  assert(!logoutThrew, "logout never throws");
});

test("refreshAccount is safe with no backend", () => {
  assertEq(refreshed.authenticated, false, "signed-out shape");
  assertEq(account(), null, "no account cached");
});

suite("accounts: no payments or paywall");

test("payment and gating exports are gone", () => {
  for (const name of ["paymentsEnabled", "freeEra"])
    assertEq(name in config, false, `config.${name} removed`);
  assertEq("startCheckout" in auth, false, "auth.startCheckout removed");
  for (const name of [
    "isPaid", "setPaid", "fullAccess", "subjectAllowed", "featureAllowed",
    "freeTopicIds", "dailyCount", "dailyCapReached", "FREE_SUBJECTS",
    "FREE_DAILY_CAP", "UPGRADE_URL",
  ])
    assertEq(name in entitlement, false, `entitlement.${name} removed`);
});
