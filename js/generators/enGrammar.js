// English — Grammar. Auto-markable MCQ: choose the word that makes the
// sentence grammatically correct, or pick the correct sentence.
import { q, makeGenerator } from "./_shared.js";
import { byBand } from "./_words.js";

// Each item: a sentence with a ___ gap, the right word, wrong words, the
// rule, and a difficulty band.
const GAPS = [
  { s: "The dog ___ in the garden every morning.", ok: "runs", bad: ["run", "running", "runned"], rule: "singular subject takes a singular verb", band: 1 },
  { s: "She ___ to school yesterday.", ok: "walked", bad: ["walk", "walks", "walking"], rule: "past tense for a finished past action", band: 1 },
  { s: "There ___ three apples on the table.", ok: "are", bad: ["is", "was", "be"], rule: "plural subject takes a plural verb", band: 2 },
  { s: "He has ___ his homework already.", ok: "done", bad: ["did", "do", "doing"], rule: "‘has’ + past participle", band: 2 },
  { s: "I have ___ books than my brother.", ok: "fewer", bad: ["less", "lesser", "few"], rule: "‘fewer’ for things you can count", band: 3 },
  { s: "Neither of the boys ___ ready.", ok: "is", bad: ["are", "were", "be"], rule: "‘neither’ is singular", band: 4 },
  { s: "If I ___ rich, I would travel the world.", ok: "were", bad: ["was", "am", "be"], rule: "subjunctive ‘were’ for a hypothetical", band: 5 },
  { s: "The team ___ celebrating its victory.", ok: "is", bad: ["are", "be", "been"], rule: "a collective noun acting as one unit is singular", band: 5 },
  { s: "To ___ should I address this letter?", ok: "whom", bad: ["who", "which", "whose"], rule: "‘whom’ as the object of a preposition", band: 6 },
  { s: "She did ___ in the exam.", ok: "well", bad: ["good", "best", "gooder"], rule: "‘well’ is the adverb of ‘good’", band: 3 },
  { s: "A ___ is needed for the science lesson.", ok: "ruler", bad: ["an ruler", "rulers is", "the rulers"], rule: "‘a’ before a consonant sound; singular agreement", band: 2 },
  { s: "They ___ finished before the bell rang.", ok: "had", bad: ["have", "has", "having"], rule: "past perfect for the earlier of two past events", band: 4 },
];

const SENTENCES = [
  { ok: "She and I went to the park.", bad: ["Her and me went to the park.", "Me and her went to the park.", "She and me went to the park."], band: 3 },
  { ok: "Each pupil has a locker.", bad: ["Each pupil have a locker.", "Each pupils has a locker.", "Each pupil having a locker."], band: 2 },
  { ok: "I haven’t seen anything.", bad: ["I haven’t seen nothing.", "I ain’t seen nothing.", "I haven’t saw nothing."], band: 4 },
  { ok: "The books are on the shelf.", bad: ["The books is on the shelf.", "The book are on the shelf.", "The books be on the shelf."], band: 1 },
  { ok: "He could have won the race.", bad: ["He could of won the race.", "He could have win the race.", "He could of win the race."], band: 5 },
];

const templates = [
  { id: "gap-fill", min: 1, max: 6, fn(level, rng) {
    const g = byBand(rng, GAPS, level);
    return q({ rng, topicId: "en-grammar", level,
      promptHTML: `Choose the word that makes this correct:<br><b>${g.s.replace("___", "______")}</b>`,
      correctText: g.ok,
      distractors: g.bad.slice(0, 3).map((w, i) => ({
        text: w, id: "gr_gap" + i,
        fb: `Rule: ${g.rule}. The answer is “${g.ok}”.`,
      })),
      explanation: `“${g.ok}” is correct — ${g.rule}.`,
      keyConcept: "Match the verb/word to the subject and the tense." });
  } },

  { id: "pick-correct-sentence", min: 2, max: 6, fn(level, rng) {
    const e = byBand(rng, SENTENCES, level);
    return q({ rng, topicId: "en-grammar", level,
      promptHTML: `Which sentence is <b>grammatically correct</b>?`,
      correctText: e.ok,
      distractors: e.bad.slice(0, 3).map((w, i) => ({
        text: w, id: "gr_sent" + i,
        fb: `The correct sentence is: “${e.ok}”.`,
      })),
      explanation: `“${e.ok}” uses correct grammar.`,
      keyConcept: "Read each option aloud and check subject, verb and pronouns." });
  } },
];

export default makeGenerator("enGrammar", "en-grammar", templates);
