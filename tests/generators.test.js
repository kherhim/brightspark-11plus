// Validates every generator at every level: structure, determinism,
// MCQ uniqueness + misconception mapping, clean numeric answers.

import { suite, test, assert, assertEq } from "./harness.js";
import { ALL_GENERATORS } from "../js/generators/index.js";
import { makeRng } from "../js/rng.js";
import { isClean } from "../js/format.js";
import { countForms } from "../js/questionFactory.js";

const SAMPLES = 60;

suite("generators");

for (const gen of ALL_GENERATORS) {
  for (let level = 1; level <= 6; level++) {
    test(`${gen.id} L${level} produces valid questions`, () => {
      for (let s = 1; s <= SAMPLES; s++) {
        const q = gen.generate(level, makeRng(s * 7919 + level));
        assert(q && q.promptHTML, "missing promptHTML");
        assert(q.explanation, "missing explanation");
        assert(q.keyConcept, "missing keyConcept");
        assert(["mcq", "numeric"].includes(q.type), "bad type " + q.type);

        if (q.type === "mcq") {
          const correct = q.choices.filter((c) => c.correct);
          assertEq(correct.length, 1, "must have exactly one correct choice");
          const texts = q.choices.map((c) => String(c.text));
          assertEq(
            new Set(texts).size,
            texts.length,
            "duplicate choice texts: " + texts.join("|")
          );
          assert(q.choices.length >= 3, "need >= 3 choices");
          for (const c of q.choices) {
            if (!c.correct) {
              assert(c.misconceptionId, "distractor missing misconceptionId");
              assert(
                q.misconceptions[c.misconceptionId],
                "no feedback for " + c.misconceptionId
              );
            }
          }
        } else {
          assert(
            typeof q.answer.value === "number" && isFinite(q.answer.value),
            "numeric answer not finite"
          );
          assert(
            isClean(q.answer.value, 3),
            `ugly numeric answer ${q.answer.value} in ${gen.id} L${level}`
          );
          assert(
            Array.isArray(q.answer.accept) && q.answer.accept.length > 0,
            "numeric needs accept[]"
          );
        }
      }
    });

    test(`${gen.id} L${level} is deterministic for a seed`, () => {
      const a = JSON.stringify(gen.generate(level, makeRng(424242)));
      const b = JSON.stringify(gen.generate(level, makeRng(424242)));
      assertEq(a, b, "same seed gave different questions");
    });
  }
}

suite("question bank size");

test("bank has plenty of question forms and instances", () => {
  const cf = countForms();
  assert(
    cf.forms >= 400,
    `expected >=400 generated forms, got ${cf.forms}`
  );
  assert(
    cf.estimatedInstances >= 1000,
    `expected >=1000 distinct questions, got ${cf.estimatedInstances}`
  );
  console.log(
    `  forms=${cf.forms} curated=${cf.curated} ~instances=${cf.estimatedInstances}`
  );
});
