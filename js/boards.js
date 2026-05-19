// Target exam-board profiles. A parent picks the board they are sitting
// (or leaves it general) and the readiness picture reweights toward what
// that board emphasises. Weights are RELATIVE importance multipliers
// (default 1 for any topic not listed) and the pace targets are
// deliberately labelled estimates — they are tunable in one place here,
// not hard-coded across the app.

// Rough "a confident child should answer within" time per question, by
// level (ms). The 11+ is time-pressured, so this rises with difficulty.
// These are estimates for guidance, not official figures.
export const DEFAULT_PACE_MS = {
  1: 30000,
  2: 38000,
  3: 48000,
  4: 60000,
  5: 78000,
  6: 95000,
};

// Only the emphasised/de-emphasised topics need listing; everything else
// is weight 1. Values ~0.8–1.5.
export const BOARDS = {
  gl: {
    id: "gl",
    name: "GL Assessment",
    // GL sets separate VR, NVR and English papers alongside maths, so all
    // four subjects matter and reasoning is prominent for grammar schools.
    topicWeights: {
      fractions: 1.2,
      percentages: 1.2,
      ratio: 1.2,
      algebra: 1.1,
      statistics: 1.1,
      "vr-vocab": 1.3, "vr-analogy": 1.2, "vr-odd": 1.2, "vr-letters": 1.2,
      "vr-codes": 1.2, "vr-logic": 1.1, "vr-words": 1.2,
      "nvr-series": 1.2, "nvr-matrix": 1.2, "nvr-odd": 1.2,
      "nvr-analogy": 1.2, "nvr-rotation": 1.1,
      "en-spelling": 1.1, "en-grammar": 1.1, "en-punctuation": 1.1,
      "en-vocab": 1.2, "en-cloze": 1.2, "en-comprehension": 1.2,
    },
  },
  cem: {
    id: "cem",
    name: "CEM (Durham)",
    // CEM blends VR+NVR+English+maths in mixed papers and is famously
    // vocabulary-heavy (cloze + comprehension feature strongly).
    topicWeights: {
      percentages: 1.4,
      ratio: 1.3,
      fractions: 1.3,
      statistics: 1.3,
      measurement: 1.2,
      "place-value": 0.9,
      "vr-vocab": 1.3, "vr-analogy": 1.1, "vr-odd": 1.1, "vr-letters": 1.0,
      "vr-codes": 1.0, "vr-logic": 1.1, "vr-words": 1.2,
      "nvr-series": 1.1, "nvr-matrix": 1.1, "nvr-odd": 1.1,
      "nvr-analogy": 1.1, "nvr-rotation": 1.0,
      "en-spelling": 1.1, "en-grammar": 1.1, "en-punctuation": 1.1,
      "en-vocab": 1.4, "en-cloze": 1.4, "en-comprehension": 1.3,
    },
  },
  iseb: {
    id: "iseb",
    name: "ISEB / Common Entrance",
    // ISEB Common Pre-Test is computer-adaptive across all four subjects;
    // keep a balanced uplift on reasoning/English over the maths emphasis.
    topicWeights: {
      algebra: 1.4,
      geometry: 1.3,
      fractions: 1.2,
      pav: 1.2,
      decimals: 1.1,
      "vr-vocab": 1.1, "vr-analogy": 1.1, "vr-odd": 1.1, "vr-letters": 1.1,
      "vr-codes": 1.1, "vr-logic": 1.1, "vr-words": 1.1,
      "nvr-series": 1.1, "nvr-matrix": 1.1, "nvr-odd": 1.1,
      "nvr-analogy": 1.1, "nvr-rotation": 1.1,
      "en-spelling": 1.1, "en-grammar": 1.1, "en-punctuation": 1.1,
      "en-vocab": 1.1, "en-cloze": 1.1, "en-comprehension": 1.2,
    },
  },
  csse: {
    id: "csse",
    name: "CSSE (Essex)",
    // CSSE tests English + maths ONLY (no VR/NVR papers). Explicit 0
    // weight removes VR/NVR from the readiness picture entirely.
    topicWeights: {
      ratio: 1.5,
      fractions: 1.4,
      percentages: 1.4,
      algebra: 1.3,
      "multiply-divide": 1.2,
      statistics: 1.2,
      "vr-vocab": 0, "vr-analogy": 0, "vr-odd": 0, "vr-letters": 0,
      "vr-codes": 0, "vr-logic": 0, "vr-words": 0,
      "nvr-series": 0, "nvr-matrix": 0, "nvr-odd": 0,
      "nvr-analogy": 0, "nvr-rotation": 0,
      "en-spelling": 1.2, "en-grammar": 1.3, "en-punctuation": 1.2,
      "en-vocab": 1.3, "en-cloze": 1.3, "en-comprehension": 1.4,
    },
  },
};

// For the parent selector. `null` = no specific board (everything weight 1).
export const BOARD_LIST = Object.values(BOARDS).map((b) => ({
  id: b.id,
  name: b.name,
}));

export function getBoard(boardId) {
  return (boardId && BOARDS[boardId]) || null;
}

export function boardName(boardId) {
  const b = getBoard(boardId);
  return b ? b.name : "General 11+";
}

// Relative importance of a topic for a board. An unlisted topic defaults
// to 1; a listed topic uses its explicit value INCLUDING 0, so a board
// can fully exclude a subject it does not test (e.g. CSSE has no VR/NVR).
export function boardWeight(boardId, topicId) {
  const b = getBoard(boardId);
  const w = b && b.topicWeights && b.topicWeights[topicId];
  return typeof w === "number" && isFinite(w) && w >= 0 ? w : 1;
}

// Target time per question (ms) for a board at a given level.
export function boardPaceTarget(boardId, level) {
  const b = getBoard(boardId);
  const table = (b && b.paceTargetMsByLevel) || DEFAULT_PACE_MS;
  const lvl = Math.min(6, Math.max(1, Math.round(level || 1)));
  return table[lvl] || DEFAULT_PACE_MS[lvl];
}
