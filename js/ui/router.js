// Minimal hash router. Routes:
//   #/home              welcome screen
//   #/topics            topic grid (pick a topic to drill)
//   #/quiz              adaptive practice (engine chooses topics)
//   #/quiz/<topicId>    practice one topic
//   #/mock              timed mock-exam setup
//   #/mock/<subject>    mock exam for a subject (deep link)
//   #/parent            parent dashboard

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
