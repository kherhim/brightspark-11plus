// Phase 4A — board profiles. New subjects must be weighted per the real
// 11+ blueprint, and CSSE (English + maths only) must genuinely EXCLUDE
// VR/NVR via an explicit 0 weight so its readiness picture is unaffected
// by reasoning topics the child never sits.

import { suite, test, assert, assertEq } from "./harness.js";
import { boardWeight } from "../js/boards.js";
import { freshState } from "../js/store.js";
import { overallReadiness, subjectReadiness } from "../js/analytics.js";

suite("boards: weighting");

test("an unlisted topic defaults to weight 1", () => {
  assertEq(boardWeight("gl", "totally-unknown"), 1, "default 1");
  assertEq(boardWeight(null, "vr-vocab"), 1, "no board → 1");
});

test("GL/CEM/ISEB give the new subjects a positive weight", () => {
  for (const id of ["vr-vocab", "nvr-series", "en-comprehension"]) {
    assert(boardWeight("gl", id) > 0, "GL weights " + id);
    assert(boardWeight("cem", id) > 0, "CEM weights " + id);
    assert(boardWeight("iseb", id) > 0, "ISEB weights " + id);
  }
  assert(boardWeight("cem", "en-vocab") >= 1.3, "CEM is vocab-heavy");
});

test("CSSE explicitly zeroes VR/NVR but keeps English", () => {
  assertEq(boardWeight("csse", "vr-vocab"), 0, "no VR for CSSE");
  assertEq(boardWeight("csse", "nvr-series"), 0, "no NVR for CSSE");
  assert(boardWeight("csse", "en-comprehension") > 1, "English emphasised");
});

suite("boards: readiness impact");

test("CSSE overall readiness ignores strong/weak VR & NVR", () => {
  const a = freshState();
  const b = freshState();
  // b has a brilliant VR record; a does not. Under CSSE (VR weight 0)
  // this must NOT change the overall readiness.
  Object.assign(b.topics["vr-vocab"], {
    attempts: 30, correct: 30, mastery: 1, level: 6,
    paceMs: Array(8).fill(20000),
  });
  const ra = overallReadiness(a, "csse");
  const rb = overallReadiness(b, "csse");
  assertEq(rb, ra, "VR mastery is invisible to a CSSE child");
  // Sanity: under GL (VR weighted) it WOULD raise readiness.
  assert(
    overallReadiness(b, "gl") > overallReadiness(a, "gl"),
    "GL does count the VR strength"
  );
});

test("subjectReadiness is null for a board that omits the subject", () => {
  const s = freshState();
  assertEq(
    subjectReadiness(s, "vr", "csse"),
    null,
    "CSSE does not assess VR → null (UI hides it)"
  );
  assert(
    subjectReadiness(s, "vr", "gl") === 0,
    "GL assesses VR; untouched → 0, not null"
  );
});

test("subjectReadiness is board-weighted and monotonic", () => {
  const s = freshState();
  const before = subjectReadiness(s, "english", null);
  assertEq(before, 0, "untouched subject → 0");
  Object.assign(s.topics["en-comprehension"], {
    attempts: 20, correct: 20, mastery: 1, level: 6,
    paceMs: Array(8).fill(25000),
  });
  const after = subjectReadiness(s, "english", null);
  assert(after > before, "improving a topic raises subject readiness");
  assert(after <= 1, "stays within 0..1");
});
