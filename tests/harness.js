// Dependency-free test harness. Works in the browser (renders to #out)
// and in Node (prints to console, exits non-zero on failure).

const results = [];
let current = "";

export function suite(name) {
  current = name;
}

export function test(name, fn) {
  try {
    fn();
    results.push({ suite: current, name, ok: true });
  } catch (e) {
    results.push({ suite: current, name, ok: false, err: e.message || String(e) });
  }
}

export function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assertion failed");
}

export function assertEq(a, b, msg) {
  if (a !== b)
    throw new Error((msg || "not equal") + ` (got ${a}, expected ${b})`);
}

export function report() {
  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  const lines = results
    .filter((r) => !r.ok)
    .map((r) => `✗ [${r.suite}] ${r.name} — ${r.err}`);
  const summary = `${pass}/${results.length} passed${
    fail ? `, ${fail} FAILED` : " — all green ✓"
  }`;

  const out =
    typeof document !== "undefined" && document.getElementById("out");
  if (out) {
    out.innerHTML =
      `<h2 class="${fail ? "fail" : "pass"}">${summary}</h2>` +
      (lines.length
        ? `<pre>${lines.join("\n")}</pre>`
        : `<pre>${results.map((r) => `✓ [${r.suite}] ${r.name}`).join("\n")}</pre>`);
  }
  console.log(summary);
  lines.forEach((l) => console.log(l));
  if (typeof process !== "undefined" && fail) process.exitCode = 1;
  return { pass, fail, total: results.length };
}
