// Verbal Reasoning — Word Analogies. "A is to B as C is to ?". The strong
// distractor is B itself (children who miss the relationship); the rest
// come from the unrelated pools.
import { q, makeGenerator } from "./_shared.js";
import { ANALOGIES, NOUN_POOL, byBand, sampleDistinct } from "./_words.js";

const templates = [
  { id: "word-analogy", min: 1, max: 6, fn(level, rng) {
    const e = byBand(rng, ANALOGIES, level);
    const filler = sampleDistinct(
      rng, NOUN_POOL, 2, [e.a, e.b, e.c, e.d]
    );
    return q({ rng, topicId: "vr-analogy", level,
      promptHTML: `<b>${e.a}</b> is to <b>${e.b}</b> as <b>${e.c}</b> is to <b>?</b>`,
      correctText: e.d,
      distractors: [
        { text: e.b, id: "va_repeat",
          fb: `The relationship is “${e.rel}”. Apply it to “${e.c}” → “${e.d}”.` },
        { text: filler[0], id: "va_unrelated0",
          fb: `Find the link “${e.a} → ${e.b}” (${e.rel}) and repeat it.` },
        { text: filler[1], id: "va_unrelated1",
          fb: `Answer: “${e.d}” (${e.rel}).` },
      ],
      explanation: `Relationship: ${e.rel}. ${e.c} → ${e.d}.`,
      keyConcept: "Name the link between the first pair, then apply it." });
  } },
];

export default makeGenerator("vrAnalogy", "vr-analogy", templates);
