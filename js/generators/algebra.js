// Algebra & Sequences — recalibrated HARD: multi-step equations, brackets,
// nth-term (find the rule), unknown both sides, forming & solving.
import { q, numeric, makeGenerator } from "./_shared.js";

const templates = [
  { id: "sequence-continue", min: 1, max: 6, fn(level, rng) {
    const start = rng.int(4, 15 * level);
    const step = rng.int(3, 5 + level * 2) * rng.pick([1, -1]);
    const seq = [0, 1, 2, 3].map((i) => start + i * step);
    const next = start + 4 * step;
    return q({ rng, topicId: "algebra", level,
      promptHTML: `Continue: <b>${seq.join(", ")}, ?</b>`,
      correctText: String(next),
      distractors: [
        { text: String(next + step), id: "sc_two", fb: "Add exactly one step." },
        { text: String(seq[3] - step), id: "sc_back", fb: `The step is ${step}; keep the same direction.` },
        { text: String(seq[3] + (step > 0 ? 1 : -1)), id: "sc_one", fb: "Find the step from two terms." },
      ],
      explanation: `Constant step of ${step} (subtract consecutive terms to find it).`,
      workedSteps: [`${seq[3]} + (${step}) = ${next}`],
      keyConcept: "Linear sequence: add a constant step." });
  } },

  { id: "nth-term-rule", min: 2, max: 6, fn(level, rng) {
    const m = rng.int(2, 9), c = rng.int(-6, 9);
    const seq = [1, 2, 3, 4].map((n) => m * n + c);
    const correct = `${m}n ${c >= 0 ? "+ " + c : "− " + -c}`;
    return q({ rng, topicId: "algebra", level,
      promptHTML: `Find the nth-term rule for: <b>${seq.join(", ")}, …</b>`,
      correctText: correct,
      distractors: [
        { text: `n ${c >= 0 ? "+ " + c : "− " + -c}`, id: "nt_nostep", fb: `The common difference is ${m}, so it's ${m}n + …` },
        { text: `${m}n ${c >= 0 ? "− " + c : "+ " + -c}`, id: "nt_sign", fb: `Check the constant: 1st term − ${m} = ${seq[0] - m}.` },
        { text: `${m + 1}n ${c >= 0 ? "+ " + c : "− " + -c}`, id: "nt_step", fb: "The difference between terms is the coefficient of n." },
      ],
      explanation: "Coefficient of n = common difference; constant = (first term − difference).",
      workedSteps: [`Difference = ${m}`, `1st term ${seq[0]} = ${m}×1 + ${c}`, `Rule: ${correct}`],
      keyConcept: "nth term = (difference)·n + (term0)." });
  } },

  { id: "nth-term-value", min: 1, max: 6, fn(level, rng) {
    const m = rng.int(3, 9), c = rng.int(-9, 12);
    const n = rng.int(15, 40 + level * 10);
    return numeric({ topicId: "algebra", level,
      promptHTML: `A sequence has rule <b>${m}n ${c >= 0 ? "+ " + c : "− " + -c}</b>. What is the <b>${n}th</b> term?`,
      value: m * n + c,
      explanation: "Substitute the position number n into the rule.",
      workedSteps: [`${m} × ${n} ${c >= 0 ? "+ " + c : "− " + -c} = ${m * n + c}`],
      keyConcept: "The rule gives any term directly from its position." });
  } },

  { id: "two-step-equation", min: 1, max: 6, fn(level, rng) {
    const m = rng.int(2, 9), x = rng.int(3, 15), c = rng.int(2, 20);
    const sub = rng.chance(0.5);
    const rhs = sub ? m * x - c : m * x + c;
    return numeric({ topicId: "algebra", level,
      promptHTML: `Solve for x:  <b>${m}x ${sub ? "−" : "+"} ${c} = ${rhs}</b>`,
      value: x,
      explanation: "Undo the constant first (inverse), then divide by the coefficient.",
      workedSteps: [`${m}x = ${rhs} ${sub ? "+" : "−"} ${c} = ${sub ? rhs + c : rhs - c}`, `x = ${sub ? rhs + c : rhs - c} ÷ ${m} = ${x}`],
      keyConcept: "Same operation both sides; undo +/− then ×." });
  } },

  { id: "brackets-equation", min: 3, max: 6, fn(level, rng) {
    const a = rng.int(2, 6), x = rng.int(2, 12), b = rng.int(1, 9);
    const rhs = a * (x + b);
    return numeric({ topicId: "algebra", level,
      promptHTML: `Solve for x:  <b>${a}(x + ${b}) = ${rhs}</b>`,
      value: x,
      explanation: "Divide both sides by the number outside the bracket, then subtract.",
      workedSteps: [`x + ${b} = ${rhs} ÷ ${a} = ${rhs / a}`, `x = ${rhs / a} − ${b} = ${x}`],
      keyConcept: "Undo brackets by dividing first (or expand)." });
  } },

  { id: "unknown-both-sides", min: 4, max: 6, fn(level, rng) {
    const x = rng.int(2, 12);
    const a = rng.int(4, 9), b = rng.int(1, a - 1);
    const c = rng.int(1, 15);
    // a x + (rhsConst) = b x + c  →  (a-b)x = c - rhsConst
    const d = c + (a - b) * x;
    return numeric({ topicId: "algebra", level,
      promptHTML: `Solve for x:  <b>${a}x + ${c} = ${b}x + ${d}</b>`,
      value: x,
      explanation: "Collect x terms on one side and numbers on the other, then divide.",
      workedSteps: [`${a}x − ${b}x = ${d} − ${c}`, `${a - b}x = ${d - c}`, `x = ${(d - c) / (a - b)}`],
      keyConcept: "Gather like terms before dividing." });
  } },

  { id: "function-machine-chain", min: 1, max: 6, fn(level, rng) {
    const m = rng.int(2, 6), c = rng.int(2, 12), k = rng.int(2, 5);
    const inp = rng.int(2, 12);
    const out = (m * inp + c) * k;
    return q({ rng, topicId: "algebra", level,
      promptHTML: `Machine: input → <b>× ${m}</b> → <b>+ ${c}</b> → <b>× ${k}</b> → output.<br>Input <b>${inp}</b> gives what output?`,
      correctText: String(out),
      distractors: [
        { text: String(m * inp + c + k), id: "fmc_add", fb: "The last step is × " + k + "." },
        { text: String(m * inp * k + c), id: "fmc_order", fb: "Apply the steps strictly in order." },
        { text: String((inp + c) * m * k), id: "fmc_first", fb: "First step is × " + m + "." },
      ],
      explanation: "Apply each step in order, left to right.",
      workedSteps: [`${inp} × ${m} = ${m * inp}`, `+ ${c} = ${m * inp + c}`, `× ${k} = ${out}`],
      keyConcept: "Chained machines: one step at a time." });
  } },

  { id: "reverse-machine", min: 2, max: 6, fn(level, rng) {
    const m = rng.int(2, 6), c = rng.int(2, 15);
    const inp = rng.int(3, 15);
    const out = m * inp + c;
    return numeric({ topicId: "algebra", level,
      promptHTML: `A machine does <b>× ${m}</b> then <b>+ ${c}</b>. The output is <b>${out}</b>. What was the input?`,
      value: inp,
      explanation: "Work backwards with inverse operations, in reverse order.",
      workedSteps: [`${out} − ${c} = ${out - c}`, `${out - c} ÷ ${m} = ${inp}`],
      keyConcept: "Reverse a machine: inverse ops, reverse order." });
  } },

  { id: "substitution", min: 1, max: 6, fn(level, rng) {
    const a = rng.int(2, 9), b = rng.int(2, 9), d = rng.int(1, 12);
    const x = rng.int(2, 9), yv = rng.int(2, 9);
    const correct = a * x * x - b * yv + d;
    return q({ rng, topicId: "algebra", level,
      promptHTML: `If x = <b>${x}</b> and y = <b>${yv}</b>, work out <b>${a}x² − ${b}y + ${d}</b>.`,
      correctText: String(correct),
      distractors: [
        { text: String(a * (x * 2) - b * yv + d), id: "sub_sq", fb: "x² means x × x, not x × 2." },
        { text: String(a * x * x + b * yv + d), id: "sub_sign", fb: "There is a minus before the y term." },
        { text: String(a * x * x - b * yv - d), id: "sub_const", fb: "The constant is added." },
      ],
      explanation: "Substitute, do the power first, then ×, then +/−.",
      workedSteps: [`${a}×${x}² = ${a * x * x}`, `− ${b}×${yv} = −${b * yv}`, `+ ${d} → ${correct}`],
      keyConcept: "Substitution with powers: index before multiply." });
  } },

  { id: "form-and-solve", min: 3, max: 6, fn(level, rng) {
    const each = rng.int(3, 9), extra = rng.int(2, 20), x = rng.int(4, 15);
    const total = each * x + extra;
    return numeric({ topicId: "algebra", level,
      promptHTML: `Syon buys <b>x</b> books at <b>£${each}</b> each plus a <b>£${extra}</b> bag. He spends <b>£${total}</b> in total. How many books did he buy?`,
      value: x,
      explanation: `Form the equation ${each}x + ${extra} = ${total}, then solve it.`,
      workedSteps: [`${each}x + ${extra} = ${total}`, `${each}x = ${total - extra}`, `x = ${x}`],
      keyConcept: "Turn the words into an equation, then solve it." });
  } },

  { id: "consecutive-algebra", min: 4, max: 6, fn(level, rng) {
    const n = rng.int(8, 30);
    const sum = n + (n + 1) + (n + 2);
    return numeric({ topicId: "algebra", level,
      promptHTML: `Three consecutive numbers add to <b>${sum}</b>. What is the smallest?`,
      value: n,
      explanation: "Let them be n, n+1, n+2. Then 3n + 3 = sum, so n = (sum − 3) ÷ 3.",
      workedSteps: [`3n + 3 = ${sum}`, `3n = ${sum - 3}`, `n = ${n}`],
      keyConcept: "Represent unknowns with n and form an equation." });
  } },

  { id: "inequality", min: 5, max: 6, fn(level, rng) {
    const m = rng.int(2, 6), c = rng.int(1, 12), bound = m * rng.int(3, 9) + c;
    const maxX = Math.floor((bound - c) / m);
    return numeric({ topicId: "algebra", level,
      promptHTML: `What is the <b>largest whole number</b> x for which <b>${m}x + ${c} ≤ ${bound}</b>?`,
      value: maxX,
      explanation: "Solve like an equation, then take the largest whole number that fits.",
      workedSteps: [`${m}x ≤ ${bound - c}`, `x ≤ ${(bound - c) / m}`, `Largest whole number = ${maxX}`],
      keyConcept: "Solve the inequality, then pick the right whole number." });
  } },
];

export default makeGenerator("algebra", "algebra", templates);
