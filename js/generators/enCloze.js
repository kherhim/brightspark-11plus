// English — Cloze (gap-fill). A short passage with one gap; the child
// picks the word that fits grammatically AND in meaning. Auto-markable
// MCQ, so it stays deterministic (no free text — that is the paid essay
// add-on, Phase 7, not here).
import { q, makeGenerator } from "./_shared.js";
import { byBand } from "./_words.js";

const PASSAGES = [
  { text: "The kitten was so ___ that it slept all afternoon in the sun.",
    ok: "sleepy", bad: ["loud", "angry", "tall"], band: 1 },
  { text: "Because it had not rained for weeks, the river became very ___.",
    ok: "shallow", bad: ["deep", "wide", "cold"], band: 2 },
  { text: "The explorers packed extra food ___ the journey would be long.",
    ok: "because", bad: ["although", "unless", "whether"], band: 3 },
  { text: "Although she was nervous, she spoke with surprising ___.",
    ok: "confidence", bad: ["silence", "weakness", "fear"], band: 4 },
  { text: "The ancient manuscript was so ___ that the librarian wore gloves to touch it.",
    ok: "fragile", bad: ["sturdy", "modern", "noisy"], band: 5 },
  { text: "His argument was ___; not a single person could find a flaw in it.",
    ok: "flawless", bad: ["careless", "doubtful", "brief"], band: 6 },
  { text: "The children ran inside ___ the storm began to break.",
    ok: "as", bad: ["so", "but", "or"], band: 2 },
  { text: "The scientist recorded every result ___ to avoid any mistakes.",
    ok: "carefully", bad: ["rarely", "loudly", "barely"], band: 3 },
];

const templates = [
  { id: "single-gap", min: 1, max: 6, fn(level, rng) {
    const p = byBand(rng, PASSAGES, level);
    return q({ rng, topicId: "en-cloze", level,
      promptHTML: `Choose the word that best fills the gap:<br><i>${p.text.replace("___", "______")}</i>`,
      correctText: p.ok,
      distractors: p.bad.slice(0, 3).map((w, i) => ({
        text: w, id: "cz_gap" + i,
        fb: `“${p.ok}” fits both the grammar and the meaning of the passage.`,
      })),
      explanation: `“${p.ok}” is the word that makes the passage make sense.`,
      keyConcept: "Read the whole sentence; the gap must fit grammar and meaning." });
  } },
];

export default makeGenerator("enCloze", "en-cloze", templates);
