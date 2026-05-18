import { h, button, progressBar, clear } from "./components.js";
import { TOPICS } from "../topics.js";

export function renderHome(ctx) {
  const { state, mount } = ctx;
  clear(mount);

  const who = (state.profile && state.profile.childName || "").trim();
  const mastered = TOPICS.filter((t) => state.topics[t.id]?.mastered).length;
  const g = state.global;
  const accuracy = g.totalAnswered
    ? Math.round((g.totalCorrect / g.totalAnswered) * 100)
    : 0;

  mount.appendChild(
    h("div", { class: "card center" }, [
      h("h1", { text: who ? `Hi ${who}! 👋` : "Hi there! 👋" }),
      h("p", {
        class: "muted",
        text: "Practice maths for your senior school entrance exam. The questions get harder as you get better — and explain everything when you go wrong.",
      }),
      progressBar(
        mastered / TOPICS.length,
        `${mastered} of ${TOPICS.length} topics mastered`
      ),
      h("div", { class: "btn-row", style: "justify-content:center" }, [
        button("▶ Start practice", () => ctx.navigate("quiz"), "btn big"),
        button(
          "Choose a topic",
          () => ctx.navigate("topics"),
          "btn big secondary"
        ),
      ]),
    ])
  );

  mount.appendChild(
    h("div", { class: "stat-grid" }, [
      stat(g.totalAnswered, "Questions answered"),
      stat(g.totalCorrect, "Correct"),
      stat(accuracy + "%", "Accuracy so far"),
    ])
  );

  mount.appendChild(
    h("div", { class: "card" }, [
      h("h2", { text: "How it works" }),
      h("ul", {}, [
        h("li", { html: "Every topic has <b>6 difficulty levels</b>. Get a few right in a row and it moves you up; struggle and it eases off." }),
        h("li", { html: "Numbers change every time, so you <b>learn the method</b> instead of memorising answers." }),
        h("li", { html: "When you slip up you get the <b>worked solution and the key idea</b>, plus the chance to try an easier one." }),
        h("li", { html: "A grown-up can see your progress on the <b>Parent</b> page." }),
      ]),
    ])
  );
}

function stat(value, label) {
  return h("div", { class: "stat" }, [
    h("div", { class: "big", text: String(value) }),
    h("div", { class: "lbl", text: label }),
  ]);
}
