// Timed mock-exam mode. A fixed-length, mixed-topic paper at the child's
// working level, with a countdown and NO feedback during the test. On
// submit it writes one mock record (muted into progress — never moves the
// practice ladder) and shows a results report with every worked solution.

import { h, button, clear, levelDots } from "./components.js";
import { renderSolution, correctAnswerText } from "./screenQuiz.js";
import { getQuestion } from "../questionFactory.js";
import { recordMockOutcome, presentationLevel } from "../engine.js";
import { makeRng, freshSeed } from "../rng.js";
import { checkNumeric, fmtDuration } from "../format.js";
import {
  TOPICS,
  topicById,
  topicsBySubject,
  activeSubjects,
} from "../topics.js";
import { randomId } from "../store.js";
import { scoreBand } from "../analytics.js";

const LENGTHS = [10, 20, 30];
let mockTimer = null; // module-level so a stale timer is always cleared

export function renderMock(ctx, params) {
  const { state, mount } = ctx;
  const who = (state.profile && state.profile.childName || "").trim();
  if (mockTimer) {
    clearInterval(mockTimer);
    mockTimer = null;
  }

  const subjects = activeSubjects();
  const deep = params && params[0] ? params[0] : null;

  const cfg = {
    subject:
      deep && (deep === "mixed" || subjects.some((s) => s.id === deep))
        ? deep
        : subjects.length > 1
        ? "mixed"
        : subjects[0].id,
    length: 20,
    timed: true,
  };

  let items = null; // built paper
  let idx = 0;

  // ---- Setup ------------------------------------------------------------
  function drawSetup() {
    clear(mount);
    const opts = subjects.map((s) => s.id);
    const choices = (subjects.length > 1 ? ["mixed"] : []).concat(opts);

    const subjRow = h(
      "div",
      { class: "btn-row" },
      choices.map((sid) =>
        button(
          sid === "mixed"
            ? "Mixed"
            : subjects.find((s) => s.id === sid).name,
          () => {
            cfg.subject = sid;
            drawSetup();
          },
          "btn " + (cfg.subject === sid ? "" : "secondary")
        )
      )
    );

    const lenRow = h(
      "div",
      { class: "btn-row" },
      LENGTHS.map((n) =>
        button(
          `${n} questions`,
          () => {
            cfg.length = n;
            drawSetup();
          },
          "btn " + (cfg.length === n ? "" : "secondary")
        )
      )
    );

    const timeRow = h("div", { class: "btn-row" }, [
      button(
        "Timed (1 min / question)",
        () => {
          cfg.timed = true;
          drawSetup();
        },
        "btn " + (cfg.timed ? "" : "secondary")
      ),
      button(
        "Untimed",
        () => {
          cfg.timed = false;
          drawSetup();
        },
        "btn " + (cfg.timed ? "secondary" : "")
      ),
    ]);

    mount.appendChild(
      h("div", { class: "card" }, [
        h("h2", { text: "Mock exam" }),
        h("p", {
          class: "muted",
          text: `A timed paper at ${
            who ? who + "’s" : "the"
          } current working level. No hints or answers until the end — then a full mark-up with worked solutions. A mock informs progress but never changes practice difficulty.`,
        }),
        h("h3", { text: "Subject" }),
        subjRow,
        h("h3", { text: "Length" }),
        lenRow,
        h("h3", { text: "Timing" }),
        timeRow,
        h("div", { class: "btn-row", style: "margin-top:18px" }, [
          button("Start mock ▶", startPaper, "btn"),
          button("Back to home", () => ctx.navigate("home"), "btn secondary"),
        ]),
      ])
    );
  }

  // ---- Build the paper --------------------------------------------------
  function startPaper() {
    const rng = makeRng(freshSeed());
    let poolIds =
      cfg.subject === "mixed"
        ? TOPICS.map((t) => t.id)
        : topicsBySubject(cfg.subject).map((t) => t.id);
    if (!poolIds.length) poolIds = TOPICS.map((t) => t.id);
    const order = rng.shuffle(poolIds.slice());

    items = [];
    for (let i = 0; i < cfg.length; i++) {
      const topicId = order[i % order.length];
      const level = presentationLevel(state, topicId);
      const seed = freshSeed();
      const q = getQuestion(topicId, level, seed);
      items.push({
        q,
        topicId,
        level,
        qid: q.id,
        seed: q.seed ?? seed,
        templateId: q.templateId ?? null,
        source: q.source,
        chosen: null, // mcq: the chosen choice object
        raw: "", // numeric: typed text
        flagged: false,
        timeMs: 0,
        shownAt: 0,
      });
    }
    idx = 0;
    startTimer();
    drawRunner();
  }

  // ---- Timer ------------------------------------------------------------
  let remaining = 0;
  function startTimer() {
    if (!cfg.timed) return;
    remaining = cfg.length * 60;
    mockTimer = setInterval(() => {
      remaining -= 1;
      const el = document.getElementById("mock-timer");
      if (el) el.textContent = clock(remaining);
      if (remaining <= 0) {
        clearInterval(mockTimer);
        mockTimer = null;
        finish();
      }
    }, 1000);
  }
  function clock(s) {
    s = Math.max(0, s);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, "0")}`;
  }

  function accumulateTime() {
    const it = items[idx];
    if (it && it.shownAt) {
      it.timeMs += Date.now() - it.shownAt;
      it.shownAt = 0;
    }
  }
  function go(to) {
    accumulateTime();
    idx = Math.max(0, Math.min(items.length - 1, to));
    drawRunner();
  }

  // ---- Runner -----------------------------------------------------------
  function drawRunner() {
    clear(mount);
    const it = items[idx];
    const q = it.q;
    it.shownAt = Date.now();

    const meta = h("div", { class: "quiz-meta" }, [
      h("span", { html: `<b>Question ${idx + 1}</b> of ${items.length}` }),
      h("span", {
        id: "mock-timer",
        text: cfg.timed ? clock(remaining) : "untimed",
      }),
    ]);

    const card = h("div", { class: "card" }, [
      meta,
      h("div", { class: "question", html: q.promptHTML }),
    ]);

    if (q.type === "mcq") {
      const wrap = h("div", { class: "choices" });
      for (const c of q.choices) {
        const b = h(
          "button",
          {
            class:
              "choice" + (it.chosen && it.chosen.key === c.key ? " picked" : ""),
            onClick: () => {
              it.chosen = c;
              drawRunner();
            },
          },
          [h("span", { class: "key", text: c.key }), h("span", { html: c.text })]
        );
        wrap.appendChild(b);
      }
      card.appendChild(wrap);
    } else {
      const input = h("input", {
        type: "text",
        inputmode: "text",
        autocomplete: "off",
        placeholder: "Type your answer",
        "aria-label": "Your answer",
        value: it.raw || "",
      });
      input.addEventListener("input", () => {
        it.raw = input.value;
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && idx < items.length - 1) go(idx + 1);
      });
      setTimeout(() => input.focus(), 30);
      card.appendChild(h("div", { class: "numeric-entry" }, [input]));
    }

    mount.appendChild(card);

    const nav = h("div", { class: "btn-row" }, [
      button("◀ Prev", () => go(idx - 1), "btn secondary"),
      button(
        it.flagged ? "🚩 Flagged" : "Flag for review",
        () => {
          it.flagged = !it.flagged;
          drawRunner();
        },
        "btn secondary"
      ),
      idx < items.length - 1
        ? button("Next ▶", () => go(idx + 1), "btn")
        : button("Finish & mark ✓", confirmFinish, "btn"),
    ]);
    mount.appendChild(nav);

    const answered = items.filter(
      (x) => (x.q.type === "mcq" ? x.chosen : x.raw && x.raw.trim())
    ).length;
    mount.appendChild(
      h("div", { class: "quiz-meta" }, [
        h("span", {
          class: "muted",
          text: `${answered}/${items.length} answered · ${
            items.filter((x) => x.flagged).length
          } flagged`,
        }),
        button(
          "Submit now",
          confirmFinish,
          "btn secondary"
        ),
      ])
    );
  }

  function confirmFinish() {
    const answered = items.filter(
      (x) => (x.q.type === "mcq" ? x.chosen : x.raw && x.raw.trim())
    ).length;
    if (
      answered < items.length &&
      !window.confirm(
        `You've answered ${answered} of ${items.length}. Submit and mark the paper now?`
      )
    )
      return;
    finish();
  }

  // ---- Mark & report ----------------------------------------------------
  function finish() {
    if (mockTimer) {
      clearInterval(mockTimer);
      mockTimer = null;
    }
    accumulateTime();

    const recItems = items.map((it) => {
      const q = it.q;
      const correctText = correctAnswerText(q);
      let correct = false;
      let chosenText = null;
      let chosenKey = null;
      let misconceptionId = null;
      if (q.type === "mcq") {
        if (it.chosen) {
          correct = !!it.chosen.correct;
          chosenText = it.chosen.text;
          chosenKey = it.chosen.key;
          misconceptionId = it.chosen.misconceptionId || null;
        }
      } else {
        chosenText = it.raw && it.raw.trim() ? it.raw.trim() : null;
        correct = chosenText ? checkNumeric(q.answer, chosenText) : false;
      }
      return {
        topicId: it.topicId,
        level: it.level,
        seed: it.seed,
        templateId: it.templateId,
        source: it.source,
        qid: it.qid,
        chosenKey,
        chosenText,
        correctText,
        misconceptionId,
        correct,
        timeMs: it.timeMs,
      };
    });

    const scoreCorrect = recItems.filter((r) => r.correct).length;
    const scoreTotal = recItems.length;
    const secMap = {};
    for (const r of recItems) {
      const s = (secMap[r.topicId] = secMap[r.topicId] || {
        topicId: r.topicId,
        correct: 0,
        total: 0,
      });
      s.total += 1;
      if (r.correct) s.correct += 1;
    }
    const durationMs = recItems.reduce((a, r) => a + (r.timeMs || 0), 0);
    const b = scoreBand(scoreTotal ? scoreCorrect / scoreTotal : 0);

    const record = {
      id: randomId(),
      at: Date.now(),
      subject: cfg.subject,
      lengthQ: scoreTotal,
      timed: cfg.timed,
      durationMs,
      scoreCorrect,
      scoreTotal,
      band: b.label,
      sections: Object.values(secMap),
      items: recItems,
    };

    recordMockOutcome(state, record);
    ctx.save();
    drawReport(record, b);
  }

  function drawReport(record, b) {
    clear(mount);
    const pct = record.scoreTotal
      ? Math.round((record.scoreCorrect / record.scoreTotal) * 100)
      : 0;

    mount.appendChild(
      h("div", { class: "card" }, [
        h("h2", { text: "Mock results" }),
        h("div", { class: "feedback " + b.cls }, [
          h("h3", {
            text: `${record.scoreCorrect} / ${record.scoreTotal}  (${pct}%) — ${b.label}`,
          }),
          h("p", {
            class: "muted",
            text: `Time taken ${fmtDuration(record.durationMs)}${
              record.timed ? "" : " (untimed)"
            }. This result informs ${
              who ? who + "’s" : "the child’s"
            } readiness but did not change any practice levels.`,
          }),
        ]),
        h("h3", { text: "By topic" }),
        h(
          "table",
          { class: "dash" },
          [
            h("tr", {}, [
              h("th", { text: "Topic" }),
              h("th", { text: "Score" }),
            ]),
          ].concat(
            record.sections.map((s) => {
              const t = topicById(s.topicId);
              return h("tr", {}, [
                h("td", { text: t ? t.name : s.topicId }),
                h("td", { text: `${s.correct}/${s.total}` }),
              ]);
            })
          )
        ),
        h("div", { class: "btn-row", style: "margin-top:16px" }, [
          button("New mock", drawSetup, "btn"),
          button("Back to home", () => ctx.navigate("home"), "btn secondary"),
        ]),
      ])
    );

    mount.appendChild(h("h2", { text: "Every question, worked through" }));
    record.items.forEach((r, i) => {
      const it = items[i];
      const q = it.q;
      const ok = r.correct;
      const card = h("div", { class: "card" }, [
        h("div", { class: "quiz-meta" }, [
          h("span", {
            html: `<b>Q${i + 1}</b> · ${
              topicById(r.topicId)?.name || r.topicId
            } · Level ${r.level}`,
          }),
          h("span", {
            class:
              "badge " + (ok ? "good" : r.chosenText ? "bad" : "learning"),
            text: ok ? "✓ Correct" : r.chosenText ? "✗ Wrong" : "— Skipped",
          }),
        ]),
        h("div", { class: "question", html: q.promptHTML }),
        h("p", {
          class: "muted",
          text: r.chosenText
            ? `${who ? who + " answered" : "Answer given"}: ${r.chosenText}`
            : "Not answered.",
        }),
      ]);
      const sol = h("div", { class: "feedback " + (ok ? "good" : "bad") });
      renderSolution(q, r.correctText).forEach((n) => sol.appendChild(n));
      card.appendChild(sol);
      mount.appendChild(card);
    });
  }

  drawSetup();
}
