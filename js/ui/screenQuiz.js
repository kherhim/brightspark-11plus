import { h, button, levelDots, clear, paywallCard } from "./components.js";
import { TOPICS, topicById } from "../topics.js";
import {
  fullAccess,
  subjectAllowed,
  freeTopicIds,
  dailyCapReached,
} from "../entitlement.js";
import { ensureTopic } from "../store.js";
import { selectTopic, presentationLevel, recordResult } from "../engine.js";
import { getQuestion } from "../questionFactory.js";
import { makeRng, freshSeed } from "../rng.js";
import { checkNumeric } from "../format.js";
import { correctAnswerText } from "../answers.js";

export { correctAnswerText };

// The teaching block for a question: correct answer, explanation, worked
// solution and key idea. Shared by the quiz feedback and the mock report
// so both show identical solutions. Returns an array of DOM nodes.
export function renderSolution(q, correctText) {
  if (correctText == null) correctText = correctAnswerText(q);
  const nodes = [
    h("p", { html: `The correct answer is <b>${correctText}</b>.` }),
  ];
  if (q.explanation) nodes.push(h("p", { text: q.explanation }));
  if (q.workedSteps && q.workedSteps.length) {
    nodes.push(
      h("div", {}, [
        h("b", { text: "Worked solution:" }),
        h(
          "ol",
          { class: "steps" },
          q.workedSteps.map((s) => h("li", { html: s }))
        ),
      ])
    );
  }
  if (q.keyConcept)
    nodes.push(
      h("div", { class: "concept", html: "💡 Key idea: " + q.keyConcept })
    );
  return nodes;
}

export function renderQuiz(ctx, params) {
  const { state, mount } = ctx;
  const practiceTopic = params && params[0] ? params[0] : null;

  if (practiceTopic) {
    const ptSubject = (topicById(practiceTopic) || {}).subject;
    if (!subjectAllowed(ptSubject)) {
      clear(mount);
      mount.appendChild(
        paywallCard(
          "This subject is premium",
          "Maths is free to practise. Verbal & Non-Verbal Reasoning and English are part of full access."
        )
      );
      return;
    }
  }

  let sessionCount = 0;
  let sessionCorrect = 0;
  let current = null; // { question, topicId, level, startedAt, graded }

  function pickTopic() {
    if (practiceTopic) return practiceTopic;
    const pool = fullAccess() ? null : freeTopicIds(TOPICS);
    return selectTopic(state, makeRng(freshSeed()), Date.now(), pool);
  }

  function nextQuestion(opts = {}) {
    if (dailyCapReached(state)) {
      clear(mount);
      mount.appendChild(
        paywallCard(
          "That's today's free questions",
          "Free practice is capped each day. Full access removes the cap and unlocks all four subjects, mocks, smart review, analytics and worksheets."
        )
      );
      return;
    }
    const topicId = opts.topicId || pickTopic();
    const level =
      opts.level != null ? opts.level : presentationLevel(state, topicId);
    const question = getQuestion(topicId, level);
    current = {
      question,
      topicId,
      level,
      startedAt: Date.now(),
      graded: opts.graded !== false,
    };
    draw();
  }

  function draw() {
    clear(mount);
    const t = topicById(current.topicId);
    const q = current.question;

    const meta = h("div", { class: "quiz-meta" }, [
      h("span", {
        html: `<b>${t ? t.name : current.topicId}</b> · Level ${current.level}/6${
          current.graded ? "" : " · easier practice"
        }`,
      }),
      h("span", {
        text: practiceTopic
          ? `${sessionCount} done`
          : `${sessionCorrect}/${sessionCount} this session`,
      }),
    ]);

    const card = h("div", { class: "card" }, [
      meta,
      h("div", { class: "question", html: q.promptHTML }),
    ]);

    if (q.type === "mcq") card.appendChild(drawChoices(q));
    else card.appendChild(drawNumeric(q));

    mount.appendChild(card);
    mount.appendChild(
      h("div", { class: "quiz-meta" }, [
        levelDots(ensureTopic(state, current.topicId).level),
        button("Quit to home", () => ctx.navigate("home"), "btn secondary"),
      ])
    );
  }

  function drawChoices(q) {
    const wrap = h("div", { class: "choices" });
    for (const c of q.choices) {
      wrap.appendChild(
        h(
          "button",
          { class: "choice", onClick: () => answer(c) },
          [
            h("span", { class: "key", text: c.key }),
            h("span", { html: c.text }),
          ]
        )
      );
    }
    return wrap;
  }

  function drawNumeric(q) {
    const input = h("input", {
      type: "text",
      inputmode: "text",
      autocomplete: "off",
      placeholder: "Type your answer",
      "aria-label": "Your answer",
    });
    const submit = () => {
      if (input.value.trim() === "") return;
      answer({ text: input.value, correct: checkNumeric(q.answer, input.value) });
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
    setTimeout(() => input.focus(), 30);
    return h("div", { class: "numeric-entry" }, [
      input,
      button("Check", submit, "btn"),
    ]);
  }

  function answer(chosen) {
    const q = current.question;
    const correct = !!chosen.correct;
    const timeMs = Date.now() - current.startedAt;
    sessionCount++;
    if (correct) sessionCorrect++;

    // Lock the question UI and show which was right/wrong.
    if (q.type === "mcq") {
      const btns = mount.querySelectorAll(".choice");
      q.choices.forEach((c, i) => {
        btns[i].setAttribute("disabled", "true");
        if (c.correct) btns[i].classList.add("correct");
        else if (c === chosen) btns[i].classList.add("wrong");
      });
    } else {
      mount
        .querySelectorAll(".numeric-entry input, .numeric-entry button")
        .forEach((n) => n.setAttribute("disabled", "true"));
    }

    const correctText = correctAnswerText(q);

    if (current.graded) {
      recordResult(state, current.topicId, {
        correct,
        level: current.level,
        timeMs,
        qid: q.id,
        seed: q.seed ?? null,
        templateId: q.templateId ?? null,
        chosenText: chosen.text ?? null,
        chosenKey: chosen.key ?? null,
        correctText,
        misconceptionId: chosen.misconceptionId ?? null,
      });
      ctx.save();
    }

    mount.appendChild(buildFeedback(q, chosen, correct, correctText));
  }

  function buildFeedback(q, chosen, correct, correctText) {
    const fb = h("div", { class: "feedback " + (correct ? "good" : "bad") });

    if (correct) {
      fb.appendChild(h("h3", { text: pick(PRAISE) }));
      if (q.keyConcept)
        fb.appendChild(h("div", { class: "concept", html: "💡 " + q.keyConcept }));
    } else {
      fb.appendChild(h("h3", { text: "Not quite — let's see why." }));
      const why =
        chosen.misconceptionId && q.misconceptions
          ? q.misconceptions[chosen.misconceptionId]
          : null;
      if (why) fb.appendChild(h("p", { class: "why", text: why }));
      renderSolution(q, correctText).forEach((n) => fb.appendChild(n));
    }

    const row = h("div", { class: "btn-row" });
    row.appendChild(
      button(correct ? "Next ▶" : "Next question ▶", () => nextQuestion(), "btn")
    );
    if (!correct && current.graded && current.level > 1) {
      row.appendChild(
        button(
          "Try an easier one",
          () =>
            nextQuestion({
              topicId: current.topicId,
              level: Math.max(1, current.level - 1),
              graded: false,
            }),
          "btn secondary"
        )
      );
    }
    if (!current.graded) {
      row.appendChild(
        button(
          "Back to scored practice",
          () => nextQuestion(),
          "btn secondary"
        )
      );
    }
    fb.appendChild(row);

    // Let Enter advance to the next question.
    const onKey = (e) => {
      if (e.key === "Enter") {
        document.removeEventListener("keydown", onKey);
        nextQuestion();
      }
    };
    document.addEventListener("keydown", onKey);
    return fb;
  }

  const PRAISE = [
    "Correct! 🎉",
    "Nice work! ✅",
    "Spot on! 🌟",
    "Brilliant! 👏",
    "You've got it! 💪",
  ];
  function pick(a) {
    return a[Math.floor(Math.random() * a.length)];
  }

  nextQuestion();
}
