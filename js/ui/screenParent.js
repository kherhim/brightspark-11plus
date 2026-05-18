import { h, button, levelDots, masteryBadge, clear } from "./components.js";
import { TOPICS } from "../topics.js";
import { ensureTopic, exportJSON, importJSON, resetState } from "../store.js";
import { fmtDuration } from "../format.js";
import { countForms } from "../questionFactory.js";

export function renderParent(ctx) {
  const { state, mount } = ctx;
  clear(mount);

  const who = (state.profile && state.profile.childName || "").trim();
  const g = state.global;
  const acc = g.totalAnswered
    ? Math.round((g.totalCorrect / g.totalAnswered) * 100)
    : 0;
  const totalTime = TOPICS.reduce(
    (s, t) => s + (state.topics[t.id]?.timeMs || 0),
    0
  );
  const cf = countForms();

  mount.appendChild(
    h("div", { class: "card" }, [
      h("h1", { text: "Parent dashboard" }),
      h("p", {
        class: "muted",
        html: `Question bank: <b>${cf.forms}</b> generated question forms + <b>${cf.curated}</b> curated problems — about <b>${cf.estimatedInstances.toLocaleString("en-GB")}+</b> distinct questions (numbers change every attempt).`,
      }),
      h("div", { class: "stat-grid" }, [
        st(g.totalAnswered, "Answered"),
        st(acc + "%", "Accuracy"),
        st(fmtDuration(totalTime), "Time on task"),
      ]),
    ])
  );

  // Who is practising — sets the personalised name
  const nameInput = h("input", {
    type: "text",
    value: who,
    placeholder: "e.g. Aanya",
    "aria-label": "Child's first name",
    maxlength: "40",
  });
  nameInput.addEventListener("change", () => {
    state.profile = state.profile || {};
    state.profile.childName = nameInput.value.trim().slice(0, 40);
    ctx.save();
    ctx.setNotice(
      state.profile.childName
        ? `Saved — greetings and reports will say “${state.profile.childName}”.`
        : "Name cleared — the app will use a neutral greeting."
    );
    ctx.rerender();
  });
  mount.appendChild(
    h("div", { class: "card" }, [
      h("h2", { text: "Who is practising?" }),
      h("p", {
        class: "muted",
        text: "Optional. Set the child's first name to personalise the greeting and the mock report. It is stored on this device only.",
      }),
      h("div", { class: "numeric-entry" }, [nameInput]),
    ])
  );

  // Per-topic table
  const table = h("table", { class: "dash" });
  table.appendChild(
    h("tr", {}, [
      h("th", { text: "Topic" }),
      h("th", { text: "Level" }),
      h("th", { text: "Accuracy" }),
      h("th", { text: "Done" }),
      h("th", { text: "Status" }),
    ])
  );
  for (const t of TOPICS) {
    const ts = ensureTopic(state, t.id);
    const a = ts.attempts ? Math.round((ts.correct / ts.attempts) * 100) : 0;
    table.appendChild(
      h("tr", {}, [
        h("td", { text: t.name }),
        h("td", {}, [levelDots(ts.level)]),
        h("td", { text: ts.attempts ? a + "%" : "—" }),
        h("td", { text: String(ts.attempts) }),
        h("td", {}, [masteryBadge(ts)]),
      ])
    );
  }
  mount.appendChild(h("div", { class: "card" }, [
    h("h2", { text: "Progress by topic" }),
    table,
  ]));

  // Recent mistakes (across topics, newest first)
  const mistakes = [];
  for (const t of TOPICS) {
    for (const m of ensureTopic(state, t.id).recentMistakes || []) {
      mistakes.push({ topic: t.name, ...m });
    }
  }
  mistakes.sort((x, y) => y.at - x.at);
  const mlist = h("div", { class: "mistake-list" });
  if (!mistakes.length) {
    mlist.appendChild(h("p", { class: "muted", text: "No mistakes recorded yet." }));
  } else {
    for (const m of mistakes.slice(0, 15)) {
      mlist.appendChild(
        h("div", {}, [
          h("b", { text: m.topic + " (L" + m.level + "): " }),
          h("span", {
            text: `chose “${m.chosenText ?? "?"}”, correct “${m.correctText ?? "?"}”`,
          }),
        ])
      );
    }
  }
  mount.appendChild(h("div", { class: "card" }, [
    h("h2", { text: "Recent mistakes" }),
    h("p", { class: "muted", text: "Use these to spot which methods to revisit together." }),
    mlist,
  ]));

  // Data controls
  mount.appendChild(
    h("div", { class: "card" }, [
      h("h2", { text: "Save / move progress" }),
      h("p", {
        class: "muted",
        text: "Progress is stored in this browser only. Export it to move to another device, or import a saved file.",
      }),
      h("div", { class: "btn-row" }, [
        button("⬇ Export progress", () => doExport(state), "btn"),
        button("⬆ Import progress", () => doImport(ctx), "btn secondary"),
        button("⚠ Reset all progress", () => doReset(ctx), "btn secondary"),
      ]),
    ])
  );
}

function st(v, l) {
  return h("div", { class: "stat" }, [
    h("div", { class: "big", text: String(v) }),
    h("div", { class: "lbl", text: l }),
  ]);
}

function doExport(state) {
  const blob = new Blob([exportJSON(state)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `brightspark-11plus-progress-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function doImport(ctx) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        ctx.replaceState(importJSON(reader.result));
        ctx.setNotice("Progress imported successfully.");
        ctx.navigate("parent");
        ctx.rerender();
      } catch (e) {
        ctx.setNotice("That file could not be read as valid progress data.");
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function doReset(ctx) {
  const who =
    (ctx.state.profile && ctx.state.profile.childName || "").trim();
  if (
    !confirm(
      `Reset ALL of ${
        who ? who + "’s" : "this child’s"
      } progress? This cannot be undone. Consider exporting first.`
    )
  )
    return;
  ctx.replaceState(resetState());
  ctx.setNotice("Progress has been reset.");
  ctx.rerender();
}
