// Readiness & speed analytics — pure, dependency-free, unit-testable.
//
// The point of difference vs the big paid platforms: this is an
// *explainable* readiness signal, not an opaque AI score. Every number
// here is derived from data the app already records (mastery, accuracy,
// level, attempts, per-question pace) and the parent can see exactly why.

import { MAX_LEVEL, TOPICS } from "./topics.js";
import { MASTERY_MIN_ATTEMPTS } from "./engine.js";
import { boardWeight, boardPaceTarget } from "./boards.js";

export const MIN_PACE_SAMPLES = 5; // below this we say "collecting data"

const clamp01 = (n) => Math.max(0, Math.min(1, n));

// Linear-interpolated quantile of a numeric array (0 <= p <= 1).
export function quantile(values, p) {
  const a = values
    .filter((n) => typeof n === "number" && isFinite(n))
    .slice()
    .sort((x, y) => x - y);
  if (!a.length) return NaN;
  if (a.length === 1) return a[0];
  const idx = clamp01(p) * (a.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return a[lo];
  return a[lo] + (a[hi] - a[lo]) * (idx - lo);
}

export const median = (values) => quantile(values, 0.5);

// Pace picture for one topic. Returns { enough:false, n } until there are
// enough samples; otherwise medians, the board target, and a fluency flag.
export function paceStats(ts, boardId) {
  const ms = ((ts && ts.paceMs) || [])
    .map((s) => (s && typeof s.ms === "number" ? s.ms : s))
    .filter((n) => typeof n === "number" && n >= 0);
  const n = ms.length;
  const targetMs = boardPaceTarget(boardId, (ts && ts.level) || 1);
  if (n < MIN_PACE_SAMPLES) return { enough: false, n, targetMs };

  const medianMs = median(ms);
  const accuracy = ts.attempts ? ts.correct / ts.attempts : 0;
  const ratio = medianMs / targetMs;
  let flag = { key: "balanced", label: "On pace" };
  if (accuracy >= 0.8 && ratio > 1.25)
    flag = { key: "slow", label: "Accurate but slow" };
  else if (accuracy < 0.6 && ratio < 0.6)
    flag = { key: "careless", label: "Fast but careless" };

  return {
    enough: true,
    n,
    medianMs,
    p25: quantile(ms, 0.25),
    p75: quantile(ms, 0.75),
    targetMs,
    accuracy,
    ratio,
    flag,
  };
}

// 0..1 readiness for one topic. Confidence (attempts vs the same gate the
// engine uses for "mastered") stops a couple of lucky answers reading green.
export function topicReadiness(ts, boardId) {
  if (!ts || !ts.attempts) return 0;
  const accuracy = ts.correct / ts.attempts;
  const confidence = clamp01(ts.attempts / MASTERY_MIN_ATTEMPTS);
  const levelProg = clamp01((ts.level || 1) / MAX_LEVEL);
  const ps = paceStats(ts, boardId);
  const paceScore = ps.enough
    ? clamp01(ps.targetMs / Math.max(ps.medianMs, 1))
    : 1; // neutral until we have enough timing data
  const r =
    confidence *
    (0.45 * (ts.mastery || 0) +
      0.3 * accuracy +
      0.2 * levelProg +
      0.05 * paceScore);
  return clamp01(r);
}

// Board-weighted average readiness across every topic.
export function overallReadiness(state, boardId) {
  let wSum = 0;
  let rSum = 0;
  for (const t of TOPICS) {
    const ts = state.topics && state.topics[t.id];
    const w = boardWeight(boardId, t.id);
    wSum += w;
    rSum += w * topicReadiness(ts, boardId);
  }
  return wSum ? rSum / wSum : 0;
}

// Shared 4-tier descriptor for a 0..1 score (readiness OR a mock fraction)
// so the whole app speaks the same 11+ language.
export function band(score) {
  if (score >= 0.8)
    return { key: "ready", label: "Exam-ready", cls: "good", badge: "mastered" };
  if (score >= 0.6)
    return { key: "ontrack", label: "On track", cls: "ok", badge: "strong" };
  if (score >= 0.4)
    return {
      key: "developing",
      label: "Developing",
      cls: "ok",
      badge: "learning",
    };
  return { key: "early", label: "Early days", cls: "bad", badge: "new" };
}

// Alias used by the mock report (a paper score is the same 0..1 idea).
export const scoreBand = band;

// One plain-English sentence explaining a topic's readiness.
export function explainTopic(ts, boardId) {
  if (!ts || !ts.attempts) return "Not started yet.";
  const acc = Math.round((ts.correct / ts.attempts) * 100);
  const ps = paceStats(ts, boardId);
  const pace = !ps.enough
    ? "pace: collecting data"
    : ps.flag.key === "slow"
    ? "but slower than the target pace"
    : ps.flag.key === "careless"
    ? "and rushing (accuracy is low for the speed)"
    : "at a good pace";
  return `mastery ${(ts.mastery || 0).toFixed(2)}, ${acc}% accurate, level ${
    ts.level
  }/${MAX_LEVEL}, ${pace}.`;
}
