// Ratio & Proportion — recalibrated HARD: 3-part ratios, sharing by a
// difference, combining ratios, scaling, best value, map scale.
import { q, numeric, makeGenerator, gcd } from "./_shared.js";
import { round } from "../format.js";

const templates = [
  { id: "simplify-ratio", min: 1, max: 6, fn(level, rng) {
    const g = rng.int(4, 8 + level);
    const a = g * rng.int(2, 9), b = g * rng.int(2, 9), c = g * rng.int(2, 9);
    const h = gcd(gcd(a, b), c);
    return q({ rng, topicId: "ratio", level,
      promptHTML: `Simplify the ratio <b>${a} : ${b} : ${c}</b> fully.`,
      correctText: `${a / h} : ${b / h} : ${c / h}`,
      distractors: [
        { text: `${a / 2} : ${b / 2} : ${c / 2}`, id: "sr_part", fb: "Divide by the HIGHEST common factor of all three." },
        { text: `${a - h} : ${b - h} : ${c - h}`, id: "sr_sub", fb: "Simplify by dividing, not subtracting." },
        { text: `${c / h} : ${b / h} : ${a / h}`, id: "sr_order", fb: "Keep the order." },
      ],
      explanation: "Divide every part by the HCF of all the parts.",
      workedSteps: [`HCF = ${h}`, `= ${a / h} : ${b / h} : ${c / h}`],
      keyConcept: "Simplify ratios by the common factor of all parts." });
  } },

  { id: "share-total", min: 1, max: 6, fn(level, rng) {
    const r = [rng.int(1, 5), rng.int(1, 5), rng.int(1, 5)];
    const part = rng.int(6, 12 + level * 4);
    const total = r.reduce((s, x) => s + x, 0) * part;
    const shares = r.map((x) => x * part);
    return q({ rng, topicId: "ratio", level,
      promptHTML: `Share <b>£${total}</b> in the ratio <b>${r.join(" : ")}</b>. What is the <b>largest</b> share?`,
      correctText: `£${Math.max(...shares)}`,
      distractors: [
        { text: `£${Math.min(...shares)}`, id: "sh_small", fb: "That is the smallest share." },
        { text: `£${part}`, id: "sh_one", fb: "That is one part — multiply by the ratio number." },
        { text: `£${round(total / 3, 2)}`, id: "sh_third", fb: "It is not split equally — use the ratio." },
      ],
      explanation: "Total ÷ (sum of parts) = one part; multiply each ratio number by it.",
      workedSteps: [`Parts = ${r.reduce((s, x) => s + x, 0)}`, `1 part = £${part}`, `Shares: ${shares.map((s) => "£" + s).join(", ")}`],
      keyConcept: "Total ÷ total parts = one part." });
  } },

  { id: "share-by-difference", min: 2, max: 6, fn(level, rng) {
    let a = rng.int(2, 6), b = rng.int(2, 6);
    if (a === b) b += 1;
    const part = rng.int(5, 10 + level * 3);
    const diff = Math.abs(a - b) * part;
    const total = (a + b) * part;
    return numeric({ topicId: "ratio", level,
      promptHTML: `Two people share money in the ratio <b>${a} : ${b}</b>. One gets <b>£${diff}</b> more than the other. How much was shared in total (£)?`,
      value: total,
      explanation: "The difference is |a−b| parts. Find one part, then total all parts.",
      workedSteps: [`Difference = ${Math.abs(a - b)} parts = £${diff}`, `1 part = £${part}`, `Total = ${a + b} × £${part} = £${total}`],
      keyConcept: "A difference in shares = a difference in parts." });
  } },

  { id: "recipe-scale", min: 1, max: 6, fn(level, rng) {
    const forP = rng.pick([3, 4, 6]);
    const perUnit = rng.int(2, 9) * 25;
    const amount = perUnit * forP;
    const target = forP * rng.int(2, 4) + rng.pick([0, forP]);
    const correct = (amount / forP) * target;
    return numeric({ topicId: "ratio", level,
      promptHTML: `A recipe for <b>${forP}</b> people needs <b>${amount} g</b> of flour. How much for <b>${target}</b> people (g)?`,
      value: correct,
      explanation: "Find the amount per person, then multiply by the new number of people.",
      workedSteps: [`Per person = ${amount} ÷ ${forP} = ${amount / forP} g`, `× ${target} = ${correct} g`],
      keyConcept: "Direct proportion: scale by the same factor." });
  } },

  { id: "best-value", min: 1, max: 6, fn(level, rng) {
    const s1 = rng.int(3, 6), unit = round(rng.int(35, 75) / 100, 2);
    const p1 = round(unit * s1, 2);
    const s2 = s1 * rng.int(2, 3);
    const p2 = round(unit * s2 * rng.pick([0.85, 0.92, 1.08]), 2);
    const u1 = p1 / s1, u2 = p2 / s2;
    const best = u1 <= u2 ? "Pack A" : "Pack B";
    return q({ rng, topicId: "ratio", level,
      promptHTML: `Pack A: <b>${s1}</b> for <b>£${p1.toFixed(2)}</b>. Pack B: <b>${s2}</b> for <b>£${p2.toFixed(2)}</b>. Which is better value?`,
      correctText: best,
      distractors: [
        { text: best === "Pack A" ? "Pack B" : "Pack A", id: "bv_opp", fb: "Compare the price per single item." },
        { text: "Same value", id: "bv_same", fb: `Per item: £${round(u1, 3)} vs £${round(u2, 3)}.` },
        { text: "The cheaper pack", id: "bv_total", fb: "Cheapest total ≠ best value — compare per unit." },
      ],
      explanation: "Work out the price per single item for each pack and compare.",
      workedSteps: [`A: £${round(u1, 3)} each`, `B: £${round(u2, 3)} each`],
      keyConcept: "Best value = lowest unit price." });
  } },

  { id: "proportion-multistep", min: 1, max: 6, fn(level, rng) {
    const workers1 = rng.int(2, 6);
    const days1 = rng.int(4, 12);
    const work = workers1 * days1; // worker-days
    const workers2 = rng.int(2, 8);
    // choose workers2 so work / workers2 is whole
    const w2 = [2, 3, 4, 6, 8, 12].filter((w) => work % w === 0 && w !== workers1);
    const ww = w2.length ? rng.pick(w2) : workers1 * 2;
    const days2 = work / ww;
    return numeric({ topicId: "ratio", level,
      promptHTML: `<b>${workers1}</b> people build a wall in <b>${days1}</b> days. How many days would <b>${ww}</b> people take (same rate)?`,
      value: days2,
      explanation: "Total work = people × days stays constant (inverse proportion).",
      workedSteps: [`Work = ${workers1} × ${days1} = ${work} person-days`, `${work} ÷ ${ww} = ${days2} days`],
      keyConcept: "Inverse proportion: more workers → fewer days, product constant." });
  } },

  { id: "ratio-find-other", min: 1, max: 6, fn(level, rng) {
    const a = rng.int(2, 6), b = rng.int(2, 6);
    const part = rng.int(4, 9 + level * 2);
    const known = a * part;
    return numeric({ topicId: "ratio", level,
      promptHTML: `Red and blue counters are in the ratio <b>${a} : ${b}</b>. There are <b>${known}</b> red. How many <b>blue</b>?`,
      value: b * part,
      explanation: "Find one part from the known colour, then multiply for the other.",
      workedSteps: [`1 part = ${known} ÷ ${a} = ${part}`, `Blue = ${b} × ${part} = ${b * part}`],
      keyConcept: "Use the known share to find one ratio part." });
  } },

  { id: "map-scale", min: 1, max: 6, fn(level, rng) {
    const scale = rng.pick([500, 1000, 2500, 25000, 50000]);
    const mapCm = rng.int(2, 14);
    const realM = (mapCm * scale) / 100;
    return numeric({ topicId: "ratio", level,
      promptHTML: `A map scale is <b>1 : ${scale.toLocaleString("en-GB")}</b>. A path is <b>${mapCm} cm</b> on the map. How long is it in real life (metres)?`,
      value: realM, tolerance: 0.01, accept: [String(realM), `${realM}m`],
      explanation: "1 : n means 1 map cm = n real cm. Multiply, then ÷ 100 for metres.",
      workedSteps: [`${mapCm} × ${scale} = ${(mapCm * scale).toLocaleString("en-GB")} cm`, `÷ 100 = ${realM} m`],
      keyConcept: "Map scale: × scale, then convert units." });
  } },

  { id: "ratio-change", min: 3, max: 6, fn(level, rng) {
    const a = rng.int(2, 5), b = rng.int(2, 5);
    const part = rng.int(4, 9);
    const boys = a * part, girls = b * part;
    const add = rng.int(2, 8);
    return numeric({ topicId: "ratio", level,
      promptHTML: `A club has boys and girls in the ratio <b>${a} : ${b}</b>, with <b>${boys}</b> boys. <b>${add}</b> more girls join. How many girls are there now?`,
      value: girls + add,
      explanation: "Find the current girls from the ratio, then add the new ones.",
      workedSteps: [`1 part = ${boys} ÷ ${a} = ${part}`, `Girls = ${b} × ${part} = ${girls}`, `+ ${add} = ${girls + add}`],
      keyConcept: "Solve the ratio first, then apply the change." });
  } },

  { id: "unit-rate", min: 1, max: 6, fn(level, rng) {
    const n = rng.int(4, 9);
    const each = rng.int(level + 4, 12 + level * 3);
    const total = n * each;
    const askN = rng.int(2, 12);
    return numeric({ topicId: "ratio", level,
      promptHTML: `<b>${n}</b> identical bricks weigh <b>${total} g</b>. What do <b>${askN}</b> bricks weigh (g)?`,
      value: each * askN,
      explanation: "Find one brick's weight, then multiply.",
      workedSteps: [`1 brick = ${total} ÷ ${n} = ${each} g`, `× ${askN} = ${each * askN} g`],
      keyConcept: "Find the unit rate, then scale." });
  } },
];

export default makeGenerator("ratioProportion", "ratio", templates);
