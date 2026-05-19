import {
  h, button, levelDots, masteryBadge, subjectPill, clear,
} from "./components.js";
import { activeSubjects, topicsBySubject } from "../topics.js";
import { ensureTopic } from "../store.js";
import { subjectReadiness, band } from "../analytics.js";

export function renderTopics(ctx) {
  const { state, mount } = ctx;
  clear(mount);

  const board = (state.profile && state.profile.board) || null;
  const subjects = activeSubjects();

  // Quick subject jump bar + adaptive-practice shortcut.
  mount.appendChild(
    h("div", { class: "card" }, [
      h("h1", { text: "Choose a topic to practise" }),
      h("p", {
        class: "muted",
        text: "Drilling one topic uses that topic's own difficulty level. Or let the app pick the best mix for you.",
      }),
      h("div", { class: "btn-row" }, [
        button("← Adaptive practice (recommended)", () => ctx.navigate("quiz"), "btn"),
      ]),
      h(
        "div",
        { class: "subj-tabs" },
        subjects.map((s) =>
          button(
            s.name,
            () => {
              const el = document.getElementById("subj-" + s.id);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            },
            "btn secondary"
          )
        )
      ),
    ])
  );

  for (const s of subjects) {
    const r = subjectReadiness(state, s.id, board);
    const section = h("div", { class: "card", id: "subj-" + s.id }, [
      h("div", { class: "subj-head" }, [
        h("h2", { text: s.name }),
        r == null
          ? h("span", { class: "muted", text: "Not assessed by this board" })
          : subjectPill(
              state.global.totalAnswered ? band(r).label : "Not started",
              band(r)
            ),
      ]),
    ]);

    const grid = h("div", { class: "topic-grid" });
    for (const t of topicsBySubject(s.id)) {
      const ts = ensureTopic(state, t.id);
      const acc = ts.attempts
        ? Math.round((ts.correct / ts.attempts) * 100)
        : 0;
      grid.appendChild(
        h("div", { class: "topic-tile" }, [
          h("h3", { text: t.name }),
          h("div", { class: "row" }, [
            h("span", { class: "muted", text: `Level ${ts.level}/6` }),
            levelDots(ts.level),
          ]),
          h("div", { class: "row" }, [
            masteryBadge(ts),
            h("span", {
              class: "muted",
              text: ts.attempts ? `${acc}% · ${ts.attempts} done` : "new",
            }),
          ]),
          button("Practise", () => ctx.navigate("quiz/" + t.id), "btn"),
        ])
      );
    }
    section.appendChild(grid);
    mount.appendChild(section);
  }
}
