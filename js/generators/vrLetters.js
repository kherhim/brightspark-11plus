// Verbal Reasoning — Letter Sequences. Find the next letter or letter
// pair. The position in the alphabet behaves like a number sequence.
import { q, makeGenerator } from "./_shared.js";

const L = (i) => String.fromCharCode(65 + (((i % 26) + 26) % 26));

const templates = [
  { id: "single-letter-step", min: 1, max: 6, fn(level, rng) {
    const start = rng.int(0, 8);
    const step = rng.int(1, 2 + level) * rng.pick([1, -1]);
    const seq = [0, 1, 2, 3].map((k) => L(start + k * step));
    const ans = L(start + 4 * step);
    return q({ rng, topicId: "vr-letters", level,
      promptHTML: `What comes next?<br><b>${seq.join("  ")}  ?</b>`,
      correctText: ans,
      distractors: [
        { text: L(start + 3 * step), id: "vl_same",
          fb: `The step is ${step}; move one more place.` },
        { text: L(start + 4 * step + 1), id: "vl_off1",
          fb: `Find the step from two letters: it is ${step}.` },
        { text: L(start + 4 * step - step * 2), id: "vl_dir",
          fb: `Keep the same direction (step ${step}).` },
      ],
      explanation: `Each letter moves ${step} place(s) in the alphabet.`,
      keyConcept: "Treat alphabet position like a number sequence." });
  } },

  { id: "letter-pair-step", min: 2, max: 6, fn(level, rng) {
    const a0 = rng.int(0, 6), b0 = rng.int(18, 25);
    const s1 = rng.int(1, 2 + Math.floor(level / 2));
    const s2 = -rng.int(1, 2 + Math.floor(level / 2));
    const seq = [0, 1, 2, 3].map((k) => L(a0 + k * s1) + L(b0 + k * s2));
    const ans = L(a0 + 4 * s1) + L(b0 + 4 * s2);
    return q({ rng, topicId: "vr-letters", level,
      promptHTML: `Find the next pair:<br><b>${seq.join("  ")}  ?</b>`,
      correctText: ans,
      distractors: [
        { text: L(a0 + 4 * s1) + L(b0 + 3 * s2), id: "vp_2nd",
          fb: `The 2nd letter moves ${s2} each time.` },
        { text: L(a0 + 3 * s1) + L(b0 + 4 * s2), id: "vp_1st",
          fb: `The 1st letter moves +${s1} each time.` },
        { text: L(a0 + 4 * s1 + 1) + L(b0 + 4 * s2), id: "vp_off",
          fb: `Continue each letter by its own step.` },
      ],
      explanation: `1st letter +${s1}; 2nd letter ${s2} each step.`,
      keyConcept: "Each position in the pair has its own step." });
  } },
];

export default makeGenerator("vrLetters", "vr-letters", templates);
