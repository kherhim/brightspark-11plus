// Percentages — recalibrated HARD: awkward %, increase/decrease, reverse
// %, successive change, profit/loss, multi-step word problems.
import { q, numeric, makeGenerator } from "./_shared.js";
import { round, fmtFraction } from "../format.js";

const PCTS = { 1: [15, 20, 30, 40], 2: [12, 24, 35, 45], 3: [12.5, 17.5, 37.5],
  4: [15, 32, 48, 65], 5: [12.5, 37.5, 62.5, 87.5], 6: [17.5, 22.5, 47.5] };

const templates = [
  { id: "pct-of-amount", min: 1, max: 6, fn(level, rng) {
    const p = rng.pick(PCTS[level]);
    const base = rng.int(4, 12) * (Number.isInteger(p) ? 20 : 80);
    const correct = round((p / 100) * base, 2);
    return q({ rng, topicId: "percentages", level,
      promptHTML: `What is <b>${p}%</b> of <b>${base}</b>?`,
      correctText: String(correct),
      distractors: [
        { text: String(round(base / p, 2)), id: "pa_div", fb: `${p}% means × ${p}/100, not ÷ ${p}.` },
        { text: String(round(correct / 10, 2)), id: "pa_decimal", fb: "Check the decimal point — % means ÷ 100." },
        { text: String(round((p / 100) * base * 10, 2)), id: "pa_x10", fb: "Recheck: ÷ 100, not ÷ 10." },
      ],
      explanation: "Build from 10% (÷10), 5% (half of 10%) and 1% (÷100).",
      workedSteps: [`1% = ${base / 100}`, `${p}% = ${p} × ${base / 100} = ${correct}`],
      keyConcept: "Per cent = out of 100." });
  } },

  { id: "what-percent", min: 1, max: 6, fn(level, rng) {
    const whole = rng.pick([20, 25, 40, 50, 80, 200, 250]);
    const frac = rng.pick([[1, 8], [3, 8], [7, 20], [9, 20], [3, 4], [2, 5]]);
    const part = (whole / frac[1]) * frac[0];
    const correct = round((part / whole) * 100, 2);
    return q({ rng, topicId: "percentages", level,
      promptHTML: `<b>${part}</b> out of <b>${whole}</b> — what percentage is that?`,
      correctText: `${correct}%`,
      distractors: [
        { text: `${part}%`, id: "wp_part", fb: "Do part ÷ whole, then × 100." },
        { text: `${round((whole / part) * 100, 2)}%`, id: "wp_flip", fb: "It's part ÷ whole, not whole ÷ part." },
        { text: `${round(correct + 12.5, 2)}%`, id: "wp_slip", fb: "Recheck part ÷ whole × 100." },
      ],
      explanation: "Percentage = (part ÷ whole) × 100.",
      workedSteps: [`${part} ÷ ${whole} = ${round(part / whole, 4)}`, `× 100 = ${correct}%`],
      keyConcept: "'What percentage' = part/whole × 100." });
  } },

  { id: "pct-increase", min: 1, max: 6, fn(level, rng) {
    const p = rng.pick([12, 15, 20, 25, 35, 40]);
    const base = rng.int(4, 16) * 25;
    const correct = round(base * (1 + p / 100), 2);
    return numeric({ topicId: "percentages", level,
      promptHTML: `A salary of <b>£${base}</b> rises by <b>${p}%</b>. What is the new salary (£)?`,
      value: correct, tolerance: 0.01, accept: [correct.toFixed(2), String(correct)],
      explanation: "Find the percentage, then add it on (or × the multiplier 1 + p/100).",
      workedSteps: [`${p}% of ${base} = ${round(base * p / 100, 2)}`, `${base} + ${round(base * p / 100, 2)} = ${correct}`],
      keyConcept: "Increase = original × (1 + p/100)." });
  } },

  { id: "pct-decrease", min: 1, max: 6, fn(level, rng) {
    const p = rng.pick([12, 15, 20, 25, 30, 40]);
    const base = rng.int(4, 16) * 25;
    const correct = round(base * (1 - p / 100), 2);
    return numeric({ topicId: "percentages", level,
      promptHTML: `A <b>${p}%</b> discount is taken off <b>£${base}</b>. What is the sale price (£)?`,
      value: correct, tolerance: 0.01, accept: [correct.toFixed(2), String(correct)],
      explanation: "Subtract the percentage from the original (or × (1 − p/100)).",
      workedSteps: [`${p}% of ${base} = ${round(base * p / 100, 2)}`, `${base} − that = ${correct}`],
      keyConcept: "Decrease = original × (1 − p/100)." });
  } },

  { id: "reverse-pct", min: 2, max: 6, fn(level, rng) {
    const p = rng.pick([10, 15, 20, 25, 30]);
    const original = rng.int(4, 16) * 20;
    const inc = rng.chance(0.5);
    const after = round(original * (inc ? 1 + p / 100 : 1 - p / 100), 2);
    return numeric({ topicId: "percentages", level,
      promptHTML: `After a <b>${p}% ${inc ? "increase" : "decrease"}</b> a price is <b>£${after}</b>. What was the <b>original</b> price (£)?`,
      value: original, tolerance: 0.05, accept: [original.toFixed(2), String(original)],
      explanation: `£${after} is ${inc ? 100 + p : 100 - p}% of the original. Divide by that multiplier.`,
      workedSteps: [`${inc ? 100 + p : 100 - p}% = £${after}`, `1% = £${round(after / (inc ? 100 + p : 100 - p), 4)}`, `100% = £${original}`],
      keyConcept: "Reverse %: divide by the multiplier, never just add the % back." });
  } },

  { id: "successive-pct", min: 3, max: 6, fn(level, rng) {
    const p1 = rng.pick([10, 20, 25]), p2 = rng.pick([10, 20, 25]);
    const base = rng.int(3, 8) * 80; // keeps both reductions exact to the penny
    const correct = round(base * (1 - p1 / 100) * (1 - p2 / 100), 2);
    return numeric({ topicId: "percentages", level,
      promptHTML: `A coat is <b>£${base}</b>. It is reduced by <b>${p1}%</b>, then a further <b>${p2}%</b> off the new price. Final price (£)?`,
      value: correct, tolerance: 0.05, accept: [correct.toFixed(2), String(correct)],
      explanation: "Apply each reduction in turn to the running price — do NOT just add the percentages.",
      workedSteps: [`${p1}% off ${base} → £${round(base * (1 - p1 / 100), 2)}`, `${p2}% off that → £${correct}`],
      keyConcept: "Successive % changes multiply, they don't add." });
  } },

  { id: "profit-loss", min: 4, max: 6, fn(level, rng) {
    const cost = rng.int(4, 16) * 25;
    const p = rng.pick([10, 20, 25, 40]);
    const profit = rng.chance(0.5);
    const sale = round(cost * (profit ? 1 + p / 100 : 1 - p / 100), 2);
    return numeric({ topicId: "percentages", level,
      promptHTML: `A shop buys an item for <b>£${cost}</b> and sells it for <b>£${sale}</b>. What is the percentage ${sale >= cost ? "profit" : "loss"}?`,
      value: round(Math.abs(sale - cost) / cost * 100, 2), tolerance: 0.05,
      accept: [round(Math.abs(sale - cost) / cost * 100, 2) + "%", String(round(Math.abs(sale - cost) / cost * 100, 2))],
      explanation: "Profit/loss % = (difference ÷ original cost) × 100.",
      workedSteps: [`Difference = £${Math.abs(sale - cost)}`, `${Math.abs(sale - cost)} ÷ ${cost} × 100 = ${round(Math.abs(sale - cost) / cost * 100, 2)}%`],
      keyConcept: "% change is always relative to the ORIGINAL." });
  } },

  { id: "fdp-convert", min: 1, max: 6, fn(level, rng) {
    const sets = [[1, 8, 12.5], [3, 8, 37.5], [5, 8, 62.5], [7, 8, 87.5],
      [1, 40, 2.5], [3, 20, 15], [7, 20, 35], [9, 20, 45], [1, 16, 6.25]];
    const [n, dn, pct] = rng.pick(sets);
    if (rng.chance(0.5))
      return q({ rng, topicId: "percentages", level,
        promptHTML: `Write <b>${n}/${dn}</b> as a percentage.`,
        correctText: `${pct}%`,
        distractors: [
          { text: `${round(n / dn, 4)}%`, id: "fp_dec", fb: "Multiply the decimal by 100." },
          { text: `${n * dn}%`, id: "fp_mult", fb: "Divide n by d, then × 100." },
          { text: `${round(pct + 12.5, 2)}%`, id: "fp_slip", fb: "Recheck ÷ then × 100." },
        ],
        explanation: "Fraction → %: divide, then × 100.",
        workedSteps: [`${n} ÷ ${dn} = ${round(n / dn, 4)}`, `× 100 = ${pct}%`],
        keyConcept: "× 100 makes a decimal a percentage." });
    return q({ rng, topicId: "percentages", level,
      promptHTML: `Write <b>${pct}%</b> as a fraction in its simplest form.`,
      correctText: fmtFraction(n, dn),
      distractors: [
        { text: `${pct}/100`, id: "pf_unsimplified", fb: "Right idea — simplify it." },
        { text: `${pct}/10`, id: "pf_ten", fb: "Per cent = over 100." },
        { text: fmtFraction(n + 1, dn), id: "pf_slip", fb: "Recheck the cancelling." },
      ],
      explanation: "Percent → fraction: over 100, then simplify (decimals × 10s if needed).",
      workedSteps: [`${pct}% = ${pct}/100 = ${fmtFraction(n, dn)}`],
      keyConcept: "% over 100, then cancel." });
  } },

  { id: "pct-word-multistep", min: 2, max: 6, fn(level, rng) {
    // Build backwards from a 'rest' divisible by 60 so every count is whole.
    const rest = 60 * rng.int(2, 4 + level);
    const p1 = rng.pick([20, 25, 40, 50]);
    const total = rest / (1 - p1 / 100); // integer for these p1 + this rest
    const first = total - rest;
    const p2 = rng.pick([20, 25, 50]);
    const second = (rest * p2) / 100;
    const left = rest - second;
    return q({ rng, topicId: "percentages", level,
      promptHTML: `A school has <b>${total}</b> pupils. <b>${p1}%</b> walk in. Of the rest, <b>${p2}%</b> cycle. The remainder come by car. How many come by car?`,
      correctText: String(left),
      distractors: [
        { text: String(second), id: "pw_cyc", fb: "That is the cyclists — the question asks for car travellers." },
        { text: String(rest), id: "pw_stop", fb: "Take the cyclists off the remainder too." },
        { text: String(first), id: "pw_first", fb: "That is the walkers, not the car travellers." },
      ],
      explanation: "Take the first % off, then the second % off the REMAINDER.",
      workedSteps: [`Walk: ${p1}% of ${total} = ${first} → ${rest} left`, `Cycle: ${p2}% of ${rest} = ${second}`, `Car = ${rest} − ${second} = ${left}`],
      keyConcept: "Watch what each percentage is taken OF." });
  } },

  { id: "find-whole-from-pct", min: 2, max: 6, fn(level, rng) {
    const p = rng.pick([4, 5, 8, 12.5, 15, 20, 25]);
    const whole = rng.int(4, 16) * (Number.isInteger(p) ? 25 : 80);
    const part = round(whole * p / 100, 2);
    return numeric({ topicId: "percentages", level,
      promptHTML: `<b>${p}%</b> of a number is <b>${part}</b>. What is the number?`,
      value: whole, tolerance: 0.05, accept: [String(whole)],
      explanation: "If p% = part, then 1% = part ÷ p, and 100% = that × 100.",
      workedSteps: [`1% = ${part} ÷ ${p} = ${round(part / p, 4)}`, `100% = ${whole}`],
      keyConcept: "Scale up from 1% to find the whole." });
  } },
];

export default makeGenerator("percentages", "percentages", templates);
