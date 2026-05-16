// The Broad 11+ topic registry. `generator` is the id of the module in
// js/generators that produces questions for this topic; `curatedTags`
// links curated word problems to the topic. Levels are 1 (early Year 4)
// to 6 (top-end 11+ / scholarship).

export const TOPICS = [
  { id: "place-value",  name: "Number & Place Value", area: "Number",
    generator: "numberPlaceValue", curatedTags: ["place-value", "number"] },
  { id: "add-subtract", name: "Addition & Subtraction", area: "Number",
    generator: "addSubtract", curatedTags: ["add-subtract"] },
  { id: "multiply-divide", name: "Multiplication & Division", area: "Number",
    generator: "multiplyDivide", curatedTags: ["multiply-divide", "factors"] },
  { id: "fractions", name: "Fractions", area: "Number",
    generator: "fractions", curatedTags: ["fractions"] },
  { id: "decimals", name: "Decimals", area: "Number",
    generator: "decimals", curatedTags: ["decimals"] },
  { id: "percentages", name: "Percentages", area: "Number",
    generator: "percentages", curatedTags: ["percentages"] },
  { id: "ratio", name: "Ratio & Proportion", area: "Reasoning",
    generator: "ratioProportion", curatedTags: ["ratio", "proportion"] },
  { id: "algebra", name: "Algebra & Sequences", area: "Reasoning",
    generator: "algebra", curatedTags: ["algebra", "sequences"] },
  { id: "measurement", name: "Measurement & Money", area: "Measurement",
    generator: "measurement", curatedTags: ["measurement", "money", "time"] },
  { id: "geometry", name: "Geometry & Angles", area: "Geometry",
    generator: "geometry", curatedTags: ["geometry", "angles", "shapes"] },
  { id: "pav", name: "Perimeter, Area & Volume", area: "Geometry",
    generator: "perimeterAreaVolume", curatedTags: ["perimeter", "area", "volume"] },
  { id: "statistics", name: "Statistics & Data", area: "Data",
    generator: "statistics", curatedTags: ["statistics", "averages", "data"] },
];

export const MAX_LEVEL = 6;
export const MIN_LEVEL = 1;

export function topicById(id) {
  return TOPICS.find((t) => t.id === id);
}
