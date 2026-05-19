// Shared, frequency-banded word data for the Verbal Reasoning and English
// generators. `band` is a rough difficulty tier (1 = common KS2 vocabulary,
// 6 = stretching scholarship vocabulary). Generators map the requested
// level to a band so harder levels draw harder words, while every entry
// re-randomises by seed so nothing can be rote-memorised.
//
// All data is plain and pure; the only function, `sampleDistinct`, is
// deterministic given the rng passed in.

// Pick `n` distinct items from `arr` (deterministic for a given rng),
// skipping anything in `exclude` (array or Set). Returns up to `n` items.
export function sampleDistinct(rng, arr, n, exclude = []) {
  const ex = exclude instanceof Set ? exclude : new Set(exclude);
  const pool = arr.filter((x) => !ex.has(x));
  return rng.shuffle(pool.slice()).slice(0, n);
}

// Clamp a 1..6 level onto a 1..6 band.
export function bandFor(level) {
  return Math.min(6, Math.max(1, Math.round(level || 1)));
}

// Deterministically pick an entry whose band suits `level`: never harder
// than the level's band, and biased toward the top tier available so
// higher levels genuinely feel harder.
export function byBand(rng, arr, level) {
  const b = bandFor(level);
  let c = arr.filter((x) => x.band <= b);
  if (!c.length) c = arr.slice();
  const hard = c.filter((x) => x.band >= b - 1);
  return rng.pick(hard.length ? hard : c);
}

// word -> closest in meaning. Each has 1 synonym; distractors come from
// the shared NOUN/ADJ pools so they are always clearly unrelated.
export const SYNONYMS = [
  { w: "big", s: "large", band: 1 },
  { w: "small", s: "tiny", band: 1 },
  { w: "happy", s: "glad", band: 1 },
  { w: "fast", s: "quick", band: 1 },
  { w: "begin", s: "start", band: 1 },
  { w: "shut", s: "close", band: 1 },
  { w: "easy", s: "simple", band: 2 },
  { w: "angry", s: "cross", band: 2 },
  { w: "brave", s: "bold", band: 2 },
  { w: "rich", s: "wealthy", band: 2 },
  { w: "strange", s: "odd", band: 2 },
  { w: "calm", s: "peaceful", band: 3 },
  { w: "ancient", s: "old", band: 3 },
  { w: "enormous", s: "huge", band: 3 },
  { w: "famous", s: "renowned", band: 3 },
  { w: "fragile", s: "delicate", band: 3 },
  { w: "abundant", s: "plentiful", band: 4 },
  { w: "reluctant", s: "unwilling", band: 4 },
  { w: "vivid", s: "bright", band: 4 },
  { w: "weary", s: "tired", band: 4 },
  { w: "courteous", s: "polite", band: 4 },
  { w: "tedious", s: "boring", band: 5 },
  { w: "candid", s: "frank", band: 5 },
  { w: "diligent", s: "hardworking", band: 5 },
  { w: "lucid", s: "clear", band: 5 },
  { w: "obsolete", s: "outdated", band: 5 },
  { w: "ephemeral", s: "fleeting", band: 6 },
  { w: "gregarious", s: "sociable", band: 6 },
  { w: "meticulous", s: "careful", band: 6 },
  { w: "tenacious", s: "persistent", band: 6 },
  { w: "ubiquitous", s: "widespread", band: 6 },
];

// word -> opposite in meaning.
export const ANTONYMS = [
  { w: "hot", a: "cold", band: 1 },
  { w: "up", a: "down", band: 1 },
  { w: "open", a: "closed", band: 1 },
  { w: "fast", a: "slow", band: 1 },
  { w: "happy", a: "sad", band: 1 },
  { w: "light", a: "dark", band: 1 },
  { w: "empty", a: "full", band: 2 },
  { w: "ancient", a: "modern", band: 2 },
  { w: "brave", a: "cowardly", band: 2 },
  { w: "tame", a: "wild", band: 2 },
  { w: "smooth", a: "rough", band: 2 },
  { w: "expand", a: "shrink", band: 3 },
  { w: "ascend", a: "descend", band: 3 },
  { w: "generous", a: "selfish", band: 3 },
  { w: "permanent", a: "temporary", band: 3 },
  { w: "victory", a: "defeat", band: 3 },
  { w: "abundant", a: "scarce", band: 4 },
  { w: "praise", a: "criticise", band: 4 },
  { w: "expand", a: "contract", band: 4 },
  { w: "humble", a: "arrogant", band: 4 },
  { w: "transparent", a: "opaque", band: 5 },
  { w: "frugal", a: "wasteful", band: 5 },
  { w: "concealed", a: "exposed", band: 5 },
  { w: "amateur", a: "professional", band: 5 },
  { w: "benevolent", a: "malicious", band: 6 },
  { w: "verbose", a: "concise", band: 6 },
  { w: "fortify", a: "weaken", band: 6 },
  { w: "scarcity", a: "abundance", band: 6 },
];

// Analogy quads: a:b :: c:d, with a named relation for the explanation.
export const ANALOGIES = [
  { a: "dog", b: "puppy", c: "cat", d: "kitten", rel: "adult → young", band: 1 },
  { a: "hand", b: "glove", c: "foot", d: "sock", rel: "body part → what covers it", band: 1 },
  { a: "bird", b: "fly", c: "fish", d: "swim", rel: "animal → how it moves", band: 1 },
  { a: "day", b: "night", c: "summer", d: "winter", rel: "opposites", band: 2 },
  { a: "cow", b: "calf", c: "horse", d: "foal", rel: "adult → young", band: 2 },
  { a: "book", b: "read", c: "song", d: "sing", rel: "object → action", band: 2 },
  { a: "teacher", b: "school", c: "doctor", d: "hospital", rel: "person → workplace", band: 3 },
  { a: "hot", b: "cold", c: "fast", d: "slow", rel: "opposites", band: 3 },
  { a: "petal", b: "flower", c: "leaf", d: "tree", rel: "part → whole", band: 3 },
  { a: "author", b: "book", c: "composer", d: "symphony", rel: "creator → creation", band: 4 },
  { a: "thermometer", b: "temperature", c: "clock", d: "time", rel: "instrument → what it measures", band: 4 },
  { a: "drought", b: "rain", c: "famine", d: "food", rel: "shortage → of what", band: 5 },
  { a: "novice", b: "expert", c: "whisper", d: "shout", rel: "weak → strong form", band: 5 },
  { a: "cartographer", b: "map", c: "lexicographer", d: "dictionary", rel: "maker → product", band: 6 },
];

// Odd-one-out categories. A question shows 3 members of one category plus
// one intruder from another category; the intruder is the answer.
export const CATEGORIES = [
  { name: "fruit", items: ["apple", "banana", "orange", "grape", "pear", "plum"], band: 1 },
  { name: "animals", items: ["lion", "tiger", "wolf", "bear", "fox", "deer"], band: 1 },
  { name: "colours", items: ["red", "blue", "green", "yellow", "purple", "orange"], band: 1 },
  { name: "vehicles", items: ["car", "bus", "train", "lorry", "van", "tram"], band: 2 },
  { name: "furniture", items: ["chair", "table", "sofa", "desk", "shelf", "stool"], band: 2 },
  { name: "instruments", items: ["violin", "flute", "trumpet", "piano", "cello", "harp"], band: 3 },
  { name: "metals", items: ["iron", "copper", "silver", "gold", "tin", "zinc"], band: 3 },
  { name: "planets", items: ["mars", "venus", "jupiter", "saturn", "mercury", "neptune"], band: 4 },
  { name: "emotions", items: ["joy", "anger", "fear", "sorrow", "envy", "pride"], band: 4 },
  { name: "shapes", items: ["square", "circle", "triangle", "hexagon", "pentagon", "octagon"], band: 2 },
  { name: "weather", items: ["rain", "snow", "hail", "fog", "sleet", "drizzle"], band: 3 },
  { name: "occupations", items: ["plumber", "surgeon", "architect", "engineer", "lawyer", "chemist"], band: 5 },
];

// Vocabulary-in-context: a sentence with a gap; pick the word that fits.
export const CONTEXT = [
  { sentence: "The desert was so dry that water became extremely ___.", correct: "scarce", distractors: ["plentiful", "wet", "heavy"], band: 4 },
  { sentence: "She was ___ to leave the party because she was enjoying herself.", correct: "reluctant", distractors: ["eager", "ready", "quick"], band: 4 },
  { sentence: "The old bridge was ___, so the council closed it for repairs.", correct: "unstable", distractors: ["sturdy", "modern", "wide"], band: 3 },
  { sentence: "His ___ explanation made the difficult topic easy to follow.", correct: "lucid", distractors: ["confusing", "loud", "brief"], band: 5 },
  { sentence: "The crowd's ___ applause showed how much they loved the show.", correct: "enthusiastic", distractors: ["silent", "weak", "brief"], band: 3 },
  { sentence: "The detective found ___ evidence that proved who the thief was.", correct: "conclusive", distractors: ["doubtful", "missing", "false"], band: 5 },
  { sentence: "After the long hike the children were utterly ___.", correct: "exhausted", distractors: ["energetic", "cheerful", "hungry"], band: 2 },
  { sentence: "The museum displayed an ___ collection of ancient coins.", correct: "extensive", distractors: ["tiny", "modern", "fake"], band: 4 },
  { sentence: "The volcano had been ___ for centuries before it erupted.", correct: "dormant", distractors: ["active", "noisy", "visible"], band: 6 },
  { sentence: "Her ___ remarks offended several people at the meeting.", correct: "tactless", distractors: ["polite", "quiet", "kind"], band: 5 },
];

// Common 11+ spelling words with the misspellings children typically make.
export const SPELLING = [
  { correct: "because", wrong: ["becuase", "becouse", "becasue"], band: 1 },
  { correct: "friend", wrong: ["freind", "frend", "friendd"], band: 1 },
  { correct: "beautiful", wrong: ["beautifull", "beutiful", "beatiful"], band: 2 },
  { correct: "separate", wrong: ["seperate", "separete", "seperat"], band: 3 },
  { correct: "necessary", wrong: ["neccessary", "necesary", "neccesary"], band: 4 },
  { correct: "definitely", wrong: ["definately", "definitly", "definatly"], band: 3 },
  { correct: "rhythm", wrong: ["rythm", "rhythem", "rhytm"], band: 5 },
  { correct: "embarrass", wrong: ["embarass", "embarras", "embarrass"], band: 5 },
  { correct: "occasion", wrong: ["ocasion", "occassion", "ocassion"], band: 4 },
  { correct: "tomorrow", wrong: ["tommorow", "tomorow", "tommorrow"], band: 2 },
  { correct: "address", wrong: ["adress", "addres", "adresss"], band: 2 },
  { correct: "weird", wrong: ["wierd", "weerd", "weird "], band: 3 },
  { correct: "conscience", wrong: ["concience", "conscence", "consciense"], band: 6 },
  { correct: "privilege", wrong: ["priviledge", "privelege", "privilage"], band: 6 },
  { correct: "argument", wrong: ["arguement", "argumant", "arguemnt"], band: 4 },
];

// Generic distractor pools used so word MCQs always have clearly-wrong,
// distinct options (kept simple words so they are never plausibly right).
export const NOUN_POOL = [
  "river", "mountain", "pencil", "window", "garden", "bottle", "ladder",
  "candle", "basket", "engine", "feather", "anchor", "tunnel", "harvest",
  "compass", "lantern", "marble", "puzzle", "ribbon", "saddle",
];
export const ADJ_POOL = [
  "wooden", "circular", "frozen", "golden", "narrow", "hollow", "spotted",
  "sticky", "distant", "crooked", "gentle", "sudden", "hidden", "fragile",
  "ancient", "silent", "rapid", "shallow", "rugged", "vacant",
];
