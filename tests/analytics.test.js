// Phase 3 — readiness & speed analytics. The readiness signal must be
// explainable and monotonic; pace flags must trip on the right boundaries;
// the target board must actually reweight the overall picture.

import { suite, test, assert, assertEq } from "./harness.js";
import { freshState } from "../js/store.js";
import { recordResult } from "../js/engine.js";
import {
  quantile,
  median,
  paceStats,
  topicReadiness,
  overallReadiness,
  band,
  scoreBand,
  explainTopic,
  MIN_PACE_SAMPLES,
} from "../js/analytics.js";

function ts(over = {}) {
  return Object.assign(
    {
      level: 3,
      attempts: 0,
      correct: 0,
      mastery: 0,
      paceMs: [],
    },
    over
  );
}

suite("analytics: quantiles");

test("quantile interpolates; median is the 50th", () => {
  assertEq(quantile([1, 2, 3, 4], 0.5), 2.5, "p50 of 1..4");
  assertEq(quantile([10], 0.9), 10, "single value");
  assertEq(median([3, 1, 2]), 2, "median unsorted");
  assert(Number.isNaN(quantile([], 0.5)), "empty -> NaN");
  assertEq(quantile([1, 2, 3, 4], 0.25), 1.75, "p25");
});

suite("analytics: bands");

test("four-tier band thresholds", () => {
  assertEq(band(0.85).key, "ready", ">=0.8 exam-ready");
  assertEq(band(0.7).key, "ontrack", ">=0.6 on track");
  assertEq(band(0.5).key, "developing", ">=0.4 developing");
  assertEq(band(0.2).key, "early", "<0.4 early");
  assertEq(scoreBand, band, "mock report shares the same vocabulary");
});

suite("analytics: pace flags");

test("not enough samples reports collecting", () => {
  const p = paceStats(ts({ paceMs: [1000, 2000] }));
  assertEq(p.enough, false, "below the sample floor");
  assertEq(p.n, 2, "sample count returned");
  assert(p.targetMs > 0, "still exposes the target");
});

test("accurate but slow", () => {
  // level 3 → default target 48000ms; 90000 is ~1.9x → slow
  const p = paceStats(
    ts({ attempts: 20, correct: 18, paceMs: Array(6).fill(90000) })
  );
  assertEq(p.enough, true, "enough samples");
  assertEq(p.flag.key, "slow", "high accuracy + slow median");
});

test("fast but careless", () => {
  const p = paceStats(
    ts({ attempts: 20, correct: 9, paceMs: Array(6).fill(15000) })
  );
  assertEq(p.flag.key, "careless", "low accuracy + very fast");
});

test("on pace is balanced", () => {
  const p = paceStats(
    ts({ attempts: 20, correct: 15, paceMs: Array(6).fill(46000) })
  );
  assertEq(p.flag.key, "balanced", "near target, decent accuracy");
});

suite("analytics: readiness");

test("more correct never lowers readiness; confidence gates luck", () => {
  const weak = topicReadiness(
    ts({ attempts: 12, correct: 6, mastery: 0.5, level: 3 })
  );
  const strong = topicReadiness(
    ts({ attempts: 12, correct: 12, mastery: 0.9, level: 5 })
  );
  assert(strong > weak, "stronger topic reads higher");
  const lucky = topicReadiness(
    ts({ attempts: 1, correct: 1, mastery: 0.9, level: 6 })
  );
  assert(
    lucky < strong,
    "one lucky answer can't outrank a sustained record"
  );
  assertEq(topicReadiness(ts()), 0, "untouched topic = 0");
});

test("target board reweights the overall readiness", () => {
  const s = freshState();
  // Make only 'ratio' strong; everything else untouched (readiness 0).
  Object.assign(s.topics.ratio, {
    attempts: 20,
    correct: 20,
    mastery: 1,
    level: 6,
    paceMs: Array(6).fill(40000),
  });
  const general = overallReadiness(s, null);
  const csse = overallReadiness(s, "csse"); // CSSE weights ratio 1.5x
  assert(general > 0, "some readiness exists");
  assert(
    csse > general,
    `board emphasis on a strong topic raises overall (csse ${csse.toFixed(
      3
    )} > general ${general.toFixed(3)})`
  );
});

test("explainTopic is plain English and safe when unstarted", () => {
  assertEq(explainTopic(ts()), "Not started yet.");
  const e = explainTopic(
    ts({ attempts: 10, correct: 7, mastery: 0.6, level: 4 })
  );
  assert(/accurate/.test(e) && /level 4\/6/.test(e), "reads explainably");
});

suite("analytics: engine feeds pace");

test("recordResult collects per-question pace samples", () => {
  const s = freshState();
  for (let i = 0; i < MIN_PACE_SAMPLES; i++)
    recordResult(s, "decimals", {
      correct: true,
      level: 3,
      timeMs: 20000,
      qid: "decimals:L3:s=" + i,
      seed: i,
      templateId: "d",
    });
  assertEq(
    s.topics.decimals.paceMs.length,
    MIN_PACE_SAMPLES,
    "practice answers recorded pace"
  );
  assertEq(
    paceStats(s.topics.decimals, null).enough,
    true,
    "enough to analyse"
  );
  assert(s.global.totalTimeMs >= 100000, "global time accumulated");
});
