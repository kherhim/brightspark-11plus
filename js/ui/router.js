// Minimal hash router. Routes:
//   #/home              welcome screen
//   #/topics            topic grid (pick a topic to drill)
//   #/quiz              adaptive practice (engine chooses topics)
//   #/quiz/<topicId>    practice one topic
//   #/mock              timed mock-exam setup
//   #/mock/<subject>    mock exam for a subject (deep link)
//   #/review            spaced review of past mistakes + fix-it
//   #/worksheet         printable worksheet generator (+ answer key)
//   #/parent            parent dashboard
//   #/signup[/<plan>]   passwordless sign-in (optional intended plan)
//   #/verify/<token>    magic-link landing (exchanges token for a session)
//   #/account[/<flag>]  account + upgrade (flag: paid | cancelled)

export function parseHash() {
  const raw = (location.hash || "#/home").replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean);
  const name = parts[0] || "home";
  return { name, params: parts.slice(1) };
}

export function navigate(path) {
  location.hash = path.startsWith("#") ? path : "#/" + path;
}

export function startRouter(onRoute) {
  window.addEventListener("hashchange", () => onRoute(parseHash()));
  onRoute(parseHash());
}
