// Addition & Subtraction — recalibrated HARD (multi-step, large numbers,
// money/decimals, missing values). L1 ≈ strong Year 5/6, L6 ≈ scholarship.
import { q, numeric, makeGenerator } from "./_shared.js";
import { round } from "../format.js";

const MAG = { 1: 1e3, 2: 1e3, 3: 1e4, 4: 1e4, 5: 1e5, 6: 1e6 };

const templates = [
  { id: "add-chain", min: 1, max: 6, fn(level, rng) {
    const m = MAG[level];
    const a = rng.int(m, m * 9), b = rng.int(m, m * 9), c = rng.int(m, m * 9);
    const correct = a + b + c;
    return numeric({ topicId: "add-subtract", level,
      promptHTML: `<b>${a.toLocaleString("en-GB")} + ${b.toLocaleString("en-GB")} + ${c.toLocaleString("en-GB")} = ?</b>`,
      value: correct,
      explanation: "Add in stages, lining up place value and carrying.",
      workedSteps: [`${a.toLocaleString("en-GB")} + ${b.toLocaleString("en-GB")} = ${(a + b).toLocaleString("en-GB")}`, `+ ${c.toLocaleString("en-GB")} = ${correct.toLocaleString("en-GB")}`],
      keyConcept: "Chain addition: combine two, then the next." });
  } },

  { id: "sub-borrow", min: 1, max: 6, fn(level, rng) {
    const m = MAG[level];
    // Force borrowing across zeros.
    const a = rng.int(3, 9) * m * 10;
    const b = rng.int(m, a - m);
    const correct = a - b;
    return numeric({ topicId: "add-subtract", level,
      promptHTML: `<b>${a.toLocaleString("en-GB")} − ${b.toLocaleString("en-GB")} = ?</b>`,
      value: correct,
      explanation: "Exchange across the zeros from the next non-zero column.",
      workedSteps: [`${a.toLocaleString("en-GB")} − ${b.toLocaleString("en-GB")} = ${correct.toLocaleString("en-GB")}`],
      keyConcept: "Subtraction across zeros needs careful exchanging." });
  } },

  { id: "missing-addend", min: 1, max: 6, fn(level, rng) {
    const m = MAG[level];
    const a = rng.int(m, m * 8);
    const total = a + rng.int(m, m * 8);
    const missing = total - a;
    return q({ rng, topicId: "add-subtract", level,
      promptHTML: `<b>${a.toLocaleString("en-GB")} + ☐ = ${total.toLocaleString("en-GB")}</b><br>Find the missing number.`,
      correctText: missing.toLocaleString("en-GB"),
      distractors: [
        { text: (total + a).toLocaleString("en-GB"), id: "ms_added", fb: "Subtract the known part from the total." },
        { text: total.toLocaleString("en-GB"), id: "ms_total", fb: "That is the total, not the missing part." },
        { text: (missing + m).toLocaleString("en-GB"), id: "ms_slip", fb: "Recheck the subtraction." },
      ],
      explanation: "Missing addend = total − known part (inverse operation).",
      workedSteps: [`${total.toLocaleString("en-GB")} − ${a.toLocaleString("en-GB")} = ${missing.toLocaleString("en-GB")}`],
      keyConcept: "Addition and subtraction are inverses." });
  } },

  { id: "money-multistep", min: 1, max: 6, fn(level, rng) {
    const item = round(rng.int(180, 120 * level) / 100, 2);
    const qty = rng.int(3, 6);
    const extra = round(rng.int(150, 90 * level) / 100, 2);
    const total = round(item * qty + extra, 2);
    const paid = Math.ceil(total) + rng.int(0, 4);
    const change = round(paid - total, 2);
    return numeric({ topicId: "add-subtract", level,
      promptHTML: `Omar buys <b>${qty}</b> pens at <b>£${item.toFixed(2)}</b> each and a ruler for <b>£${extra.toFixed(2)}</b>. He pays with <b>£${paid}</b>. How much change (£)?`,
      value: change, tolerance: 0.005, accept: [change.toFixed(2), `£${change.toFixed(2)}`],
      explanation: "Total the cost (price × quantity + extra), then subtract from what was paid.",
      workedSteps: [`${qty} × £${item.toFixed(2)} = £${(item * qty).toFixed(2)}`, `+ £${extra.toFixed(2)} = £${total.toFixed(2)}`, `£${paid} − £${total.toFixed(2)} = £${change.toFixed(2)}`],
      keyConcept: "Multi-step money: total first, then change." });
  } },

  { id: "balance-equation", min: 1, max: 6, fn(level, rng) {
    const m = MAG[level] / 10;
    const a = rng.int(m, m * 9), b = rng.int(m, m * 9);
    const c = rng.int(m, a + b - m);
    const missing = a + b - c;
    return numeric({ topicId: "add-subtract", level,
      promptHTML: `Balance the equation: <b>${a.toLocaleString("en-GB")} + ${b.toLocaleString("en-GB")} = ${c.toLocaleString("en-GB")} + ☐</b>`,
      value: missing,
      explanation: "Both sides must be equal. Find one side's total, then solve.",
      workedSteps: [`Left = ${(a + b).toLocaleString("en-GB")}`, `${(a + b).toLocaleString("en-GB")} − ${c.toLocaleString("en-GB")} = ${missing.toLocaleString("en-GB")}`],
      keyConcept: "‘=’ means the same value both sides." });
  } },

  { id: "word-multistep", min: 1, max: 6, fn(level, rng) {
    const start = rng.int(40 * level, 120 * level) * 10;
    const out1 = rng.int(100, start - 200);
    const inAmt = rng.int(100, 30 * level * 10);
    const out2 = rng.int(50, start - out1 + inAmt - 10);
    const correct = start - out1 + inAmt - out2;
    return q({ rng, topicId: "add-subtract", level,
      promptHTML: `A charity has <b>£${start.toLocaleString("en-GB")}</b>. It spends <b>£${out1.toLocaleString("en-GB")}</b>, receives a donation of <b>£${inAmt.toLocaleString("en-GB")}</b>, then spends <b>£${out2.toLocaleString("en-GB")}</b>. How much is left?`,
      correctText: `£${correct.toLocaleString("en-GB")}`,
      distractors: [
        { text: `£${(start - out1 - inAmt - out2).toLocaleString("en-GB")}`, id: "wp_sign", fb: "A donation is *received* — that is added." },
        { text: `£${(start - out1 + inAmt).toLocaleString("en-GB")}`, id: "wp_stop", fb: "Don't stop early — include the second spend." },
        { text: `£${(start + out1 + inAmt - out2).toLocaleString("en-GB")}`, id: "wp_allsign", fb: "Spending reduces the total." },
      ],
      explanation: "Process each event in order: spend = −, receive = +.",
      workedSteps: [`${start} − ${out1} = ${start - out1}`, `+ ${inAmt} = ${start - out1 + inAmt}`, `− ${out2} = ${correct}`],
      keyConcept: "Multi-step word problems: translate each step to + or −." });
  } },

  { id: "consecutive-sum", min: 1, max: 6, fn(level, rng) {
    const count = rng.pick([3, 5]);
    const middle = rng.int(20 * level, 90 * level);
    const sum = middle * count;
    return numeric({ topicId: "add-subtract", level,
      promptHTML: `${count} consecutive whole numbers add up to <b>${sum.toLocaleString("en-GB")}</b>. What is the <b>largest</b> of them?`,
      value: middle + (count - 1) / 2,
      explanation: "For consecutive numbers the middle one is the mean (sum ÷ count).",
      workedSteps: [`Middle = ${sum} ÷ ${count} = ${middle}`, `Largest = ${middle} + ${(count - 1) / 2} = ${middle + (count - 1) / 2}`],
      keyConcept: "Consecutive numbers: middle = mean." });
  } },

  { id: "magic-line", min: 2, max: 6, fn(level, rng) {
    const lo = rng.int(1, 9);
    const nums = [lo, lo + 1, lo + 2, lo + 3, lo + 4, lo + 5, lo + 6, lo + 7, lo + 8];
    const total = (nums.reduce((s, x) => s + x, 0)) / 3;
    return numeric({ topicId: "add-subtract", level,
      promptHTML: `A 3×3 magic square uses the numbers ${lo}–${lo + 8}, each once, so every row, column and diagonal has the same total. What is that total?`,
      value: total,
      explanation: "Total of all nine numbers, shared equally over the 3 rows.",
      workedSteps: [`Sum ${lo}–${lo + 8} = ${nums.reduce((s, x) => s + x, 0)}`, `÷ 3 rows = ${total}`],
      keyConcept: "Use the grand total to find a shared row total." });
  } },

  { id: "diff-of-totals", min: 1, max: 6, fn(level, rng) {
    const m = MAG[level] / 10;
    const setA = [rng.int(m, m * 9), rng.int(m, m * 9), rng.int(m, m * 9)];
    const setB = [rng.int(m, m * 9), rng.int(m, m * 9)];
    const tA = setA.reduce((s, x) => s + x, 0);
    const tB = setB.reduce((s, x) => s + x, 0);
    const correct = Math.abs(tA - tB);
    return numeric({ topicId: "add-subtract", level,
      promptHTML: `Team A scored ${setA.join(", ")}. Team B scored ${setB.join(", ")}. What is the difference between the teams' total scores?`,
      value: correct,
      explanation: "Total each team, then subtract the smaller total from the larger.",
      workedSteps: [`A = ${tA}, B = ${tB}`, `|${tA} − ${tB}| = ${correct}`],
      keyConcept: "Compare groups by totalling each, then differencing." });
  } },

  { id: "estimate-check", min: 1, max: 6, fn(level, rng) {
    const m = MAG[level];
    const a = rng.int(m, m * 9), b = rng.int(m, m * 9);
    const wrong = a - b + rng.pick([-1, 1]) * rng.int(1, 9) * (m / 100 || 1);
    const ok = a - b === Math.round(a - b);
    return q({ rng, topicId: "add-subtract", level,
      promptHTML: `A pupil says <b>${a.toLocaleString("en-GB")} − ${b.toLocaleString("en-GB")} = ${wrong.toLocaleString("en-GB")}</b>. What is the correct answer?`,
      correctText: (a - b).toLocaleString("en-GB"),
      distractors: [
        { text: wrong.toLocaleString("en-GB"), id: "ec_trust", fb: "Don't trust the pupil — work it out yourself." },
        { text: (a + b).toLocaleString("en-GB"), id: "ec_added", fb: "The operation is subtraction." },
        { text: (a - b + 100).toLocaleString("en-GB"), id: "ec_slip", fb: "Recheck the borrowing." },
      ],
      explanation: "Recompute it carefully rather than trusting a stated answer.",
      workedSteps: [`${a.toLocaleString("en-GB")} − ${b.toLocaleString("en-GB")} = ${(a - b).toLocaleString("en-GB")}`],
      keyConcept: "Always verify a claimed answer independently." });
  } },

  { id: "bridging", min: 1, max: 6, fn(level, rng) {
    const m = MAG[level];
    const a = rng.int(m, m * 9);
    const target = Math.ceil(a / m) * m + rng.int(1, 9) * m;
    const missing = target - a;
    return numeric({ topicId: "add-subtract", level,
      promptHTML: `How much must be added to <b>${a.toLocaleString("en-GB")}</b> to reach <b>${target.toLocaleString("en-GB")}</b>?`,
      value: missing,
      explanation: "Find the difference by counting up (or subtracting) to the target.",
      workedSteps: [`${target.toLocaleString("en-GB")} − ${a.toLocaleString("en-GB")} = ${missing.toLocaleString("en-GB")}`],
      keyConcept: "‘How much to reach’ is a difference." });
  } },
];

export default makeGenerator("addSubtract", "add-subtract", templates);
