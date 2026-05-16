// Perimeter, Area & Volume — recalibrated HARD: compound shapes,
// triangle/parallelogram/trapezium area, prisms, surface area, reverse.
import { q, numeric, makeGenerator } from "./_shared.js";

const templates = [
  { id: "area-rect", min: 1, max: 6, fn(level, rng) {
    const w = rng.int(7, 15 + level * 4), h = rng.int(7, 15 + level * 4);
    const a = w * h;
    return q({ rng, topicId: "pav", level,
      promptHTML: `A rectangle is <b>${w} cm</b> by <b>${h} cm</b>. What is its area?`,
      correctText: `${a} cm²`,
      distractors: [
        { text: `${2 * (w + h)} cm²`, id: "ar_perim", fb: "That is the perimeter. Area = length × width." },
        { text: `${w + h} cm²`, id: "ar_add", fb: "Area is × not +." },
        { text: `${a - w} cm²`, id: "ar_slip", fb: "Recheck the multiplication." },
      ],
      explanation: "Area of a rectangle = length × width.",
      workedSteps: [`${w} × ${h} = ${a} cm²`],
      keyConcept: "Area = length × width." });
  } },

  { id: "perimeter-compound", min: 2, max: 6, fn(level, rng) {
    const a = rng.int(6, 14), b = rng.int(4, 10), c = rng.int(3, 8), d = rng.int(3, 8);
    // L-shape: outer a wide, b tall; notch c × d removed from a corner.
    const perim = 2 * (a + b);
    return numeric({ topicId: "pav", level,
      promptHTML: `An L-shape is a <b>${a} cm × ${b} cm</b> rectangle with a <b>${c} cm × ${d} cm</b> rectangle cut from one corner. What is its <b>perimeter</b> (cm)?`,
      value: perim,
      explanation: "For an L-shape, the cut-out corner moves edges but the perimeter equals the surrounding rectangle's perimeter.",
      workedSteps: [`Outer rectangle perimeter = 2 × (${a} + ${b}) = ${perim} cm`],
      keyConcept: "An inside notch keeps the perimeter the same as the bounding rectangle." });
  } },

  { id: "area-compound", min: 2, max: 6, fn(level, rng) {
    const a = rng.int(6, 14), b = rng.int(5, 12), c = rng.int(2, a - 2), d = rng.int(2, b - 2);
    const area = a * b - c * d;
    return numeric({ topicId: "pav", level,
      promptHTML: `An L-shape is a <b>${a} × ${b}</b> rectangle with a <b>${c} × ${d}</b> rectangle cut out. What is its area (cm²)?`,
      value: area, accept: [`${area}cm²`],
      explanation: "Area of the big rectangle minus the cut-out rectangle.",
      workedSteps: [`${a}×${b} = ${a * b}`, `− ${c}×${d} = ${c * d}`, `Area = ${area} cm²`],
      keyConcept: "Compound area: whole minus the missing piece." });
  } },

  { id: "area-triangle", min: 1, max: 6, fn(level, rng) {
    const base = rng.int(4, 12) * 2; // even → clean halving
    const ht = rng.int(5, 9 + level * 2);
    const a = (base * ht) / 2;
    return q({ rng, topicId: "pav", level,
      promptHTML: `A triangle has base <b>${base} cm</b> and height <b>${ht} cm</b>. What is its area?`,
      correctText: `${a} cm²`,
      distractors: [
        { text: `${base * ht} cm²`, id: "tr_nohalf", fb: "A triangle is half a rectangle — ÷ 2." },
        { text: `${base + ht} cm²`, id: "tr_add", fb: "Use ½ × base × height." },
        { text: `${a + base} cm²`, id: "tr_slip", fb: "Recheck ½ × base × height." },
      ],
      explanation: "Triangle area = ½ × base × height.",
      workedSteps: [`${base} × ${ht} = ${base * ht}`, `÷ 2 = ${a} cm²`],
      keyConcept: "Triangle area = ½ × base × height." });
  } },

  { id: "area-parallelogram", min: 3, max: 6, fn(level, rng) {
    const base = rng.int(6, 16), ht = rng.int(4, 12);
    const a = base * ht;
    return numeric({ topicId: "pav", level,
      promptHTML: `A parallelogram has base <b>${base} cm</b> and perpendicular height <b>${ht} cm</b>. What is its area (cm²)?`,
      value: a, accept: [`${a}cm²`],
      explanation: "Parallelogram area = base × perpendicular height (not the slant side).",
      workedSteps: [`${base} × ${ht} = ${a} cm²`],
      keyConcept: "Use the PERPENDICULAR height." });
  } },

  { id: "area-trapezium", min: 5, max: 6, fn(level, rng) {
    const aP = rng.int(4, 12), bP = rng.int(4, 12);
    const ht = rng.int(2, 8) * 2; // even so ÷2 stays whole
    const area = ((aP + bP) / 2) * ht;
    return numeric({ topicId: "pav", level,
      promptHTML: `A trapezium has parallel sides <b>${aP} cm</b> and <b>${bP} cm</b>, and height <b>${ht} cm</b>. Find its area (cm²).`,
      value: area, accept: [`${area}cm²`],
      explanation: "Trapezium area = ½ × (a + b) × height.",
      workedSteps: [`(${aP} + ${bP}) ÷ 2 = ${(aP + bP) / 2}`, `× ${ht} = ${area} cm²`],
      keyConcept: "Trapezium = average of parallel sides × height." });
  } },

  { id: "volume-cuboid", min: 1, max: 6, fn(level, rng) {
    const l = rng.int(5, 10 + level * 2), w = rng.int(4, 9), h = rng.int(3, 8);
    const v = l * w * h;
    return q({ rng, topicId: "pav", level,
      promptHTML: `A cuboid is <b>${l} × ${w} × ${h} cm</b>. What is its volume?`,
      correctText: `${v} cm³`,
      distractors: [
        { text: `${l + w + h} cm³`, id: "vc_add", fb: "Volume = l × w × h." },
        { text: `${2 * (l * w + w * h + l * h)} cm³`, id: "vc_sa", fb: "That is the surface area." },
        { text: `${l * w} cm³`, id: "vc_face", fb: "Multiply all THREE dimensions." },
      ],
      explanation: "Volume of a cuboid = length × width × height.",
      workedSteps: [`${l} × ${w} × ${h} = ${v} cm³`],
      keyConcept: "Volume = how many unit cubes fit." });
  } },

  { id: "surface-area", min: 4, max: 6, fn(level, rng) {
    const l = rng.int(3, 9), w = rng.int(3, 9), h = rng.int(3, 9);
    const sa = 2 * (l * w + w * h + l * h);
    return numeric({ topicId: "pav", level,
      promptHTML: `Find the surface area of a cuboid <b>${l} × ${w} × ${h} cm</b> (cm²).`,
      value: sa, accept: [`${sa}cm²`],
      explanation: "Surface area = 2(lw + wh + lh) — three pairs of faces.",
      workedSteps: [`2 × (${l * w} + ${w * h} + ${l * h}) = ${sa} cm²`],
      keyConcept: "Cuboid surface area = 2(lw + wh + lh)." });
  } },

  { id: "volume-prism", min: 5, max: 6, fn(level, rng) {
    const base = rng.int(4, 10) * 2, ht = rng.int(4, 9);
    const len = rng.int(5, 14);
    const csa = (base * ht) / 2;
    const vol = csa * len;
    return numeric({ topicId: "pav", level,
      promptHTML: `A triangular prism has a triangular cross-section (base <b>${base} cm</b>, height <b>${ht} cm</b>) and length <b>${len} cm</b>. Find its volume (cm³).`,
      value: vol, accept: [`${vol}cm³`],
      explanation: "Volume of a prism = cross-sectional area × length.",
      workedSteps: [`Triangle area = ½ × ${base} × ${ht} = ${csa}`, `× ${len} = ${vol} cm³`],
      keyConcept: "Prism volume = cross-section area × length." });
  } },

  { id: "missing-side-area", min: 1, max: 6, fn(level, rng) {
    const w = rng.int(4, 16), h = rng.int(4, 16);
    const a = w * h;
    return numeric({ topicId: "pav", level,
      promptHTML: `A rectangle has area <b>${a} cm²</b> and one side <b>${w} cm</b>. Find the other side (cm).`,
      value: h, accept: [`${h}cm`],
      explanation: "Other side = area ÷ known side.",
      workedSteps: [`${a} ÷ ${w} = ${h} cm`],
      keyConcept: "Inverse: side = area ÷ side." });
  } },

  { id: "missing-edge-volume", min: 4, max: 6, fn(level, rng) {
    const l = rng.int(3, 9), w = rng.int(3, 9), h = rng.int(3, 9);
    const v = l * w * h;
    return numeric({ topicId: "pav", level,
      promptHTML: `A cuboid has volume <b>${v} cm³</b>. Two edges are <b>${l} cm</b> and <b>${w} cm</b>. Find the third edge (cm).`,
      value: h, accept: [`${h}cm`],
      explanation: "Third edge = volume ÷ (the two known edges).",
      workedSteps: [`${v} ÷ (${l} × ${w}) = ${v} ÷ ${l * w} = ${h} cm`],
      keyConcept: "Reverse the volume formula." });
  } },

  { id: "border-area", min: 3, max: 6, fn(level, rng) {
    const a = rng.int(10, 20), b = rng.int(8, 16), border = rng.int(1, 3);
    const inner = (a - 2 * border) * (b - 2 * border);
    const area = a * b - inner;
    return numeric({ topicId: "pav", level,
      promptHTML: `A <b>${a} m × ${b} m</b> lawn has a path of width <b>${border} m</b> all around the inside edge. What is the area of the <b>path</b> (m²)?`,
      value: area, accept: [`${area}m²`],
      explanation: "Path area = whole area − inner (grass) area; the inner loses 2×width on each dimension.",
      workedSteps: [`Whole = ${a * b}`, `Inner = ${a - 2 * border}×${b - 2 * border} = ${inner}`, `Path = ${area} m²`],
      keyConcept: "A border reduces each dimension by twice its width." });
  } },

  { id: "area-to-side", min: 2, max: 6, fn(level, rng) {
    const s = rng.int(4, 18);
    const a = s * s;
    return numeric({ topicId: "pav", level,
      promptHTML: `A square has area <b>${a} cm²</b>. How long is each side (cm)?`,
      value: s, accept: [`${s}cm`],
      explanation: "Side = √area.",
      workedSteps: [`√${a} = ${s} cm`],
      keyConcept: "Undo 'side²' with a square root." });
  } },
];

export default makeGenerator("perimeterAreaVolume", "pav", templates);
