// Decimals — recalibrated HARD: 2–3 dp, decimal × decimal, division to
// decimals, multi-step money/measure, conversions with awkward values.
import { q, numeric, makeGenerator } from "./_shared.js";
import { round, fmtFraction } from "../format.js";

const DP = { 1: 2, 2: 2, 3: 2, 4: 3, 5: 3, 6: 3 };

const templates = [
  { id: "add-sub-decimals", min: 1, max: 6, fn(level, rng) {
    const d = DP[level];
    const sc = Math.pow(10, d);
    const a = round(rng.int(sc, sc * 90) / sc, d);
    const b = round(rng.int(sc, sc * 90) / sc, d);
    const add = rng.chance(0.5);
    const aa = add ? a : Math.max(a, b), bb = add ? b : Math.min(a, b);
    const correct = round(add ? aa + bb : aa - bb, d);
    return numeric({ topicId: "decimals", level,
      promptHTML: `<b>${aa.toFixed(d)} ${add ? "+" : "−"} ${bb.toFixed(d)} = ?</b>`,
      value: correct, tolerance: 0.0005, accept: [correct.toFixed(d)],
      explanation: "Line up the decimal points; fill gaps with zeros.",
      workedSteps: [`${aa.toFixed(d)} ${add ? "+" : "−"} ${bb.toFixed(d)} = ${correct.toFixed(d)}`],
      keyConcept: "Always align the decimal points." });
  } },

  { id: "decimal-times-decimal", min: 1, max: 6, fn(level, rng) {
    const a = round(rng.int(11, 99) / 10, 1);
    const b = round(rng.int(11, 99) / 10, 1);
    const correct = round(a * b, 2);
    return numeric({ topicId: "decimals", level,
      promptHTML: `<b>${a.toFixed(1)} × ${b.toFixed(1)} = ?</b>`,
      value: correct, tolerance: 0.0005, accept: [correct.toFixed(2)],
      explanation: "Multiply ignoring points, then the answer has as many decimals as the two numbers combined (here 2).",
      workedSteps: [`${a * 10} × ${b * 10} = ${a * 10 * b * 10}`, `÷ 100 → ${correct.toFixed(2)}`],
      keyConcept: "Decimal places in the question = decimal places in the answer." });
  } },

  { id: "divide-to-decimal", min: 1, max: 6, fn(level, rng) {
    const k = rng.int(4, 8 + level);
    const quotient = round(rng.int(125, 875) / 100, 2);
    const a = round(quotient * k, 2);
    return numeric({ topicId: "decimals", level,
      promptHTML: `<b>${a.toFixed(2)} ÷ ${k} = ?</b>`,
      value: quotient, tolerance: 0.005, accept: [quotient.toFixed(2)],
      explanation: "Divide as normal, keeping the decimal point lined up in the answer.",
      workedSteps: [`${a.toFixed(2)} ÷ ${k} = ${quotient.toFixed(2)}`],
      keyConcept: "Keep the point above its place when dividing." });
  } },

  { id: "x-div-powers", min: 1, max: 6, fn(level, rng) {
    const d = DP[level] + 1;
    const a = round(rng.int(101, 9999) / Math.pow(10, d), d);
    const p = rng.pick([10, 100, 1000]);
    const mult = rng.chance(0.5);
    const correct = round(mult ? a * p : a / p, 5);
    return q({ rng, topicId: "decimals", level,
      promptHTML: `<b>${a} ${mult ? "×" : "÷"} ${p} = ?</b>`,
      correctText: String(correct),
      distractors: [
        { text: String(round(mult ? a / p : a * p, 5)), id: "xp_wrong_dir", fb: mult ? "× makes it bigger — point moves right." : "÷ makes it smaller — point moves left." },
        { text: String(round(mult ? a * (p / 10) : a / (p / 10), 5)), id: "xp_off", fb: `Move the point ${String(p).length - 1} places.` },
        { text: String(a) + "0", id: "xp_zero", fb: "Move the decimal point, don't just add a zero." },
      ],
      explanation: `× or ÷ by ${p} moves the decimal point ${String(p).length - 1} place(s).`,
      workedSteps: [`${a} ${mult ? "×" : "÷"} ${p} = ${correct}`],
      keyConcept: "Powers of ten shift the decimal point." });
  } },

  { id: "round-decimal", min: 1, max: 6, fn(level, rng) {
    const a = round(rng.int(10000, 999999) / 1000, 3);
    const places = rng.pick(level <= 3 ? [1, 2] : [1, 2, 0]);
    const correct = round(a, places);
    return q({ rng, topicId: "decimals", level,
      promptHTML: `Round <b>${a.toFixed(3)}</b> to ${places === 0 ? "the nearest whole number" : places + " decimal place" + (places > 1 ? "s" : "")}.`,
      correctText: places === 0 ? String(correct) : correct.toFixed(places),
      distractors: [
        { text: (Math.floor(a * 10 ** places) / 10 ** places).toFixed(Math.max(places, 1)), id: "rd_down", fb: "Next digit 5+ rounds up." },
        { text: (Math.ceil(a * 10 ** places) / 10 ** places).toFixed(Math.max(places, 1)), id: "rd_up", fb: "Next digit < 5 rounds down." },
        { text: a.toFixed(3), id: "rd_none", fb: "You did not round it." },
      ],
      explanation: "Look at the digit just after the rounding place.",
      workedSteps: [`${a.toFixed(3)} → ${places === 0 ? correct : correct.toFixed(places)}`],
      keyConcept: "Rounding rule applies to any decimal place." });
  } },

  { id: "fdp-convert", min: 1, max: 6, fn(level, rng) {
    const sets = [[1, 8, 0.125, 12.5], [3, 8, 0.375, 37.5], [5, 8, 0.625, 62.5],
      [7, 8, 0.875, 87.5], [1, 4, 0.25, 25], [3, 4, 0.75, 75], [1, 5, 0.2, 20],
      [2, 5, 0.4, 40], [3, 20, 0.15, 15], [7, 20, 0.35, 35], [9, 20, 0.45, 45]];
    const [n, dn, dec, pct] = rng.pick(sets);
    const mode = rng.pick(["dec", "pct", "frac"]);
    if (mode === "dec")
      return q({ rng, topicId: "decimals", level,
        promptHTML: `Write <b>${n}/${dn}</b> as a decimal.`,
        correctText: String(dec),
        distractors: [
          { text: String(round(dn / n, 4)), id: "fc_flip", fb: "Divide numerator ÷ denominator." },
          { text: `0.${n}${dn}`, id: "fc_concat", fb: "Don't write the digits — divide top by bottom." },
          { text: String(round(dec + 0.1, 4)), id: "fc_slip", fb: "Recheck the division." },
        ],
        explanation: "Fraction → decimal: numerator ÷ denominator.",
        workedSteps: [`${n} ÷ ${dn} = ${dec}`],
        keyConcept: "A fraction is a division." });
    if (mode === "pct")
      return q({ rng, topicId: "decimals", level,
        promptHTML: `Write <b>${n}/${dn}</b> as a percentage.`,
        correctText: `${pct}%`,
        distractors: [
          { text: `${dec}%`, id: "fp_dec", fb: "Multiply the decimal by 100 for a percentage." },
          { text: `${n}${dn}%`, id: "fp_concat", fb: "Divide then × 100." },
          { text: `${round(pct + 10, 1)}%`, id: "fp_slip", fb: "Recheck ÷ then × 100." },
        ],
        explanation: "Fraction → %: divide, then × 100.",
        workedSteps: [`${n} ÷ ${dn} = ${dec}`, `× 100 = ${pct}%`],
        keyConcept: "× 100 turns a decimal into a percentage." });
    return q({ rng, topicId: "decimals", level,
      promptHTML: `Write <b>${dec}</b> as a fraction in its simplest form.`,
      correctText: fmtFraction(n, dn),
      distractors: [
        { text: `${dec * 1000}/1000`, id: "df_unsimplified", fb: "Right value — now simplify." },
        { text: fmtFraction(dn, n), id: "df_flip", fb: "0.125 = 125/1000, not its reciprocal." },
        { text: fmtFraction(n + 1, dn), id: "df_slip", fb: "Recheck the place value." },
      ],
      explanation: "Write the decimal over 10/100/1000, then simplify.",
      workedSteps: [`${dec} = ${dec * 1000}/1000 = ${fmtFraction(n, dn)}`],
      keyConcept: "Decimal place value gives the denominator." });
  } },

  { id: "order-decimals", min: 1, max: 6, fn(level, rng) {
    // Mixed lengths after the point, to defeat 'more digits = bigger'.
    const base = rng.int(2, 9);
    const nums = rng.sample(
      Array.from({ length: 14 }, () =>
        round(base + rng.int(1, 999) / Math.pow(10, rng.int(1, 3)), 3)), 5);
    const sorted = nums.slice().sort((a, b) => a - b);
    return q({ rng, topicId: "decimals", level,
      promptHTML: `Put in order, which is the <b>smallest</b>?<br>${nums.join(" &nbsp; ")}`,
      correctText: String(sorted[0]),
      distractors: [
        { text: String(sorted[4]), id: "od_largest", fb: "Compare tenths, then hundredths…" },
        { text: String(sorted.reduce((m, x) => (String(x).length > String(m).length ? x : m))), id: "od_longest", fb: "More digits after the point does NOT mean bigger." },
        { text: String(sorted[1]), id: "od_close", fb: "Line up the points and compare place by place." },
      ],
      explanation: "Compare whole part, then tenths, hundredths, thousandths.",
      workedSteps: [`Smallest = ${sorted[0]}`],
      keyConcept: "Compare decimals place by place, not by length." });
  } },

  { id: "money-multistep", min: 1, max: 6, fn(level, rng) {
    const price = round(rng.int(125, 95 * level + 100) / 100, 2);
    const qty = rng.int(3, 7);
    const discount = round(rng.int(50, 300) / 100, 2);
    const total = round(price * qty - discount, 2);
    return numeric({ topicId: "decimals", level,
      promptHTML: `A book costs <b>£${price.toFixed(2)}</b>. Buying <b>${qty}</b> gives <b>£${discount.toFixed(2)}</b> off the total. What is the total cost (£)?`,
      value: total, tolerance: 0.005, accept: [total.toFixed(2), `£${total.toFixed(2)}`],
      explanation: "Total = price × quantity, then subtract the discount.",
      workedSteps: [`${qty} × £${price.toFixed(2)} = £${(price * qty).toFixed(2)}`, `− £${discount.toFixed(2)} = £${total.toFixed(2)}`],
      keyConcept: "Multi-step money with decimals." });
  } },

  { id: "decimal-place-value", min: 1, max: 6, fn(level, rng) {
    const a = round(rng.int(10000, 99999) / 10000, 4);
    const s = a.toFixed(4);
    const idx = rng.int(2, 5);
    const names = { 2: "tenths", 3: "hundredths", 4: "thousandths", 5: "ten-thousandths" };
    const digit = Number(s[idx]);
    const placeVal = 1 / Math.pow(10, idx - 1);
    const correct = round(digit * placeVal, 4);
    return q({ rng, topicId: "decimals", level,
      promptHTML: `In <b>${s}</b>, what is the value of the digit in the <b>${names[idx]}</b> place?`,
      correctText: String(correct),
      distractors: [
        { text: String(digit), id: "dpv_digit", fb: `Multiply the digit by ${placeVal}.` },
        { text: String(placeVal), id: "dpv_place", fb: "That is the place value; multiply by the digit." },
        { text: String(round(correct * 10, 4)), id: "dpv_off", fb: "Recount the decimal columns." },
      ],
      explanation: "tenths 0.1, hundredths 0.01, thousandths 0.001, ten-thousandths 0.0001.",
      workedSteps: [`${digit} × ${placeVal} = ${correct}`],
      keyConcept: "Decimal place value: 10× smaller each step right." });
  } },

  { id: "decimal-word-rate", min: 1, max: 6, fn(level, rng) {
    const perKm = round(rng.int(105, 175) / 100, 2);
    const km = rng.int(6, 8 + level * 3);
    const total = round(perKm * km, 2);
    return numeric({ topicId: "decimals", level,
      promptHTML: `Petrol costs <b>£${perKm.toFixed(2)}</b> per litre. A car uses <b>${km}</b> litres. What is the cost (£)?`,
      value: total, tolerance: 0.005, accept: [total.toFixed(2), `£${total.toFixed(2)}`],
      explanation: "Cost = price per unit × number of units.",
      workedSteps: [`£${perKm.toFixed(2)} × ${km} = £${total.toFixed(2)}`],
      keyConcept: "Rate × quantity = total." });
  } },

  { id: "missing-decimal", min: 1, max: 6, fn(level, rng) {
    const d = DP[level];
    const sc = Math.pow(10, d);
    const a = round(rng.int(sc, sc * 50) / sc, d);
    const total = round(a + rng.int(sc, sc * 50) / sc, d);
    const missing = round(total - a, d);
    return numeric({ topicId: "decimals", level,
      promptHTML: `<b>${a.toFixed(d)} + ☐ = ${total.toFixed(d)}</b>. Find the missing number.`,
      value: missing, tolerance: 0.0005, accept: [missing.toFixed(d)],
      explanation: "Missing part = total − known part.",
      workedSteps: [`${total.toFixed(d)} − ${a.toFixed(d)} = ${missing.toFixed(d)}`],
      keyConcept: "Inverse operation finds a missing decimal." });
  } },
];

export default makeGenerator("decimals", "decimals", templates);
