// Stage B — client monetisation layer. The critical guarantee: with NO
// backend configured (API_BASE empty), every path degrades to the free,
// no-account experience and never throws. Plus the entitlement gate maths.

import { suite, test, assert, assertEq } from "./harness.js";
import {
  hasBackend,
  apiUrl,
  paymentsEnabled,
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

// Resolve the async, no-backend paths once (awaited at import time).
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

suite("monetisation: config (no backend)");

test("backend is opt-in and off by default", () => {
  assertEq(hasBackend(), false, "API_BASE empty → no backend");
  assert(apiUrl("/me").endsWith("/me"), "apiUrl joins path");
  assertEq(cfgNoBackend, null, "loadServerConfig → null with no backend");
  assertEq(paymentsEnabled(), false, "payments off until server says so");
});

test("server config mirror gates payments", () => {
  setServerConfig({ paymentsEnabled: true, consentVersion: "x" });
  assertEq(paymentsEnabled(), true, "reflects server flag");
  assertEq(serverConfig().consentVersion, "x", "exposes config");
  setServerConfig(null);
  assertEq(paymentsEnabled(), false, "reset");
});

suite("monetisation: auth degrades gracefully");

test("no session, no throws, free shapes with no backend", () => {
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

test("free tier: maths only, premium locked", () => {
  assertEq(isPaid(), false, "not paid by default");
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
});

test("daily cap applies to free users only", () => {
  const today = localDay();
  const at = (n) => ({ activity: { date: today, answered: n } });
  assertEq(dailyCount(at(7)), 7, "counts today's answers");
  assertEq(dailyCount({ activity: { date: "1999-01-01", answered: 9 } }), 0,
    "stale day → 0");
  assertEq(dailyCapReached(at(FREE_DAILY_CAP - 1)), false, "under cap ok");
  assertEq(dailyCapReached(at(FREE_DAILY_CAP)), true, "at cap blocked");
});

test("paid unlocks everything and removes the cap", () => {
  setPaid(true);
  assertEq(isPaid(), true, "paid");
  assertEq(subjectAllowed("vr"), true, "VR unlocked when paid");
  assertEq(featureAllowed("worksheet"), true, "features unlocked");
  assertEq(
    dailyCapReached({ activity: { date: localDay(), answered: 9999 } }),
    false,
    "no cap for paid"
  );
  setPaid(false); // restore
  assertEq(isPaid(), false, "restored to free");
});

test("refreshEntitlement is safe with no backend", () => {
  assertEq(refreshFree.authenticated, false, "free shape");
  assertEq(refreshFree.paid, false, "not paid");
  assertEq(isPaid(), false, "stays free");
  assertEq(account(), null, "no account cached");
});
