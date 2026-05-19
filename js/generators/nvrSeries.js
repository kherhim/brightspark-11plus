// Non-Verbal Reasoning — Figure Series. Four figures follow a rule; pick
// the figure that comes next. Distractors each break ONE attribute of the
// correct answer (so each maps to a specific misconception).
import { q, makeGenerator } from "./_shared.js";
import { figureSVG, figureRow, SHAPES, ROTATIONS } from "./_svg.js";

const ROT_SHAPES = ["triangle", "arrow", "pentagon", "diamond", "star"];

const templates = [
  { id: "rotation-series", min: 1, max: 6, fn(level, rng) {
    const shape = rng.pick(ROT_SHAPES);
    const fill = rng.int(0, level >= 4 ? 3 : 1);
    const step = (level >= 3 ? 45 : 90) * rng.pick([1, -1]);
    const r0 = rng.pick(ROTATIONS);
    const rotAt = (k) => ((r0 + k * step) % 360 + 360) % 360;
    const series = [0, 1, 2, 3].map((k) => ({
      shape, fill, rot: rotAt(k), count: 1, size: "medium",
    }));
    const ans = { shape, fill, rot: rotAt(4), count: 1, size: "medium" };
    return q({ rng, topicId: "nvr-series", level,
      promptHTML:
        `<p>Which figure comes next in the series?</p>` +
        figureRow(series, { qmark: true }),
      correctText: figureSVG(ans),
      distractors: [
        { text: figureSVG({ ...ans, rot: rotAt(3) }), id: "ns_norot",
          fb: `Each figure turns ${Math.abs(step)}° ${step > 0 ? "clockwise" : "anticlockwise"}; apply one more turn.` },
        { text: figureSVG({ ...ans, rot: rotAt(2) }), id: "ns_wrongdir",
          fb: `Keep turning the same way (${step > 0 ? "clockwise" : "anticlockwise"}) right to the end.` },
        { text: figureSVG({ ...ans, fill: (fill + 1) % 4 }), id: "ns_fill",
          fb: `The shading does not change — only the rotation does.` },
      ],
      explanation: `The figure rotates ${Math.abs(step)}° ${step > 0 ? "clockwise" : "anticlockwise"} each step.`,
      keyConcept: "Find what changes from one figure to the next, and repeat it." });
  } },

  { id: "fill-cycle-series", min: 2, max: 6, fn(level, rng) {
    const shape = rng.pick(SHAPES.filter((s) => s !== "arrow"));
    const dir = rng.pick([1, 3]); // +1 or −1 (mod 4) through the 4 shadings
    const f0 = rng.int(0, 3);
    const fillAt = (k) => (f0 + k * dir) % 4;
    const series = [0, 1, 2, 3].map((k) => ({
      shape, fill: fillAt(k), rot: 0, count: 1, size: "medium",
    }));
    const ans = { shape, fill: fillAt(4), rot: 0, count: 1, size: "medium" };
    return q({ rng, topicId: "nvr-series", level,
      promptHTML:
        `<p>Which figure comes next in the series?</p>` +
        figureRow(series, { qmark: true }),
      correctText: figureSVG(ans),
      distractors: [
        { text: figureSVG({ ...ans, fill: fillAt(3) }), id: "nf_repeat",
          fb: `The shading advances every step — move it on once more.` },
        { text: figureSVG({ ...ans, fill: (fillAt(4) + 2) % 4 }), id: "nf_skip",
          fb: `It advances by one shading each time, not two.` },
        { text: figureSVG({ ...ans, shape: SHAPES[(SHAPES.indexOf(shape) + 1) % SHAPES.length] }), id: "nf_shape",
          fb: `The shape stays the same; only the shading cycles.` },
      ],
      explanation: `The shading cycles ${dir === 1 ? "forward" : "backward"} by one each step.`,
      keyConcept: "Track the shading sequence and continue it." });
  } },
];

export default makeGenerator("nvrSeries", "nvr-series", templates);
