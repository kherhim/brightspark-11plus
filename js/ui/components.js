// Tiny DOM helpers — no framework. `h` builds elements; the rest are
// reusable bits of UI (buttons, progress bars, mastery badges).

export function h(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on") && typeof v === "function")
      node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

export function button(label, onClick, cls = "btn") {
  return h("button", { class: cls, onClick }, label);
}

export function progressBar(fraction, label) {
  const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  return h("div", { class: "progress" }, [
    h("div", { class: "progress-fill", style: `width:${pct}%` }),
    h("span", { class: "progress-label", text: label || `${pct}%` }),
  ]);
}

export function levelDots(level, max = 6) {
  const wrap = h("div", { class: "level-dots", title: `Level ${level} of ${max}` });
  for (let i = 1; i <= max; i++) {
    wrap.appendChild(
      h("span", { class: "dot" + (i <= level ? " on" : "") })
    );
  }
  return wrap;
}

export function masteryBadge(ts) {
  if (ts.mastered)
    return h("span", { class: "badge mastered", text: "★ Mastered" });
  if (ts.mastery >= 0.6)
    return h("span", { class: "badge strong", text: "Getting strong" });
  if (ts.attempts === 0)
    return h("span", { class: "badge new", text: "Not started" });
  return h("span", { class: "badge learning", text: "Learning" });
}

// A small coloured readiness/level pill (reuses the .badge palette).
export function subjectPill(label, bandObj) {
  return h("span", {
    class: "badge " + (bandObj ? bandObj.badge : "new"),
    text: label,
  });
}

// Streak + daily-goal + earned-badges strip. Pure: reads only state.
export function engagementWidget(state, goalProgress, BADGES) {
  const gp = goalProgress(state);
  const streak = (state.streaks && state.streaks.current) || 0;
  const best = (state.streaks && state.streaks.longest) || 0;
  const earned = BADGES.filter((b) => state.badges && state.badges[b.id]);

  const badgeRow = h("div", { class: "badge-strip" });
  if (!earned.length) {
    badgeRow.appendChild(
      h("span", { class: "muted", text: "No badges yet — keep practising!" })
    );
  } else {
    for (const b of earned) {
      badgeRow.appendChild(
        h("span", {
          class: "badge-chip",
          title: `${b.name} — ${b.desc}`,
          html: `${b.icon} ${b.name}`,
        })
      );
    }
  }

  return h("div", { class: "card engage" }, [
    h("div", { class: "engage-top" }, [
      h("div", { class: "engage-streak" }, [
        h("div", { class: "flame", text: streak > 0 ? "🔥" : "✨" }),
        h("div", {}, [
          h("div", {
            class: "big",
            text: streak > 0 ? `${streak}-day streak` : "Start a streak!",
          }),
          h("div", {
            class: "lbl muted",
            text: best > 0 ? `Best: ${best} days` : "Practise today to begin",
          }),
        ]),
      ]),
      h("div", { class: "engage-goal" }, [
        h("div", { class: "lbl muted", text: "Today's goal" }),
        progressBar(
          gp.fraction,
          gp.met ? `Goal done! ${gp.done}/${gp.goal}` : `${gp.done} / ${gp.goal}`
        ),
      ]),
    ]),
    badgeRow,
  ]);
}

// Premium-feature paywall card. "See plans" is a full-page link to the
// landing pricing section (app is app.html; landing is index.html).
export function paywallCard(title, message) {
  return h("div", { class: "card center" }, [
    h("div", { style: "font-size:2.2rem", text: "🔒" }),
    h("h2", { text: title || "Premium feature" }),
    h("p", {
      class: "muted",
      text:
        message ||
        "Unlock all four subjects, mock exams, smart review, readiness analytics and printable worksheets.",
    }),
    h(
      "a",
      {
        class: "btn big",
        href: "index.html#pricing",
        "data-ev": "see_pricing",
        "data-from": "paywall",
      },
      "See plans"
    ),
    h("p", { class: "muted", text: "Maths practice stays free." }),
  ]);
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}
