// Multiplication & Division — recalibrated HARD: long methods, HCF/LCM,
// prime factors, order of operations, multi-step word problems.
import { q, numeric, makeGenerator, gcd, primesUpTo, isPrime } from "./_shared.js";

const templates = [
  { id: "long-mult", min: 1, max: 6, fn(level, rng) {
    const aDig = { 1: 2, 2: 3, 3: 3, 4: 3, 5: 4, 6: 4 }[level];
    const bDig = { 1: 2, 2: 2, 3: 2, 4: 3, 5: 3, 6: 3 }[level];
    const a = rng.int(Math.pow(10, aDig - 1) + 1, Math.pow(10, aDig) - 1);
    const b = rng.int(Math.pow(10, bDig - 1) + 1, Math.pow(10, bDig) - 1);
    const correct = a * b;
    return numeric({ topicId: "multiply-divide", level,
      promptHTML: `<b>${a.toLocaleString("en-GB")} × ${b.toLocaleString("en-GB")} = ?</b>`,
      value: correct,
      explanation: "Long multiplication: multiply by each digit, shift by place value, then add the partial products.",
      workedSteps: [`${a} × ${b} = ${correct.toLocaleString("en-GB")}`],
      keyConcept: "Long multiplication = sum of partial products." });
  } },

  { id: "long-div-remainder", min: 1, max: 6, fn(level, rng) {
    const divisor = rng.int(level <= 2 ? 6 : 12, level <= 2 ? 19 : 40);
    const quotient = rng.int(level <= 2 ? 30 : 60, level <= 2 ? 200 : 900);
    const rem = rng.int(1, divisor - 1);
    const dividend = divisor * quotient + rem;
    return q({ rng, topicId: "multiply-divide", level,
      promptHTML: `<b>${dividend.toLocaleString("en-GB")} ÷ ${divisor} = ?</b> (quotient and remainder)`,
      correctText: `${quotient} r ${rem}`,
      distractors: [
        { text: `${quotient + 1} r ${rem}`, id: "ld_quot", fb: "Find the largest multiple of the divisor that fits." },
        { text: `${quotient} r ${(rem % divisor) + 1}`, id: "ld_rem", fb: "Remainder = what is left after the multiples." },
        { text: `${quotient}`, id: "ld_norem", fb: "It does not divide exactly — state the remainder." },
      ],
      explanation: "Divide step by step; the remainder must be less than the divisor.",
      workedSteps: [`${divisor} × ${quotient} = ${(divisor * quotient).toLocaleString("en-GB")}`, `${dividend} − ${(divisor * quotient)} = ${rem}`],
      keyConcept: "Remainder < divisor, always." });
  } },

  { id: "division-rounding-context", min: 1, max: 6, fn(level, rng) {
    const perBox = rng.int(12, 24 + level * 4);
    const quotient = rng.int(level * 8, level * 30);
    const rem = rng.int(1, perBox - 1);
    const total = perBox * quotient + rem;
    return q({ rng, topicId: "multiply-divide", level,
      promptHTML: `Eggs are packed <b>${perBox}</b> to a box. There are <b>${total.toLocaleString("en-GB")}</b> eggs. How many boxes are needed so none are left loose?`,
      correctText: String(quotient + 1),
      distractors: [
        { text: String(quotient), id: "dr_floor", fb: "That leaves some eggs unboxed — round up." },
        { text: String(rem), id: "dr_rem", fb: "That is the leftover eggs, not the box count." },
        { text: String(quotient + 2), id: "dr_over", fb: "One extra box is enough for the remainder." },
      ],
      explanation: "Divide, then round the box count UP because the leftover still needs a box.",
      workedSteps: [`${total} ÷ ${perBox} = ${quotient} r ${rem}`, `Round up → ${quotient + 1} boxes`],
      keyConcept: "Real-life division often rounds up." });
  } },

  { id: "hcf", min: 1, max: 6, fn(level, rng) {
    const g = rng.int(3, 6 + level);
    const a = g * rng.int(2, 9), b = g * rng.int(2, 9), c = g * rng.int(2, 9);
    let hcf = 1;
    for (let i = 1; i <= Math.min(a, b, c); i++)
      if (a % i === 0 && b % i === 0 && c % i === 0) hcf = i;
    return numeric({ topicId: "multiply-divide", level,
      promptHTML: `Find the highest common factor (HCF) of <b>${a}</b>, <b>${b}</b> and <b>${c}</b>.`,
      value: hcf,
      explanation: "The HCF is the largest number that divides all of them exactly.",
      workedSteps: [`HCF(${a}, ${b}, ${c}) = ${hcf}`],
      keyConcept: "HCF: biggest shared factor." });
  } },

  { id: "lcm", min: 1, max: 6, fn(level, rng) {
    const a = rng.int(4, 9 + level), b = rng.int(4, 9 + level), c = rng.int(3, 7);
    const lcm2 = (x, y) => (x * y) / gcd(x, y);
    const l = lcm2(lcm2(a, b), c);
    return numeric({ topicId: "multiply-divide", level,
      promptHTML: `Buses leave every <b>${a}</b>, <b>${b}</b> and <b>${c}</b> minutes. They all leave together now. After how many minutes will they next all leave together?`,
      value: l,
      explanation: "They coincide at the lowest common multiple of the intervals.",
      workedSteps: [`LCM(${a}, ${b}, ${c}) = ${l} minutes`],
      keyConcept: "LCM: smallest number all divide into." });
  } },

  { id: "prime-factors", min: 2, max: 6, fn(level, rng) {
    const primes = [2, 3, 5, 7];
    let n = 1;
    const factors = [];
    const count = 2 + Math.floor(level / 2);
    for (let i = 0; i < count; i++) {
      const p = rng.pick(primes);
      n *= p;
      factors.push(p);
    }
    factors.sort((a, b) => a - b);
    const correct = factors.join(" × ");
    return q({ rng, topicId: "multiply-divide", level,
      promptHTML: `Write <b>${n}</b> as a product of its prime factors.`,
      correctText: correct,
      distractors: [
        { text: factors.map((f) => f).reverse().join(" + "), id: "pf_added", fb: "Prime factorisation multiplies primes, it doesn't add them." },
        { text: `${n} × 1`, id: "pf_trivial", fb: "1 is not prime — break it fully into primes." },
        { text: factors.slice(1).join(" × ") || "2", id: "pf_missing", fb: `Check it multiplies back to ${n}.` },
      ],
      explanation: "Split repeatedly into primes until only primes remain.",
      workedSteps: [`${n} = ${correct}`],
      keyConcept: "Every number has a unique prime factorisation." });
  } },

  { id: "is-prime", min: 1, max: 6, fn(level, rng) {
    const primes = primesUpTo(40 + level * 30).filter((p) => p > 20);
    const p = rng.pick(primes);
    let comps = [];
    let g = p + 1;
    while (comps.length < 3) { if (!isPrime(g)) comps.push(g); g += rng.int(1, 3); }
    return q({ rng, topicId: "multiply-divide", level,
      promptHTML: `Which of these is a <b>prime number</b>?`,
      correctText: String(p),
      distractors: comps.map((c) => ({ text: String(c), id: "pr_comp", fb: `${c} has a factor other than 1 and itself.` })),
      explanation: "A prime has exactly two factors: 1 and itself. Test divisibility by 2, 3, 5, 7 …",
      workedSteps: [`${p} is only divisible by 1 and ${p}.`],
      keyConcept: "Test primality with small prime divisors." });
  } },

  { id: "order-operations", min: 1, max: 6, fn(level, rng) {
    const a = rng.int(2, 9), b = rng.int(2, 9), c = rng.int(2, 9), d = rng.int(2, 9);
    const correct = a + b * c - d;
    return q({ rng, topicId: "multiply-divide", level,
      promptHTML: `Work out <b>${a} + ${b} × ${c} − ${d}</b>`,
      correctText: String(correct),
      distractors: [
        { text: String((a + b) * c - d), id: "oo_lr", fb: "Do × before + and − (BODMAS)." },
        { text: String((a + b) * (c - d)), id: "oo_group", fb: "There are no brackets here — only × has priority." },
        { text: String(a + b * (c - d)), id: "oo_order2", fb: "Work left to right after doing the ×." },
      ],
      explanation: "BODMAS: multiplication before addition/subtraction.",
      workedSteps: [`${b} × ${c} = ${b * c}`, `${a} + ${b * c} − ${d} = ${correct}`],
      keyConcept: "Brackets, then ×÷, then +−." });
  } },

  { id: "brackets", min: 2, max: 6, fn(level, rng) {
    const a = rng.int(3, 12), b = rng.int(3, 12), c = rng.int(2, 9);
    const correct = (a + b) * c;
    return q({ rng, topicId: "multiply-divide", level,
      promptHTML: `Work out <b>(${a} + ${b}) × ${c}</b>`,
      correctText: String(correct),
      distractors: [
        { text: String(a + b * c), id: "br_ignored", fb: "Brackets are done first." },
        { text: String(a + b + c), id: "br_added", fb: "After the bracket, multiply by " + c + "." },
        { text: String((a + b) + c), id: "br_plus", fb: "The operation outside the bracket is ×." },
      ],
      explanation: "Always evaluate the brackets first.",
      workedSteps: [`${a} + ${b} = ${a + b}`, `${a + b} × ${c} = ${correct}`],
      keyConcept: "Brackets have top priority." });
  } },

  { id: "rate-word", min: 1, max: 6, fn(level, rng) {
    const rate = rng.int(level + 4, 9 + level * 3);
    const unitTime = rng.pick([1, 1, 1]);
    const time = rng.int(6, 12 + level * 4);
    const correct = rate * time;
    return q({ rng, topicId: "multiply-divide", level,
      promptHTML: `A machine makes <b>${rate}</b> parts every minute. How many parts in <b>${time}</b> minutes?`,
      correctText: correct.toLocaleString("en-GB"),
      distractors: [
        { text: (rate + time).toLocaleString("en-GB"), id: "rw_added", fb: "Rate × time, not rate + time." },
        { text: (correct - rate).toLocaleString("en-GB"), id: "rw_off", fb: "Count every minute." },
        { text: (rate * (time + 1)).toLocaleString("en-GB"), id: "rw_extra", fb: "One minute too many." },
      ],
      explanation: "Total = rate × time.",
      workedSteps: [`${rate} × ${time} = ${correct.toLocaleString("en-GB")}`],
      keyConcept: "Rate problems: multiply rate by amount." });
  } },

  { id: "sharing-remainder-word", min: 1, max: 6, fn(level, rng) {
    const people = rng.int(4, 8);
    const each = rng.int(10 + level * 5, 30 + level * 12);
    const rem = rng.int(1, people - 1);
    const total = people * each + rem;
    return q({ rng, topicId: "multiply-divide", level,
      promptHTML: `<b>${total.toLocaleString("en-GB")}</b> stickers are shared equally between <b>${people}</b> children. How many are <b>left over</b>?`,
      correctText: String(rem),
      distractors: [
        { text: String(each), id: "sr_each", fb: "That is how many each child gets." },
        { text: "0", id: "sr_exact", fb: "It does not divide exactly — there is a remainder." },
        { text: String(people - rem), id: "sr_complement", fb: "The remainder is what is left after sharing equally." },
      ],
      explanation: "Divide and read the remainder.",
      workedSteps: [`${total} ÷ ${people} = ${each} r ${rem}`],
      keyConcept: "The remainder answers 'how many left over'." });
  } },

  { id: "factor-pairs", min: 1, max: 6, fn(level, rng) {
    const n = rng.pick([24, 36, 48, 60, 72, 96, 120, 144, 180, 210]);
    let count = 0;
    for (let i = 1; i * i <= n; i++) if (n % i === 0) count += i * i === n ? 1 : 2;
    return numeric({ topicId: "multiply-divide", level,
      promptHTML: `How many factors does <b>${n}</b> have altogether?`,
      value: count,
      explanation: "Find factor pairs; count each member (a square number's root counts once).",
      workedSteps: [`${n} has ${count} factors.`],
      keyConcept: "Factors come in pairs that multiply to the number." });
  } },
];

export default makeGenerator("multiplyDivide", "multiply-divide", templates);
