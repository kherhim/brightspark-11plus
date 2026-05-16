// Schema-validates every entry in data/curated.json and checks the
// loader normalises records into valid question instances.

import { suite, test, assert, assertEq } from "./harness.js";
import { setCurated, getCurated, allCurated } from "../js/curated.js";
import { topicById } from "../js/topics.js";
import { makeRng } from "../js/rng.js";

suite("curated bank");

// Resolve relative to this module so it works from /tests/test.html
const url = new URL("../data/curated.json", import.meta.url);

let data = [];
try {
  data = await (await fetch(url, { cache: "no-store" })).json();
} catch (e) {
  data = [];
}

test("curated.json loaded", () => {
  assert(Array.isArray(data) && data.length > 0, "could not load curated.json");
});

test("every curated entry has a valid schema", () => {
  const ids = new Set();
  for (const item of data) {
    assert(item.id, "missing id");
    assert(!ids.has(item.id), "duplicate id " + item.id);
    ids.add(item.id);
    assert(topicById(item.topicId), "unknown topicId " + item.topicId);
    assert(
      typeof item.level === "number" && item.level >= 1 && item.level <= 6,
      "bad level in " + item.id
    );
    assert(item.promptHTML, "missing promptHTML in " + item.id);
    assert(item.explanation, "missing explanation in " + item.id);
    assert(item.keyConcept, "missing keyConcept in " + item.id);
    if (item.type === "mcq") {
      const correct = item.choices.filter((c) => c.correct);
      assertEq(correct.length, 1, "one correct choice required in " + item.id);
      for (const c of item.choices) {
        if (!c.correct)
          assert(
            c.misconceptionId && item.misconceptions[c.misconceptionId],
            "missing misconception feedback in " + item.id
          );
      }
    } else if (item.type === "numeric") {
      assert(
        typeof item.answer.value !== "undefined",
        "numeric needs answer.value in " + item.id
      );
    } else {
      throw new Error("unknown type in " + item.id);
    }
  }
});

test("loader normalises a curated record into a question instance", () => {
  setCurated(data);
  assert(allCurated().length > 0, "setCurated kept nothing");
  const q = getCurated("fractions", 5, makeRng(99));
  assert(q && q.promptHTML, "did not return a normalised question");
  if (q.type === "mcq") {
    assertEq(
      q.choices.filter((c) => c.correct).length,
      1,
      "normalised MCQ must have one correct"
    );
    assert(q.choices.every((c) => c.key), "choices must have keys");
  }
});
