// Verbal Reasoning — Letter & Number Codes. Crack a shift cipher or an
// A=1..Z=26 number code and apply it to a new word.
import { q, makeGenerator } from "./_shared.js";

const WORDS = [
  "CAT", "DOG", "SUN", "MAP", "BOX", "PEN", "CUP", "JAM", "FOX", "BUS",
  "LAMP", "FROG", "DESK", "SHIP", "GOLD", "WIND", "NEST", "RAIN",
];
const L = (i) => String.fromCharCode(65 + (((i % 26) + 26) % 26));
const idx = (ch) => ch.charCodeAt(0) - 65;
const shiftWord = (w, s) => w.split("").map((c) => L(idx(c) + s)).join("");

const templates = [
  { id: "shift-cipher", min: 1, max: 6, fn(level, rng) {
    const s = rng.int(1, 1 + Math.min(4, level)) * rng.pick([1, -1]);
    const ex = rng.pick(WORDS);
    let qw = rng.pick(WORDS);
    if (qw === ex) qw = WORDS[(WORDS.indexOf(qw) + 1) % WORDS.length];
    const ans = shiftWord(qw, s);
    return q({ rng, topicId: "vr-codes", level,
      promptHTML:
        `In a code <b>${ex}</b> is written as <b>${shiftWord(ex, s)}</b>.<br>` +
        `How is <b>${qw}</b> written?`,
      correctText: ans,
      distractors: [
        { text: shiftWord(qw, -s), id: "vc_dir",
          fb: `The shift is ${s > 0 ? "+" : ""}${s}; apply it the same way.` },
        { text: shiftWord(qw, s + 1), id: "vc_off",
          fb: `Find the shift exactly from ${ex} → ${shiftWord(ex, s)}.` },
        { text: qw.split("").reverse().join(""), id: "vc_reverse",
          fb: `The code shifts letters, it does not reverse the word.` },
      ],
      explanation: `Each letter moves ${s > 0 ? "+" : ""}${s} in the alphabet.`,
      keyConcept: "Work out the shift from the example, then apply it." });
  } },

  { id: "number-code", min: 2, max: 6, fn(level, rng) {
    let w = rng.pick(WORDS.filter((x) => x.length === 4));
    const code = w.split("").map((c) => idx(c) + 1);
    return q({ rng, topicId: "vr-codes", level,
      promptHTML:
        `Using <b>A=1, B=2, … Z=26</b>, what is the code for <b>${w}</b>?`,
      correctText: code.join(", "),
      distractors: [
        { text: w.split("").map((c) => idx(c)).join(", "), id: "nc_zero",
          fb: `A=1, not 0 — count from 1.` },
        { text: code.slice().reverse().join(", "), id: "nc_rev",
          fb: `Code the letters in order, left to right.` },
        { text: code.map((n) => n + 1).join(", "), id: "nc_off",
          fb: `Use each letter's exact position.` },
      ],
      explanation: `${w.split("").map((c, i) => `${c}=${code[i]}`).join(", ")}.`,
      keyConcept: "Map each letter to its position in the alphabet." });
  } },
];

export default makeGenerator("vrCodes", "vr-codes", templates);
