// The single entry point the UI uses to get a question. It merges the
// parametric generators with the curated bank and stamps a reproducible id.

import { makeRng, freshSeed } from "./rng.js";
import { GENERATORS, ALL_GENERATORS } from "./generators/index.js";
import { getCurated, allCurated } from "./curated.js";
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
