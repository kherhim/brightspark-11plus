// Geometry & Angles — recalibrated HARD: multi-step angle reasoning,
// parallel lines, polygon interior/exterior angles, coordinates, solids.
import { q, numeric, makeGenerator } from "./_shared.js";

const templates = [
  { id: "triangle-missing", min: 1, max: 6, fn(level, rng) {
    const a = rng.int(30, 80), b = rng.int(30, 150 - a);
    const c = 180 - a - b;
    return q({ rng, topicId: "geometry", level,
      promptHTML: `A triangle has angles <b>${a}°</b> and <b>${b}°</b>. Find the third angle.`,
      correctText: `${c}°`,
      distractors: [
        { text: `${360 - a - b}°`, id: "tm_360", fb: "Triangle angles total 180°, not 360°." },
        { text: `${a + b}°`, id: "tm_sum", fb: "Subtract the two from 180°." },
        { text: `${c + 10}°`, id: "tm_slip", fb: "Recheck 180 − the two angles." },
      ],
      explanation: "Angles in a triangle sum to 180°.",
      workedSteps: [`180 − ${a} − ${b} = ${c}`],
      keyConcept: "Triangle angle sum = 180°." });
  } },

  { id: "isosceles", min: 1, max: 6, fn(level, rng) {
    const apex = rng.int(20, 110);
    const base = (180 - apex) / 2;
    const giveApex = rng.chance(0.5);
    if (giveApex && Number.isInteger(base))
      return numeric({ topicId: "geometry", level,
        promptHTML: `An isosceles triangle has an apex angle of <b>${apex}°</b>. What is each base angle (degrees)?`,
        value: base, unit: "°", accept: [`${base}°`],
        explanation: "The two base angles are equal; all three total 180°.",
        workedSteps: [`(180 − ${apex}) ÷ 2 = ${base}°`],
        keyConcept: "Isosceles: two equal base angles." });
    const baseAng = rng.int(40, 75);
    return numeric({ topicId: "geometry", level,
      promptHTML: `An isosceles triangle has each base angle <b>${baseAng}°</b>. What is the apex angle (degrees)?`,
      value: 180 - 2 * baseAng, unit: "°", accept: [`${180 - 2 * baseAng}°`],
      explanation: "Apex = 180 − (two equal base angles).",
      workedSteps: [`180 − 2×${baseAng} = ${180 - 2 * baseAng}°`],
      keyConcept: "Isosceles: base angles equal." });
  } },

  { id: "angles-point", min: 1, max: 6, fn(level, rng) {
    const parts = level <= 3 ? 3 : 4;
    const angles = [];
    let total = 360;
    for (let i = 0; i < parts - 1; i++) {
      const a = rng.int(30, total - 30 * (parts - 1 - i));
      angles.push(a);
      total -= a;
    }
    return numeric({ topicId: "geometry", level,
      promptHTML: `Angles ${angles.join("°, ")}° and one more meet at a <b>point</b>. Find the missing angle (degrees).`,
      value: total, unit: "°", accept: [`${total}°`],
      explanation: "Angles around a point sum to 360°.",
      workedSteps: [`360 − (${angles.join(" + ")}) = ${total}`],
      keyConcept: "Angles around a point = 360°." });
  } },

  { id: "vertically-opposite", min: 2, max: 6, fn(level, rng) {
    const a = rng.int(35, 145);
    return q({ rng, topicId: "geometry", level,
      promptHTML: `Two straight lines cross. One angle is <b>${a}°</b>. What is the angle <b>next to it</b> (on the straight line)?`,
      correctText: `${180 - a}°`,
      distractors: [
        { text: `${a}°`, id: "vo_vert", fb: "That is the vertically opposite angle, not the one next to it." },
        { text: `${360 - a}°`, id: "vo_360", fb: "Angles on a straight line total 180°." },
        { text: `${90 - (a % 90)}°`, id: "vo_90", fb: "Use 180°, not 90°." },
      ],
      explanation: "Adjacent angles on a straight line are supplementary (sum 180°); vertically opposite angles are equal.",
      workedSteps: [`180 − ${a} = ${180 - a}`],
      keyConcept: "Straight line = 180°; vertically opposite = equal." });
  } },

  { id: "parallel-lines", min: 3, max: 6, fn(level, rng) {
    const a = rng.int(40, 140);
    const kind = rng.pick([
      ["alternate (Z)", a, "Alternate angles are EQUAL."],
      ["co-interior (C)", 180 - a, "Co-interior angles sum to 180°."],
      ["corresponding (F)", a, "Corresponding angles are EQUAL."],
    ]);
    return q({ rng, topicId: "geometry", level,
      promptHTML: `Parallel lines are crossed by a straight line. One angle is <b>${a}°</b>. Find the <b>${kind[0]}</b> angle.`,
      correctText: `${kind[1]}°`,
      distractors: [
        { text: `${kind[1] === a ? 180 - a : a}°`, id: "pl_wrong_rel", fb: kind[2] },
        { text: `${360 - a}°`, id: "pl_360", fb: "Angles here relate via 180° or are equal, never 360°." },
        { text: `${a + 10}°`, id: "pl_slip", fb: kind[2] },
      ],
      explanation: kind[2] + " (parallel-line angle rules).",
      workedSteps: [`${kind[0]} angle = ${kind[1]}°`],
      keyConcept: "Z = equal, F = equal, C = sum 180°." });
  } },

  { id: "polygon-interior", min: 3, max: 6, fn(level, rng) {
    const sides = rng.pick([5, 6, 8, 9, 10, 12]);
    const each = ((sides - 2) * 180) / sides;
    return numeric({ topicId: "geometry", level,
      promptHTML: `Each interior angle of a regular <b>${sides}-sided</b> polygon — what is it (degrees)?`,
      value: each, unit: "°", accept: [`${each}°`],
      explanation: "Interior angle sum = (n − 2) × 180; divide by n for a regular polygon.",
      workedSteps: [`(${sides} − 2) × 180 = ${(sides - 2) * 180}`, `÷ ${sides} = ${each}°`],
      keyConcept: "Regular polygon interior angle = (n−2)·180 ÷ n." });
  } },

  { id: "polygon-exterior", min: 3, max: 6, fn(level, rng) {
    const sides = rng.pick([4, 5, 6, 8, 9, 10, 12]);
    const ext = 360 / sides;
    return numeric({ topicId: "geometry", level,
      promptHTML: `What is each exterior angle of a regular <b>${sides}-sided</b> polygon (degrees)?`,
      value: ext, unit: "°", accept: [`${ext}°`],
      explanation: "The exterior angles of any polygon sum to 360°.",
      workedSteps: [`360 ÷ ${sides} = ${ext}°`],
      keyConcept: "Exterior angles always total 360°." });
  } },

  { id: "angles-line-multi", min: 1, max: 6, fn(level, rng) {
    const parts = level <= 2 ? 2 : 3;
    const angles = [];
    let total = 180;
    for (let i = 0; i < parts - 1; i++) {
      const a = rng.int(25, total - 25 * (parts - 1 - i));
      angles.push(a);
      total -= a;
    }
    return numeric({ topicId: "geometry", level,
      promptHTML: `Angles ${angles.join("°, ")}° and one more lie on a <b>straight line</b>. Find the missing angle (degrees).`,
      value: total, unit: "°", accept: [`${total}°`],
      explanation: "Angles on a straight line sum to 180°.",
      workedSteps: [`180 − (${angles.join(" + ")}) = ${total}`],
      keyConcept: "Straight line = 180°." });
  } },

  { id: "coordinates-fourth", min: 2, max: 6, fn(level, rng) {
    const x = rng.int(-3, 4), y = rng.int(-3, 4);
    const w = rng.int(2, 6), h = rng.int(2, 6);
    // Rectangle vertices: (x,y),(x+w,y),(x+w,y+h),(x,y+h). Ask the 4th.
    return q({ rng, topicId: "geometry", level,
      promptHTML: `Three corners of a rectangle are <b>(${x}, ${y})</b>, <b>(${x + w}, ${y})</b> and <b>(${x + w}, ${y + h})</b>. What is the fourth corner?`,
      correctText: `(${x}, ${y + h})`,
      distractors: [
        { text: `(${x + w}, ${y + h})`, id: "cf_dup", fb: "That corner is already given." },
        { text: `(${x}, ${y})`, id: "cf_dup2", fb: "That corner is already given." },
        { text: `(${x + h}, ${y + w})`, id: "cf_swap", fb: "Match the sides: same x as one corner, same y as another." },
      ],
      explanation: "Opposite sides of a rectangle are parallel and equal — the 4th point shares an x with one corner and a y with another.",
      workedSteps: [`Fourth corner = (${x}, ${y + h})`],
      keyConcept: "Use rectangle structure to find a missing vertex." });
  } },

  { id: "midpoint", min: 4, max: 6, fn(level, rng) {
    const x1 = rng.int(-6, 6) * 2, y1 = rng.int(-6, 6) * 2;
    const x2 = rng.int(-6, 6) * 2, y2 = rng.int(-6, 6) * 2;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    return q({ rng, topicId: "geometry", level,
      promptHTML: `What is the midpoint of <b>(${x1}, ${y1})</b> and <b>(${x2}, ${y2})</b>?`,
      correctText: `(${mx}, ${my})`,
      distractors: [
        { text: `(${x1 + x2}, ${y1 + y2})`, id: "mp_nodiv", fb: "Midpoint averages the coordinates — divide by 2." },
        { text: `(${(x2 - x1) / 2}, ${(y2 - y1) / 2})`, id: "mp_diff", fb: "Add the coordinates before halving." },
        { text: `(${my}, ${mx})`, id: "mp_swap", fb: "Keep x with x and y with y." },
      ],
      explanation: "Midpoint = (average of x's, average of y's).",
      workedSteps: [`x: (${x1}+${x2})÷2 = ${mx}`, `y: (${y1}+${y2})÷2 = ${my}`],
      keyConcept: "Midpoint = mean of the endpoints." });
  } },

  { id: "solid-properties", min: 1, max: 6, fn(level, rng) {
    const solids = [["cube", 6, 12, 8], ["cuboid", 6, 12, 8],
      ["square-based pyramid", 5, 8, 5], ["triangular prism", 5, 9, 6],
      ["tetrahedron", 4, 6, 4], ["hexagonal prism", 8, 18, 12],
      ["pentagonal pyramid", 6, 10, 6]];
    const s = rng.pick(solids);
    const which = rng.pick([["faces", 1], ["edges", 2], ["vertices", 3]]);
    return q({ rng, topicId: "geometry", level,
      promptHTML: `How many <b>${which[0]}</b> does a <b>${s[0]}</b> have?`,
      correctText: String(s[which[1]]),
      distractors: [
        { text: String(s[which[1]] + 2), id: "sp_p2", fb: `Recount the ${which[0]}.` },
        { text: String(s[which[1]] - 1), id: "sp_m1", fb: "Faces are flat, edges are lines, vertices are corners." },
        { text: String(s[which[1]] + 1), id: "sp_p1", fb: `A ${s[0]} has ${s[which[1]]} ${which[0]}.` },
      ],
      explanation: "Faces = flat surfaces, edges = where faces meet, vertices = corners.",
      workedSteps: [`A ${s[0]} has ${s[which[1]]} ${which[0]}.`],
      keyConcept: "Know F/E/V for common solids (Euler: F + V − E = 2)." });
  } },

  { id: "exterior-find-sides", min: 4, max: 6, fn(level, rng) {
    const sides = rng.pick([4, 5, 6, 8, 9, 10, 12]);
    const ext = 360 / sides;
    return numeric({ topicId: "geometry", level,
      promptHTML: `A regular polygon has an exterior angle of <b>${ext}°</b>. How many sides does it have?`,
      value: sides,
      explanation: "Number of sides = 360 ÷ exterior angle.",
      workedSteps: [`360 ÷ ${ext} = ${sides} sides`],
      keyConcept: "Sides = 360 ÷ exterior angle." });
  } },
];

export default makeGenerator("geometry", "geometry", templates);
