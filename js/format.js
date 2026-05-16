// Number / answer formatting and lenient answer comparison.

// Round to at most `dp` decimals, dropping trailing zeros ("2.50" -> "2.5").
export function round(n, dp = 4) {
  const f = Math.pow(10, dp);
  return Math.round((n + Number.EPSILON) * f) / f;
}

// Is this value "clean" enough to show a child? Integer or terminating
// decimal with <= dp places. Generators use this to reject ugly draws.
export function isClean(n, dp = 2) {
  if (!isFinite(n)) return false;
  const r = round(n, dp);
  return Math.abs(r - n) < 1e-9;
}

export function fmtNumber(n) {
  return String(round(n, 4));
}

export function fmtMoney(pounds) {
  const sign = pounds < 0 ? "-" : "";
  const v = Math.abs(round(pounds, 2));
  return `${sign}£${v.toFixed(2)}`;
}

export function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

// Format a fraction, simplifying and extracting whole parts.
export function fmtFraction(num, den) {
  if (den < 0) {
    num = -num;
    den = -den;
  }
  const g = gcd(num, den);
  num /= g;
  den /= g;
  if (den === 1) return String(num);
  return `${num}/${den}`;
}

// Normalise free-text input for comparison: trim, lower-case, strip the
// common decorations a child might type (£, %, units, spaces, commas).
function normalise(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[,£$%°]/g, "")
    .replace(/\s+/g, "")
    .replace(/(cm|mm|km|kg|ml|cl|m|g|l|p)$/i, "");
}

// Parse "3/4", "1 1/2", "0.75" into a number, or NaN.
function parseAnswer(s) {
  s = normalise(s);
  if (s === "") return NaN;
  const mixed = s.match(/^(-?\d+)\s*\+?\s*(\d+)\/(\d+)$/);
  if (mixed) {
    const w = parseInt(mixed[1], 10);
    const sign = w < 0 ? -1 : 1;
    return w + sign * (parseInt(mixed[2], 10) / parseInt(mixed[3], 10));
  }
  const frac = s.match(/^(-?\d+)\/(\d+)$/);
  if (frac) return parseInt(frac[1], 10) / parseInt(frac[2], 10);
  const num = Number(s);
  return isNaN(num) ? NaN : num;
}

// Compare a free-entry answer object { value, tolerance, accept[] } to input.
export function checkNumeric(answer, input) {
  const accept = (answer.accept || []).map(normalise);
  if (accept.includes(normalise(input))) return true;
  const got = parseAnswer(input);
  if (isNaN(got)) return false;
  const tol = answer.tolerance || 0;
  return Math.abs(got - answer.value) <= tol + 1e-9;
}

// Pretty elapsed time for the dashboard.
export function fmtDuration(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
