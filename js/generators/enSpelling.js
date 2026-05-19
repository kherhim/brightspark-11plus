// English — Spelling. Auto-markable MCQ: spot the correct spelling, or
// spot the misspelled word. Words are frequency-banded by level.
import { q, makeGenerator } from "./_shared.js";
import { SPELLING, byBand, sampleDistinct } from "./_words.js";

const templates = [
  { id: "pick-correct-spelling", min: 1, max: 6, fn(level, rng) {
    const e = byBand(rng, SPELLING, level);
    return q({ rng, topicId: "en-spelling", level,
      promptHTML: `Which is the <b>correct</b> spelling?`,
      correctText: e.correct,
      distractors: e.wrong.slice(0, 3).map((w, i) => ({
        text: w, id: "sp_wrong" + i,
        fb: `“${e.correct}” is the correct spelling.`,
      })),
      explanation: `The correct spelling is “${e.correct}”.`,
      keyConcept: "Learn tricky words by their letter patterns, not by sound." });
  } },

  { id: "spot-the-misspelling", min: 2, max: 6, fn(level, rng) {
    const e = byBand(rng, SPELLING, level);
    const others = sampleDistinct(
      rng, SPELLING.map((x) => x.correct), 3, [e.correct]
    );
    const bad = e.wrong[0];
    return q({ rng, topicId: "en-spelling", level,
      promptHTML: `Which word is spelled <b>incorrectly</b>?`,
      correctText: bad,
      distractors: others.map((w, i) => ({
        text: w, id: "sp_ok" + i,
        fb: `“${w}” is spelled correctly. “${bad}” should be “${e.correct}”.`,
      })),
      explanation: `“${bad}” is wrong — it should be “${e.correct}”.`,
      keyConcept: "Check each word letter by letter." });
  } },
];

export default makeGenerator("enSpelling", "en-spelling", templates);
