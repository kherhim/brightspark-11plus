// Shared helpers for every generator. Generators stay small by leaning on
// makeMCQ (which guarantees unique, non-colliding distractors) and the
// `q` / `numeric` builders that produce the universal question instance.

import { round, gcd } from "../format.js";

export { gcd };

export function lcm(a, b) {
  return Math.abs(a * b) / gcd(a, b);
}

export function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}

export function primesUpTo(n) {
  const out = [];
  for (let i = 2; i <= n; i++) if (isPrime(i)) out.push(i);
  return out;
}

export function factorsOf(n) {
  const out = [];
  for (let i = 1; i <= n; i++) if (n % i === 0) out.push(i);
  return out;
}

const KEYS = ["A", "B", "C", "D", "E"];

// Build a multiple-choice question. `distractors` is an array of
// { text, id, fb } objects. Collisions with the correct answer or with
// each other are removed; if too few survive we synthesise safe numeric
// near-misses so the child always gets at least 3 options.
export function makeMCQ(rng, correctText, distractors) {
  correctText = String(correctText);
  const seen = new Set([correctText]);
  const kept = [];
  for (const d of distractors) {
    const text = String(d.text);
    if (seen.has(text)) continue;
    seen.add(text);
    kept.push({ text, id: d.id, fb: d.fb });
  }

  const correctNum = Number(correctText.replace(/[^0-9.\-]/g, ""));
  if (kept.length < 3 && isFinite(correctNum)) {
    const offsets = [1, -1, 2, -2, 10, -10, 5, -5, 3, -3];
    for (const o of offsets) {
      if (kept.length >= 3) break;
      const v = round(correctNum + o, 2);
      const text = String(v);
      if (v >= 0 && !seen.has(text)) {
        seen.add(text);
        kept.push({
          text,
          id: "near_miss",
          fb: "That is close but not right — recheck your working.",
        });
      }
    }
  }

  const choices = rng.shuffle(
    [{ text: correctText, correct: true }].concat(
      kept.slice(0, 3).map((d) => ({ text: d.text, correct: false, _d: d }))
    )
  );
  const misconceptions = {};
  choices.forEach((c, i) => {
    c.key = KEYS[i];
    if (!c.correct) {
      c.misconceptionId = c._d.id;
      misconceptions[c._d.id] = c._d.fb;
      delete c._d;
    }
  });
  return { choices, misconceptions };
}

// Universal question-instance builder for multiple-choice questions.
export function q(opts) {
  const { choices, misconceptions } = makeMCQ(
    opts.rng,
    opts.correctText,
    opts.distractors
  );
  return {
    source: "generated",
    topicId: opts.topicId,
    level: opts.level,
    type: "mcq",
    promptHTML: opts.promptHTML,
    choices,
    misconceptions,
    explanation: opts.explanation,
    workedSteps: opts.workedSteps || [],
    keyConcept: opts.keyConcept || "",
  };
}

// Universal builder for free-entry numeric questions.
export function numeric(opts) {
  const accept = (opts.accept || []).map(String);
  accept.push(String(opts.value));
  return {
    source: "generated",
    topicId: opts.topicId,
    level: opts.level,
    type: "numeric",
    promptHTML: opts.promptHTML,
    answer: {
      value: opts.value,
      tolerance: opts.tolerance || 0,
      unit: opts.unit || null,
      accept,
    },
    explanation: opts.explanation,
    workedSteps: opts.workedSteps || [],
    keyConcept: opts.keyConcept || "",
  };
}

// Assemble a generator module from a list of templates. Each template:
//   { id, min, max, fn(level, rng) -> question }
// `generate` picks a template valid at the requested level.
export function makeGenerator(id, topicId, templates) {
  return {
    id,
    topicId,
    templates,
    templatesAt(level) {
      return templates.filter((t) => level >= t.min && level <= t.max);
    },
    generate(level, rng) {
      const usable = this.templatesAt(level);
      const t = usable.length ? rng.pick(usable) : templates[0];
      const question = t.fn(level, rng);
      question.templateId = t.id;
      return question;
    },
  };
}
