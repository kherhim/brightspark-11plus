// Phase 4A — engagement: the daily streak must advance at most once per
// LOCAL day and only forward; the daily goal must reflect today's count;
// badges must earn under their condition and be idempotent. All time
// logic takes an injected `now` so there is no wall-clock flake.

import { suite, test, assert, assertEq } from "./harness.js";
import { freshState } from "../js/store.js";
import { SUBJECTS, topicsBySubject } from "../js/topics.js";
import {
  localDay,
  dayDiff,
  recordActivity,
  goalProgress,
  evaluateBadges,
  BADGES,
} from "../js/engagement.js";

// Local-time timestamps for specific calendar days (TZ-robust: localDay
// reads local Y/M/D, dayDiff compares the date strings).
const D = (y, m, d, h = 12) => new Date(y, m - 1, d, h).getTime();

suite("engagement: day maths");

test("localDay is a YYYY-MM-DD string, stable within a day", () => {
  const a = localDay(D(2026, 5, 19, 1));
  const b = localDay(D(2026, 5, 19, 23));
  assert(/^\d{4}-\d{2}-\d{2}$/.test(a), "format");
  assertEq(a, b, "same calendar day → same string");
});

test("dayDiff handles consecutive, gaps, month/year rollover, null", () => {
  assertEq(dayDiff("2026-01-01", "2026-01-02"), 1, "consecutive");
  assertEq(dayDiff("2026-01-01", "2026-01-01"), 0, "same day");
  assertEq(dayDiff("2026-03-01", "2026-03-05"), 4, "gap");
  assertEq(dayDiff("2026-01-31", "2026-02-01"), 1, "month rollover");
  assertEq(dayDiff("2026-12-31", "2027-01-01"), 1, "year rollover");
  assertEq(dayDiff(null, "2026-01-01"), null, "null start");
});

suite("engagement: streak + goal");

test("streak advances once per day, forward only", () => {
  const s = freshState();
  recordActivity(s, { correct: true }, D(2026, 1, 1));
  assertEq(s.streaks.current, 1, "day 1 → 1");
  assertEq(s.activity.answered, 1, "counted");

  recordActivity(s, { correct: false }, D(2026, 1, 1, 18));
  assertEq(s.streaks.current, 1, "same day does not bump streak");
  assertEq(s.activity.answered, 2, "still counts the answer");

  recordActivity(s, { correct: true }, D(2026, 1, 2));
  assertEq(s.streaks.current, 2, "consecutive day → 2");
  assertEq(s.activity.answered, 1, "counters rolled to the new day");

  recordActivity(s, { correct: true }, D(2026, 1, 5));
  assertEq(s.streaks.current, 1, "a gap resets to 1");
  assertEq(s.streaks.longest, 2, "longest is preserved");
});

test("goalProgress reflects today's answers vs the goal", () => {
  const s = freshState();
  const now = D(2026, 2, 10);
  recordActivity(s, { correct: true }, now);
  recordActivity(s, { correct: true }, now);
  recordActivity(s, { correct: false }, now);
  let g = goalProgress(s, now);
  assertEq(g.done, 3, "3 answered today");
  assertEq(g.goal, 10, "default goal");
  assertEq(g.met, false, "not met yet");
  s.profile.dailyGoal = 2;
  g = goalProgress(s, now);
  assert(g.met, "met once the goal is lowered");
  assertEq(g.fraction, 1, "fraction clamps at 1");
  // A new day with no activity reads 0 progress.
  assertEq(goalProgress(s, D(2026, 2, 11)).done, 0, "fresh day → 0");
});

suite("engagement: badges");

test("badges earn under their condition", () => {
  const s = freshState();
  assertEq(evaluateBadges(s).length, 0, "fresh earns nothing");

  s.global.totalAnswered = 1;
  let earned = evaluateBadges(s);
  assert(earned.includes("first-steps"), "first answer → first-steps");

  s.streaks.longest = 7;
  earned = evaluateBadges(s);
  assert(
    earned.includes("streak-3") && earned.includes("streak-7"),
    "streak badges"
  );
  assert(!earned.includes("streak-30"), "30-day not yet");

  s.mockHistory.push({ scoreCorrect: 9, scoreTotal: 10 });
  earned = evaluateBadges(s);
  assert(
    earned.includes("first-mock") && earned.includes("mock-ace"),
    "mock badges from a 90% paper"
  );

  // One mastered topic in every subject → polymath.
  for (const sub of SUBJECTS) {
    const id = topicsBySubject(sub.id)[0].id;
    s.topics[id].mastered = true;
  }
  earned = evaluateBadges(s);
  assert(earned.includes("topic-master"), "topic-master");
  assert(earned.includes("polymath"), "a master in every subject");
});

test("evaluateBadges is idempotent (earnedAt never overwritten)", () => {
  const s = freshState();
  s.global.totalAnswered = 100;
  evaluateBadges(s, 1000);
  const stamp = s.badges["century"];
  assert(stamp === 1000, "earned at the given time");
  const again = evaluateBadges(s, 5000);
  assertEq(s.badges["century"], stamp, "timestamp unchanged");
  assert(!again.includes("century"), "not re-reported");
});

test("every badge has a working pure test()", () => {
  const s = freshState();
  for (const b of BADGES) {
    assert(typeof b.test === "function", b.id + " has test");
    // Must not throw for an empty-ish state.
    b.test(s, Date.now());
  }
});
