// Verbal Reasoning — Word Manipulation. Hidden words inside longer words,
// and finding the closest-meaning pair across two groups.
import { q, makeGenerator } from "./_shared.js";
import { SYNONYMS, ADJ_POOL, byBand, sampleDistinct } from "./_words.js";

// Each carrier genuinely contains `hidden` as consecutive letters; the
// decoys do not.
const HIDDEN = [
  { hidden: "ear", what: "a body part", carriers: ["search", "yearly", "beard"], decoys: ["window", "planet", "rocket"], band: 1 },
  { hidden: "cat", what: "an animal", carriers: ["scatter", "vacate", "delicate"], decoys: ["bridge", "pencil", "garden"], band: 2 },
  { hidden: "ant", what: "an insect", carriers: ["pleasant", "distant", "elephant"], decoys: ["wonder", "circle", "yellow"], band: 2 },
  { hidden: "pen", what: "a writing tool", carriers: ["expensive", "happen", "open"], decoys: ["mirror", "candle", "forest"], band: 3 },
  { hidden: "one", what: "a number", carriers: ["money", "phone", "stone"], decoys: ["bridge", "carpet", "letter"], band: 3 },
  { hidden: "age", what: "a time of life", carriers: ["village", "manage", "cage"], decoys: ["pillow", "rocket", "stream"], band: 4 },
  { hidden: "art", what: "creative work", carriers: ["depart", "smart", "particle"], decoys: ["jungle", "bottle", "winter"], band: 5 },
];

const templates = [
  { id: "hidden-word", min: 1, max: 6, fn(level, rng) {
    const e = byBand(rng, HIDDEN, level);
    const carrier = rng.pick(e.carriers);
    const ds = sampleDistinct(rng, e.decoys, 3, [carrier]);
    return q({ rng, topicId: "vr-words", level,
      promptHTML:
        `In which word is the word <b>${e.hidden.toUpperCase()}</b> ` +
        `(${e.what}) hidden, in order, without changing the letters?`,
      correctText: carrier,
      distractors: ds.map((w, i) => ({
        text: w, id: "vw_hid" + i,
        fb: `“${carrier}” contains the letters ${e.hidden.toUpperCase()} together.`,
      })),
      explanation: `“${carrier}” has “${e.hidden}” inside it.`,
      keyConcept: "Scan each word for the target letters in order." });
  } },

  { id: "closest-meaning-pair", min: 2, max: 6, fn(level, rng) {
    const e = byBand(rng, SYNONYMS, level);
    const fillers = sampleDistinct(rng, ADJ_POOL, 4, [e.w, e.s]);
    const g1 = rng.shuffle([e.w, fillers[0], fillers[1]]);
    const g2 = rng.shuffle([e.s, fillers[2], fillers[3]]);
    return q({ rng, topicId: "vr-words", level,
      promptHTML:
        `One word in each group is closest in meaning to a word in the ` +
        `other. Which is the pair?<br>` +
        `Group 1: <b>${g1.join(", ")}</b><br>` +
        `Group 2: <b>${g2.join(", ")}</b>`,
      correctText: `${e.w} & ${e.s}`,
      distractors: [
        { text: `${e.w} & ${fillers[2]}`, id: "vw_pair0",
          fb: `“${e.w}” means the same as “${e.s}”.` },
        { text: `${fillers[0]} & ${e.s}`, id: "vw_pair1",
          fb: `Match by meaning: ${e.w} ↔ ${e.s}.` },
        { text: `${fillers[1]} & ${fillers[3]}`, id: "vw_pair2",
          fb: `The synonym pair is ${e.w} ↔ ${e.s}.` },
      ],
      explanation: `“${e.w}” (group 1) means the same as “${e.s}” (group 2).`,
      keyConcept: "Test each cross-group pairing for shared meaning." });
  } },
];

export default makeGenerator("vrWords", "vr-words", templates);
