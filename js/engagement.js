// Engagement: daily streak, daily-goal progress and achievement badges.
// Pure data ops — no DOM, no fetch — so it is fully unit testable and
// safe to import from the engine, exactly like review.js.
//
// The schema already provisions `state.streaks`, `state.profile.dailyGoal`
// and `state.badges`; this module is what finally WRITES them, plus one
// additive `state.activity` day-counter (backfilled in store.js — NO
// schema bump). The day boundary is the device's LOCAL day, which is the
// right model for a local-first app (revisited only if cloud sync lands).

import { SUBJECTS, topicsBySubject } from "./topics.js";

// Local calendar day as "YYYY-MM-DD" (NOT UTC) so a streak rolls over at
// the child's midnight, not the server's.
export function localDay(ts = Date.now()) {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// Whole-day difference between two "YYYY-MM-DD" strings (b − a). Uses
// UTC midnight of each local date so DST never adds/loses a day.
export function dayDiff(a, b) {
  if (!a || !b) return null;
  const pa = a.split("-").map(Number);
  const pb = b.split("-").map(Number);
  const ua = Date.UTC(pa[0], pa[1] - 1, pa[2]);
  const ub = Date.UTC(pb[0], pb[1] - 1, pb[2]);
  return Math.round((ub - ua) / 86400000);
}

function ensureShape(state) {
  if (!state.streaks || typeof state.streaks !== "object")
    state.streaks = { current: 0, longest: 0, lastActiveDay: null };
  if (!state.activity || typeof state.activity !== "object")
    state.activity = { date: null, answered: 0, correct: 0 };
  if (!state.badges || typeof state.badges !== "object") state.badges = {};
  return state;
}

// Roll the per-day counters onto today's date if the day changed.
function rollDay(state, today) {
  if (state.activity.date !== today) {
    state.activity.date = today;
    state.activity.answered = 0;
    state.activity.correct = 0;
  }
}

// The streak only ever advances once per local day, and only forward:
// a consecutive day +1, a gap (or first ever) resets to 1, the same day
// is a no-op. `longest` never decreases.
function updateStreak(state, today) {
  const last = state.streaks.lastActiveDay;
  if (last === today) return;
  const gap = dayDiff(last, today);
  state.streaks.current = gap === 1 ? (state.streaks.current || 0) + 1 : 1;
  state.streaks.lastActiveDay = today;
  if (state.streaks.current > (state.streaks.longest || 0))
    state.streaks.longest = state.streaks.current;
}

// Call for every GRADED practice answer (NOT mock — a mock is a muted
// update that must not farm the streak/goal, mirroring how it never
// moves the ladder). Mutates state; returns it.
export function recordActivity(state, info, now = Date.now()) {
  ensureShape(state);
  const today = localDay(now);
  rollDay(state, today);
  state.activity.answered += 1;
  if (info && info.correct) state.activity.correct += 1;
  updateStreak(state, today);
  return state;
}

// Today's progress toward the parent-set daily goal.
export function goalProgress(state, now = Date.now()) {
  ensureShape(state);
  const goal =
    (state.profile && typeof state.profile.dailyGoal === "number"
      ? state.profile.dailyGoal
      : 10) || 10;
  const sameDay = state.activity.date === localDay(now);
  const done = sameDay ? state.activity.answered : 0;
  return {
    done,
    goal,
    met: done >= goal,
    fraction: Math.max(0, Math.min(1, goal ? done / goal : 0)),
  };
}

// Badge catalogue. Every test is a pure function of state already
// recorded elsewhere (no new tracking), so badges are deterministic and
// trivially unit-testable. Day-bounded ones take `now` for testability.
export const BADGES = [
  { id: "first-steps", name: "First Steps", icon: "🌱",
    desc: "Answer your first question",
    test: (s) => (s.global && s.global.totalAnswered) >= 1 },
  { id: "century", name: "Century", icon: "💯",
    desc: "Answer 100 questions",
    test: (s) => (s.global && s.global.totalAnswered) >= 100 },
  { id: "marathon", name: "Marathon", icon: "🏃",
    desc: "Answer 1000 questions",
    test: (s) => (s.global && s.global.totalAnswered) >= 1000 },
  { id: "sharp", name: "Sharp Shooter", icon: "🎯",
    desc: "50+ answered at 80%+ accuracy",
    test: (s) =>
      s.global &&
      s.global.totalAnswered >= 50 &&
      s.global.totalCorrect / s.global.totalAnswered >= 0.8 },
  { id: "streak-3", name: "On a Roll", icon: "🔥",
    desc: "3-day streak",
    test: (s) => (s.streaks && s.streaks.longest) >= 3 },
  { id: "streak-7", name: "Week Warrior", icon: "🔥",
    desc: "7-day streak",
    test: (s) => (s.streaks && s.streaks.longest) >= 7 },
  { id: "streak-30", name: "Unstoppable", icon: "⚡",
    desc: "30-day streak",
    test: (s) => (s.streaks && s.streaks.longest) >= 30 },
  { id: "goal-met", name: "Goal Getter", icon: "✅",
    desc: "Hit your daily goal",
    test: (s, now) => goalProgress(s, now).met },
  { id: "first-mock", name: "Mock Debut", icon: "📝",
    desc: "Complete a mock exam",
    test: (s) => Array.isArray(s.mockHistory) && s.mockHistory.length >= 1 },
  { id: "mock-ace", name: "Mock Ace", icon: "🏅",
    desc: "Score 90%+ in a mock exam",
    test: (s) =>
      Array.isArray(s.mockHistory) &&
      s.mockHistory.some((m) => {
        if (!m) return false;
        const tot =
          typeof m.scoreTotal === "number"
            ? m.scoreTotal
            : m.items && m.items.length;
        const cor =
          typeof m.scoreCorrect === "number"
            ? m.scoreCorrect
            : (m.items || []).filter((it) => it && it.correct).length;
        return tot ? cor / tot >= 0.9 : false;
      }) },
  { id: "topic-master", name: "Topic Master", icon: "⭐",
    desc: "Master any topic",
    test: (s) =>
      s.topics &&
      Object.values(s.topics).some((t) => t && t.mastered) },
  { id: "polymath", name: "Polymath", icon: "🧠",
    desc: "Master a topic in every subject",
    test: (s) =>
      s.topics &&
      SUBJECTS.every((sub) => {
        const ids = topicsBySubject(sub.id).map((t) => t.id);
        return (
          ids.length > 0 &&
          ids.some((id) => s.topics[id] && s.topics[id].mastered)
        );
      }) },
];

// Award any newly-earned badges. Idempotent: an existing earnedAt is
// never overwritten. Returns the list of badge ids earned on THIS call
// (so the UI can toast them).
export function evaluateBadges(state, now = Date.now()) {
  ensureShape(state);
  const earned = [];
  for (const b of BADGES) {
    if (state.badges[b.id]) continue;
    let ok = false;
    try {
      ok = !!b.test(state, now);
    } catch (e) {
      ok = false;
    }
    if (ok) {
      state.badges[b.id] = now;
      earned.push(b.id);
    }
  }
  return earned;
}

export function badgeById(id) {
  return BADGES.find((b) => b.id === id) || null;
}
