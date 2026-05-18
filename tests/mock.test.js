// Mock mode relies on (a) seed-reproducible questions for the end-of-paper
// solution report, and (b) a *muted* progress update that can never move
// the practice ladder.

import { suite, test, assert, assertEq } from "./harness.js";
import { freshState, START_LEVEL } from "../js/store.js";
import { recordMockOutcome } from "../js/engine.js";
import { getQuestion, getQuestionById } from "../js/questionFactory.js";

function correctTextOf(q) {
  return q.type === "mcq"
    ? q.choices.find((c) => c.correct).text
    : String(q.answer.value);
}

suite("mock: question reproducibility");

test("getQuestionById reproduces a generated question exactly", () => {
  const cases = [
    ["fractions", 4, 12345],
    ["place-value", 6, 99],
    ["statistics", 5, 777],
    ["algebra", 3, 424242],
  ];
  for (const [topic, level, seed] of cases) {
    const q1 = getQuestion(topic, level, seed);
    const q2 = getQuestionById(q1.id);
    assert(q2, `regenerated ${q1.id}`);
    assertEq(q2.id, q1.id, "same id");
    assertEq(q2.promptHTML, q1.promptHTML, "same prompt");
    assertEq(correctTextOf(q2), correctTextOf(q1), "same correct answer");
    assertEq(q2.type, q1.type, "same type");
  }
});

test("an unparseable id returns null (no throw)", () => {
  assertEq(getQuestionById("nonsense"), null);
  assertEq(getQuestionById(123), null);
});

suite("mock: muted progress update");

function item(topicId, level, correct) {
  return {
    topicId,
    level,
    correct,
    timeMs: 5000,
    qid: `${topicId}:L${level}:s=1`,
    seed: 1,
    templateId: "tpl",
    source: "generated",
    chosenKey: "B",
    chosenText: correct ? "right" : "wrong",
    correctText: "right",
    misconceptionId: correct ? null : "m_demo",
  };
}

test("a mock never promotes or demotes the ladder", () => {
  const s = freshState();
  const items = [
    item("fractions", 5, false),
    item("fractions", 5, false),
    item("fractions", 5, false),
    item("decimals", 6, true),
    item("decimals", 6, true),
    item("algebra", 4, false),
  ];
  recordMockOutcome(s, {
    id: "m1", at: 1, subject: "mixed", lengthQ: 6, timed: true,
    durationMs: 0, scoreCorrect: 2, scoreTotal: 6, band: "x",
    sections: [], items,
  });
  for (const id of ["fractions", "decimals", "algebra"]) {
    assertEq(s.topics[id].level, START_LEVEL, `${id} level unmoved`);
    assertEq(s.topics[id].streakCorrect, 0, `${id} streakCorrect untouched`);
    assertEq(s.topics[id].streakWrong, 0, `${id} streakWrong untouched`);
  }
  assertEq(s.topics.fractions.attempts, 3, "attempts counted");
  assertEq(s.global.totalAnswered, 6, "global answered counted");
  assertEq(s.global.totalCorrect, 2, "global correct counted");
  assertEq(s.mockHistory.length, 1, "paper recorded in history");
  assertEq(
    s.mistakeLog.filter((x) => x.source === "mock").length,
    4,
    "wrong answers logged as mock mistakes"
  );
  assert(
    s.topics.fractions.misconceptionCounts.m_demo === 3,
    "misconception tallied"
  );
});

test("a strong mock raises mastery but still does not move level", () => {
  const s = freshState();
  const items = Array.from({ length: 10 }, () => item("geometry", 6, true));
  recordMockOutcome(s, {
    id: "m2", at: 1, subject: "maths", lengthQ: 10, timed: false,
    durationMs: 0, scoreCorrect: 10, scoreTotal: 10, band: "x",
    sections: [], items,
  });
  assertEq(s.topics.geometry.level, START_LEVEL, "level still unmoved");
  assert(s.topics.geometry.mastery > 0, "mastery rose from a good mock");
  assert(!s.topics.geometry.mastered, "not mastered off one muted mock");
  assertEq(s.mockHistory.length, 1, "one paper");
});

test("mockHistory is capped at 20 papers", () => {
  const s = freshState();
  for (let i = 0; i < 25; i++) {
    recordMockOutcome(s, {
      id: "m" + i, at: i, subject: "maths", lengthQ: 1, timed: false,
      durationMs: 0, scoreCorrect: 1, scoreTotal: 1, band: "x",
      sections: [], items: [item("decimals", 4, true)],
    });
  }
  assertEq(s.mockHistory.length, 20, "old papers dropped");
  assertEq(s.mockHistory[19].id, "m24", "newest kept");
});
