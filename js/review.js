// Smart review: a Leitner spaced-repetition queue over the child's OWN
// mistakes, plus aggregation that surfaces a dominant recurring
// misconception. Pure data ops — no DOM, no fetch — so it is fully unit
// testable and safe to import from the engine.

const DAY = 86400000;
// Wait time (ms) once an item ENTERS box 1..5. Box 1 is due immediately.
export const INTERVALS_MS = [0, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY];
export const MAX_BOX = 5;

// A Leitner item is keyed by templateId (re-test the *method* with fresh
// numbers) or, for curated questions that have no template, by their qid.
export function reviewKey(e) {
  return (e && (e.templateId || e.qid)) || null;
}

// Called when an answer is got WRONG (practice or mock): (re)insert the
// item at box 1, due now. Re-failing an item resets it to box 1.
export function enqueueLeitner(state, e) {
  if (!state.leitner || typeof state.leitner !== "object")
    state.leitner = { boxes: {} };
  if (!state.leitner.boxes) state.leitner.boxes = {};
  const key = reviewKey(e);
  if (!key) return null;
  const boxes = state.leitner.boxes;
  const prev = boxes[key];
  const now = Date.now();
  boxes[key] = {
    key,
    box: 1,
    dueAt: now,
    topicId: e.topicId,
    level: e.level,
    qid: e.qid ?? (prev && prev.qid) ?? null,
    seed: e.seed ?? (prev && prev.seed) ?? null,
    templateId: e.templateId ?? (prev && prev.templateId) ?? null,
    misconceptionId: e.misconceptionId ?? (prev && prev.misconceptionId) ?? null,
    wrongCount: ((prev && prev.wrongCount) || 0) + 1,
    lastResult: "wrong",
    updatedAt: now,
  };
  return boxes[key];
}

// Items due for review now, soonest-due first.
export function dueReviews(state, now = Date.now()) {
  const boxes = (state.leitner && state.leitner.boxes) || {};
  return Object.values(boxes)
    .filter((b) => b && b.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt);
}

export function reviewCountDue(state, now = Date.now()) {
  return dueReviews(state, now).length;
}

// Update a Leitner item after it is reviewed. Correct => promote a box and
// push the next due date out; reaching the top box graduates (removed).
// Wrong => back to box 1, due immediately.
export function gradeReview(state, key, correct, now = Date.now()) {
  const boxes = (state.leitner && state.leitner.boxes) || {};
  const b = boxes[key];
  if (!b) return null;
  if (correct) {
    if (b.box >= MAX_BOX) {
      delete boxes[key];
      return { key, graduated: true };
    }
    b.box += 1;
    b.dueAt = now + INTERVALS_MS[b.box - 1];
    b.lastResult = "right";
  } else {
    b.box = 1;
    b.dueAt = now;
    b.lastResult = "wrong";
  }
  b.updatedAt = now;
  return b;
}

// The single most common recurring misconception, if one clearly dominates.
// Ignores the generic "near_miss" padding id and trivial noise.
export function dominantMisconception(state, opts = {}) {
  const minCount = opts.minCount ?? 4;
  const minShare = opts.minShare ?? 0.15;
  const mc = state.misconceptionCounts || {};
  const entries = Object.entries(mc).filter(
    ([id, c]) => id && id !== "near_miss" && c > 0
  );
  const total = entries.reduce((s, [, c]) => s + c, 0);
  if (!total) return null;
  entries.sort((a, b) => b[1] - a[1]);
  const [id, count] = entries[0];
  if (count >= minCount && count / total >= minShare)
    return { misconceptionId: id, count, total, share: count / total };
  return null;
}

// Which topic does this misconception cluster in (for an area-level
// fix-it fallback and to pick the drill topic).
export function topicForMisconception(state, mid) {
  let best = null;
  let bestC = 0;
  for (const [tid, ts] of Object.entries(state.topics || {})) {
    const c = (ts && ts.misconceptionCounts && ts.misconceptionCounts[mid]) || 0;
    if (c > bestC) {
      bestC = c;
      best = tid;
    }
  }
  return best;
}
