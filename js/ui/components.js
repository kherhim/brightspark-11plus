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

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}
