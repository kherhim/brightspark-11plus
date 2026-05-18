// Progress persistence. State lives in localStorage; if that is unavailable
// (private mode / quota / blocked) we fall back to an in-memory copy so the
// app still works for the session, and the UI shows a non-blocking notice.
//
// Schema v4 adds the data the differentiation features need (mock history,
// persistent mistake log, Leitner queue, per-question pace, streaks, target
// board, badges). The v3 -> v4 migration upgrades real saved progress
// FIELD-BY-FIELD and never wipes it.

import { TOPICS } from "./topics.js";

// NOTE: this storage key is intentionally kept as "...v3" even though the
// schema is now v4. It is just the localStorage slot name; renaming it would
// orphan every existing save on a child's device. Schema version is tracked
// by state.schemaVersion, not by this string. Do not rename.
const KEY = "syon11plus.v3";
export const SCHEMA_VERSION = 4;

let memoryFallback = null;
let storageOk = true;

function ls() {
  try {
    const t = "__bs_probe__";
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

export function randomId() {
  return (
    "d-" +
    Date.now().toString(36) +
    "-" +
    Math.floor(Math.random() * 0xffffffff).toString(36)
  );
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
    recentMistakes: [], // ring buffer, newest last, max 10 (engine enforces)
    paceMs: [], // per-question time samples, capped ring (analytics, Phase 3)
    misconceptionCounts: {}, // misconceptionId -> count (Phase 2)
  };
}

function freshProfile() {
  return { board: null, dailyGoal: 10, childName: "" };
}

function freshStreaks() {
  return { current: 0, longest: 0, lastActiveDay: null };
}

export function freshState() {
  const topics = {};
  for (const t of TOPICS) topics[t.id] = freshTopic();
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deviceId: randomId(),
    global: { totalAnswered: 0, totalCorrect: 0, sessionCount: 0, totalTimeMs: 0 },
    profile: freshProfile(),
    streaks: freshStreaks(),
    badges: {}, // badgeId -> earnedAt (Phase 4)
    mistakeLog: [], // persistent, capped (Phase 2)
    leitner: { boxes: {} }, // spaced-repetition queue (Phase 2)
    mockHistory: [], // last mock papers, capped (Phase 1)
    lastTopicId: null,
    topics,
  };
}

// Make sure every registered topic has an entry (new topics added later —
// including future VR/NVR/English — still work against an old save file).
export function ensureTopic(state, topicId) {
  if (!state.topics[topicId]) state.topics[topicId] = freshTopic();
  return state.topics[topicId];
}

// Idempotently bring a state object up to the full v4 shape without
// discarding any existing data. Safe to call on a fresh v4 state or on a
// state being upgraded from v3.
function ensureV4Shape(state) {
  if (!state.topics || typeof state.topics !== "object") state.topics = {};
  if (!state.global || typeof state.global !== "object")
    state.global = { totalAnswered: 0, totalCorrect: 0, sessionCount: 0 };
  state.deviceId = state.deviceId || randomId();
  state.profile = state.profile || freshProfile();
  if (typeof state.profile.board === "undefined") state.profile.board = null;
  if (typeof state.profile.dailyGoal !== "number") state.profile.dailyGoal = 10;
  if (typeof state.profile.childName !== "string") state.profile.childName = "";
  state.streaks = state.streaks || freshStreaks();
  state.badges = state.badges || {};
  state.mistakeLog = Array.isArray(state.mistakeLog) ? state.mistakeLog : [];
  state.leitner =
    state.leitner && typeof state.leitner === "object"
      ? state.leitner
      : { boxes: {} };
  if (!state.leitner.boxes || typeof state.leitner.boxes !== "object")
    state.leitner.boxes = {};
  state.mockHistory = Array.isArray(state.mockHistory)
    ? state.mockHistory
    : [];

  // Every registered topic must exist and carry the v4 per-topic fields.
  for (const t of TOPICS) {
    const ts = ensureTopic(state, t.id);
    if (!Array.isArray(ts.recentMistakes)) ts.recentMistakes = [];
    if (!Array.isArray(ts.paceMs)) ts.paceMs = [];
    if (!ts.misconceptionCounts || typeof ts.misconceptionCounts !== "object")
      ts.misconceptionCounts = {};
  }

  if (typeof state.global.totalTimeMs !== "number") {
    let sum = 0;
    for (const id of Object.keys(state.topics)) {
      const v = state.topics[id] && state.topics[id].timeMs;
      if (typeof v === "number") sum += v;
    }
    state.global.totalTimeMs = sum;
  }
  return state;
}

// Upgrade a v3 state to v4 in place. Preserves every existing field
// (levels, accuracy, mastery, recentMistakes, global counters, lastTopicId)
// and seeds the new persistent mistakeLog from the per-topic 10-item rings
// so no mistake history is lost.
export function migrateV3toV4(state) {
  state.schemaVersion = SCHEMA_VERSION;
  ensureV4Shape(state);
  if (state.mistakeLog.length === 0) {
    for (const id of Object.keys(state.topics)) {
      const ts = state.topics[id];
      if (ts && Array.isArray(ts.recentMistakes)) {
        for (const m of ts.recentMistakes) {
          state.mistakeLog.push({ ...m, topicId: id, source: "practice" });
        }
      }
    }
    state.mistakeLog.sort((a, b) => (a.at || 0) - (b.at || 0));
  }
  return state;
}

export function migrate(state) {
  if (!state || typeof state !== "object") return freshState();
  if (state.schemaVersion === SCHEMA_VERSION) {
    return ensureV4Shape(state);
  }
  if (state.schemaVersion === 3) {
    return migrateV3toV4(state);
  }
  // Older (v2 / pre-versioning) or unknown/garbage: safest to start fresh.
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
