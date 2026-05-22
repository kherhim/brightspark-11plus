// Client monetisation layer. Post Stage C cutover a backend IS configured
// (API_BASE set). The critical guarantee under test: if that backend is
// unreachable, every path still degrades to the free, no-account experience
// and never throws. Plus the entitlement gate maths. fetch is stubbed below
// so the suite is hermetic — no real network, no production calls.

import { suite, test, assert, assertEq } from "./harness.js";
import {
  hasBackend,
  apiUrl,
  paymentsEnabled,
  freeEra,
  loadServerConfig,
  serverConfig,
  setServerConfig,
} from "../js/config.js";
import {
  getSession,
  isSignedIn,
  requestLink,
  verifyToken,
  me,
  logout,
  startCheckout,
} from "../js/auth.js";
import {
  isPaid,
  setPaid,
  fullAccess,
  subjectAllowed,
  featureAllowed,
  freeTopicIds,
  dailyCount,
  dailyCapReached,
  refreshEntitlement,
  account,
  FREE_DAILY_CAP,
} from "../js/entitlement.js";
import { localDay } from "../js/engagement.js";
import { TOPICS } from "../js/topics.js";

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
const chk = await startCheckout("oneoff");
let logoutThrew = false;
try {
  await logout();
} catch (e) {
  logoutThrew = true;
}
const refreshFree = await refreshEntitlement();
globalThis.fetch = _origFetch; // restore — later tests don't hit network

suite("monetisation: config (backend configured, unreachable)");

test("configured backend, unreachable → stays safe free mode", () => {
  assertEq(hasBackend(), true, "API_BASE set after Stage C cutover");
  assert(apiUrl("/me").endsWith("/me"), "apiUrl joins path");
  assertEq(cfgNoBackend, null, "loadServerConfig → null when unreachable");
  assertEq(paymentsEnabled(), false, "payments off until server config says so");
});

test("server config mirror gates payments", () => {
  setServerConfig({ paymentsEnabled: true, consentVersion: "x" });
  assertEq(paymentsEnabled(), true, "reflects server flag");
  assertEq(serverConfig().consentVersion, "x", "exposes config");
  setServerConfig(null);
  assertEq(paymentsEnabled(), false, "reset");
});

suite("monetisation: auth degrades gracefully");

test("no session, no throws, free shapes when backend unreachable", () => {
  assertEq(getSession(), null, "no session");
  assertEq(isSignedIn(), false, "not signed in");
  assertEq(reqLink.ok, false, "requestLink not ok offline");
  assertEq(ver.ok, false, "verifyToken not ok offline");
  assertEq(meFree.authenticated, false, "me() unauthenticated");
  assertEq(meFree.paid, false, "me() not paid");
  assertEq(chk.ok, false, "startCheckout not ok offline");
  assert(!logoutThrew, "logout never throws");
});

suite("monetisation: entitlement gate");

// freeEra() fails OPEN — with no server config loaded it defaults to the
// free-for-all era being ON. The restricted-tier tests below therefore
// pin freeEra:false explicitly; the free-era test pins it true.

test("freeEra() fails open; server config can turn it off", () => {
  setServerConfig(null);
  assertEq(freeEra(), true, "defaults ON when config unavailable");
  setServerConfig({ freeEra: true });
  assertEq(freeEra(), true, "ON when the server says so");
  setServerConfig({ freeEra: false });
  assertEq(freeEra(), false, "OFF only when the server explicitly says so");
  setServerConfig(null); // restore
});

test("restricted tier (era off): maths only, premium locked", () => {
  setServerConfig({ freeEra: false });
  assertEq(isPaid(), false, "not paid by default");
  assertEq(fullAccess(), false, "no full access: not paid and era off");
  assertEq(subjectAllowed("maths"), true, "maths free");
  assertEq(subjectAllowed("vr"), false, "VR locked");
  assertEq(subjectAllowed("nvr"), false, "NVR locked");
  assertEq(subjectAllowed("english"), false, "English locked");
  assertEq(featureAllowed("mock"), false, "mocks locked");
  const free = freeTopicIds(TOPICS);
  assert(free.length > 0, "some free topics");
  assert(
    free.every((id) => TOPICS.find((t) => t.id === id).subject === "maths"),
    "free topics are all maths"
  );
  assert(free.includes("place-value"), "maths topic free");
  assert(!free.includes("vr-vocab"), "VR topic not free");
  setServerConfig(null); // restore
});

test("free era opens every subject + feature for non-paid users", () => {
  setServerConfig({ freeEra: true });
  assertEq(isPaid(), false, "still not a paid account");
  assertEq(fullAccess(), true, "but the era grants full access");
  assertEq(subjectAllowed("vr"), true, "VR open");
  assertEq(subjectAllowed("nvr"), true, "NVR open");
  assertEq(subjectAllowed("english"), true, "English open");
  assertEq(featureAllowed("mock"), true, "mocks open");
  assertEq(featureAllowed("worksheet"), true, "worksheets open");
  assertEq(
    dailyCapReached({ activity: { date: localDay(), answered: 9999 } }),
    false,
    "no daily cap during the free era"
  );
  setServerConfig(null); // restore
});

test("daily cap applies to restricted-tier users only", () => {
  setServerConfig({ freeEra: false });
  const today = localDay();
  const at = (n) => ({ activity: { date: today, answered: n } });
  assertEq(dailyCount(at(7)), 7, "counts today's answers");
  assertEq(dailyCount({ activity: { date: "1999-01-01", answered: 9 } }), 0,
    "stale day → 0");
  assertEq(dailyCapReached(at(FREE_DAILY_CAP - 1)), false, "under cap ok");
  assertEq(dailyCapReached(at(FREE_DAILY_CAP)), true, "at cap blocked");
  setServerConfig(null); // restore
});

test("paid unlocks everything and removes the cap", () => {
  setServerConfig({ freeEra: false });
  setPaid(true);
  assertEq(isPaid(), true, "paid");
  assertEq(fullAccess(), true, "full access via payment");
  assertEq(subjectAllowed("vr"), true, "VR unlocked when paid");
  assertEq(featureAllowed("worksheet"), true, "features unlocked");
  assertEq(
    dailyCapReached({ activity: { date: localDay(), answered: 9999 } }),
    false,
    "no cap for paid"
  );
  setPaid(false); // restore
  assertEq(isPaid(), false, "restored to free");
  setServerConfig(null); // restore
});

test("refreshEntitlement is safe with no backend", () => {
  assertEq(refreshFree.authenticated, false, "free shape");
  assertEq(refreshFree.paid, false, "not paid");
  assertEq(isPaid(), false, "stays free");
  assertEq(account(), null, "no account cached");
});
