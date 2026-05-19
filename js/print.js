// Printable-worksheet builder. Pure and DOM-free (so it is node-testable):
// it just reuses the existing getQuestion()/countForms() bank with a
// deterministic seed walk, so the SAME {topicId,level,count,seed} always
// produces the SAME sheet (a parent can reprint an identical copy, or
// change the seed for a fresh set — anti-memorisation still holds because
// the numbers re-randomise per seed).

import { getQuestion, countForms } from "./questionFactory.js";
import { correctAnswerText } from "./answers.js";
import { topicById } from "./topics.js";

// A deterministic, well-mixed seed for question i of a sheet.
function seedAt(base, i) {
  let h = ((base >>> 0) ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0 || 1;
}

export function buildWorksheet({ topicId, level, count, seed = 1 }) {
  const t = topicById(topicId);
  // A missing level/count uses a sensible default; an explicit out-of-range
  // value (incl. 0) is CLAMPED rather than defaulted.
  const lvl = Math.min(6, Math.max(1, Math.round(level == null ? 3 : level)));
  const n = Math.min(50, Math.max(1, Math.round(count == null ? 10 : count)));
  const base = (seed >>> 0) || 1;
  const items = [];
  for (let i = 0; i < n; i++) {
    const q = getQuestion(topicId, lvl, seedAt(base, i));
    items.push({ n: i + 1, q, answer: correctAnswerText(q) });
  }
  return {
    topicId,
    topicName: t ? t.name : topicId,
    level: lvl,
    count: n,
    seed: base,
    items,
  };
}

// Bank size, for the "about N distinct questions" line on the screen.
export function worksheetBankInfo() {
  return countForms();
}
