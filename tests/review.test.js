// Phase 2 — smart review: Leitner scheduling, misconception aggregation,
// fresh same-template re-draw, and the engine wiring that feeds them.

import { suite, test, assert, assertEq } from "./harness.js";
import { freshState } from "../js/store.js";
import { recordResult, recordMockOutcome } from "../js/engine.js";
import {
  INTERVALS_MS,
  enqueueLeitner,
  dueReviews,
  gradeReview,
  dominantMisconception,
  topicForMisconception,
} from "../js/review.js";
import { freshQuestionFromTemplate } from "../js/questionFactory.js";

const DAY = 86400000;

suite("review: Leitner scheduling");

test("enqueue puts an item in box 1, due now, keyed by templateId", () => {
  const s = freshState();
  enqueueLeitner(s, {
    topicId: "fractions",
    level: 4,
    qid: "fractions:L4:s=1",
    seed: 1,
    templateId: "frac-word",
    misconceptionId: "fw_wrong_base",
  });
  const due = dueReviews(s, Date.now() + 10);
  assertEq(due.length, 1, "one item due");
  assertEq(due[0].box, 1, "box 1");
  assertEq(due[0].key, "frac-word", "keyed by templateId");
  enqueueLeitner(s, { topicId: "fractions", level: 4, templateId: "frac-word" });
  assertEq(
    s.leitner.boxes["frac-word"].wrongCount,
    2,
    "re-failing increments wrongCount"
  );
});

test("correct promotes and pushes the due date out; 5 corrects graduate", () => {
  const s = freshState();
  enqueueLeitner(s, { topicId: "decimals", level: 3, templateId: "dx" });
  const now = 1000000;
  let b = gradeReview(s, "dx", true, now);
  assertEq(b.box, 2, "box 2");
  assertEq(b.dueAt, now + INTERVALS_MS[1], "due +1 day");
  b = gradeReview(s, "dx", true, now);
  assertEq(b.box, 3, "box 3");
  assertEq(b.dueAt, now + INTERVALS_MS[2], "due +3 days");
  gradeReview(s, "dx", true, now); // box4
  assertEq(s.leitner.boxes["dx"].box, 4, "box 4");
  gradeReview(s, "dx", true, now); // box5
  assertEq(s.leitner.boxes["dx"].box, 5, "box 5");
  const g = gradeReview(s, "dx", true, now); // graduate
  assert(g && g.graduated, "graduated out");
  assert(!s.leitner.boxes["dx"], "removed from queue");
});

test("a wrong review sends it back to box 1, due now", () => {
  const s = freshState();
  enqueueLeitner(s, { topicId: "algebra", level: 5, templateId: "ax" });
  gradeReview(s, "ax", true, 1000); // box 2
  const b = gradeReview(s, "ax", false, 5000);
  assertEq(b.box, 1, "back to box 1");
  assertEq(b.dueAt, 5000, "due immediately");
});

suite("review: misconception aggregation");

test("dominant misconception respects count + share thresholds", () => {
  const s = freshState();
  s.misconceptionCounts = { fw_wrong_base: 5, mn_sum: 1, near_miss: 99 };
  const d = dominantMisconception(s);
  assert(d && d.misconceptionId === "fw_wrong_base", "picks the recurring one");
  assertEq(d.count, 5, "count");
  assert(d.share > 0.8, "share excludes near_miss noise");

  s.misconceptionCounts = { a: 1, b: 1, c: 1 };
  assertEq(dominantMisconception(s), null, "nothing below the count floor");

  s.misconceptionCounts = { near_miss: 50 };
  assertEq(dominantMisconception(s), null, "near_miss never dominates");
});

test("topicForMisconception finds where the error clusters", () => {
  const s = freshState();
  s.topics.fractions.misconceptionCounts = { fw_wrong_base: 3 };
  s.topics.decimals.misconceptionCounts = { fw_wrong_base: 1 };
  assertEq(topicForMisconception(s, "fw_wrong_base"), "fractions");
  assertEq(topicForMisconception(s, "never_seen"), null);
});

suite("review: fresh same-template draw");

test("freshQuestionFromTemplate keeps the method, changes the numbers", () => {
  const q1 = freshQuestionFromTemplate("statistics", 3, "range");
  const q2 = freshQuestionFromTemplate("statistics", 3, "range");
  assert(q1 && q2, "both produced");
  assertEq(q1.templateId, "range", "same template id");
  assertEq(q2.templateId, "range", "same template id");
  assertEq(q1.topicId, "statistics", "right topic");
  assert(q1.id !== q2.id, "different seeds → different instances");
  const bad = freshQuestionFromTemplate("statistics", 3, "no-such-template");
  assert(bad, "unknown template falls back to a normal question");
});

suite("review: engine wiring");

test("a wrong practice answer logs, tallies and queues for review", () => {
  const s = freshState();
  recordResult(s, "fractions", {
    correct: false,
    level: 4,
    timeMs: 10,
    qid: "fractions:L4:s=7",
    seed: 7,
    templateId: "frac-x",
    misconceptionId: "fw_wrong_base",
    chosenText: "a",
    correctText: "b",
  });
  assertEq(s.mistakeLog.length, 1, "logged");
  assertEq(s.mistakeLog[0].source, "practice", "default source");
  assertEq(s.misconceptionCounts.fw_wrong_base, 1, "global tally");
  assertEq(
    s.topics.fractions.misconceptionCounts.fw_wrong_base,
    1,
    "per-topic tally"
  );
  assertEq(dueReviews(s, Date.now() + 10).length, 1, "queued for review");
});

test("near_miss padding never feeds the aggregation", () => {
  const s = freshState();
  recordResult(s, "decimals", {
    correct: false,
    level: 3,
    timeMs: 5,
    qid: "decimals:L3:s=2",
    seed: 2,
    templateId: "d-x",
    misconceptionId: "near_miss",
    chosenText: "a",
    correctText: "b",
  });
  assert(
    s.misconceptionCounts.near_miss === undefined,
    "near_miss not tallied"
  );
  assertEq(s.mistakeLog.length, 1, "still logged");
  assertEq(dueReviews(s, Date.now() + 10).length, 1, "still queued");
});

test("a mock mistake also feeds review and the global tally", () => {
  const s = freshState();
  recordMockOutcome(s, {
    id: "m", at: 1, subject: "maths", lengthQ: 1, timed: true,
    durationMs: 0, scoreCorrect: 0, scoreTotal: 1, band: "x", sections: [],
    items: [
      {
        topicId: "geometry", level: 5, correct: false, timeMs: 100,
        qid: "geometry:L5:s=3", seed: 3, templateId: "g-x", source: "generated",
        chosenKey: "B", chosenText: "x", correctText: "y",
        misconceptionId: "au_straight",
      },
    ],
  });
  assertEq(s.misconceptionCounts.au_straight, 1, "global tally from mock");
  const due = dueReviews(s, Date.now() + 10);
  assertEq(due.length, 1, "mock mistake queued for review");
  assertEq(due[0].topicId, "geometry", "right topic");
});
