// Non-Verbal Reasoning — Rotation & Reflection. Match a figure to its
// rotation, or spot the reflection hiding among rotations.
import { q, makeGenerator } from "./_shared.js";
import { figureSVG } from "./_svg.js";

const SH = ["triangle", "arrow", "pentagon", "diamond", "star"];
const norm = (d) => ((d % 360) + 360) % 360;

const templates = [
  { id: "match-rotation", min: 1, max: 6, fn(level, rng) {
    const shape = rng.pick(SH);
    const fill = rng.int(0, level >= 4 ? 3 : 1);
    const r0 = rng.pick([0, 45, 90, 135]);
    // Avoid 180° so a turn the "wrong way" can never coincide with the
    // correct rotation (a ±180° turn lands in the same place).
    const deg = rng.pick(level >= 3 ? [45, 90, 135] : [90, 135]);
    const cw = rng.pick([1, -1]);
    const base = { shape, fill, rot: r0, count: 1, size: "medium" };
    const ans = { shape, fill, rot: norm(r0 + cw * deg), count: 1, size: "medium" };
    return q({ rng, topicId: "nvr-rotation", level,
      promptHTML:
        `<p>Which figure is this one turned <b>${deg}° ` +
        `${cw > 0 ? "clockwise" : "anticlockwise"}</b>?</p>` +
        `<div class="nvr-row">${figureSVG(base)}</div>`,
      correctText: figureSVG(ans),
      distractors: [
        { text: figureSVG(base), id: "nr_same",
          fb: `That is the original — it has not been turned.` },
        { text: figureSVG({ ...ans, rot: norm(r0 - cw * deg) }), id: "nr_dir",
          fb: `Turn it ${cw > 0 ? "clockwise" : "anticlockwise"}, the other way.` },
        { text: figureSVG({ ...ans, flip: true }), id: "nr_flip",
          fb: `This is a mirror image, not a rotation.` },
      ],
      explanation: `Turn the figure ${deg}° ${cw > 0 ? "clockwise" : "anticlockwise"} about its centre.`,
      keyConcept: "A rotation turns the figure; it does not flip it." });
  } },

  { id: "spot-the-reflection", min: 3, max: 6, fn(level, rng) {
    const shape = rng.pick(SH);
    const fill = rng.int(0, 3);
    const angles = rng.shuffle([45, 90, 135, 225, 270, 315]).slice(0, 3);
    const rotations = angles.map((a) => ({
      shape, fill, rot: a, count: 1, size: "medium",
    }));
    const reflection = {
      shape, fill, rot: rng.pick([45, 135, 225, 315]),
      count: 1, size: "medium", flip: true,
    };
    return q({ rng, topicId: "nvr-rotation", level,
      promptHTML:
        `<p>Three of the options are <b>rotations</b> of the same figure. ` +
        `Which one is a <b>reflection</b> (mirror image)?</p>`,
      correctText: figureSVG(reflection),
      distractors: rotations.map((c, i) => ({
        text: figureSVG(c), id: "nr_rot" + i,
        fb: `That is just a rotation; the reflection is the mirrored figure.`,
      })),
      explanation: `A reflection is a mirror image — it cannot be obtained by turning.`,
      keyConcept: "A reflection flips the figure; a rotation only turns it." });
  } },
];

export default makeGenerator("nvrRotation", "nvr-rotation", templates);
