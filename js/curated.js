// Loads and serves the curated multi-step problem bank. Curated questions
// are hand-written and stored in data/curated.json. We fetch it once; if
// the fetch fails (rare, offline edge) a small embedded subset keeps the
// app usable.

const FALLBACK = [
  {
    id: "fb-1", topicId: "fractions", level: 5, type: "numeric",
    promptHTML: "Syon spends 1/3 of £24 on a book, then 1/4 of what is left on a snack. How much (£) is left?",
    answer: { value: 12, tolerance: 0, accept: ["12", "£12"] },
    explanation: "Take the book cost off first, then a quarter of the remainder.",
    workedSteps: ["1/3 of 24 = 8 → 16 left", "1/4 of 16 = 4 → 12 left"],
    keyConcept: "‘Of what is left’ uses the new amount.",
  },
  {
    id: "fb-2", topicId: "ratio", level: 5, type: "numeric",
    promptHTML: "Apples : oranges = 3 : 5. There are 24 apples. How many pieces of fruit in total?",
    answer: { value: 64, tolerance: 0, accept: ["64"] },
    explanation: "Find one part from the apples, then total all parts.",
    workedSteps: ["1 part = 24 ÷ 3 = 8", "Total = 8 × (3+5) = 64"],
    keyConcept: "Use a known share to find one ratio part.",
  },
];

let CURATED = null;

const KEYS = ["A", "B", "C", "D", "E"];

function valid(item) {
  if (!item || !item.id || !item.topicId || !item.promptHTML) return false;
  if (typeof item.level !== "number" || item.level < 1 || item.level > 6)
    return false;
  if (item.type === "mcq")
    return Array.isArray(item.choices) &&
      item.choices.filter((c) => c.correct).length === 1;
  if (item.type === "numeric")
    return item.answer && typeof item.answer.value !== "undefined";
  return false;
}

export async function loadCurated() {
  if (CURATED) return CURATED;
  try {
    const res = await fetch("./data/curated.json", { cache: "no-store" });
    const data = await res.json();
    CURATED = data.filter(valid);
    if (!CURATED.length) CURATED = FALLBACK.slice();
  } catch (e) {
    CURATED = FALLBACK.slice();
  }
  return CURATED;
}

// Synchronous accessor (after loadCurated has resolved). Tests can also
// pass an array in directly via setCurated.
export function setCurated(arr) {
  CURATED = arr.filter(valid);
}
export function allCurated() {
  return CURATED || [];
}

// Turn a stored curated record into the universal question instance,
// shuffling MCQ choices so the answer position varies.
function normalise(item, rng) {
  const base = {
    id: `curated:${item.id}`,
    source: "curated",
    topicId: item.topicId,
    level: item.level,
    seed: null,
    promptHTML: item.promptHTML,
    explanation: item.explanation || "",
    workedSteps: item.workedSteps || [],
    keyConcept: item.keyConcept || "",
  };
  if (item.type === "numeric") {
    const accept = (item.answer.accept || []).map(String);
    accept.push(String(item.answer.value));
    return {
      ...base,
      type: "numeric",
      answer: {
        value: item.answer.value,
        tolerance: item.answer.tolerance || 0,
        unit: item.answer.unit || null,
        accept,
      },
    };
  }
  const choices = rng.shuffle(item.choices.slice());
  const misconceptions = { ...(item.misconceptions || {}) };
  choices.forEach((c, i) => {
    c.key = KEYS[i];
    if (!c.correct && c.misconceptionId) {
      if (!misconceptions[c.misconceptionId])
        misconceptions[c.misconceptionId] = "Recheck your working.";
    }
  });
  return { ...base, type: "mcq", choices, misconceptions };
}

// Pick a curated question near the requested level (±1) for the topic.
export function getCurated(topicId, level, rng) {
  const pool = (CURATED || []).filter(
    (c) => c.topicId === topicId && Math.abs(c.level - level) <= 1
  );
  if (!pool.length) return null;
  return normalise(rng.pick(pool), rng);
}

export function curatedCount() {
  return (CURATED || []).length;
}
