// The Broad 11+ topic registry. `generator` is the id of the module in
// js/generators that produces questions for this topic; `curatedTags`
// links curated word problems to the topic; `subject` groups topics into
// the four 11+ subjects (Maths now; VR/NVR/English added in Phase 4).
// Levels are 1 (early Year 4) to 6 (top-end 11+ / scholarship).

export const SUBJECTS = [
  { id: "maths", name: "Maths" },
  { id: "vr", name: "Verbal Reasoning" },
  { id: "nvr", name: "Non-Verbal Reasoning" },
  { id: "english", name: "English" },
];

export const TOPICS = [
  { id: "place-value",  name: "Number & Place Value", subject: "maths", area: "Number",
    generator: "numberPlaceValue", curatedTags: ["place-value", "number"] },
  { id: "add-subtract", name: "Addition & Subtraction", subject: "maths", area: "Number",
    generator: "addSubtract", curatedTags: ["add-subtract"] },
  { id: "multiply-divide", name: "Multiplication & Division", subject: "maths", area: "Number",
    generator: "multiplyDivide", curatedTags: ["multiply-divide", "factors"] },
  { id: "fractions", name: "Fractions", subject: "maths", area: "Number",
    generator: "fractions", curatedTags: ["fractions"] },
  { id: "decimals", name: "Decimals", subject: "maths", area: "Number",
    generator: "decimals", curatedTags: ["decimals"] },
  { id: "percentages", name: "Percentages", subject: "maths", area: "Number",
    generator: "percentages", curatedTags: ["percentages"] },
  { id: "ratio", name: "Ratio & Proportion", subject: "maths", area: "Reasoning",
    generator: "ratioProportion", curatedTags: ["ratio", "proportion"] },
  { id: "algebra", name: "Algebra & Sequences", subject: "maths", area: "Reasoning",
    generator: "algebra", curatedTags: ["algebra", "sequences"] },
  { id: "measurement", name: "Measurement & Money", subject: "maths", area: "Measurement",
    generator: "measurement", curatedTags: ["measurement", "money", "time"] },
  { id: "geometry", name: "Geometry & Angles", subject: "maths", area: "Geometry",
    generator: "geometry", curatedTags: ["geometry", "angles", "shapes"] },
  { id: "pav", name: "Perimeter, Area & Volume", subject: "maths", area: "Geometry",
    generator: "perimeterAreaVolume", curatedTags: ["perimeter", "area", "volume"] },
  { id: "statistics", name: "Statistics & Data", subject: "maths", area: "Data",
    generator: "statistics", curatedTags: ["statistics", "averages", "data"] },
];

export const MAX_LEVEL = 6;
export const MIN_LEVEL = 1;

export function topicById(id) {
  return TOPICS.find((t) => t.id === id);
}

// Subjects that currently have at least one registered topic.
export function activeSubjects() {
  return SUBJECTS.filter((s) => TOPICS.some((t) => t.subject === s.id));
}

export function topicsBySubject(subjectId) {
  return TOPICS.filter((t) => t.subject === subjectId);
}
