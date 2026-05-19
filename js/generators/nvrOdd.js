// Non-Verbal Reasoning — Odd One Out. Three figures share a property; one
// breaks it and is the answer. The shown options vary other attributes so
// the child must reason about the rule, not spot a duplicate.
import { q, makeGenerator } from "./_shared.js";
import { figureSVG, SHAPES, ROTATIONS } from "./_svg.js";

const templates = [
  { id: "odd-by-shape", min: 1, max: 6, fn(level, rng) {
    const shape = rng.pick(SHAPES.filter((s) => s !== "circle"));
    let other = rng.pick(SHAPES.filter((s) => s !== shape));
    const fill = rng.int(0, level >= 4 ? 3 : 1);
    const rots = rng.shuffle(ROTATIONS.slice()).slice(0, 3);
    const conformers = rots.map((r) => ({
      shape, fill, rot: r, count: 1, size: "medium",
    }));
    const odd = { shape: other, fill, rot: rng.pick(ROTATIONS), count: 1, size: "medium" };
    return q({ rng, topicId: "nvr-odd", level,
      promptHTML: `<p>Which figure is the <b>odd one out</b>?</p>`,
      correctText: figureSVG(odd),
      distractors: conformers.map((c, i) => ({
        text: figureSVG(c), id: "no_shape" + i,
        fb: `Three figures are the same shape (${shape}); the ${other} is the odd one.`,
      })),
      explanation: `Three are ${shape}s (just rotated); the ${other} breaks the set.`,
      keyConcept: "Find the property MOST figures share, then spot the exception." });
  } },

  { id: "odd-by-shading", min: 3, max: 6, fn(level, rng) {
    const shape = rng.pick(SHAPES.filter((s) => s !== "arrow"));
    const fill = rng.int(0, 3);
    let oddFill = rng.int(0, 3);
    if (oddFill === fill) oddFill = (fill + 1) % 4;
    const shapes3 = rng.shuffle(
      SHAPES.filter((s) => s !== "arrow")
    ).slice(0, 3);
    const conformers = shapes3.map((s) => ({
      shape: s, fill, rot: 0, count: 1, size: "medium",
    }));
    const odd = { shape: rng.pick(SHAPES.filter((s) => s !== "arrow")), fill: oddFill, rot: 0, count: 1, size: "medium" };
    return q({ rng, topicId: "nvr-odd", level,
      promptHTML: `<p>Which figure is the <b>odd one out</b>?</p>`,
      correctText: figureSVG(odd),
      distractors: conformers.map((c, i) => ({
        text: figureSVG(c), id: "no_fill" + i,
        fb: `Three figures share the same shading; one is shaded differently.`,
      })),
      explanation: `Three figures have the same shading; the differently-shaded one is odd.`,
      keyConcept: "The shared property here is the shading, not the shape." });
  } },
];

export default makeGenerator("nvrOdd", "nvr-odd", templates);
