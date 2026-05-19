// Verbal Reasoning — Odd One Out. Three words share a category; one
// intruder from a different category is the answer.
import { q, makeGenerator } from "./_shared.js";
import { CATEGORIES, byBand, sampleDistinct } from "./_words.js";

const templates = [
  { id: "odd-word-out", min: 1, max: 6, fn(level, rng) {
    const cat = byBand(rng, CATEGORIES, level);
    const others = CATEGORIES.filter((c) => c.name !== cat.name);
    const intruderCat = rng.pick(others);
    const members = sampleDistinct(rng, cat.items, 3);
    // Never pick an intruder that also appears in this category (e.g.
    // "orange" is both a fruit and a colour) or among the shown members.
    const safe = intruderCat.items.filter(
      (x) => !cat.items.includes(x) && !members.includes(x)
    );
    const intruder = rng.pick(safe.length ? safe : intruderCat.items);
    return q({ rng, topicId: "vr-odd", level,
      promptHTML:
        `Which word is the <b>odd one out</b>?<br>` +
        `<b>${members.join(" · ")} · ${intruder}</b>`,
      correctText: intruder,
      distractors: members.map((w, i) => ({
        text: w, id: "vo_member" + i,
        fb: `“${w}” is a type of ${cat.name}; “${intruder}” is not.`,
      })),
      explanation: `Three words are ${cat.name}; “${intruder}” is a ${intruderCat.name}.`,
      keyConcept: "Find the group most words belong to, then spot the exception." });
  } },
];

export default makeGenerator("vrOdd", "vr-odd", templates);
