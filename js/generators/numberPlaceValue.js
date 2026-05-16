// Number & Place Value — recalibrated HARD.
// Level 1 ≈ strong Year 5/6 already; Level 6 ≈ scholarship / CEM / CSSE.
import { q, numeric, makeGenerator } from "./_shared.js";

// Digits in the working numbers, by level (L1 already 5-digit).
const LEN = { 1: 5, 2: 6, 3: 6, 4: 7, 5: 8, 6: 9 };
const ROUND_TO = { 1: 100, 2: 1000, 3: 1000, 4: 10000, 5: 100000, 6: 1000000 };

const ROMAN = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"],
  [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"],
  [5, "V"], [4, "IV"], [1, "I"],
];
function toRoman(n) {
  let s = "";
  for (const [v, r] of ROMAN) while (n >= v) { s += r; n -= v; }
  return s;
}

const PLACES = [
  ["units", 1], ["tens", 10], ["hundreds", 100], ["thousands", 1000],
  ["ten thousands", 10000], ["hundred thousands", 100000],
  ["millions", 1000000], ["ten millions", 10000000],
  ["hundred millions", 100000000],
];

function bigNumber(rng, level) {
  const len = LEN[level];
  const digits = Array.from({ length: len }, (_, i) =>
    rng.int(i === 0 ? 1 : 0, 9));
  return { digits, n: Number(digits.join("")) };
}

const templates = [
  { id: "digit-value", min: 1, max: 6, fn(level, rng) {
    const { digits, n } = bigNumber(rng, level);
    const len = digits.length;
    const pos = rng.int(0, len - 1);
    const placeName = PLACES[len - 1 - pos][0];
    const placeVal = PLACES[len - 1 - pos][1];
    let d = digits[pos];
    if (d === 0) d = digits[pos] = rng.int(1, 9);
    const correct = d * placeVal;
    return q({ rng, topicId: "place-value", level,
      promptHTML: `In <b>${n.toLocaleString("en-GB")}</b>, what is the value of the digit <b>${d}</b> in the ${placeName} place?`,
      correctText: correct.toLocaleString("en-GB"),
      distractors: [
        { text: String(d), id: "pv_digit_only", fb: `Its value is ${d} × ${placeVal.toLocaleString("en-GB")}, not just the digit.` },
        { text: placeVal.toLocaleString("en-GB"), id: "pv_place_only", fb: "That is the place value; multiply it by the digit." },
        { text: (d * placeVal * 10).toLocaleString("en-GB"), id: "pv_off_place", fb: "Recount the columns from the right." },
      ],
      explanation: "A digit's value = the digit × its place value.",
      workedSteps: [`${d} sits in the ${placeName} column (${placeVal.toLocaleString("en-GB")})`, `${d} × ${placeVal.toLocaleString("en-GB")} = ${correct.toLocaleString("en-GB")}`],
      keyConcept: "Each column is 10× the one to its right." });
  } },

  { id: "round-nearest", min: 1, max: 6, fn(level, rng) {
    const r = ROUND_TO[level];
    const n = rng.int(r * 3, r * 970) + rng.int(1, r - 1);
    const correct = Math.round(n / r) * r;
    return q({ rng, topicId: "place-value", level,
      promptHTML: `Round <b>${n.toLocaleString("en-GB")}</b> to the nearest <b>${r.toLocaleString("en-GB")}</b>.`,
      correctText: correct.toLocaleString("en-GB"),
      distractors: [
        { text: (Math.floor(n / r) * r).toLocaleString("en-GB"), id: "rnd_down", fb: "5 or more in the next digit rounds up." },
        { text: (Math.ceil(n / r) * r).toLocaleString("en-GB"), id: "rnd_up", fb: "Less than 5 rounds down." },
        { text: (correct + r).toLocaleString("en-GB"), id: "rnd_over", fb: "You rounded one step too far." },
      ],
      explanation: `Look at the digit just below the ${r.toLocaleString("en-GB")} column to decide up or down.`,
      workedSteps: [`${n.toLocaleString("en-GB")} → ${correct.toLocaleString("en-GB")}`],
      keyConcept: "Rounding: 5+ up, 4 or less down." });
  } },

  { id: "order-numbers", min: 1, max: 6, fn(level, rng) {
    // Numbers that share leading digits, so comparison is genuinely hard.
    const len = LEN[level];
    const stem = Array.from({ length: len - 2 }, (_, i) =>
      rng.int(i === 0 ? 1 : 0, 9)).join("");
    const nums = rng.sample(
      Array.from({ length: 30 }, () => Number(stem + String(rng.int(0, 99)).padStart(2, "0"))), 5);
    const asc = rng.chance(0.5);
    const sorted = nums.slice().sort((a, b) => (asc ? a - b : b - a));
    return q({ rng, topicId: "place-value", level,
      promptHTML: `Which is the <b>${asc ? "smallest" : "largest"}</b>?<br>${nums.map((n) => n.toLocaleString("en-GB")).join(" &nbsp; ")}`,
      correctText: sorted[0].toLocaleString("en-GB"),
      distractors: [
        { text: sorted[sorted.length - 1].toLocaleString("en-GB"), id: "ord_opposite", fb: `That is the ${asc ? "largest" : "smallest"}.` },
        { text: sorted[1].toLocaleString("en-GB"), id: "ord_close", fb: "Compare the first digit that differs." },
        { text: sorted[2].toLocaleString("en-GB"), id: "ord_mid", fb: "Compare left to right, place by place." },
      ],
      explanation: "When numbers share leading digits, compare at the first place that differs.",
      workedSteps: [`Sorted: ${sorted.map((n) => n.toLocaleString("en-GB")).join(", ")}`],
      keyConcept: "Compare from the highest place value, left to right." });
  } },

  { id: "roman", min: 1, max: 6, fn(level, rng) {
    const max = { 1: 99, 2: 399, 3: 999, 4: 1999, 5: 2999, 6: 3999 }[level];
    const n = rng.int(40, max);
    const r = toRoman(n);
    if (rng.chance(0.5)) {
      return q({ rng, topicId: "place-value", level,
        promptHTML: `What number is the Roman numeral <b>${r}</b>?`,
        correctText: String(n),
        distractors: [
          { text: String(n + (rng.chance(0.5) ? 10 : -10)), id: "rom_off10", fb: "Watch X (10) and pairs like XL = 40, XC = 90." },
          { text: String(n + (rng.chance(0.5) ? 1 : -1)), id: "rom_off1", fb: "Recheck IV = 4 and IX = 9." },
          { text: String(n + 100), id: "rom_off100", fb: "Watch C (100), CD = 400, CM = 900." },
        ],
        explanation: "Add symbol values; subtract when a smaller symbol precedes a larger one.",
        workedSteps: [`${r} = ${n}`],
        keyConcept: "Subtractive pairs: IV, IX, XL, XC, CD, CM." });
    }
    return numeric({ topicId: "place-value", level,
      promptHTML: `Write <b>${n}</b> as a Roman numeral.`,
      value: 0, accept: [r, r.toLowerCase()],
      explanation: "Build from the largest values; use IV/IX-style pairs.",
      workedSteps: [`${n} = ${r}`],
      keyConcept: "M=1000, D=500, C=100, L=50, X=10, V=5, I=1." });
  } },

  { id: "negatives", min: 1, max: 6, fn(level, rng) {
    // Multi-step temperature change crossing zero.
    const start = rng.int(-12 - 3 * level, -2);
    const fall = rng.int(2, 4 + level);
    const rise = rng.int(fall + 1, fall + 8 + 2 * level);
    const correct = start - fall + rise;
    return q({ rng, topicId: "place-value", level,
      promptHTML: `The temperature is <b>${start}°C</b>. It falls by <b>${fall}°C</b>, then rises by <b>${rise}°C</b>. What is it now?`,
      correctText: `${correct}`,
      distractors: [
        { text: `${start + fall + rise}`, id: "neg_sign", fb: "It falls first — that is a subtraction." },
        { text: `${start - fall - rise}`, id: "neg_sign2", fb: "Then it rises — that part is added." },
        { text: `${Math.abs(start) - fall + rise}`, id: "neg_dropsign", fb: "Keep the minus sign on the start temperature." },
      ],
      explanation: "Track the value step by step on a number line: fall = subtract, rise = add.",
      workedSteps: [`${start} − ${fall} = ${start - fall}`, `${start - fall} + ${rise} = ${correct}`],
      keyConcept: "Cross zero carefully; fall = −, rise = +." });
  } },

  { id: "number-properties", min: 1, max: 6, fn(level, rng) {
    const kinds = level <= 2
      ? ["square number", "prime number", "multiple of both 3 and 4"]
      : ["square number", "cube number", "prime number", "multiple of both 6 and 8"];
    const kind = rng.pick(kinds);
    const test = (x) =>
      kind === "square number" ? Number.isInteger(Math.sqrt(x))
      : kind === "cube number" ? Number.isInteger(Math.cbrt(x))
      : kind === "prime number" ? (x > 1 && [...Array(x).keys()].slice(2).every((d) => x % d !== 0))
      : kind === "multiple of both 3 and 4" ? x % 12 === 0
      : x % 24 === 0;
    const hi = 30 + level * 25;
    const pool = rng.sample(Array.from({ length: 60 }, () => rng.int(8, hi)), 4);
    let correct = pool.find(test);
    if (correct === undefined) {
      correct = kind === "square number" ? 49 : kind === "cube number" ? 27
        : kind === "prime number" ? 37 : kind === "multiple of both 3 and 4" ? 24 : 48;
      pool[0] = correct;
    }
    const wrong = pool.filter((x) => x !== correct && !test(x)).slice(0, 3);
    let g = correct + 1;
    while (wrong.length < 3) { if (!test(g) && g !== correct) wrong.push(g); g++; }
    return q({ rng, topicId: "place-value", level,
      promptHTML: `Which of these is a <b>${kind}</b>?<br>${pool.join(" &nbsp; ")}`,
      correctText: String(correct),
      distractors: wrong.map((w) => ({ text: String(w), id: "prop_wrong", fb: `Test each against the rule for a ${kind}.` })),
      explanation: "Square = n×n, cube = n×n×n, prime = exactly two factors, common multiple = divisible by both.",
      workedSteps: [`${correct} is a ${kind}.`],
      keyConcept: "Know square, cube, prime numbers and common multiples on sight." });
  } },

  { id: "place-add-subtract", min: 1, max: 6, fn(level, rng) {
    const base = rng.int(Math.pow(10, LEN[level] - 1), Math.pow(10, LEN[level]) - 1);
    const step = rng.pick([100, 1000, 10000, 100000]);
    const k = rng.int(2, 9);
    const add = rng.chance(0.5);
    const correct = add ? base + step * k : base - step * k;
    return numeric({ topicId: "place-value", level,
      promptHTML: `<b>${base.toLocaleString("en-GB")} ${add ? "+" : "−"} ${(step * k).toLocaleString("en-GB")} = ?</b>`,
      value: correct,
      explanation: "Adding/subtracting a power of ten changes that column (with carrying across boundaries).",
      workedSteps: [`${base.toLocaleString("en-GB")} ${add ? "+" : "−"} ${(step * k).toLocaleString("en-GB")} = ${correct.toLocaleString("en-GB")}`],
      keyConcept: "Operate on the right column; carry across zeros." });
  } },

  { id: "compose-number", min: 1, max: 6, fn(level, rng) {
    const len = LEN[level];
    const parts = [];
    let n = 0;
    for (let i = len - 1; i >= 0; i--) {
      const d = rng.int(i === len - 1 ? 1 : 0, 9);
      if (d) parts.push(`${d} ${PLACES[i][0]}`);
      n += d * Math.pow(10, i);
    }
    return numeric({ topicId: "place-value", level,
      promptHTML: `Write the number: <b>${rng.shuffle(parts).join(", ")}</b>.`,
      value: n,
      explanation: "Add the value of every part to compose the number.",
      workedSteps: [`Total = ${n.toLocaleString("en-GB")}`],
      keyConcept: "Number = Σ (digit × place value)." });
  } },

  { id: "rounding-context", min: 1, max: 6, fn(level, rng) {
    // Two-step: round both numbers then combine (estimation).
    const r = ROUND_TO[level];
    const a = rng.int(r * 3, r * 80) + rng.int(1, r - 1);
    const b = rng.int(r * 3, r * 80) + rng.int(1, r - 1);
    const correct = Math.round(a / r) * r + Math.round(b / r) * r;
    return q({ rng, topicId: "place-value", level,
      promptHTML: `Estimate <b>${a.toLocaleString("en-GB")} + ${b.toLocaleString("en-GB")}</b> by rounding each to the nearest <b>${r.toLocaleString("en-GB")}</b>.`,
      correctText: correct.toLocaleString("en-GB"),
      distractors: [
        { text: (a + b).toLocaleString("en-GB"), id: "rc_exact", fb: "An estimate uses the rounded numbers." },
        { text: (Math.floor(a / r) * r + Math.floor(b / r) * r).toLocaleString("en-GB"), id: "rc_down", fb: "Round each properly (5+ up)." },
        { text: (correct + r).toLocaleString("en-GB"), id: "rc_slip", fb: "Recheck one rounded value." },
      ],
      explanation: "Round each number first, then add the rounded values.",
      workedSteps: [`${a.toLocaleString("en-GB")} ≈ ${(Math.round(a / r) * r).toLocaleString("en-GB")}`, `${b.toLocaleString("en-GB")} ≈ ${(Math.round(b / r) * r).toLocaleString("en-GB")}`, `Sum ≈ ${correct.toLocaleString("en-GB")}`],
      keyConcept: "Estimation = round, then calculate." });
  } },

  { id: "place-value-swap", min: 1, max: 6, fn(level, rng) {
    const len = LEN[level];
    let d = Array.from({ length: len }, (_, i) => rng.int(i === 0 ? 1 : 0, 9));
    if (d[0] === d[len - 1]) d[len - 1] = (d[len - 1] + 3) % 10 || 4;
    const original = Number(d.join(""));
    const swapped = Number([d[len - 1], ...d.slice(1, len - 1), d[0]].join(""));
    return numeric({ topicId: "place-value", level,
      promptHTML: `In <b>${original.toLocaleString("en-GB")}</b> the first and last digits are swapped. By how much does the number change?`,
      value: Math.abs(original - swapped),
      explanation: "The change = (difference of the two digits) × (difference of their place values).",
      workedSteps: [`${original.toLocaleString("en-GB")} → ${swapped.toLocaleString("en-GB")}`, `Change = ${Math.abs(original - swapped).toLocaleString("en-GB")}`],
      keyConcept: "Moving a digit changes its value by powers of 10." });
  } },

  { id: "count-in-steps", min: 1, max: 6, fn(level, rng) {
    // Includes negative steps and large steps at higher levels.
    const step = rng.pick([25, 50, 250, 500, 1000, -50, -250, -500].slice(0, 4 + level));
    const start = rng.int(20, 60) * Math.abs(step);
    const seq = [0, 1, 2, 3].map((i) => start + i * step);
    const correct = start + 4 * step;
    return q({ rng, topicId: "place-value", level,
      promptHTML: `Continue: <b>${seq.map((x) => x.toLocaleString("en-GB")).join(", ")}, ?</b>`,
      correctText: correct.toLocaleString("en-GB"),
      distractors: [
        { text: (correct + step).toLocaleString("en-GB"), id: "seq_two", fb: "Add one step, not two." },
        { text: (seq[3] - step).toLocaleString("en-GB"), id: "seq_back", fb: `The step is ${step} — keep going the same way.` },
        { text: (seq[3] + (step > 0 ? 1 : -1)).toLocaleString("en-GB"), id: "seq_one", fb: "Find the step from two consecutive terms." },
      ],
      explanation: `Constant step of ${step}.`,
      workedSteps: [`${seq[3].toLocaleString("en-GB")} + (${step}) = ${correct.toLocaleString("en-GB")}`],
      keyConcept: "Linear count: add a fixed (possibly negative) step." });
  } },

  { id: "expanded-form", min: 1, max: 6, fn(level, rng) {
    const { digits, n } = bigNumber(rng, level);
    const len = digits.length;
    const expanded = digits
      .map((dig, i) => dig * Math.pow(10, len - 1 - i))
      .filter((v) => v > 0)
      .map((v) => v.toLocaleString("en-GB"))
      .join(" + ");
    return q({ rng, topicId: "place-value", level,
      promptHTML: `Which is the expanded form of <b>${n.toLocaleString("en-GB")}</b>?`,
      correctText: expanded,
      distractors: [
        { text: digits.filter((x) => x).join(" + "), id: "exp_digits", fb: "Use place values, not bare digits." },
        { text: digits.map((dig, i) => dig * Math.pow(10, i)).filter((v) => v).map((v) => v.toLocaleString("en-GB")).join(" + "), id: "exp_rev", fb: "Largest place value first (read left to right)." },
        { text: n.toLocaleString("en-GB"), id: "exp_none", fb: "Split it into place-value parts." },
      ],
      explanation: "Expanded form = sum of each digit × its place value.",
      workedSteps: [`${n.toLocaleString("en-GB")} = ${expanded}`],
      keyConcept: "Expanded form makes place value explicit." });
  } },
];

export default makeGenerator("numberPlaceValue", "place-value", templates);
