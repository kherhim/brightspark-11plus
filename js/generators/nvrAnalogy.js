// Non-Verbal Reasoning — Figure Analogies. "A is to B as C is to ?":
// work out the transformation A→B and apply the same one to C.
import { q, makeGenerator } from "./_shared.js";
import { figureSVG, SHAPES } from "./_svg.js";

const ROT_SHAPES = ["triangle", "arrow", "pentagon", "diamond", "star"];

function pairHTML(a, b, c) {
  return (
    `<div class="nvr-row">${figureSVG(a)}` +
    `<span class="nvr-op">→</span>${figureSVG(b)}` +
    `<span class="nvr-op">::</span>${figureSVG(c)}` +
    `<span class="nvr-op">→</span>` +
    `<svg class="nvr-fig" viewBox="0 0 100 100" width="96" height="96" ` +
    `role="img" aria-label="missing figure" ` +
    `style="background:#fff;border:2px dashed #9ca3af;border-radius:6px">` +
    `<text x="50" y="66" text-anchor="middle" font-size="48" fill="#6b7280">?</text></svg></div>`
  );
}

const templates = [
  { id: "rotate-analogy", min: 1, max: 6, fn(level, rng) {
    const shape = rng.pick(ROT_SHAPES);
    const fill = rng.int(0, level >= 4 ? 3 : 1);
    const step = (level >= 3 ? 45 : 90) * rng.pick([1, -1]);
    const norm = (d) => ((d % 360) + 360) % 360;
    const aRot = rng.pick([0, 45, 90, 135]);
    const cRot = norm(aRot + rng.pick([90, 180, 270]));
    const A = { shape, fill, rot: aRot, count: 1, size: "medium" };
    const B = { shape, fill, rot: norm(aRot + step), count: 1, size: "medium" };
    const C = { shape, fill, rot: cRot, count: 1, size: "medium" };
    const ans = { shape, fill, rot: norm(cRot + step), count: 1, size: "medium" };
    return q({ rng, topicId: "nvr-analogy", level,
      promptHTML: `<p>Work out A → B, then apply it to C:</p>` + pairHTML(A, B, C),
      correctText: figureSVG(ans),
      distractors: [
        { text: figureSVG(C), id: "na_none",
          fb: `A turns ${Math.abs(step)}° to make B — turn C the same way.` },
        { text: figureSVG({ ...ans, rot: norm(cRot - step) }), id: "na_dir",
          fb: `Turn C the SAME direction as A→B (${step > 0 ? "clockwise" : "anticlockwise"}).` },
        { text: figureSVG({ ...ans, fill: (fill + 1) % 4 }), id: "na_fill",
          fb: `Only the rotation changes — the shading stays.` },
      ],
      explanation: `A→B is a ${Math.abs(step)}° ${step > 0 ? "clockwise" : "anticlockwise"} turn; apply it to C.`,
      keyConcept: "Name the change in the first pair, then repeat it." });
  } },

  { id: "shade-analogy", min: 2, max: 6, fn(level, rng) {
    const shape = rng.pick(SHAPES.filter((s) => s !== "arrow"));
    const aFill = rng.int(0, 3);
    // d ∈ {1,3} so that "wrong direction" can never coincide with the
    // correct shading (2·d ≢ 0 mod 4).
    const d = rng.pick([1, 3]);
    const cShape = rng.pick(SHAPES.filter((s) => s !== "arrow" && s !== shape));
    const A = { shape, fill: aFill, rot: 0, count: 1, size: "medium" };
    const B = { shape, fill: (aFill + d) % 4, rot: 0, count: 1, size: "medium" };
    const cFill = rng.int(0, 3);
    const C = { shape: cShape, fill: cFill, rot: 0, count: 1, size: "medium" };
    const ans = { shape: cShape, fill: (cFill + d) % 4, rot: 0, count: 1, size: "medium" };
    return q({ rng, topicId: "nvr-analogy", level,
      promptHTML: `<p>Work out A → B, then apply it to C:</p>` + pairHTML(A, B, C),
      correctText: figureSVG(ans),
      distractors: [
        { text: figureSVG(C), id: "sa_none",
          fb: `The shading advances by ${d} from A to B — do the same to C.` },
        { text: figureSVG({ ...ans, fill: (cFill - d + 8) % 4 }), id: "sa_dir",
          fb: `Advance the shading the same way as A→B.` },
        { text: figureSVG({ ...ans, shape }), id: "sa_shape",
          fb: `Keep C's shape; only its shading changes.` },
      ],
      explanation: `A→B advances the shading by ${d}; apply the same step to C.`,
      keyConcept: "The transformation is about shading, not shape." });
  } },
];

export default makeGenerator("nvrAnalogy", "nvr-analogy", templates);
