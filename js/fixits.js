// Loads the fix-it mini-lesson bank (data/fixits.json). A fix-it is a
// short targeted lesson surfaced when one misconception keeps recurring.
// Lookup is by exact misconceptionId, falling back to the topic's area so
// every dominant error always has *something* useful to show. Mirrors the
// curated.js loader pattern (fetch once, embedded fallback for offline).

const FALLBACK = {
  byMisconception: {
    ar_perim: {
      title: "Area vs perimeter",
      explanationHTML:
        "<b>Perimeter</b> is the distance around a shape; <b>area</b> is the space inside it (length × width for a rectangle).",
      workedExample: "6 × 4 rectangle: perimeter 20 cm, area 24 cm².",
    },
    mn_sum: {
      title: "Mean: don't forget to divide",
      explanationHTML:
        "The <b>mean</b> is the total <b>÷ how many numbers</b> there are.",
      workedExample: "4, 6, 8, 2 → 20 ÷ 4 = 5.",
    },
  },
  byArea: {
    Number: {
      title: "Slow down on number work",
      explanationHTML:
        "Underline exactly what is asked, work one step at a time, and check the size of your answer makes sense.",
      workedExample: "412 − 187 ≈ 400 − 200 = 200, so ~225 is sensible.",
    },
    Reasoning: {
      title: "Turn words into a clear plan",
      explanationHTML:
        "Find the value of one part (or what each letter means) first, then build the rest.",
      workedExample: "Ratio 3:5, 24 apples → 1 part = 8 → oranges = 40.",
    },
    Measurement: {
      title: "Check the units first",
      explanationHTML:
        "Convert everything to the same unit before adding or subtracting.",
      workedExample: "3 m − 145 cm → 300 − 145 = 155 cm.",
    },
    Geometry: {
      title: "Name the property you're using",
      explanationHTML:
        "State the angle fact (line 180°, triangle 180°, point 360°), then calculate.",
      workedExample: "Straight line: 180 − 115 = 65°.",
    },
    Data: {
      title: "Pick the right average",
      explanationHTML:
        "Mean = total ÷ count, median = middle (sorted), mode = most common, range = largest − smallest.",
      workedExample: "2, 5, 5, 8 → mean 5, median 5, mode 5, range 6.",
    },
  },
};

let FIX = null;

function valid(obj) {
  return (
    obj &&
    typeof obj === "object" &&
    obj.byArea &&
    typeof obj.byArea === "object"
  );
}

export async function loadFixits() {
  if (FIX) return FIX;
  try {
    const res = await fetch("./data/fixits.json", { cache: "no-store" });
    const data = await res.json();
    FIX = valid(data) ? data : FALLBACK;
  } catch (e) {
    FIX = FALLBACK;
  }
  return FIX;
}

// Test hook / direct injection.
export function setFixits(obj) {
  FIX = valid(obj) ? obj : FALLBACK;
}

export function fixitsLoaded() {
  return !!FIX;
}

// Best fix-it for a misconception: exact match first, then the topic's
// area as a fallback. Returns null only if nothing at all is available.
export function getFixit(misconceptionId, area) {
  const f = FIX || FALLBACK;
  return (
    (f.byMisconception && f.byMisconception[misconceptionId]) ||
    (f.byArea && f.byArea[area]) ||
    null
  );
}
