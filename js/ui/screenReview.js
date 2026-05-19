// Smart review: re-tests the child's OWN past mistakes on a spaced
// (Leitner) schedule, and — when one misconception keeps recurring —
// offers a targeted fix-it mini-lesson followed by a short focused drill.
// Review answers are real graded practice (they help mastery), and each
// item's Leitner box is moved by THIS attempt's result.

import { h, button, clear, paywallCard } from "./components.js";
import { featureAllowed } from "../entitlement.js";
import { renderSolution, correctAnswerText } from "./screenQuiz.js";
import {
  getQuestion,
  getQuestionById,
  freshQuestionFromTemplate,
} from "../questionFactory.js";
import { recordResult, presentationLevel } from "../engine.js";
import {
  dueReviews,
  gradeReview,
  dominantMisconception,
  topicForMisconception,
} from "../review.js";
import { getFixit } from "../fixits.js";
import { topicById } from "../topics.js";
import { checkNumeric } from "../format.js";

export function renderReview(ctx) {
  const { state, mount } = ctx;
  if (!featureAllowed("review")) {
    clear(mount);
    mount.appendChild(
      paywallCard(
        "Smart review is premium",
        "Spaced re-testing of your child's own mistakes and the fix-it mini-lessons are part of full access."
      )
    );
    return;
  }
  const who = ((state.profile && state.profile.childName) || "").trim();

  // Ask one graded question; report correctness to `done(correct)`.
  // `extra.meta` is a small progress label; `extra.originalQid` (optional)
  // adds a button to reveal the exact question that was first missed.
  function askGraded(q, extra, done) {
    clear(mount);
    const t = topicById(q.topicId);
    const startedAt = Date.now();
    const card = h("div", { class: "card" }, [
      h("div", { class: "quiz-meta" }, [
        h("span", {
          html: `<b>${t ? t.name : q.topicId}</b> · Level ${q.level}`,
        }),
        h("span", { class: "muted", text: (extra && extra.meta) || "" }),
      ]),
      h("div", { class: "question", html: q.promptHTML }),
    ]);

    function grade(chosen) {
      const correct = !!chosen.correct;
      const timeMs = Date.now() - startedAt;
      if (q.type === "mcq") {
        const btns = mount.querySelectorAll(".choice");
        q.choices.forEach((c, k) => {
          btns[k].setAttribute("disabled", "true");
          if (c.correct) btns[k].classList.add("correct");
          else if (c === chosen) btns[k].classList.add("wrong");
        });
      } else {
        mount
          .querySelectorAll(".numeric-entry input, .numeric-entry button")
          .forEach((n) => n.setAttribute("disabled", "true"));
      }
      const correctText = correctAnswerText(q);
      recordResult(state, q.topicId, {
        correct,
        level: q.level,
        timeMs,
        qid: q.id,
        seed: q.seed ?? null,
        templateId: q.templateId ?? null,
        chosenText: chosen.text ?? null,
        chosenKey: chosen.key ?? null,
        correctText,
        misconceptionId: chosen.misconceptionId ?? null,
        source: "review",
      });
      ctx.save();

      const fb = h("div", { class: "feedback " + (correct ? "good" : "bad") });
      fb.appendChild(
        h("h3", { text: correct ? "Correct! 🎉" : "Not quite — here's why." })
      );
      if (!correct) {
        const why =
          chosen.misconceptionId && q.misconceptions
            ? q.misconceptions[chosen.misconceptionId]
            : null;
        if (why) fb.appendChild(h("p", { class: "why", text: why }));
        renderSolution(q, correctText).forEach((n) => fb.appendChild(n));
      } else if (q.keyConcept) {
        fb.appendChild(
          h("div", { class: "concept", html: "💡 " + q.keyConcept })
        );
      }

      const row = h("div", { class: "btn-row" });
      if (extra && extra.originalQid && extra.originalQid !== q.id) {
        let shown = false;
        row.appendChild(
          button(
            "See the exact question missed",
            (e) => {
              if (shown) return;
              shown = true;
              e.target.setAttribute("disabled", "true");
              const orig = getQuestionById(extra.originalQid);
              if (!orig) return;
              const oc = h("div", { class: "card" }, [
                h("p", {
                  class: "muted",
                  text: "The original question that was got wrong:",
                }),
                h("div", { class: "question", html: orig.promptHTML }),
              ]);
              const sol = h("div", { class: "feedback good" });
              renderSolution(orig).forEach((n) => sol.appendChild(n));
              oc.appendChild(sol);
              mount.appendChild(oc);
            },
            "btn secondary"
          )
        );
      }
      row.appendChild(button("Continue ▶", () => done(correct)));
      fb.appendChild(row);
      const onKey = (e) => {
        if (e.key === "Enter") {
          document.removeEventListener("keydown", onKey);
          done(correct);
        }
      };
      document.addEventListener("keydown", onKey);
      mount.appendChild(fb);
    }

    if (q.type === "mcq") {
      const wrap = h("div", { class: "choices" });
      for (const c of q.choices)
        wrap.appendChild(
          h("button", { class: "choice", onClick: () => grade(c) }, [
            h("span", { class: "key", text: c.key }),
            h("span", { html: c.text }),
          ])
        );
      card.appendChild(wrap);
    } else {
      const input = h("input", {
        type: "text",
        autocomplete: "off",
        placeholder: "Type your answer",
        "aria-label": "Your answer",
      });
      const submit = () => {
        if (input.value.trim() === "") return;
        grade({
          text: input.value,
          correct: checkNumeric(q.answer, input.value),
        });
      };
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") submit();
      });
      setTimeout(() => input.focus(), 30);
      card.appendChild(
        h("div", { class: "numeric-entry" }, [input, button("Check", submit)])
      );
    }
    mount.appendChild(card);
  }

  // ---- Review queue (spaced repetition of own mistakes) -----------------
  function startReview() {
    const queue = dueReviews(state);
    let i = 0;
    let reviewed = 0;
    let gotRight = 0;

    function summary() {
      clear(mount);
      mount.appendChild(
        h("div", { class: "card center" }, [
          h("h2", { text: "Review complete 👏" }),
          h("p", {
            class: "muted",
            text: `${reviewed} reviewed${
              reviewed ? ` · ${gotRight} correct` : ""
            }. Items answered right move further out; ones missed come back soon.`,
          }),
          h("div", { class: "btn-row", style: "justify-content:center" }, [
            button("Back to review", overview, "btn"),
            button("Home", () => ctx.navigate("home"), "btn secondary"),
          ]),
        ])
      );
    }

    function step() {
      if (i >= queue.length) return summary();
      const b = queue[i++];
      let q = b.templateId
        ? freshQuestionFromTemplate(b.topicId, b.level, b.templateId)
        : b.qid
        ? getQuestionById(b.qid)
        : null;
      if (!q) q = getQuestion(b.topicId, b.level || 3);
      if (!q) return step(); // unreproducible — skip
      askGraded(
        q,
        { meta: `Review ${i} of ${queue.length}`, originalQid: b.qid },
        (correct) => {
          reviewed++;
          if (correct) gotRight++;
          gradeReview(state, b.key, correct);
          ctx.save();
          step();
        }
      );
    }

    queue.length ? step() : summary();
  }

  // ---- Fix-it lesson + focused drill ------------------------------------
  function fixit(dom) {
    const drillTopic =
      topicForMisconception(state, dom.misconceptionId) ||
      state.lastTopicId ||
      null;
    const area = drillTopic ? topicById(drillTopic)?.area : null;
    const fx = getFixit(dom.misconceptionId, area);
    clear(mount);
    if (!fx) return overview();
    mount.appendChild(
      h("div", { class: "card" }, [
        h("h2", { text: "Fix-it: " + fx.title }),
        h("p", {
          class: "muted",
          text: `This idea has tripped ${who || "you"} up ${
            dom.count
          } times — let's nail it.`,
        }),
        h("div", { class: "concept", html: fx.explanationHTML }),
        fx.workedExample
          ? h("p", { html: "<b>Example:</b> " + fx.workedExample })
          : null,
        h("div", { class: "btn-row" }, [
          drillTopic
            ? button(
                "Practise this (5 questions) ▶",
                () => drill(drillTopic),
                "btn"
              )
            : null,
          button("Back", overview, "btn secondary"),
        ]),
      ])
    );
  }

  function drill(topicId) {
    let n = 0;
    let right = 0;
    const total = 5;
    function next() {
      if (n >= total) {
        clear(mount);
        mount.appendChild(
          h("div", { class: "card center" }, [
            h("h2", { text: "Nice focus 💪" }),
            h("p", {
              class: "muted",
              text: `${right}/${total} correct on that idea. It will keep coming back in review until it's secure.`,
            }),
            h("div", { class: "btn-row", style: "justify-content:center" }, [
              button("Back to review", overview, "btn"),
              button("Home", () => ctx.navigate("home"), "btn secondary"),
            ]),
          ])
        );
        return;
      }
      n++;
      const q = getQuestion(topicId, presentationLevel(state, topicId));
      askGraded(q, { meta: `Practice ${n} of ${total}` }, (correct) => {
        if (correct) right++;
        next();
      });
    }
    next();
  }

  // ---- Overview ---------------------------------------------------------
  function overview() {
    clear(mount);
    const due = dueReviews(state);
    const dom = dominantMisconception(state);

    mount.appendChild(
      h("div", { class: "card" }, [
        h("h1", { text: "Smart review" }),
        due.length
          ? h("p", {
              class: "muted",
              text: `${due.length} question${
                due.length === 1 ? "" : "s"
              } due — these re-test, with fresh numbers, the methods ${
                who || "you"
              } slipped on, spaced out so they actually stick.`,
            })
          : h("p", {
              class: "muted",
              text: "Nothing due right now. Anything got wrong in practice or a mock turns up here, then returns on a spaced schedule until it's secure.",
            }),
        h("div", { class: "btn-row" }, [
          due.length
            ? button("Start review ▶", startReview, "btn big")
            : button("Go practise", () => ctx.navigate("quiz"), "btn big"),
        ]),
      ])
    );

    if (dom) {
      const topic = topicForMisconception(state, dom.misconceptionId);
      const fx =
        getFixit(
          dom.misconceptionId,
          topic ? topicById(topic)?.area : null
        ) || {};
      mount.appendChild(
        h("div", { class: "card" }, [
          h("div", { class: "feedback bad" }, [
            h("h3", { text: "One slip keeps coming back" }),
            h("p", {
              html: `${who || "You"} made the same kind of mistake <b>${
                dom.count
              }</b> times${
                fx.title ? ` — <b>${fx.title}</b>` : ""
              }. A two-minute fix-it plus a short drill clears it up.`,
            }),
            h("div", { class: "btn-row" }, [
              button("Fix it now ▶", () => fixit(dom), "btn"),
            ]),
          ]),
        ])
      );
    }
  }

  overview();
}
