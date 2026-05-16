import { h, button, levelDots, masteryBadge, clear } from "./components.js";
import { TOPICS } from "../topics.js";
import { ensureTopic } from "../store.js";

export function renderTopics(ctx) {
  const { state, mount } = ctx;
  clear(mount);

  mount.appendChild(
    h("div", { class: "card" }, [
      h("h1", { text: "Choose a topic to practise" }),
      h("p", {
        class: "muted",
        text: "Drilling one topic uses that topic's own difficulty level. Or go back and let the app pick the best mix for you.",
      }),
      button("← Adaptive practice (recommended)", () => ctx.navigate("quiz"), "btn"),
    ])
  );

  const grid = h("div", { class: "topic-grid" });
  for (const t of TOPICS) {
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
  mount.appendChild(grid);
}
