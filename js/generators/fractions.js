// Fractions — recalibrated HARD: harder denominators, mixed numbers,
// four operations, fraction-of-fraction, reverse problems, multi-step.
import { q, numeric, makeGenerator, gcd, lcm } from "./_shared.js";
import { fmtFraction } from "../format.js";

const F = fmtFraction;

const templates = [
  { id: "frac-of-amount", min: 1, max: 6, fn(level, rng) {
    const denoms = { 1: [3, 4, 5, 6], 2: [4, 6, 8, 10], 3: [6, 8, 9, 12],
      4: [7, 8, 9, 12], 5: [8, 9, 11, 12], 6: [11, 12, 13, 16] }[level];
    const b = rng.pick(denoms);
    const a = rng.int(2, b - 1);
    const N = b * rng.int(6 + level, 12 + level * 3);
    const correct = (N / b) * a;
    return q({ rng, topicId: "fractions", level,
      promptHTML: `What is <b>${a}/${b}</b> of <b>${N}</b>?`,
      correctText: String(correct),
      distractors: [
        { text: String((N / b)), id: "fa_unit", fb: `That is 1/${b} of ${N}. Now multiply by ${a}.` },
        { text: String(N * a), id: "fa_mult_whole", fb: `Divide ${N} by ${b} first.` },
        { text: String(N - correct), id: "fa_complement", fb: `That is the part left, not ${a}/${b} of it.` },
      ],
      explanation: "a/b of N = (N ÷ b) × a.",
      workedSteps: [`${N} ÷ ${b} = ${N / b}`, `${N / b} × ${a} = ${correct}`],
      keyConcept: "'of' means multiply." });
  } },

  { id: "reverse-fraction", min: 1, max: 6, fn(level, rng) {
    const b = rng.pick([3, 4, 5, 6, 7, 8, 9, 12]);
    const a = rng.int(2, b - 1);
    const whole = b * rng.int(4 + level, 9 + level * 2);
    const part = (whole / b) * a;
    return numeric({ topicId: "fractions", level,
      promptHTML: `<b>${a}/${b}</b> of a number is <b>${part}</b>. What is the number?`,
      value: whole,
      explanation: "If a/b is the part, one part (1/b) = part ÷ a, then × b for the whole.",
      workedSteps: [`1/${b} = ${part} ÷ ${a} = ${part / a}`, `Whole = ${part / a} × ${b} = ${whole}`],
      keyConcept: "Reverse a fraction by finding the unit fraction first." });
  } },

  { id: "simplify", min: 1, max: 6, fn(level, rng) {
    const a = rng.int(2, 8), b = rng.int(a + 1, 12);
    const k = rng.int(3, 4 + level * 2);
    const num = a * k, den = b * k;
    return q({ rng, topicId: "fractions", level,
      promptHTML: `Simplify <b>${num}/${den}</b> fully.`,
      correctText: F(num, den),
      distractors: [
        { text: `${num / gcd(num, den)}/${den}`, id: "sm_top", fb: "Divide top AND bottom by the common factor." },
        { text: `${Math.round(num / 2)}/${Math.round(den / 2)}`, id: "sm_part", fb: "Cancel the *highest* common factor, fully." },
        { text: `${num - k}/${den - k}`, id: "sm_sub", fb: "Simplify by dividing, not subtracting." },
      ],
      explanation: "Divide numerator and denominator by their HCF.",
      workedSteps: [`HCF = ${gcd(num, den)}`, `${num}/${den} = ${F(num, den)}`],
      keyConcept: "Cancel the highest common factor." });
  } },

  { id: "add-sub-unlike", min: 1, max: 6, fn(level, rng) {
    const pool = [2, 3, 4, 5, 6, 8, 9, 12];
    let d1 = rng.pick(pool), d2 = rng.pick(pool.filter((x) => x !== d1));
    const L = lcm(d1, d2);
    let a = rng.int(1, d1 - 1), b = rng.int(1, d2 - 1);
    let n1 = a * (L / d1), n2 = b * (L / d2);
    const add = rng.chance(0.5);
    if (!add && n1 < n2) { [a, b] = [b, a]; [d1, d2] = [d2, d1]; [n1, n2] = [n2, n1]; }
    const num = add ? n1 + n2 : n1 - n2;
    return q({ rng, topicId: "fractions", level,
      promptHTML: `<b>${a}/${d1} ${add ? "+" : "−"} ${b}/${d2} = ?</b>`,
      correctText: F(num, L),
      distractors: [
        { text: F(add ? a + b : Math.abs(a - b), add ? d1 + d2 : Math.abs(d1 - d2) || 1), id: "au_straight", fb: "Make denominators equal first — don't combine tops and bottoms separately." },
        { text: F(add ? a + b : Math.max(1, a - b), L), id: "au_num_only", fb: "Convert each fraction to the common denominator before combining tops." },
        { text: F(num + (L / d1), L), id: "au_slip", fb: "Recheck the converted numerators." },
      ],
      explanation: "Find a common denominator, convert both, then add or subtract the numerators.",
      workedSteps: [`Common denominator = ${L}`, `${n1}/${L} ${add ? "+" : "−"} ${n2}/${L} = ${F(num, L)}`],
      keyConcept: "Unlike denominators: make them the same first." });
  } },

  { id: "mixed-add", min: 2, max: 6, fn(level, rng) {
    const d = rng.pick([3, 4, 5, 6, 8]);
    const w1 = rng.int(1, 4 + level), w2 = rng.int(1, 4 + level);
    const n1 = rng.int(1, d - 1), n2 = rng.int(1, d - 1);
    const totalN = n1 + n2;
    const wholes = w1 + w2 + Math.floor(totalN / d);
    const rem = totalN % d;
    const correct = rem ? `${wholes} ${rem}/${d}` : String(wholes);
    return q({ rng, topicId: "fractions", level,
      promptHTML: `<b>${w1} ${n1}/${d} + ${w2} ${n2}/${d} = ?</b>`,
      correctText: correct,
      distractors: [
        { text: `${w1 + w2} ${totalN}/${d}`, id: "ma_no_carry", fb: `${totalN}/${d} is improper — carry the whole part.` },
        { text: `${w1 + w2} ${n1 + n2}/${d + d}`, id: "ma_add_den", fb: "Keep the denominator; only add numerators." },
        { text: `${wholes + 1} ${rem}/${d}`, id: "ma_slip", fb: "Recheck how many wholes carry over." },
      ],
      explanation: "Add whole parts and fraction parts; carry a whole if the fraction is improper.",
      workedSteps: [`Wholes: ${w1}+${w2}`, `Fractions: ${n1}/${d}+${n2}/${d} = ${totalN}/${d}`, `= ${correct}`],
      keyConcept: "Mixed numbers: add parts, carry improper fractions." });
  } },

  { id: "multiply-frac", min: 1, max: 6, fn(level, rng) {
    const a = rng.int(2, 6), b = rng.int(a + 1, 9);
    const c = rng.int(2, 6), d = rng.int(c + 1, 9);
    const num = a * c, den = b * d;
    return q({ rng, topicId: "fractions", level,
      promptHTML: `<b>${a}/${b} × ${c}/${d} = ?</b> (simplest form)`,
      correctText: F(num, den),
      distractors: [
        { text: F(a + c, b + d), id: "mf_add", fb: "Multiply straight across, don't add." },
        { text: F(a * d, b * c), id: "mf_cross", fb: "Cross-multiplying is for division, not ×." },
        { text: `${num}/${den}`, id: "mf_unsimplified", fb: "Correct product — now simplify it." },
      ],
      explanation: "Multiply numerators and denominators, then simplify.",
      workedSteps: [`${a}×${c}=${num}, ${b}×${d}=${den}`, `= ${F(num, den)}`],
      keyConcept: "Multiply tops, multiply bottoms, then cancel." });
  } },

  { id: "divide-frac", min: 2, max: 6, fn(level, rng) {
    const a = rng.int(2, 6), b = rng.int(a + 1, 9);
    const c = rng.int(2, 6), d = rng.int(c + 1, 9);
    const num = a * d, den = b * c;
    return q({ rng, topicId: "fractions", level,
      promptHTML: `<b>${a}/${b} ÷ ${c}/${d} = ?</b> (simplest form)`,
      correctText: F(num, den),
      distractors: [
        { text: F(a * c, b * d), id: "df_mult", fb: "To divide, multiply by the reciprocal (flip the 2nd)." },
        { text: F(b * c, a * d), id: "df_flip_first", fb: "Flip the *second* fraction, not the first." },
        { text: `${num}/${den}`, id: "df_unsimplified", fb: "Right idea — now simplify." },
      ],
      explanation: "Keep, Change, Flip: ÷ becomes × the reciprocal of the second fraction.",
      workedSteps: [`${a}/${b} × ${d}/${c} = ${F(num, den)}`],
      keyConcept: "Divide by a fraction = multiply by its reciprocal." });
  } },

  { id: "fraction-of-fraction", min: 3, max: 6, fn(level, rng) {
    const b = rng.pick([2, 3, 4, 5]), a = rng.int(1, b - 1);
    const d = rng.pick([3, 4, 5, 6]), c = rng.int(1, d - 1);
    const num = a * c, den = b * d;
    return q({ rng, topicId: "fractions", level,
      promptHTML: `What is <b>${a}/${b}</b> of <b>${c}/${d}</b>?`,
      correctText: F(num, den),
      distractors: [
        { text: F(a + c, b + d), id: "ff_add", fb: "'of' means multiply the fractions." },
        { text: F(c, d), id: "ff_none", fb: `You must take ${a}/${b} of it.` },
        { text: `${num}/${den}`, id: "ff_unsimplified", fb: "Simplify the result." },
      ],
      explanation: "'of' between fractions means multiply them.",
      workedSteps: [`${a}/${b} × ${c}/${d} = ${F(num, den)}`],
      keyConcept: "Fraction OF a fraction = multiply." });
  } },

  { id: "compare-three", min: 1, max: 6, fn(level, rng) {
    const fr = rng.sample(
      [[2, 3], [3, 4], [3, 5], [5, 8], [5, 6], [7, 12], [7, 10], [4, 9], [5, 9], [7, 8]], 3);
    const sorted = fr.slice().sort((x, y) => y[0] / y[1] - x[0] / x[1]);
    const big = `${sorted[0][0]}/${sorted[0][1]}`;
    return q({ rng, topicId: "fractions", level,
      promptHTML: `Which is the <b>largest</b>: <b>${fr.map((f) => f[0] + "/" + f[1]).join(", ")}</b>?`,
      correctText: big,
      distractors: [
        { text: `${sorted[2][0]}/${sorted[2][1]}`, id: "ct_smallest", fb: "Use a common denominator (or decimals) to compare." },
        { text: `${sorted[1][0]}/${sorted[1][1]}`, id: "ct_mid", fb: "Convert all three to the same denominator." },
        { text: "They are equal", id: "ct_equal", fb: "They are not equal — compare carefully." },
      ],
      explanation: "Convert to a common denominator or to decimals, then compare.",
      workedSteps: [`As decimals: ${fr.map((f) => (f[0] / f[1]).toFixed(2)).join(", ")}`, `Largest = ${big}`],
      keyConcept: "Common denominator (or decimals) to compare fractions." });
  } },

  { id: "improper-mixed", min: 1, max: 6, fn(level, rng) {
    const d = rng.int(3, 9), w = rng.int(2, 4 + level), n = rng.int(1, d - 1);
    const imp = w * d + n;
    if (rng.chance(0.5)) {
      return q({ rng, topicId: "fractions", level,
        promptHTML: `Write <b>${imp}/${d}</b> as a mixed number.`,
        correctText: `${w} ${n}/${d}`,
        distractors: [
          { text: `${w + 1} ${n}/${d}`, id: "im_whole", fb: "Whole part = how many times the bottom fits fully." },
          { text: `${w} ${(n % d) + 1}/${d}`, id: "im_rem", fb: "Remainder is the new numerator." },
          { text: `${imp}/${d}`, id: "im_none", fb: "Divide to get the whole part." },
        ],
        explanation: "Divide: quotient is the whole, remainder is the new numerator.",
        workedSteps: [`${imp} ÷ ${d} = ${w} r ${n}`, `= ${w} ${n}/${d}`],
        keyConcept: "Improper → mixed by division with remainder." });
    }
    return q({ rng, topicId: "fractions", level,
      promptHTML: `Write <b>${w} ${n}/${d}</b> as an improper fraction.`,
      correctText: `${imp}/${d}`,
      distractors: [
        { text: `${w * n}/${d}`, id: "mi_mult_num", fb: "Whole × denominator, then ADD the numerator." },
        { text: `${w + n}/${d}`, id: "mi_add", fb: "It's (whole × denominator) + numerator." },
        { text: `${imp}/${d + 1}`, id: "mi_den", fb: "The denominator stays the same." },
      ],
      explanation: "Improper = (whole × denominator + numerator) / denominator.",
      workedSteps: [`${w}×${d}+${n} = ${imp}`, `= ${imp}/${d}`],
      keyConcept: "Whole × bottom + top, keep the bottom." });
  } },

  { id: "frac-word-multistep", min: 2, max: 6, fn(level, rng) {
    const b1 = rng.pick([3, 4, 5]), b2 = rng.pick([3, 4, 5]);
    const N = b1 * b2 * rng.int(2, 4 + level); // keeps every step exact
    const spent1 = N / b1;
    const rest = N - spent1; // = b2 * k * (b1-1), divisible by b2
    const spent2 = rest / b2;
    const left = rest - spent2;
    return q({ rng, topicId: "fractions", level,
      promptHTML: `Ben has <b>£${N}</b>. He spends <b>1/${b1}</b> of it, then <b>1/${b2}</b> of what is left. How much (£) remains?`,
      correctText: String(left),
      distractors: [
        { text: String(rest), id: "fw_stop", fb: "Take the second fraction off the *remaining* money too." },
        { text: String(N - spent1 - N / b2), id: "fw_wrong_base", fb: "The second fraction is of what is LEFT, not of the original." },
        { text: String(spent1), id: "fw_spent", fb: "That is what he spent first, not what remains." },
      ],
      explanation: "Apply the first fraction, then the second to the new (smaller) amount.",
      workedSteps: [`Spend ${N}/${b1} = ${spent1} → £${rest} left`, `Spend ${rest}/${b2} = ${spent2} → £${left} left`],
      keyConcept: "'Of what is left' uses the reduced amount." });
  } },
];

export default makeGenerator("fractions", "fractions", templates);
