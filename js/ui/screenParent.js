import {
  h,
  button,
  levelDots,
  masteryBadge,
  progressBar,
  subjectPill,
  engagementWidget,
  clear,
} from "./components.js";
import {
  TOPICS, topicById, activeSubjects, topicsBySubject,
} from "../topics.js";
import { ensureTopic, exportJSON, importJSON, resetState } from "../store.js";
import { fmtDuration } from "../format.js";
import { countForms } from "../questionFactory.js";
import { topicForMisconception } from "../review.js";
import { getFixit } from "../fixits.js";
import {
  overallReadiness,
  subjectReadiness,
  topicReadiness,
  paceStats,
  band,
  explainTopic,
  MIN_PACE_SAMPLES,
} from "../analytics.js";
import { goalProgress, BADGES } from "../engagement.js";
import { BOARD_LIST, boardName } from "../boards.js";

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

  // Motivation: streak, daily goal and earned badges at a glance.
  mount.appendChild(engagementWidget(state, goalProgress, BADGES));

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

  // Readiness & speed (board-weighted, explainable)
  const board = (state.profile && state.profile.board) || null;
  const overall = overallReadiness(state, board);
  const ob = band(overall);
  const boardChoices = [{ id: null, name: "General 11+" }].concat(BOARD_LIST);
  const boardRow = h(
    "div",
    { class: "btn-row" },
    boardChoices.map((c) =>
      button(
        c.name,
        () => {
          state.profile = state.profile || {};
          state.profile.board = c.id;
          ctx.save();
          ctx.rerender();
        },
        "btn " + ((board || null) === c.id ? "" : "secondary")
      )
    )
  );

  const rTable = h("table", { class: "dash" });
  rTable.appendChild(
    h("tr", {}, [
      h("th", { text: "Topic" }),
      h("th", { text: "Readiness" }),
      h("th", { text: "Pace" }),
    ])
  );
  for (const s of activeSubjects()) {
    const sr = subjectReadiness(state, s.id, board);
    rTable.appendChild(
      h("tr", { class: "subj-row" }, [
        h("td", { colspan: "2" }, [h("b", { text: s.name })]),
        h("td", {}, [
          sr == null
            ? h("span", { class: "muted", text: "not assessed" })
            : h("span", {
                class: "badge " + band(sr).badge,
                text: state.global.totalAnswered ? band(sr).label : "—",
              }),
        ]),
      ])
    );
    for (const t of topicsBySubject(s.id)) {
      const ts = ensureTopic(state, t.id);
      const r = topicReadiness(ts, board);
      const tb = band(r);
      const ps = paceStats(ts, board);
      const paceTxt = !ts.attempts
        ? "—"
        : ps.enough
        ? ps.flag.label
        : `collecting (${ps.n}/${MIN_PACE_SAMPLES})`;
      rTable.appendChild(
        h("tr", { title: explainTopic(ts, board) }, [
          h("td", { text: t.name }),
          h("td", {}, [
            h("span", {
              class: "badge " + tb.badge,
              text: ts.attempts ? tb.label : "Not started",
            }),
          ]),
          h("td", {
            class:
              ps.enough && ps.flag.key !== "balanced" ? "pace-flag" : "muted",
            text: paceTxt,
          }),
        ])
      );
    }
  }
  mount.appendChild(
    h("div", { class: "card" }, [
      h("h2", { text: "Readiness" }),
      h("p", {
        class: "muted",
        html: `Target board: <b>${boardName(
          board
        )}</b>. Readiness blends mastery, accuracy, level and pace, and only counts once there are enough attempts — so a couple of lucky answers can't read “Exam-ready”. Hover a row for the reason.`,
      }),
      boardRow,
      h("div", { style: "margin:14px 0 6px" }, [
        progressBar(
          overall,
          `${Math.round(overall * 100)}% · ${ob.label}`
        ),
      ]),
      rTable,
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
  for (const s of activeSubjects()) {
    table.appendChild(
      h("tr", { class: "subj-row" }, [
        h("td", { colspan: "5" }, [h("b", { text: s.name })]),
      ])
    );
    for (const t of topicsBySubject(s.id)) {
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
  }
  mount.appendChild(h("div", { class: "card" }, [
    h("h2", { text: "Progress by topic" }),
    table,
  ]));

  // Top error patterns — the misconceptions that recur most
  const mc = state.misconceptionCounts || {};
  const patterns = Object.entries(mc)
    .filter(([id, c]) => id && id !== "near_miss" && c > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const plist = h("div", { class: "mistake-list" });
  if (!patterns.length) {
    plist.appendChild(
      h("p", { class: "muted", text: "No recurring error patterns yet." })
    );
  } else {
    for (const [mid, count] of patterns) {
      const tid = topicForMisconception(state, mid);
      const area = tid ? topicById(tid)?.area : null;
      const fx = getFixit(mid, area);
      const label =
        (fx && fx.title) || (tid && topicById(tid)?.name) || "Repeated slip";
      plist.appendChild(
        h("div", {}, [
          h("b", { text: `${count}× ` }),
          h("span", {
            text: label + (tid ? ` · ${topicById(tid)?.name || tid}` : ""),
          }),
        ])
      );
    }
  }
  mount.appendChild(
    h("div", { class: "card" }, [
      h("h2", { text: "Top error patterns" }),
      h("p", {
        class: "muted",
        text: "The methods to revisit together. The Review page turns the biggest one into a quick fix-it.",
      }),
      plist,
    ])
  );

  // Recent mistakes — the persistent cross-topic log (practice + mock +
  // review), newest first, paginated.
  const log = (state.mistakeLog || [])
    .slice()
    .sort((a, b) => (b.at || 0) - (a.at || 0));
  const card = h("div", { class: "card" });
  let expanded = false;
  function fillLog() {
    clear(card);
    card.appendChild(h("h2", { text: "Recent mistakes" }));
    card.appendChild(
      h("p", {
        class: "muted",
        text: `${log.length} recorded. Source is shown so you can tell practice from mock and review.`,
      })
    );
    const list = h("div", { class: "mistake-list" });
    if (!log.length) {
      list.appendChild(
        h("p", { class: "muted", text: "No mistakes recorded yet." })
      );
    } else {
      const shown = expanded ? log : log.slice(0, 20);
      for (const m of shown) {
        const tn = topicById(m.topicId)?.name || m.topicId;
        list.appendChild(
          h("div", {}, [
            h("b", { text: `${tn} (L${m.level}) ` }),
            h("span", {
              class: "badge " + (m.source === "mock" ? "strong" : m.source === "review" ? "new" : "learning"),
              text: m.source || "practice",
            }),
            h("span", {
              text: ` chose “${m.chosenText ?? "?"}”, correct “${
                m.correctText ?? "?"
              }”`,
            }),
          ])
        );
      }
    }
    card.appendChild(list);
    if (log.length > 20) {
      card.appendChild(
        button(
          expanded ? "Show fewer" : `Show all (${log.length})`,
          () => {
            expanded = !expanded;
            fillLog();
          },
          "btn secondary"
        )
      );
    }
  }
  fillLog();
  mount.appendChild(card);

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
