// Statistics & Data — recalibrated HARD: mean/median/mode/range, missing
// value from a mean, combined mean, mean when a value changes, probability.
import { q, numeric, makeGenerator } from "./_shared.js";
import { round } from "../format.js";

const templates = [
  { id: "mean", min: 1, max: 6, fn(level, rng) {
    const n = rng.pick([5, 6, 8]);
    const mean = rng.int(8, 18 + level * 4);
    // Build n numbers summing to mean*n (clean mean).
    const data = Array.from({ length: n - 1 }, () => rng.int(3, mean + 8));
    let last = mean * n - data.reduce((s, x) => s + x, 0);
    if (last < 1) last = 1 + (mean * n - data.reduce((s, x) => s + x, 0) < 0 ? 0 : 0);
    last = Math.max(1, mean * n - data.reduce((s, x) => s + x, 0));
    data.push(last);
    const sum = data.reduce((s, x) => s + x, 0);
    const trueMean = round(sum / n, 2);
    return q({ rng, topicId: "statistics", level,
      promptHTML: `Find the <b>mean</b> of: <b>${data.join(", ")}</b>`,
      correctText: String(trueMean),
      distractors: [
        { text: String(sum), id: "mn_sum", fb: "Divide the total by how many numbers there are." },
        { text: String(n), id: "mn_count", fb: "That is the count, not the mean." },
        { text: String(round(sum / (n - 1), 2)), id: "mn_div", fb: `Divide by ${n}, the number of values.` },
      ],
      explanation: "Mean = total ÷ number of values.",
      workedSteps: [`Sum = ${sum}`, `${sum} ÷ ${n} = ${trueMean}`],
      keyConcept: "Mean: add them all, divide by how many." });
  } },

  { id: "mean-missing", min: 1, max: 6, fn(level, rng) {
    const n = rng.pick([4, 5, 6]);
    const mean = rng.int(8, 16 + level * 3);
    const known = Array.from({ length: n - 1 }, () => rng.int(4, mean + 6));
    const missing = mean * n - known.reduce((s, x) => s + x, 0);
    if (missing < 1) return this.fn(level, rng);
    return numeric({ topicId: "statistics", level,
      promptHTML: `The mean of <b>${n}</b> numbers is <b>${mean}</b>. ${n - 1} of them are <b>${known.join(", ")}</b>. Find the missing number.`,
      value: missing,
      explanation: "Total = mean × count. Subtract the known values.",
      workedSteps: [`Total = ${mean} × ${n} = ${mean * n}`, `${mean * n} − ${known.reduce((s, x) => s + x, 0)} = ${missing}`],
      keyConcept: "Use total = mean × count." });
  } },

  { id: "mean-changes", min: 3, max: 6, fn(level, rng) {
    const n = rng.int(4, 8);
    const mean = rng.int(10, 25);
    const extra = rng.int(2, n) * (rng.int(5, 12)); // a value that shifts the mean
    const newMean = round((mean * n + extra) / (n + 1), 2);
    return numeric({ topicId: "statistics", level,
      promptHTML: `<b>${n}</b> numbers have a mean of <b>${mean}</b>. A new number, <b>${extra}</b>, is added. What is the new mean?`,
      value: newMean, tolerance: 0.005, accept: [String(newMean)],
      explanation: "New mean = (old total + new value) ÷ (count + 1).",
      workedSteps: [`Old total = ${mean} × ${n} = ${mean * n}`, `(${mean * n} + ${extra}) ÷ ${n + 1} = ${newMean}`],
      keyConcept: "Recompute the mean from the new total and count." });
  } },

  { id: "combined-mean", min: 4, max: 6, fn(level, rng) {
    const n1 = rng.int(3, 8), m1 = rng.int(6, 18);
    const n2 = rng.int(3, 8), m2 = rng.int(6, 18);
    const combined = round((n1 * m1 + n2 * m2) / (n1 + n2), 2);
    return numeric({ topicId: "statistics", level,
      promptHTML: `Class A: <b>${n1}</b> pupils, mean score <b>${m1}</b>. Class B: <b>${n2}</b> pupils, mean <b>${m2}</b>. What is the mean for both classes together?`,
      value: combined, tolerance: 0.005, accept: [String(combined)],
      explanation: "Combine totals and counts: (n₁m₁ + n₂m₂) ÷ (n₁ + n₂). You cannot just average the two means.",
      workedSteps: [`Totals: ${n1 * m1} + ${n2 * m2} = ${n1 * m1 + n2 * m2}`, `÷ ${n1 + n2} = ${combined}`],
      keyConcept: "Combined mean uses combined totals, not the average of means." });
  } },

  { id: "median", min: 1, max: 6, fn(level, rng) {
    const n = rng.pick([5, 7, 9]);
    const data = Array.from({ length: n }, () => rng.int(2, 40 + level * 5));
    const sorted = data.slice().sort((a, b) => a - b);
    const med = sorted[(n - 1) / 2];
    return q({ rng, topicId: "statistics", level,
      promptHTML: `Find the <b>median</b> of: <b>${data.join(", ")}</b>`,
      correctText: String(med),
      distractors: [
        { text: String(data[Math.floor(n / 2)]), id: "me_unsorted", fb: "Sort the numbers first, then take the middle." },
        { text: String(Math.max(...data)), id: "me_max", fb: "Median is the middle, not the biggest." },
        { text: String(round(data.reduce((s, x) => s + x, 0) / n, 1)), id: "me_mean", fb: "That is the mean, not the median." },
      ],
      explanation: "Median = middle value once the data is in order.",
      workedSteps: [`Sorted: ${sorted.join(", ")}`, `Middle = ${med}`],
      keyConcept: "Sort, then take the middle." });
  } },

  { id: "median-even", min: 4, max: 6, fn(level, rng) {
    const n = rng.pick([6, 8]);
    const data = Array.from({ length: n }, () => rng.int(2, 50));
    const sorted = data.slice().sort((a, b) => a - b);
    const lo = sorted[n / 2 - 1], hi = sorted[n / 2];
    const med = round((lo + hi) / 2, 1);
    return numeric({ topicId: "statistics", level,
      promptHTML: `Find the <b>median</b> of these ${n} numbers: <b>${data.join(", ")}</b>`,
      value: med, tolerance: 0.005, accept: [String(med)],
      explanation: "With an even count, the median is the mean of the two middle values.",
      workedSteps: [`Sorted: ${sorted.join(", ")}`, `(${lo} + ${hi}) ÷ 2 = ${med}`],
      keyConcept: "Even data set: average the two middle numbers." });
  } },

  { id: "range", min: 1, max: 6, fn(level, rng) {
    const data = Array.from({ length: rng.int(5, 8) }, () => rng.int(3, 60 + level * 10));
    const r = Math.max(...data) - Math.min(...data);
    return q({ rng, topicId: "statistics", level,
      promptHTML: `Find the <b>range</b> of: <b>${data.join(", ")}</b>`,
      correctText: String(r),
      distractors: [
        { text: String(Math.max(...data)), id: "rg_max", fb: "Range = largest − smallest." },
        { text: String(Math.max(...data) + Math.min(...data)), id: "rg_add", fb: "Subtract, don't add." },
        { text: String(r - 1), id: "rg_slip", fb: "Recheck the subtraction." },
      ],
      explanation: "Range = largest − smallest.",
      workedSteps: [`${Math.max(...data)} − ${Math.min(...data)} = ${r}`],
      keyConcept: "Range measures the spread." });
  } },

  { id: "mode-table", min: 1, max: 6, fn(level, rng) {
    const items = ["red", "blue", "green", "yellow"];
    const counts = rng.shuffle([rng.int(3, 6), rng.int(7, 9), rng.int(3, 6), rng.int(2, 5)]);
    const maxI = counts.indexOf(Math.max(...counts));
    return q({ rng, topicId: "statistics", level,
      promptHTML: `Favourite colours — ${items.map((it, k) => `${it}: ${counts[k]}`).join(", ")}.<br>What is the <b>mode</b>?`,
      correctText: items[maxI],
      distractors: items.filter((_, k) => k !== maxI).slice(0, 3)
        .map((it) => ({ text: it, id: "mt_wrong", fb: "Mode = the most frequent category." })),
      explanation: "The mode is the value (here colour) with the highest frequency.",
      workedSteps: [`Highest count is ${items[maxI]} (${counts[maxI]}).`],
      keyConcept: "Mode = most frequent." });
  } },

  { id: "table-twostep", min: 2, max: 6, fn(level, rng) {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const vals = days.map(() => rng.int(8, 20 + level * 6));
    const i = rng.int(0, 2), j = rng.int(3, 4);
    const diff = Math.abs(vals[i] - vals[j]);
    return numeric({ topicId: "statistics", level,
      promptHTML: `Visitors — ${days.map((d, k) => `${d}: ${vals[k]}`).join(", ")}.<br>How many <b>more</b> visitors on ${vals[i] > vals[j] ? days[i] : days[j]} than on ${vals[i] > vals[j] ? days[j] : days[i]}?`,
      value: diff,
      explanation: "Read both values from the table, then subtract.",
      workedSteps: [`|${vals[i]} − ${vals[j]}| = ${diff}`],
      keyConcept: "‘How many more’ = difference of two table values." });
  } },

  { id: "table-total-mean", min: 3, max: 6, fn(level, rng) {
    const n = 5;
    const vals = Array.from({ length: n }, () => rng.int(4, 10) * 2);
    const total = vals.reduce((s, x) => s + x, 0);
    const mean = round(total / n, 2);
    return numeric({ topicId: "statistics", level,
      promptHTML: `A table shows <b>${vals.join(", ")}</b> goals over ${n} matches. What is the <b>mean</b> goals per match?`,
      value: mean, tolerance: 0.005, accept: [String(mean)],
      explanation: "Add the table values, divide by the number of entries.",
      workedSteps: [`Total = ${total}`, `${total} ÷ ${n} = ${mean}`],
      keyConcept: "Mean from a table: total ÷ count." });
  } },

  { id: "probability", min: 1, max: 6, fn(level, rng) {
    const r = rng.int(2, 6), b = rng.int(2, 6), g = rng.int(1, 5);
    const total = r + b + g;
    return q({ rng, topicId: "statistics", level,
      promptHTML: `A bag has <b>${r}</b> red, <b>${b}</b> blue and <b>${g}</b> green counters. What is the probability of picking <b>blue</b>? (simplest form)`,
      correctText: simplify(b, total),
      distractors: [
        { text: simplify(b, r + g), id: "pb_wrong_total", fb: "Probability = blue ÷ TOTAL counters." },
        { text: simplify(r, total), id: "pb_red", fb: "That is P(red)." },
        { text: `${b}`, id: "pb_count", fb: "Probability is a fraction out of the total." },
      ],
      explanation: "Probability = favourable ÷ total, then simplify.",
      workedSteps: [`P(blue) = ${b}/${total} = ${simplify(b, total)}`],
      keyConcept: "Probability = wanted ÷ total outcomes." });
  } },

  { id: "find-value-from-mean-range", min: 5, max: 6, fn(level, rng) {
    const a = rng.int(5, 15), diff = rng.int(4, 14);
    const b = a + diff; // range = diff
    const third = rng.int(a, b);
    const mean = round((a + b + third) / 3, 2);
    return numeric({ topicId: "statistics", level,
      promptHTML: `Three numbers have smallest <b>${a}</b>, range <b>${diff}</b> and the third number is <b>${third}</b>. What is their mean?`,
      value: mean, tolerance: 0.005, accept: [String(mean)],
      explanation: "Range = largest − smallest, so largest = smallest + range. Then mean = total ÷ 3.",
      workedSteps: [`Largest = ${a} + ${diff} = ${b}`, `(${a} + ${b} + ${third}) ÷ 3 = ${mean}`],
      keyConcept: "Combine range and mean facts." });
  } },
];

function simplify(num, den) {
  const g = (function gg(x, y) { return y ? gg(y, x % y) : x; })(num, den);
  return `${num / g}/${den / g}`;
}

export default makeGenerator("statistics", "statistics", templates);
