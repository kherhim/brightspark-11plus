// Deterministic inline-SVG figures for the Non-Verbal Reasoning generators.
//
// A figure is a plain attribute vector { shape, fill, rot, count, size }.
// Every function here is pure and rounds all coordinates to integers, so
// the SAME attribute vector always yields a byte-identical SVG string —
// which keeps NVR questions reproducible from a seed (anti-memorisation:
// the attributes re-randomise, the rendering is exact).
//
// Shading is done with flat fill colours (not <pattern>/<defs>) so there
// are no element-id collisions when several figures appear on one page,
// and so it still prints (paired with print-color-adjust in the CSS).

export const SHAPES = [
  "triangle", "square", "circle", "pentagon", "star", "diamond", "hexagon", "arrow",
];
export const FILLS = ["#ffffff", "#4f46e5", "#9ca3af", "#fde68a"];
export const FILL_NAMES = ["unshaded", "shaded", "grey", "amber"];
export const SIZES = { small: 18, medium: 28, large: 38 };
export const ROTATIONS = [0, 45, 90, 135, 180, 225, 270, 315];

const r0 = (n) => Math.round(n);

function polyPoints(cx, cy, r, sides, rotDeg, baseDeg = 0) {
  const off = -Math.PI / 2 + ((rotDeg + baseDeg) * Math.PI) / 180;
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const ang = off + (i * 2 * Math.PI) / sides;
    pts.push(`${r0(cx + r * Math.cos(ang))},${r0(cy + r * Math.sin(ang))}`);
  }
  return pts.join(" ");
}

function starPoints(cx, cy, r, rotDeg) {
  const off = -Math.PI / 2 + (rotDeg * Math.PI) / 180;
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.42;
    const ang = off + (i * Math.PI) / 5;
    pts.push(`${r0(cx + rr * Math.cos(ang))},${r0(cy + rr * Math.sin(ang))}`);
  }
  return pts.join(" ");
}

// One shape centred at (cx,cy). `rot` only visibly affects shapes that
// have an orientation (triangle / pentagon / arrow / star / diamond).
function shapeMarkup(shape, cx, cy, r, rot, fillColor) {
  const common = `fill="${fillColor}" stroke="#1f2937" stroke-width="3"`;
  switch (shape) {
    case "circle":
      return `<circle cx="${r0(cx)}" cy="${r0(cy)}" r="${r0(r)}" ${common}/>`;
    case "square":
      return `<polygon points="${polyPoints(cx, cy, r, 4, rot, 45)}" ${common}/>`;
    case "diamond":
      return `<polygon points="${polyPoints(cx, cy, r, 4, rot, 0)}" ${common}/>`;
    case "triangle":
      return `<polygon points="${polyPoints(cx, cy, r, 3, rot, 0)}" ${common}/>`;
    case "pentagon":
      return `<polygon points="${polyPoints(cx, cy, r, 5, rot, 0)}" ${common}/>`;
    case "hexagon":
      return `<polygon points="${polyPoints(cx, cy, r, 6, rot, 0)}" ${common}/>`;
    case "star":
      return `<polygon points="${starPoints(cx, cy, r, rot)}" ${common}/>`;
    case "arrow": {
      // Up-pointing arrow, rotated about the centre by `rot`.
      const a = [
        [cx, cy - r], [cx + r * 0.6, cy], [cx + r * 0.25, cy],
        [cx + r * 0.25, cy + r], [cx - r * 0.25, cy + r],
        [cx - r * 0.25, cy], [cx - r * 0.6, cy],
      ]
        .map(([x, y]) => `${r0(x)},${r0(y)}`)
        .join(" ");
      return `<g transform="rotate(${rot} ${r0(cx)} ${r0(cy)})"><polygon points="${a}" ${common}/></g>`;
    }
    default:
      return `<circle cx="${r0(cx)}" cy="${r0(cy)}" r="${r0(r)}" ${common}/>`;
  }
}

export function describe(attrs) {
  const size = attrs.size || "medium";
  const fill = FILL_NAMES[attrs.fill || 0];
  const count = attrs.count || 1;
  const rotTxt = attrs.rot ? `, rotated ${attrs.rot}°` : "";
  const cntTxt = count > 1 ? ` ×${count}` : "";
  const flipTxt = attrs.flip ? ", mirrored" : "";
  return `${size} ${fill} ${attrs.shape}${cntTxt}${rotTxt}${flipTxt}`;
}

// A single 100×100 figure tile as a standalone <svg> string. `count`
// (1..4) tiles the shape horizontally so "how many" varies cleanly.
export function figureSVG(attrs, opts = {}) {
  const px = opts.px || 96;
  const count = Math.max(1, Math.min(4, attrs.count || 1));
  const fillColor = FILLS[attrs.fill || 0];
  const baseR = SIZES[attrs.size || "medium"] || SIZES.medium;
  let body = "";
  if (count === 1) {
    body = shapeMarkup(attrs.shape, 50, 50, baseR, attrs.rot || 0, fillColor);
  } else {
    const r = Math.max(10, baseR - (count - 1) * 5);
    const gap = 100 / count;
    for (let i = 0; i < count; i++) {
      body += shapeMarkup(
        attrs.shape, r0(gap * (i + 0.5)), 50, r, attrs.rot || 0, fillColor
      );
    }
  }
  if (attrs.flip) body = `<g transform="translate(100,0) scale(-1,1)">${body}</g>`;
  return (
    `<svg class="nvr-fig" viewBox="0 0 100 100" width="${px}" height="${px}" ` +
    `role="img" aria-label="${describe(attrs)}" ` +
    `style="background:#fff;border:1px solid #e5e7eb;border-radius:6px">` +
    body +
    `</svg>`
  );
}

// A row of figures (e.g. a series with a "?" final cell) as one SVG-rich
// HTML fragment. `qmark` adds a trailing box with a question mark.
export function figureRow(list, opts = {}) {
  const cells = list.map((a) => figureSVG(a, opts)).join("");
  const qmark = opts.qmark
    ? `<svg class="nvr-fig" viewBox="0 0 100 100" width="${opts.px || 96}" ` +
      `height="${opts.px || 96}" role="img" aria-label="missing figure" ` +
      `style="background:#fff;border:2px dashed #9ca3af;border-radius:6px">` +
      `<text x="50" y="66" text-anchor="middle" font-size="48" ` +
      `fill="#6b7280">?</text></svg>`
    : "";
  return `<div class="nvr-row">${cells}${qmark}</div>`;
}

// A 2×2 or 3×3 grid with the bottom-right cell shown as "?".
export function figureGrid(rows, opts = {}) {
  const n = rows.length;
  let html = `<div class="nvr-grid" style="grid-template-columns:repeat(${n},auto)">`;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const a = rows[i][j];
      html +=
        a === "?"
          ? `<svg class="nvr-fig" viewBox="0 0 100 100" width="${opts.px || 84}" ` +
            `height="${opts.px || 84}" role="img" aria-label="missing figure" ` +
            `style="background:#fff;border:2px dashed #9ca3af;border-radius:6px">` +
            `<text x="50" y="66" text-anchor="middle" font-size="48" ` +
            `fill="#6b7280">?</text></svg>`
          : figureSVG(a, { px: opts.px || 84 });
    }
  }
  return html + `</div>`;
}
