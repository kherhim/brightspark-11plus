// Phase 4A — printable worksheets. The builder must be pure and
// deterministic: the SAME {topicId,level,count,seed} reproduces the SAME
// sheet (so a parent can reprint an identical copy), it must respect the
// count, work for MCQ and numeric topics, and its answer key must match
// the canonical correct answer.

import { suite, test, assert, assertEq } from "./harness.js";
import { buildWorksheet } from "../js/print.js";
import { correctAnswerText } from "../js/answers.js";

const ids = (ws) => ws.items.map((i) => i.q.id).join("|");

suite("worksheets: build");

test("deterministic for a fixed topic/level/count/seed", () => {
  const cfg = { topicId: "fractions", level: 3, count: 10, seed: 42 };
  const a = buildWorksheet(cfg);
  const b = buildWorksheet(cfg);
  assertEq(ids(a), ids(b), "same inputs → identical question ids");
  assertEq(
    a.items.map((i) => i.answer).join("|"),
    b.items.map((i) => i.answer).join("|"),
    "same answers too"
  );
});

test("a different seed gives a different sheet", () => {
  const base = { topicId: "algebra", level: 4, count: 12 };
  const a = buildWorksheet({ ...base, seed: 1 });
  const b = buildWorksheet({ ...base, seed: 2 });
  assert(ids(a) !== ids(b), "seed actually varies the questions");
});

test("respects the requested count (clamped 1..50)", () => {
  assertEq(buildWorksheet({ topicId: "decimals", level: 2, count: 15 }).items.length, 15, "exact count");
  assertEq(buildWorksheet({ topicId: "decimals", level: 2, count: 0 }).count, 1, "min 1");
  assertEq(buildWorksheet({ topicId: "decimals", level: 2, count: 999 }).count, 50, "max 50");
});

test("works for an MCQ subject and a numeric-bearing subject", () => {
  for (const topicId of ["vr-vocab", "nvr-series", "algebra", "en-cloze"]) {
    const ws = buildWorksheet({ topicId, level: 4, count: 8, seed: 7 });
    assertEq(ws.items.length, 8, topicId + " count");
    for (const it of ws.items) {
      assert(it.q.promptHTML, topicId + " has a prompt");
      assert(["mcq", "numeric"].includes(it.q.type), topicId + " valid type");
      assert(
        String(it.answer).length > 0,
        topicId + " answer key non-empty"
      );
      assertEq(
        it.answer,
        correctAnswerText(it.q),
        topicId + " key matches the question's correct answer"
      );
    }
  }
});

test("level is clamped into 1..6 and surfaced on the sheet", () => {
  assertEq(buildWorksheet({ topicId: "geometry", level: 9, count: 3 }).level, 6, "clamp high");
  assertEq(buildWorksheet({ topicId: "geometry", level: 0, count: 3 }).level, 1, "clamp low");
});
