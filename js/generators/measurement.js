// Measurement & Money — recalibrated HARD: decimal conversions, time
// durations & timetables, speed, multi-step money, mixed units.
import { q, numeric, makeGenerator } from "./_shared.js";
import { round } from "../format.js";

const pad = (n) => String(n).padStart(2, "0");

const templates = [
  { id: "length-convert", min: 1, max: 6, fn(level, rng) {
    const cm = rng.int(125, 980 + level * 100);
    const m = round(cm / 100, 2);
    if (rng.chance(0.5))
      return numeric({ topicId: "measurement", level,
        promptHTML: `Convert <b>${cm} cm</b> to metres.`,
        value: m, tolerance: 0.005, accept: [m.toFixed(2), `${m}m`],
        explanation: "100 cm = 1 m, so divide by 100.",
        workedSteps: [`${cm} ÷ 100 = ${m} m`],
        keyConcept: "cm → m: ÷ 100." });
    const km = round(rng.int(1250, 9800) / 1000, 3);
    return numeric({ topicId: "measurement", level,
      promptHTML: `Convert <b>${km} km</b> to metres.`,
      value: round(km * 1000, 0), accept: [String(round(km * 1000, 0)), `${round(km * 1000, 0)}m`],
      explanation: "1 km = 1000 m, so multiply by 1000.",
      workedSteps: [`${km} × 1000 = ${round(km * 1000, 0)} m`],
      keyConcept: "km → m: × 1000." });
  } },

  { id: "mass-convert", min: 1, max: 6, fn(level, rng) {
    const kg = round(rng.int(1250, 9750) / 1000, 3);
    const g = Math.round(kg * 1000);
    if (rng.chance(0.5))
      return numeric({ topicId: "measurement", level,
        promptHTML: `Convert <b>${kg} kg</b> to grams.`,
        value: g, accept: [`${g}g`],
        explanation: "1 kg = 1000 g, multiply by 1000.",
        workedSteps: [`${kg} × 1000 = ${g} g`],
        keyConcept: "kg → g: × 1000." });
    return numeric({ topicId: "measurement", level,
      promptHTML: `Convert <b>${g} g</b> to kilograms.`,
      value: kg, tolerance: 0.0005, accept: [`${kg}kg`],
      explanation: "1000 g = 1 kg, divide by 1000.",
      workedSteps: [`${g} ÷ 1000 = ${kg} kg`],
      keyConcept: "g → kg: ÷ 1000." });
  } },

  { id: "mixed-units", min: 1, max: 6, fn(level, rng) {
    const m = rng.int(2, 9), cm = rng.int(5, 99), mm = rng.int(1, 9);
    const totalMm = (m * 100 + cm) * 10 + mm;
    return numeric({ topicId: "measurement", level,
      promptHTML: `A rod is <b>${m} m ${cm} cm ${mm} mm</b>. How long is it in <b>millimetres</b>?`,
      value: totalMm, accept: [`${totalMm}mm`],
      explanation: "1 m = 1000 mm, 1 cm = 10 mm. Convert each part and add.",
      workedSteps: [`${m} m = ${m * 1000} mm`, `${cm} cm = ${cm * 10} mm`, `Total = ${totalMm} mm`],
      keyConcept: "Mixed units: convert all to one unit, then add." });
  } },

  { id: "time-duration", min: 1, max: 6, fn(level, rng) {
    const h1 = rng.int(8, 13), m1 = rng.int(0, 59);
    const dur = rng.int(45, 60 + level * 35);
    const tot = h1 * 60 + m1 + dur;
    const h2 = Math.floor(tot / 60) % 24, m2 = tot % 60;
    return q({ rng, topicId: "measurement", level,
      promptHTML: `A train leaves at <b>${pad(h1)}:${pad(m1)}</b> and the journey takes <b>${dur} minutes</b>. What time does it arrive?`,
      correctText: `${pad(h2)}:${pad(m2)}`,
      distractors: [
        { text: `${pad(h1 + Math.floor(dur / 100))}:${pad((m1 + (dur % 100)) % 60)}`, id: "td_base100", fb: "An hour is 60 minutes, not 100." },
        { text: `${pad(h2)}:${pad((m2 + 15) % 60)}`, id: "td_slip", fb: "Recount the minutes over the hour." },
        { text: `${pad((h1 + Math.ceil(dur / 60)) % 24)}:${pad(m1)}`, id: "td_hours_only", fb: "Add the leftover minutes too." },
      ],
      explanation: "Add minutes, carrying 60 minutes into 1 hour.",
      workedSteps: [`${pad(h1)}:${pad(m1)} + ${dur} min = ${pad(h2)}:${pad(m2)}`],
      keyConcept: "Time is base 60." });
  } },

  { id: "time-back", min: 1, max: 6, fn(level, rng) {
    const h = rng.int(13, 21), m = rng.int(0, 59);
    const dur = rng.int(40, 60 + level * 30);
    const startTot = h * 60 + m - dur;
    const sh = Math.floor(startTot / 60), sm = startTot % 60;
    return q({ rng, topicId: "measurement", level,
      promptHTML: `A meeting ends at <b>${pad(h)}:${pad(m)}</b> after <b>${dur} minutes</b>. What time did it start?`,
      correctText: `${pad(sh)}:${pad(sm)}`,
      distractors: [
        { text: `${pad(h)}:${pad((m - dur + 60 * 3) % 60)}`, id: "tb_nohr", fb: "Borrow 60 minutes when minutes go negative." },
        { text: `${pad(h - Math.ceil(dur / 60))}:${pad(m)}`, id: "tb_hours", fb: "Subtract the minutes part too." },
        { text: `${pad(sh)}:${pad((sm + 10) % 60)}`, id: "tb_slip", fb: "Recount the minutes." },
      ],
      explanation: "Subtract the duration, borrowing 60 minutes when needed.",
      workedSteps: [`${pad(h)}:${pad(m)} − ${dur} min = ${pad(sh)}:${pad(sm)}`],
      keyConcept: "Work back in time: subtract, borrow in 60s." });
  } },

  { id: "speed", min: 2, max: 6, fn(level, rng) {
    const speed = rng.int(40, 90);
    const hours = rng.pick([2, 3, 4, 5]);
    const dist = speed * hours;
    const ask = rng.pick(["dist", "time", "speed"]);
    if (ask === "dist")
      return numeric({ topicId: "measurement", level,
        promptHTML: `A car travels at <b>${speed} km/h</b> for <b>${hours} hours</b>. How far does it go (km)?`,
        value: dist,
        explanation: "Distance = speed × time.",
        workedSteps: [`${speed} × ${hours} = ${dist} km`],
        keyConcept: "Distance = speed × time." });
    if (ask === "time")
      return numeric({ topicId: "measurement", level,
        promptHTML: `A car covers <b>${dist} km</b> at <b>${speed} km/h</b>. How long does it take (hours)?`,
        value: hours,
        explanation: "Time = distance ÷ speed.",
        workedSteps: [`${dist} ÷ ${speed} = ${hours} hours`],
        keyConcept: "Time = distance ÷ speed." });
    return numeric({ topicId: "measurement", level,
      promptHTML: `A car covers <b>${dist} km</b> in <b>${hours} hours</b>. What is its average speed (km/h)?`,
      value: speed,
      explanation: "Speed = distance ÷ time.",
      workedSteps: [`${dist} ÷ ${hours} = ${speed} km/h`],
      keyConcept: "Speed = distance ÷ time." });
  } },

  { id: "timetable", min: 3, max: 6, fn(level, rng) {
    const dep = { h: rng.int(8, 16), m: rng.pick([0, 15, 30, 45]) };
    const legs = [rng.int(20, 50), rng.int(15, 40)];
    const wait = rng.int(5, 20);
    const totMin = dep.h * 60 + dep.m + legs[0] + wait + legs[1];
    const ah = Math.floor(totMin / 60) % 24, am = totMin % 60;
    return q({ rng, topicId: "measurement", level,
      promptHTML: `Leave at <b>${pad(dep.h)}:${pad(dep.m)}</b>. First train ${legs[0]} min, wait ${wait} min, second train ${legs[1]} min. Arrival time?`,
      correctText: `${pad(ah)}:${pad(am)}`,
      distractors: [
        { text: `${pad(ah)}:${pad((am - wait + 60) % 60)}`, id: "tt_nowait", fb: "Include the waiting time at the change." },
        { text: `${pad((dep.h + 1) % 24)}:${pad(dep.m)}`, id: "tt_guess", fb: "Add every leg and the wait carefully." },
        { text: `${pad(ah)}:${pad((am + 12) % 60)}`, id: "tt_slip", fb: "Recheck the minute totals." },
      ],
      explanation: "Add every interval (legs + wait) to the departure time.",
      workedSteps: [`${pad(dep.h)}:${pad(dep.m)} + ${legs[0]} + ${wait} + ${legs[1]} = ${pad(ah)}:${pad(am)}`],
      keyConcept: "Timetables: add all stages, carry in 60s." });
  } },

  { id: "money-budget", min: 1, max: 6, fn(level, rng) {
    const a = round(rng.int(150, 90 * level + 200) / 100, 2);
    const qa = rng.int(2, 4);
    const b = round(rng.int(150, 500) / 100, 2);
    const qb = rng.int(2, 5);
    const spent = round(a * qa + b * qb, 2);
    const budget = Math.ceil(spent) + rng.int(2, 15); // always affordable
    const left = round(budget - spent, 2);
    return numeric({ topicId: "measurement", level,
      promptHTML: `Budget <b>£${budget}</b>. Buy <b>${qa}</b> at £${a.toFixed(2)} and <b>${qb}</b> at £${b.toFixed(2)}. How much (£) is left?`,
      value: left, tolerance: 0.005, accept: [left.toFixed(2), `£${left.toFixed(2)}`],
      explanation: "Total each purchase, add them, subtract from the budget.",
      workedSteps: [`${qa}×£${a.toFixed(2)} = £${(a * qa).toFixed(2)}`, `${qb}×£${b.toFixed(2)} = £${(b * qb).toFixed(2)}`, `£${budget} − £${spent.toFixed(2)} = £${left.toFixed(2)}`],
      keyConcept: "Multi-step budgeting." });
  } },

  { id: "capacity-share", min: 1, max: 6, fn(level, rng) {
    const litres = round(rng.int(15, 60) / 10, 1);
    const glass = rng.pick([100, 125, 150, 200, 250]);
    const ml = litres * 1000;
    const glasses = Math.floor(ml / glass);
    return numeric({ topicId: "measurement", level,
      promptHTML: `A jug holds <b>${litres} litres</b>. How many full <b>${glass} ml</b> glasses can be poured?`,
      value: glasses,
      explanation: "Convert litres to ml, divide by the glass size, round DOWN (only full glasses).",
      workedSteps: [`${litres} L = ${ml} ml`, `${ml} ÷ ${glass} = ${round(ml / glass, 2)} → ${glasses} full`],
      keyConcept: "Convert, divide, round down for 'full'." });
  } },

  { id: "unit-best-buy", min: 2, max: 6, fn(level, rng) {
    const g1 = rng.pick([250, 500]), p1 = round(rng.int(80, 200) / 100, 2);
    const g2 = g1 * 2, p2 = round(p1 * 2 * rng.pick([0.9, 1.1]), 2);
    const per1 = round((p1 / g1) * 100, 3), per2 = round((p2 / g2) * 100, 3);
    const best = per1 <= per2 ? "the small pack" : "the large pack";
    return q({ rng, topicId: "measurement", level,
      promptHTML: `Small: <b>${g1} g</b> for <b>£${p1.toFixed(2)}</b>. Large: <b>${g2} g</b> for <b>£${p2.toFixed(2)}</b>. Which is better value per 100 g?`,
      correctText: best,
      distractors: [
        { text: best === "the small pack" ? "the large pack" : "the small pack", id: "bb_opp", fb: "Compare price per 100 g." },
        { text: "They are equal", id: "bb_eq", fb: `Per 100 g: £${per1} vs £${per2}.` },
        { text: "The cheaper pack overall", id: "bb_total", fb: "Cheapest total isn't always best value." },
      ],
      explanation: "Work out the price per 100 g for each and compare.",
      workedSteps: [`Small: £${per1}/100g`, `Large: £${per2}/100g`],
      keyConcept: "Best value = lowest price per fixed amount." });
  } },

  { id: "pence-pounds", min: 1, max: 6, fn(level, rng) {
    const pence = rng.int(305, 90 * level + 800);
    const correct = round(pence / 100, 2);
    return q({ rng, topicId: "measurement", level,
      promptHTML: `Write <b>${pence}p</b> in pounds.`,
      correctText: `£${correct.toFixed(2)}`,
      distractors: [
        { text: `£${pence}`, id: "pp_same", fb: "100p = £1 — divide by 100." },
        { text: `£${round(pence / 10, 2)}`, id: "pp_ten", fb: "There are 100 pence in a pound." },
        { text: `£${Math.floor(pence / 100)}`, id: "pp_whole", fb: "Keep the leftover pence as the decimal part." },
      ],
      explanation: "100 pence = £1, so divide pence by 100 (2 decimal places).",
      workedSteps: [`${pence} ÷ 100 = £${correct.toFixed(2)}`],
      keyConcept: "Pence → pounds: ÷ 100." });
  } },
];

export default makeGenerator("measurement", "measurement", templates);
