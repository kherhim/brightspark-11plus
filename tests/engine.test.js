// Adaptive engine invariants: ladder promotion/demotion, clamps,
// mastery behaviour, and topic-selection coverage/weighting.

import { suite, test, assert, assertEq } from "./harness.js";
import { freshState, START_LEVEL } from "../js/store.js";
import {
  recordResult,
  selectTopic,
  PROMOTE_THRESHOLD,
  DEMOTE_THRESHOLD,
} from "../js/engine.js";
import { TOPICS } from "../js/topics.js";
import { makeRng } from "../js/rng.js";

const T = "fractions";
function ans(state, correct, level) {
  recordResult(state, T, { correct, level, timeMs: 1000, qid: "x" });
}

suite("engine ladder");

test("promotes after a correct streak", () => {
  const s = freshState();
  assertEq(s.topics[T].level, START_LEVEL, "fresh topic starts at START_LEVEL");
  for (let i = 0; i < PROMOTE_THRESHOLD; i++) ans(s, true, START_LEVEL);
  assertEq(s.topics[T].level, START_LEVEL + 1, "should climb one level");
  assertEq(s.topics[T].streakCorrect, 0, "streak resets on promote");
});

test("demotes after a wrong streak", () => {
  const s = freshState();
  s.topics[T].level = 4;
  for (let i = 0; i < DEMOTE_THRESHOLD; i++) ans(s, false, 4);
  assertEq(s.topics[T].level, 3, "should drop to level 3");
});

test("never promotes past 6 or demotes below 1", () => {
  const s = freshState();
  s.topics[T].level = 6;
  for (let i = 0; i < 20; i++) ans(s, true, 6);
  assertEq(s.topics[T].level, 6, "capped at 6");
  s.topics[T].level = 1;
  for (let i = 0; i < 20; i++) ans(s, false, 1);
  assertEq(s.topics[T].level, 1, "floored at 1");
});

suite("engine mastery");

test("mastery rises with correct, falls with wrong", () => {
  const s = freshState();
  for (let i = 0; i < 15; i++) ans(s, true, 5);
  const high = s.topics[T].mastery;
  assert(high > 0.6, "mastery should climb, got " + high);
  for (let i = 0; i < 15; i++) ans(s, false, 5);
  assert(s.topics[T].mastery < high, "mastery should fall after wrongs");
});

test("a strong topic eventually becomes mastered", () => {
  const s = freshState();
  for (let i = 0; i < 40; i++) ans(s, true, 6);
  assert(s.topics[T].mastered, "should be flagged mastered");
});

suite("engine selection");

test("every topic is reachable and weak topics are favoured", () => {
  const s = freshState();
  // Make one topic strong/mastered, leave the rest weak.
  for (let i = 0; i < 40; i++)
    recordResult(s, "fractions", { correct: true, level: 6, timeMs: 10, qid: "x" });
  const counts = {};
  const rng = makeRng(12345);
  for (let i = 0; i < 6000; i++) {
    const t = selectTopic(s, rng);
    counts[t] = (counts[t] || 0) + 1;
    s.lastTopicId = null; // don't bias the repeat-avoid rule in this stat test
  }
  for (const t of TOPICS) assert(counts[t.id] > 0, `topic ${t.id} never picked`);
  const weakAvg =
    TOPICS.filter((t) => t.id !== "fractions").reduce(
      (a, t) => a + counts[t.id],
      0
    ) /
    (TOPICS.length - 1);
  assert(
    weakAvg > counts["fractions"],
    "weak topics should be picked more than the mastered one"
  );
});
