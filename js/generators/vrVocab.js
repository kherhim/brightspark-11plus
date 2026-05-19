// Verbal Reasoning — Synonyms & Antonyms. Pick the word closest in
// meaning, or the word most opposite in meaning. Distractors are drawn
// from the shared unrelated-word pools so they are clearly wrong.
import { q, makeGenerator } from "./_shared.js";
import {
  SYNONYMS, ANTONYMS, ADJ_POOL, NOUN_POOL, byBand, sampleDistinct,
} from "./_words.js";

const templates = [
  { id: "synonym", min: 1, max: 6, fn(level, rng) {
    const e = byBand(rng, SYNONYMS, level);
    const pool = level >= 4 ? ADJ_POOL : NOUN_POOL;
    const ds = sampleDistinct(rng, pool, 3, [e.s, e.w]);
    return q({ rng, topicId: "vr-vocab", level,
      promptHTML: `Which word means most nearly the <b>same</b> as <b>${e.w}</b>?`,
      correctText: e.s,
      distractors: ds.map((w, i) => ({
        text: w, id: "vv_syn" + i,
        fb: `“${e.w}” means the same as “${e.s}”.`,
      })),
      explanation: `“${e.w}” is a synonym of “${e.s}”.`,
      keyConcept: "A synonym has the same meaning, not just a related one." });
  } },

  { id: "antonym", min: 1, max: 6, fn(level, rng) {
    const e = byBand(rng, ANTONYMS, level);
    const pool = level >= 4 ? ADJ_POOL : NOUN_POOL;
    const ds = sampleDistinct(rng, pool, 3, [e.a, e.w]);
    return q({ rng, topicId: "vr-vocab", level,
      promptHTML: `Which word is most nearly <b>opposite</b> in meaning to <b>${e.w}</b>?`,
      correctText: e.a,
      distractors: ds.map((w, i) => ({
        text: w, id: "vv_ant" + i,
        fb: `The opposite of “${e.w}” is “${e.a}”.`,
      })),
      explanation: `“${e.a}” is the opposite of “${e.w}”.`,
      keyConcept: "An antonym means the opposite, not merely different." });
  } },
];

export default makeGenerator("vrVocab", "vr-vocab", templates);
