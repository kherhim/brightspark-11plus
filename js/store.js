// Progress persistence. State lives in localStorage; if that is unavailable
// (private mode / quota / blocked) we fall back to an in-memory copy so the
// app still works for the session, and the UI shows a non-blocking notice.

import { TOPICS } from "./topics.js";

const KEY = "syon11plus.v3";
export const SCHEMA_VERSION = 3;

let memoryFallback = null;
let storageOk = true;

function ls() {
  try {
    const t = "__syon_probe__";
    window.localStorage.setItem(t, "1");
    window.localStorage.removeItem(t);
    return window.localStorage;
  } catch (e) {
    storageOk = false;
    return null;
  }
}

export function storageAvailable() {
  return storageOk && ls() !== null;
}

// Start mid-ladder: with the recalibrated (harder) curve, even Level 1 is
// solid Year 5/6, so a strong child begins at Level 3 and climbs fast.
export const START_LEVEL = 3;

function freshTopic() {
  return {
    level: START_LEVEL,
    streakCorrect: 0,
    streakWrong: 0,
    attempts: 0,
    correct: 0,
    mastery: 0,
    timeMs: 0,
    lastSeenAt: 0,
    seenCount: 0,
    mastered: false,
    recentMistakes: [], // ring buffer, newest last, max 10
  };
}

export function freshState() {
  const topics = {};
  for (const t of TOPICS) topics[t.id] = freshTopic();
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    global: { totalAnswered: 0, totalCorrect: 0, sessionCount: 0 },
    lastTopicId: null,
    topics,
  };
}

// Make sure every registered topic has an entry (new topics added later
// still work against an old save file).
export function ensureTopic(state, topicId) {
  if (!state.topics[topicId]) state.topics[topicId] = freshTopic();
  return state.topics[topicId];
}

function migrate(state) {
  if (!state || typeof state !== "object") return freshState();
  if (state.schemaVersion === SCHEMA_VERSION) {
    for (const t of TOPICS) ensureTopic(state, t.id);
    return state;
  }
  // Unknown / older / newer schema: keep it safe rather than crash.
  // (Only v2 exists today; future migrations slot in here.)
  return freshState();
}

export function loadState() {
  const store = ls();
  if (!store) {
    memoryFallback = memoryFallback || freshState();
    return memoryFallback;
  }
  try {
    const raw = store.getItem(KEY);
    if (!raw) return freshState();
    return migrate(JSON.parse(raw));
  } catch (e) {
    return freshState();
  }
}

export function saveState(state) {
  state.updatedAt = Date.now();
  const store = ls();
  if (!store) {
    memoryFallback = state;
    return false;
  }
  try {
    store.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    memoryFallback = state;
    storageOk = false;
    return false;
  }
}

export function resetState() {
  const s = freshState();
  saveState(s);
  return s;
}

export function exportJSON(state) {
  return JSON.stringify(state, null, 2);
}

export function importJSON(text) {
  const parsed = JSON.parse(text); // throws on bad JSON -> caller handles
  const migrated = migrate(parsed);
  saveState(migrated);
  return migrated;
}
