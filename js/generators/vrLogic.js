// Verbal Reasoning — Number & Word Logic. Short deductive puzzles:
// comparative ordering, age relationships, and day/position logic.
import { q, numeric, makeGenerator } from "./_shared.js";

const NAMES = ["Amir", "Beth", "Carlos", "Dina", "Esha", "Finn", "Grace"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday",
  "Friday", "Saturday", "Sunday"];

const templates = [
  { id: "ordering", min: 1, max: 6, fn(level, rng) {
    const [a, b, c] = rng.sample(NAMES, 3);
    const adj = rng.pick([
      ["taller", "tallest"], ["older", "oldest"],
      ["faster", "fastest"], ["heavier", "heaviest"],
    ]);
    return q({ rng, topicId: "vr-logic", level,
      promptHTML:
        `${a} is ${adj[0]} than ${b}. ${b} is ${adj[0]} than ${c}.<br>` +
        `Who is the <b>${adj[1]}</b>?`,
      correctText: a,
      distractors: [
        { text: c, id: "vl_bottom",
          fb: `${c} is the least ${adj[0]}, not the ${adj[1]}.` },
        { text: b, id: "vl_middle",
          fb: `${b} is in the middle.` },
        { text: "Cannot tell", id: "vl_cant",
          fb: `The two clues chain together: ${a} > ${b} > ${c}.` },
      ],
      explanation: `${a} > ${b} > ${c}, so ${a} is the ${adj[1]}.`,
      keyConcept: "Chain the clues into one order." });
  } },

  { id: "age-relationship", min: 1, max: 6, fn(level, rng) {
    const [x, y] = rng.sample(NAMES, 2);
    const diff = rng.int(2, 4 + level);
    // Keep both ages sensible and positive whichever way the clue runs.
    const yAge = rng.int(diff + 2, diff + 8 + level);
    const older = rng.chance(0.5);
    const xAge = older ? yAge + diff : yAge - diff;
    return numeric({ topicId: "vr-logic", level,
      promptHTML:
        `${x} is ${diff} year(s) ${older ? "older" : "younger"} than ${y}. ` +
        `${y} is ${yAge}. How old is ${x}?`,
      value: xAge,
      explanation: `${yAge} ${older ? "+" : "−"} ${diff} = ${xAge}.`,
      keyConcept: "Translate 'older/younger than' into + or −." });
  } },

  { id: "day-logic", min: 2, max: 6, fn(level, rng) {
    const start = rng.int(0, 6);
    const add = rng.int(2, 3 + level);
    const ansIdx = (start + add) % 7;
    return q({ rng, topicId: "vr-logic", level,
      promptHTML:
        `If today is <b>${DAYS[start]}</b>, what day will it be in ` +
        `<b>${add}</b> days?`,
      correctText: DAYS[ansIdx],
      distractors: [
        { text: DAYS[(start + add - 1) % 7], id: "vd_off1",
          fb: `Count ${add} full days forward.` },
        { text: DAYS[(start - add + 7) % 7], id: "vd_back",
          fb: `Move forward, not backward.` },
        { text: DAYS[(start + add + 1) % 7], id: "vd_off2",
          fb: `Count exactly ${add} days.` },
      ],
      explanation: `${DAYS[start]} + ${add} days = ${DAYS[ansIdx]}.`,
      keyConcept: "Days repeat every 7 — count on and wrap round." });
  } },
];

export default makeGenerator("vrLogic", "vr-logic", templates);
