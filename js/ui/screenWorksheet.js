import { h, button, clear, paywallCard } from "./components.js";
import { featureAllowed } from "../entitlement.js";
import { activeSubjects, topicsBySubject, topicById } from "../topics.js";
import { buildWorksheet, worksheetBankInfo } from "../print.js";
import { freshSeed } from "../rng.js";

export function renderWorksheet(ctx) {
  const { state, mount } = ctx;
  if (!featureAllowed("worksheet")) {
    clear(mount);
    mount.appendChild(
      paywallCard(
        "Printable worksheets are premium",
        "Generating printable worksheets with answer keys is part of full access."
      )
    );
    return;
  }

  const subjects = activeSubjects();
  const cfg = {
    subject: subjects[0].id,
    topicId: topicsBySubject(subjects[0].id)[0].id,
    level: 3,
    count: 10,
    seed: freshSeed(),
  };

  function controls() {
    const subjRow = h(
      "div",
      { class: "btn-row" },
      subjects.map((s) =>
        button(
          s.name,
          () => {
            cfg.subject = s.id;
            cfg.topicId = topicsBySubject(s.id)[0].id;
            draw();
          },
          "btn " + (cfg.subject === s.id ? "" : "secondary")
        )
      )
    );

    const topicRow = h(
      "div",
      { class: "btn-row" },
      topicsBySubject(cfg.subject).map((t) =>
        button(
          t.name,
          () => {
            cfg.topicId = t.id;
            draw();
          },
          "btn " + (cfg.topicId === t.id ? "" : "secondary")
        )
      )
    );

    const levelRow = h(
      "div",
      { class: "btn-row" },
      [1, 2, 3, 4, 5, 6].map((l) =>
        button(
          "L" + l,
          () => {
            cfg.level = l;
            draw();
          },
          "btn " + (cfg.level === l ? "" : "secondary")
        )
      )
    );

    const countRow = h(
      "div",
      { class: "btn-row" },
      [10, 15, 20, 25].map((c) =>
        button(
          c + " questions",
          () => {
            cfg.count = c;
            draw();
          },
          "btn " + (cfg.count === c ? "" : "secondary")
        )
      )
    );

    const cf = worksheetBankInfo();
    return h("div", { class: "card no-print" }, [
      h("h1", { text: "Printable worksheets" }),
      h("p", {
        class: "muted",
        html: `Pick a subject, topic, level and length, then print. Numbers re-randomise every time — “New set” gives a fresh sheet from <b>${cf.estimatedInstances.toLocaleString(
          "en-GB"
        )}+</b> possible questions. The answer key prints on its own page.`,
      }),
      h("h2", { text: "Subject" }),
      subjRow,
      h("h2", { text: "Topic" }),
      topicRow,
      h("h2", { text: "Level" }),
      levelRow,
      h("h2", { text: "Length" }),
      countRow,
      h("div", { class: "btn-row" }, [
        button("🖨 Print this worksheet", () => window.print(), "btn big"),
        button(
          "↻ New set",
          () => {
            cfg.seed = freshSeed();
            draw();
          },
          "btn big secondary"
        ),
      ]),
    ]);
  }

  function questionBlock(it) {
    const q = it.q;
    const parts = [
      h("div", { class: "ws-q" }, [
        h("span", { class: "ws-n", text: it.n + "." }),
        h("span", { class: "ws-prompt", html: q.promptHTML }),
      ]),
    ];
    if (q.type === "mcq") {
      const ol = h("div", { class: "ws-choices" });
      for (const c of q.choices) {
        ol.appendChild(
          h("div", { class: "ws-choice" }, [
            h("span", { class: "ws-key", text: c.key }),
            h("span", { html: c.text }),
          ])
        );
      }
      parts.push(ol);
    } else {
      parts.push(h("div", { class: "ws-answerline", text: "Answer: ____________" }));
    }
    return h("div", { class: "ws-item" }, parts);
  }

  function draw() {
    clear(mount);
    mount.appendChild(controls());

    const ws = buildWorksheet(cfg);
    const who = (state.profile && state.profile.childName || "").trim();
    const t = topicById(cfg.topicId);
    const date = new Date().toLocaleDateString("en-GB");

    const sheet = h("div", { class: "card worksheet" }, [
      h("div", { class: "ws-head" }, [
        h("h2", { text: `${t ? t.name : cfg.topicId} — Level ${ws.level}` }),
        h("div", { class: "muted", text: `Brightspark 11+ · ${ws.count} questions` }),
        h("div", { class: "ws-meta" }, [
          h("span", { text: who ? `Name: ${who}` : "Name: ____________" }),
          h("span", { text: `Date: ${date}` }),
          h("span", { text: "Score: ____ / " + ws.count }),
        ]),
      ]),
    ]);
    for (const it of ws.items) sheet.appendChild(questionBlock(it));
    mount.appendChild(sheet);

    const key = h("div", { class: "card answer-key" }, [
      h("h2", { text: "Answer key" }),
      h("p", {
        class: "muted",
        text: `${t ? t.name : cfg.topicId} · Level ${ws.level} · seed ${ws.seed}`,
      }),
    ]);
    const kl = h("div", { class: "ws-key-list" });
    for (const it of ws.items) {
      kl.appendChild(
        h("div", { class: "ws-key-row" }, [
          h("b", { text: it.n + ". " }),
          h("span", { html: String(it.answer) }),
          it.q.explanation
            ? h("span", { class: "muted", text: " — " + it.q.explanation })
            : null,
        ])
      );
    }
    key.appendChild(kl);
    mount.appendChild(key);
  }

  draw();
}
