// English — Vocabulary in context. Auto-markable MCQ: pick the word that
// best fits the sentence, or the closest meaning of a word as used.
import { q, makeGenerator } from "./_shared.js";
import { CONTEXT, SYNONYMS, byBand, sampleDistinct } from "./_words.js";

const templates = [
  { id: "best-fit-word", min: 1, max: 6, fn(level, rng) {
    const c = byBand(rng, CONTEXT, level);
    return q({ rng, topicId: "en-vocab", level,
      promptHTML: `Which word best completes the sentence?<br><b>${c.sentence.replace("___", "______")}</b>`,
      correctText: c.correct,
      distractors: c.distractors.slice(0, 3).map((w, i) => ({
        text: w, id: "vc_fit" + i,
        fb: `“${c.correct}” fits the meaning of the sentence best.`,
      })),
      explanation: `“${c.correct}” is the word that makes sense here.`,
      keyConcept: "Use the rest of the sentence as a clue to the missing word." });
  } },

  { id: "closest-meaning-in-context", min: 2, max: 6, fn(level, rng) {
    const e = byBand(rng, SYNONYMS, level);
    const distractors = sampleDistinct(
      rng, SYNONYMS.map((x) => x.s), 3, [e.s, e.w]
    );
    return q({ rng, topicId: "en-vocab", level,
      promptHTML: `In the sentence “The story was very <b>${e.w}</b>”, the word <b>${e.w}</b> means closest to:`,
      correctText: e.s,
      distractors: distractors.map((w, i) => ({
        text: w, id: "vc_mean" + i,
        fb: `“${e.w}” is closest in meaning to “${e.s}”.`,
      })),
      explanation: `“${e.w}” ≈ “${e.s}”.`,
      keyConcept: "Replace the word with each option and see which keeps the meaning." });
  } },
];

export default makeGenerator("enVocab", "en-vocab", templates);
