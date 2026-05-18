// App bootstrap: load data + saved progress, wire the router and the
// shared context object the screens use.

import { activeAdapter } from "./persistence/adapter.js";
import { loadCurated } from "./curated.js";
import { loadFixits } from "./fixits.js";
import { startRouter, parseHash, navigate } from "./ui/router.js";
import { renderHome } from "./ui/screenHome.js";
import { renderTopics } from "./ui/screenTopics.js";
import { renderQuiz } from "./ui/screenQuiz.js";
import { renderMock } from "./ui/screenMock.js";
import { renderReview } from "./ui/screenReview.js";
import { renderParent } from "./ui/screenParent.js";

const mount = document.getElementById("app");
const noticeEl = document.getElementById("notice");

const ctx = {
  state: null,
  mount,
  navigate,
  save() {
    activeAdapter.save(this.state);
  },
  replaceState(s) {
    this.state = s;
  },
  setNotice(msg) {
    if (!msg) {
      noticeEl.hidden = true;
      return;
    }
    noticeEl.textContent = msg;
    noticeEl.hidden = false;
    clearTimeout(this._noticeTimer);
    this._noticeTimer = setTimeout(() => {
      noticeEl.hidden = true;
    }, 6000);
  },
  rerender() {
    route(parseHash());
  },
};

const SCREENS = {
  home: renderHome,
  topics: renderTopics,
  quiz: renderQuiz,
  mock: renderMock,
  review: renderReview,
  parent: renderParent,
};

function route({ name, params }) {
  const render = SCREENS[name] || renderHome;
  // Mark the active nav link.
  document.querySelectorAll("[data-nav]").forEach((a) => {
    a.style.textDecoration =
      a.getAttribute("href") === `#/${name}` ? "underline" : "none";
  });
  try {
    render(ctx, params);
  } catch (e) {
    console.error(e);
    mount.innerHTML =
      '<div class="card"><h2>Something went wrong</h2><p class="muted">Try Home, or reset progress on the Parent page.</p></div>';
  }
  window.scrollTo(0, 0);
}

async function boot() {
  await loadCurated();
  await loadFixits();
  ctx.state = await activeAdapter.load();
  if (!activeAdapter.isAvailable()) {
    ctx.setNotice(
      "Heads up: this browser won't save progress (private mode or storage blocked). You can still practise, and export progress from the Parent page."
    );
  }
  startRouter(route);
}

boot();
