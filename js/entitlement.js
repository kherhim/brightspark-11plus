// Free/paid entitlement gate (Stage A scaffold).
//
// `isPaid()` is the single source of truth the UI gates on. It returns
// false until Stage B wires it to the backend `/me` check; until then the
// app is effectively free but the paywall paths are exercised. This module
// is UI-layer only — it is NOT imported by the engine or any node-tested
// pure module, so the test suite is unaffected.

import { localDay } from "./engagement.js";
import { me } from "./auth.js";

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

// A whole subject (maths/vr/nvr/english).
export function subjectAllowed(subjectId) {
  return _paid || FREE_SUBJECTS.includes(subjectId);
}

// A premium feature area: "mock" | "review" | "worksheet" | "analytics".
export function featureAllowed(/* name */) {
  return _paid;
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
  return !_paid && dailyCount(state, now) >= FREE_DAILY_CAP;
}
