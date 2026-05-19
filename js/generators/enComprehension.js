// English — Reading Comprehension. A short passage plus an auto-markable
// MCQ (literal recall, inference or vocabulary-in-context). Passages are a
// hand-written bank, banded by level; the question is picked by seed so
// the same passage re-tests different skills without being memorisable.
import { q, makeGenerator } from "./_shared.js";
import { byBand } from "./_words.js";

const PASSAGES = [
  {
    band: 1,
    text:
      "Tom woke early on Saturday. He pulled on his boots, grabbed a net, " +
      "and ran down to the pond at the end of the lane. The water was " +
      "still and grey. By lunchtime he had caught three small fish, but " +
      "he gently returned every one of them to the water before walking " +
      "home for his sandwiches.",
    qs: [
      { qHTML: "What day was it?", ok: "Saturday",
        bad: ["Sunday", "Monday", "Friday"] },
      { qHTML: "What did Tom do with the fish he caught?",
        ok: "He put them back in the water",
        bad: ["He took them home", "He gave them away", "He cooked them"] },
      { qHTML: "The word <b>still</b> in “the water was still” means:",
        ok: "not moving", bad: ["dirty", "deep", "cold"] },
    ],
  },
  {
    band: 2,
    text:
      "Mrs Akiyama’s class was building a model volcano. Priya mixed the " +
      "vinegar while Daniel shaped the clay slopes. When they finally " +
      "added the baking soda, a fizzing orange foam spilled over the " +
      "edge and across the newspaper. Everyone cheered — except Daniel, " +
      "who had forgotten to move his pencil case off the table.",
    qs: [
      { qHTML: "Who shaped the clay slopes?", ok: "Daniel",
        bad: ["Priya", "Mrs Akiyama", "Tom"] },
      { qHTML: "Why was Daniel probably not cheering?",
        ok: "His pencil case got covered in foam",
        bad: ["He disliked the experiment", "He was sent out",
          "He had broken the model"] },
      { qHTML: "What caused the foam?",
        ok: "Mixing baking soda with vinegar",
        bad: ["Heating the clay", "Adding water", "Shaking the bottle"] },
    ],
  },
  {
    band: 3,
    text:
      "The lighthouse had not been used for thirty years, yet every " +
      "evening old Captain Reyes climbed its rusted stairs and polished " +
      "the great glass lens. Sailors no longer needed its beam — modern " +
      "ships steered by satellites — but the captain said a habit kept " +
      "for a lifetime was not so easily put down.",
    qs: [
      { qHTML: "How long had the lighthouse been unused?",
        ok: "Thirty years", bad: ["Thirteen years", "Three years",
          "A lifetime"] },
      { qHTML: "Why do modern ships no longer need the beam?",
        ok: "They navigate using satellites",
        bad: ["The lighthouse is broken", "They sail in daylight",
          "The captain retired"] },
      { qHTML: "What does the captain’s behaviour mainly show?",
        ok: "He is devoted to an old routine",
        bad: ["He is afraid of the dark", "He dislikes sailors",
          "He wants the lighthouse reopened"] },
    ],
  },
  {
    band: 4,
    text:
      "Although the festival was advertised as the largest in the " +
      "county, the rain was relentless and barely a hundred visitors " +
      "ventured through the gates. The organisers, undaunted, moved the " +
      "stalls beneath the cattle sheds and lit braziers along the muddy " +
      "paths. By dusk the smell of roasting chestnuts had drawn a " +
      "cheerful, if soggy, crowd after all.",
    qs: [
      { qHTML: "What does <b>relentless</b> suggest about the rain?",
        ok: "It did not stop", bad: ["It was light", "It was warm",
          "It came and went"] },
      { qHTML: "How did the organisers respond to the weather?",
        ok: "They adapted by moving stalls under cover",
        bad: ["They cancelled the festival", "They blamed the visitors",
          "They waited for it to clear"] },
      { qHTML: "The word <b>undaunted</b> tells us the organisers were:",
        ok: "not discouraged", bad: ["exhausted", "confused",
          "delighted"] },
    ],
  },
  {
    band: 5,
    text:
      "Marisol distrusted the new clock from the moment it arrived. It " +
      "kept perfect time, yet its ticking seemed to pause whenever she " +
      "entered the room, as though it were listening. Her brother " +
      "laughed and called it imagination, but he had not noticed, as " +
      "she had, that the hands always pointed to midnight when no one " +
      "was watching.",
    qs: [
      { qHTML: "Why did Marisol distrust the clock?",
        ok: "It behaved strangely when she was near",
        bad: ["It kept poor time", "It was a gift from her brother",
          "It was very old"] },
      { qHTML: "What is the brother’s attitude?",
        ok: "Dismissive — he thinks she is imagining it",
        bad: ["Frightened", "Curious and investigating", "Angry with her"] },
      { qHTML: "The passage mainly creates a mood of:",
        ok: "unease", bad: ["joy", "boredom", "relief"] },
    ],
  },
  {
    band: 6,
    text:
      "Economists once assumed that people always act in their own " +
      "rational self-interest. Recent studies, however, reveal a more " +
      "tangled picture: shoppers will travel across town to save a " +
      "small sum on a cheap item, yet ignore the same saving on an " +
      "expensive one. Such inconsistencies, far from being trivial, " +
      "have reshaped how economists model everyday decisions.",
    qs: [
      { qHTML: "What did economists once assume?",
        ok: "People always act in rational self-interest",
        bad: ["People never save money",
          "Shoppers prefer expensive items",
          "Decisions cannot be modelled"] },
      { qHTML: "The shopper example is used to show that behaviour is:",
        ok: "inconsistent", bad: ["predictable", "selfless",
          "rational"] },
      { qHTML: "What does the passage say these inconsistencies have done?",
        ok: "Reshaped how economists model decisions",
        bad: ["Proved the old theory", "Had no real effect",
          "Reduced shopping"] },
    ],
  },
];

const templates = [
  { id: "passage-question", min: 1, max: 6, fn(level, rng) {
    const p = byBand(rng, PASSAGES, level);
    const item = rng.pick(p.qs);
    return q({ rng, topicId: "en-comprehension", level,
      promptHTML:
        `<div class="passage">${p.text}</div>` +
        `<p><b>${item.qHTML}</b></p>`,
      correctText: item.ok,
      distractors: item.bad.slice(0, 3).map((w, i) => ({
        text: w, id: "cm_q" + i,
        fb: `Re-read the passage: the answer is “${item.ok}”.`,
      })),
      explanation: `The passage supports “${item.ok}”.`,
      keyConcept: "Find the part of the text that proves your answer." });
  } },
];

export default makeGenerator("enComprehension", "en-comprehension", templates);
