// The adaptive engine: per-topic difficulty ladder, EWMA mastery, and
// weighted topic selection. All tunable knobs live here as named
// constants so a non-expert can adjust the feel in one place.

import { TOPICS, MAX_LEVEL, MIN_LEVEL } from "./topics.js";
import { ensureTopic } from "./store.js";
import { enqueueLeitner } from "./review.js";

// --- Tunable constants ----------------------------------------------------
export const PROMOTE_THRESHOLD = 2; // correct-in-a-row to go up a level
export const DEMOTE_THRESHOLD = 2; // wrong-in-a-row to drop a level
export const ALPHA = 0.25; // EWMA learning rate for mastery
// A mock exam should INFORM mastery without yo-yoing the practice ladder,
// so it nudges mastery at half weight and never moves the level.
export const MOCK_ALPHA = ALPHA / 2;
export const PACE_CAP = 50; // per-topic pace samples kept (analytics)
export const MISTAKE_LOG_CAP = 200; // persistent cross-topic mistake log
export const MASTERY_MIN = 0.85; // mastery score needed to be "mastered"
export const MASTERY_LEVEL = 5; // and you must be at least this level
export const MASTERY_MIN_ATTEMPTS = 12; // and have answered at least this many
export const SPACING_MS = 1000 * 60 * 20; // "seen recently" window (20 min)
export const W_WEAKNESS = 0.55;
export const W_RECENCY = 0.3;
export const W_COVERAGE = 0.15;
export const MASTERED_PENALTY = 0.25; // mastered topics still recur, but rarely
export const WEIGHT_FLOOR = 0.03; // every topic always has a chance
export const MAX_RECENT_MISTAKES = 10;

export function levelFactor(level) {
  return 0.6 + (0.4 * level) / MAX_LEVEL;
}

export function isMastered(ts) {
  return (
    ts.level >= MASTERY_LEVEL &&
    ts.mastery >= MASTERY_MIN &&
    ts.attempts >= MASTERY_MIN_ATTEMPTS
  );
}

// One wrong answer (practice OR mock): tally the misconception on the
// topic and globally, append to the persistent mistake log, and (re)queue
// it for spaced review. `near_miss` is generic distractor padding, not a
// real misconception, so it never feeds the aggregation.
function noteWrong(state, topicId, ts, info, source) {
  const mid = info.misconceptionId ?? null;
  if (mid && mid !== "near_miss") {
    ts.misconceptionCounts = ts.misconceptionCounts || {};
    ts.misconceptionCounts[mid] = (ts.misconceptionCounts[mid] || 0) + 1;
    state.misconceptionCounts = state.misconceptionCounts || {};
    state.misconceptionCounts[mid] = (state.misconceptionCounts[mid] || 0) + 1;
  }
  logMistake(state, {
    topicId,
    qid: info.qid ?? null,
    seed: info.seed ?? null,
    level: info.level,
    templateId: info.templateId ?? null,
    source,
    chosenKey: info.chosenKey ?? null,
    chosenText: info.chosenText ?? null,
    correctText: info.correctText ?? null,
    misconceptionId: mid,
    at: Date.now(),
  });
  enqueueLeitner(state, {
    topicId,
    level: info.level,
    qid: info.qid ?? null,
    seed: info.seed ?? null,
    templateId: info.templateId ?? null,
    misconceptionId: mid,
  });
}

// Record a *graded* answer and advance the ladder. Mutates and returns the
// topic state. `info.level` is the level the question was presented at.
export function recordResult(state, topicId, info) {
  const ts = ensureTopic(state, topicId);
  const correct = !!info.correct;

  ts.attempts += 1;
  ts.seenCount += 1;
  ts.lastSeenAt = Date.now();
  ts.timeMs += Math.max(0, info.timeMs || 0);
  state.global.totalAnswered += 1;
  state.lastTopicId = topicId;

  if (correct) {
    ts.correct += 1;
    ts.streakCorrect += 1;
    ts.streakWrong = 0;
    state.global.totalCorrect += 1;
  } else {
    ts.streakWrong += 1;
    ts.streakCorrect = 0;
    ts.recentMistakes.push({
      qid: info.qid,
      level: info.level,
      chosenKey: info.chosenKey ?? null,
      chosenText: info.chosenText ?? null,
      correctText: info.correctText ?? null,
      misconceptionId: info.misconceptionId ?? null,
      at: Date.now(),
    });
    if (ts.recentMistakes.length > MAX_RECENT_MISTAKES) {
      ts.recentMistakes.shift();
    }
    noteWrong(state, topicId, ts, info, info.source || "practice");
  }

  // EWMA mastery, weighted by the level the answer was earned at.
  const target = correct ? levelFactor(info.level) : 0;
  ts.mastery = (1 - ALPHA) * ts.mastery + ALPHA * target;

  // Ladder.
  if (correct && ts.streakCorrect >= PROMOTE_THRESHOLD && ts.level < MAX_LEVEL) {
    ts.level += 1;
    ts.streakCorrect = 0;
    ts.streakWrong = 0;
  } else if (
    !correct &&
    ts.streakWrong >= DEMOTE_THRESHOLD &&
    ts.level > MIN_LEVEL
  ) {
    ts.level -= 1;
    ts.streakCorrect = 0;
    ts.streakWrong = 0;
  }

  ts.mastered = isMastered(ts);
  return ts;
}

// Relative selection weight for one topic (exposed for the dashboard too).
export function topicWeight(state, topicId, now = Date.now()) {
  const ts = ensureTopic(state, topicId);
  const weakness = 1 - ts.mastery;
  const gap = ts.lastSeenAt
    ? Math.min(1, (now - ts.lastSeenAt) / SPACING_MS)
    : 1;
  const coverage = 1 / Math.sqrt(ts.seenCount + 1);
  const penalty = ts.mastered ? MASTERED_PENALTY : 1;
  const w =
    (W_WEAKNESS * weakness + W_RECENCY * gap + W_COVERAGE * coverage) * penalty;
  return Math.max(WEIGHT_FLOOR, w);
}

// Choose the next topic by weighted random. Avoids immediately repeating
// the previous topic unless it is the only sensible choice. An optional
// `poolIds` scopes selection to a subject (defaults to every topic, so
// existing callers are unaffected).
export function selectTopic(state, rng, now = Date.now(), poolIds = null) {
  const ids =
    poolIds && poolIds.length ? poolIds.slice() : TOPICS.map((t) => t.id);
  let pool = ids;
  if (state.lastTopicId && ids.length > 1) {
    const filtered = ids.filter((id) => id !== state.lastTopicId);
    if (filtered.length) pool = filtered;
  }
  const weights = pool.map((id) => topicWeight(state, id, now));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rng.float() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

// Level a topic's next question should be presented at.
export function presentationLevel(state, topicId) {
  return ensureTopic(state, topicId).level;
}

// Push a per-question time sample onto a topic's capped pace ring.
function pushPace(ts, ms, level, mode) {
  if (!Array.isArray(ts.paceMs)) ts.paceMs = [];
  ts.paceMs.push({ ms: Math.max(0, ms || 0), level, mode, at: Date.now() });
  if (ts.paceMs.length > PACE_CAP) ts.paceMs.shift();
}

// Append to the persistent, capped, cross-topic mistake log.
export function logMistake(state, entry) {
  if (!Array.isArray(state.mistakeLog)) state.mistakeLog = [];
  state.mistakeLog.push(entry);
  if (state.mistakeLog.length > MISTAKE_LOG_CAP) state.mistakeLog.shift();
}

// Apply a completed mock paper to progress as a *muted* update: it informs
// mastery (half weight), time and coverage, and records mistakes — but it
// deliberately does NOT touch streaks or the difficulty ladder, so a good
// or bad mock can never silently promote/demote practice difficulty.
// `record.items` each: { topicId, level, correct, timeMs, qid, seed,
// templateId, source, chosenKey, chosenText, correctText, misconceptionId }.
export function recordMockOutcome(state, record) {
  for (const it of record.items || []) {
    const ts = ensureTopic(state, it.topicId);
    const correct = !!it.correct;

    ts.attempts += 1;
    ts.seenCount += 1;
    ts.lastSeenAt = Date.now();
    ts.timeMs += Math.max(0, it.timeMs || 0);
    pushPace(ts, it.timeMs, it.level, "mock");

    state.global.totalAnswered += 1;
    if (typeof state.global.totalTimeMs === "number")
      state.global.totalTimeMs += Math.max(0, it.timeMs || 0);

    if (correct) {
      ts.correct += 1;
      state.global.totalCorrect += 1;
    } else {
      noteWrong(
        state,
        it.topicId,
        ts,
        {
          qid: it.qid,
          seed: it.seed ?? null,
          level: it.level,
          templateId: it.templateId ?? null,
          chosenKey: it.chosenKey ?? null,
          chosenText: it.chosenText ?? null,
          correctText: it.correctText ?? null,
          misconceptionId: it.misconceptionId ?? null,
        },
        "mock"
      );
    }

    // Muted EWMA — informs, never moves streak/level.
    const target = correct ? levelFactor(it.level) : 0;
    ts.mastery = (1 - MOCK_ALPHA) * ts.mastery + MOCK_ALPHA * target;
    ts.mastered = isMastered(ts);
  }

  if (!Array.isArray(state.mockHistory)) state.mockHistory = [];
  state.mockHistory.push(record);
  if (state.mockHistory.length > 20) state.mockHistory.shift();
  return record;
}
