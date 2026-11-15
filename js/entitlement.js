// Signed-in account cache for the Account screen.
//
// Brightspark Prep is free and takes no payments, so nothing is gated:
// every subject and feature is open to everyone, signed in or not. (The
// old paywall and checkout code is archived at git tag
// payments-archive-2026-11.) This module only remembers who is signed in.
// It is UI-layer only — NOT imported by the engine or any node-tested pure
// module.

import { me } from "./auth.js";

let _account = null; // last /me result for a signed-in user (email)

// Last known account info, for the Account screen.
export function account() {
  return _account;
}

// Ask the backend who we are and cache it. Safe to call always: with no
// backend / no session / offline it resolves to the signed-out shape (no
// throw, no regression).
export async function refreshAccount() {
  const r = await me();
  _account = r && r.authenticated ? r : null;
  return r;
}
