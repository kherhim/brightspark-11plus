// Non-Verbal Reasoning — Matrices. A grid where an attribute changes along
// the rows and another along the columns; deduce the missing cell.
import { q, makeGenerator } from "./_shared.js";
import { figureSVG, figureGrid, SHAPES } from "./_svg.js";

const templates = [
  { id: "matrix-2x2", min: 1, max: 6, fn(level, rng) {
    const shape = rng.pick(SHAPES.filter((s) => s !== "circle"));
    const f0 = rng.int(0, 3);
    const dF = rng.pick([1, 3]);
    const r0 = rng.pick([0, 45, 90, 135]);
    const dR = rng.pick([45, 90, 270]);
    const fillCol = [f0, (f0 + dF) % 4];
    const rotRow = [r0, (r0 + dR) % 360];
    const cell = (i, j) => ({
      shape, fill: fillCol[j], rot: rotRow[i], count: 1, size: "medium",
    });
    const ans = cell(1, 1);
    return q({ rng, topicId: "nvr-matrix", level,
      promptHTML:
        `<p>Which figure completes the grid?</p>` +
        figureGrid([[cell(0, 0), cell(0, 1)], [cell(1, 0), "?"]]),
      correctText: figureSVG(ans),
      distractors: [
        { text: figureSVG({ ...ans, fill: fillCol[0] }), id: "nm_fill",
          fb: `The shading changes across the columns — match column 2.` },
        { text: figureSVG({ ...ans, rot: rotRow[0] }), id: "nm_rot",
          fb: `The rotation changes down the rows — match row 2.` },
        { text: figureSVG({ ...ans, fill: fillCol[0], rot: rotRow[0] }), id: "nm_both",
          fb: `Apply BOTH the row rule and the column rule.` },
      ],
      explanation: `Shading follows the column; rotation follows the row.`,
      keyConcept: "Work out the row rule and the column rule separately." });
  } },

  { id: "matrix-3x3", min: 4, max: 6, fn(level, rng) {
    const shape = rng.pick(["triangle", "pentagon", "diamond", "star"]);
    const r0 = rng.pick([0, 45, 90]);
    const dR = rng.pick([45, 90]);
    // Rotation increases across each row; shading increases down each col.
    const cell = (i, j) => ({
      shape,
      fill: (i + 1) % 4,
      rot: ((r0 + j * dR) % 360 + 360) % 360,
      count: 1, size: "small",
    });
    const grid = [
      [cell(0, 0), cell(0, 1), cell(0, 2)],
      [cell(1, 0), cell(1, 1), cell(1, 2)],
      [cell(2, 0), cell(2, 1), "?"],
    ];
    const ans = cell(2, 2);
    return q({ rng, topicId: "nvr-matrix", level,
      promptHTML:
        `<p>Which figure completes the grid?</p>` + figureGrid(grid),
      correctText: figureSVG(ans),
      distractors: [
        { text: figureSVG({ ...ans, rot: cell(2, 1).rot }), id: "nm3_rot",
          fb: `Rotation advances along the row — take it one more column.` },
        { text: figureSVG({ ...ans, fill: cell(1, 2).fill }), id: "nm3_fill",
          fb: `Shading advances down the column — use row 3's shading.` },
        { text: figureSVG({ ...ans, shape: "hexagon" }), id: "nm3_shape",
          fb: `The shape is constant throughout the grid.` },
      ],
      explanation: `Rotation increases along rows; shading increases down columns.`,
      keyConcept: "Two independent rules combine in the missing cell." });
  } },
];

export default makeGenerator("nvrMatrix", "nvr-matrix", templates);
