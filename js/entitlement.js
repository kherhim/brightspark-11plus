// Free/paid entitlement gate.
//
// `fullAccess()` is the single source of truth the UI gates on: true when
// the account has paid OR the free-for-all launch era is on. `isPaid()`
// is kept narrower — specifically "this account paid" — so the Account
// screen and post-era analytics can still tell the two apart. This module
// is UI-layer only — it is NOT imported by the engine or any node-tested
// pure module.

import { localDay } from "./engagement.js";
import { me } from "./auth.js";
import { freeEra } from "./config.js";

// Subjects available without paying. Everything else is premium.
export const FREE_SUBJECTS = ["maths"];
// Free users get this many graded questions per local day.
export const FREE_DAILY_CAP = 15;
// Where "see plans" sends users (the landing pricing section). The app is
// served from app.html; the landing is index.html in the same directory.
export const UPGRADE_URL = "index.html#pricing";

let _paid = false;
let _account = null; // last /me result (email, plan, valid_until, seats)

export function setPaid(v) {
  _paid = !!v;
}

export function isPaid() {
  return _paid;
}

// Last known account/entitlement info, for the Account screen.
export function account() {
  return _account;
}

// Ask the backend who we are + whether we're paid, and cache it. Safe to
// call always: with no backend / no session / offline it resolves to the
// free shape and leaves the app in free mode (no throw, no regression).
export async function refreshEntitlement() {
  const r = await me();
  _account = r && r.authenticated ? r : null;
  setPaid(!!(r && r.paid));
  return r;
}

// The single "may use everything" check the gate functions share. True
// when the account has paid OR the free-for-all launch era is on. Keep
// isPaid() separate — it still means specifically "this account paid",
// which the Account screen and post-era analytics rely on.
export function fullAccess() {
  return _paid || freeEra();
}

// A whole subject (maths/vr/nvr/english).
export function subjectAllowed(subjectId) {
  return fullAccess() || FREE_SUBJECTS.includes(subjectId);
}

// A premium feature area: "mock" | "review" | "worksheet" | "analytics".
export function featureAllowed(/* name */) {
  return fullAccess();
}

// Topic ids a free user may practise (used to scope adaptive selection).
export function freeTopicIds(allTopics) {
  return allTopics
    .filter((t) => FREE_SUBJECTS.includes(t.subject))
    .map((t) => t.id);
}

// Graded answers already done today (reuses the Phase-4A activity counter).
export function dailyCount(state, now = Date.now()) {
  const a = state && state.activity;
  if (!a || a.date !== localDay(now)) return 0;
  return a.answered || 0;
}

export function dailyCapReached(state, now = Date.now()) {
  return !fullAccess() && dailyCount(state, now) >= FREE_DAILY_CAP;
}
