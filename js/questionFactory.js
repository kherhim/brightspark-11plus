// The single entry point the UI uses to get a question. It merges the
// parametric generators with the curated bank and stamps a reproducible id.

import { makeRng, freshSeed } from "./rng.js";
import { GENERATORS, ALL_GENERATORS } from "./generators/index.js";
import { getCurated, allCurated, curatedById } from "./curated.js";
import { MAX_LEVEL } from "./topics.js";

const CURATED_CHANCE = 0.25; // at level >= 3, sometimes serve a curated problem

// Get a question for a topic at a difficulty level. A fixed `seed`
// reproduces the exact question (used for parent review and tests).
export function getQuestion(topicId, level, seed = freshSeed()) {
  const rng = makeRng(seed);
  const useCurated =
    level >= 3 && rng.float() < CURATED_CHANCE;

  if (useCurated) {
    const c = getCurated(topicId, level, rng);
    if (c) {
      c.seed = seed;
      return c;
    }
  }

  const gen = GENERATORS[topicId];
  if (!gen) throw new Error(`No generator for topic "${topicId}"`);
  const question = gen.generate(level, rng);
  question.seed = seed;
  question.id = `${topicId}:L${level}:s=${seed}`;
  return question;
}

function strHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
}

// Reproduce a question from its stable id. Generated ids look like
// "topicId:L<level>:s=<seed>" and re-run getQuestion with the same seed
// (deterministic — same branch, same numbers, same choice order). Curated
// ids look like "curated:<rawId>" and are re-normalised with a seed
// derived from the id so the rendering is stable across views.
export function getQuestionById(qid) {
  if (typeof qid !== "string") return null;
  if (qid.startsWith("curated:")) {
    const rawId = qid.slice("curated:".length);
    const q = curatedById(rawId, makeRng(strHash(qid)));
    if (q) q.id = qid;
    return q;
  }
  const m = /^(.+):L(\d+):s=(\d+)$/.exec(qid);
  if (!m) return null;
  const [, topicId, lvl, seed] = m;
  return getQuestion(topicId, Number(lvl), Number(seed));
}

// Count the question "forms" in the bank. A form = one template available
// at one difficulty level (each form produces unlimited randomised
// instances), plus each curated problem. Also returns a conservative
// estimate of distinct instances available.
export function countForms() {
  let forms = 0;
  const perTopic = {};
  for (const gen of ALL_GENERATORS) {
    let t = 0;
    for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
      t += gen.templatesAt(lvl).length;
    }
    perTopic[gen.topicId] = t;
    forms += t;
  }
  const curated = allCurated().length;
  // Each generated form yields many distinct number variants; >=15 is a
  // very conservative floor, so distinct instances dwarf the form count.
  const estimatedInstances = forms * 15 + curated;
  return { forms, curated, total: forms + curated, estimatedInstances, perTopic };
}
