// English — Punctuation. Auto-markable MCQ: pick the correctly punctuated
// sentence, or choose the punctuation mark that belongs in the gap.
import { q, makeGenerator } from "./_shared.js";
import { byBand } from "./_words.js";

const SENTENCES = [
  { ok: "Where are you going?", bad: ["Where are you going.", "where are you going?", "Where are you going!"], why: "a question ends with a question mark and starts with a capital", band: 1 },
  { ok: "I bought apples, pears and milk.", bad: ["I bought apples pears and milk.", "I bought apples, pears and milk", "i bought apples, pears and milk."], why: "items in a list are separated by commas", band: 2 },
  { ok: "“Stop!” shouted the guard.", bad: ["“Stop!” shouted the guard", "Stop! shouted the guard.", "“Stop! ”shouted the guard."], why: "speech is enclosed in inverted commas", band: 3 },
  { ok: "It’s raining, so take an umbrella.", bad: ["Its raining, so take an umbrella.", "It’s raining so take an umbrella.", "It’s raining, so take an umbrella"], why: "“it’s” = it is; a comma joins the two clauses", band: 4 },
  { ok: "The dog, which was muddy, ran inside.", bad: ["The dog which was muddy ran inside.", "The dog, which was muddy ran inside.", "The dog which was muddy, ran inside."], why: "a non-essential clause is set off by a pair of commas", band: 5 },
  { ok: "She had one goal: to win.", bad: ["She had one goal; to win.", "She had one goal, to win.", "She had one goal to win."], why: "a colon introduces an explanation", band: 6 },
  { ok: "My sister’s book is here.", bad: ["My sisters book is here.", "My sisters’ book is here.", "My sister’s book is here"], why: "an apostrophe shows singular possession", band: 4 },
];

const GAPS = [
  { s: "She asked, \"Are you coming__\"", ok: "?", bad: [".", "!", ","], why: "the quoted words form a question", band: 2 },
  { s: "We need eggs__ flour and sugar.", ok: ",", bad: [".", ";", ":"], why: "a comma separates list items", band: 1 },
  { s: "He shouted, \"Look out__\"", ok: "!", bad: [".", "?", ","], why: "an exclamation shows strong feeling", band: 2 },
  { s: "There was only one option__ run.", ok: ":", bad: [";", ",", "."], why: "a colon introduces what follows", band: 5 },
  { s: "It was late__ however, we kept working.", ok: ";", bad: [",", ":", "."], why: "a semicolon links two related clauses before ‘however’", band: 6 },
];

const templates = [
  { id: "pick-correct-sentence", min: 1, max: 6, fn(level, rng) {
    const e = byBand(rng, SENTENCES, level);
    return q({ rng, topicId: "en-punctuation", level,
      promptHTML: `Which sentence is <b>correctly punctuated</b>?`,
      correctText: e.ok,
      distractors: e.bad.slice(0, 3).map((w, i) => ({
        text: w, id: "pn_sent" + i,
        fb: `Correct: “${e.ok}” — ${e.why}.`,
      })),
      explanation: `“${e.ok}” is right because ${e.why}.`,
      keyConcept: "Capital letters, end marks, commas and apostrophes each have a job." });
  } },

  { id: "choose-the-mark", min: 2, max: 6, fn(level, rng) {
    const g = byBand(rng, GAPS, level);
    return q({ rng, topicId: "en-punctuation", level,
      promptHTML: `Which mark belongs in the gap?<br><b>${g.s.replace("__", " __ ")}</b>`,
      correctText: g.ok,
      distractors: g.bad.slice(0, 3).map((w, i) => ({
        text: w, id: "pn_mark" + i,
        fb: `Use “${g.ok}” — ${g.why}.`,
      })),
      explanation: `“${g.ok}” is correct because ${g.why}.`,
      keyConcept: "Pick the mark that matches the sentence's purpose." });
  } },
];

export default makeGenerator("enPunctuation", "en-punctuation", templates);
