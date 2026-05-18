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
    topicWeights: {
      fractions: 1.2,
      percentages: 1.2,
      ratio: 1.2,
      algebra: 1.1,
      statistics: 1.1,
    },
  },
  cem: {
    id: "cem",
    name: "CEM (Durham)",
    topicWeights: {
      percentages: 1.4,
      ratio: 1.3,
      fractions: 1.3,
      statistics: 1.3,
      measurement: 1.2,
      "place-value": 0.9,
    },
  },
  iseb: {
    id: "iseb",
    name: "ISEB / Common Entrance",
    topicWeights: {
      algebra: 1.4,
      geometry: 1.3,
      fractions: 1.2,
      pav: 1.2,
      decimals: 1.1,
    },
  },
  csse: {
    id: "csse",
    name: "CSSE (Essex)",
    topicWeights: {
      ratio: 1.5,
      fractions: 1.4,
      percentages: 1.4,
      algebra: 1.3,
      "multiply-divide": 1.2,
      statistics: 1.2,
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

// Relative importance of a topic for a board (default 1).
export function boardWeight(boardId, topicId) {
  const b = getBoard(boardId);
  const w = b && b.topicWeights && b.topicWeights[topicId];
  return typeof w === "number" && w > 0 ? w : 1;
}

// Target time per question (ms) for a board at a given level.
export function boardPaceTarget(boardId, level) {
  const b = getBoard(boardId);
  const table = (b && b.paceTargetMsByLevel) || DEFAULT_PACE_MS;
  const lvl = Math.min(6, Math.max(1, Math.round(level || 1)));
  return table[lvl] || DEFAULT_PACE_MS[lvl];
}
