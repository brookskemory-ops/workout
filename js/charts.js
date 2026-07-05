/* ============================================================================
 * KEEL — chart builders. Pure functions that return SVG strings; geometry
 * helpers are exported for node tests. All colors come from CSS classes
 * (.c1–.c6, .pos/.neg) — no literal colors here.
 * ==========================================================================*/

/* ------------------------------ donut ------------------------------------- */
// segments: [{pct, cls}] with pcts summing to ≤100. Returns arc specs for a
// circle of circumference C: each segment gets a dasharray and rotation.
function donutArcs(segments, circumference) {
  let offset = 0;
  return segments.map(s => {
    const len = Math.max(0, (s.pct / 100) * circumference);
    const arc = { cls: s.cls, dash: `${len} ${circumference - len}`, offset: -offset };
    offset += len;
    return arc;
  });
}
function donut(segments, { size = 150, stroke = 16, centerLabel = "", centerSub = "" } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arcs = donutArcs(segments, c);
  const half = size / 2;
  return `<svg class="donut" viewBox="0 0 ${size} ${size}" role="img" aria-label="${centerSub ? centerSub + ": " : ""}${centerLabel}">
    <circle class="donut-track" cx="${half}" cy="${half}" r="${r}" fill="none" stroke-width="${stroke}"/>
    ${arcs.map(a => `<circle class="donut-seg ${a.cls}" cx="${half}" cy="${half}" r="${r}" fill="none"
      stroke-width="${stroke}" stroke-dasharray="${a.dash}" stroke-dashoffset="${a.offset}"
      transform="rotate(-90 ${half} ${half})"/>`).join("")}
    <text class="donut-label money" x="${half}" y="${half - 2}" text-anchor="middle">${centerLabel}</text>
    <text class="donut-sub" x="${half}" y="${half + 16}" text-anchor="middle">${centerSub}</text>
  </svg>`;
}

/* ------------------------------ line / area ------------------------------- */
// Maps values to "x,y" points inside a w×h box with padding. Exported for
// tests: first point at x=pad, last at x=w-pad, y inverted (SVG down).
function linePoints(values, w, h, pad = 4) {
  if (values.length < 2) return [];
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const innerW = w - pad * 2, innerH = h - pad * 2;
  return values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * innerW;
    const y = pad + innerH - ((v - min) / range) * innerH;
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  });
}
function areaLine(values, { w = 320, h = 96, cls = "", baseline = null, labels = [] } = {}) {
  const pts = linePoints(values, w, h);
  if (!pts.length) return `<div class="chart-empty">Not enough data yet.</div>`;
  const line = pts.map(p => p.join(",")).join(" ");
  const area = `M${pts[0][0]},${h} ${pts.map(p => `L${p[0]},${p[1]}`).join(" ")} L${pts[pts.length - 1][0]},${h} Z`;
  // baseline (e.g. zero line) position if it falls inside the range
  let baseY = null;
  if (baseline != null) {
    const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
    if (baseline >= min && baseline <= max) baseY = 4 + (h - 8) - ((baseline - min) / range) * (h - 8);
  }
  return `<svg class="area-chart ${cls}" viewBox="0 0 ${w} ${h + (labels.length ? 16 : 0)}" preserveAspectRatio="none" role="img">
    ${baseY != null ? `<line class="area-baseline" x1="0" x2="${w}" y1="${baseY}" y2="${baseY}"/>` : ""}
    <path class="area-fill" d="${area}"/>
    <polyline class="area-line" points="${line}" fill="none"/>
    ${pts.length <= 14 ? pts.map(p => `<circle class="area-dot" cx="${p[0]}" cy="${p[1]}" r="2.5"/>`).join("") : ""}
    ${labels.map((lb, i) => {
      const x = 4 + (i / (labels.length - 1)) * (w - 8);
      return `<text class="area-x-label" x="${x}" y="${h + 12}" text-anchor="${i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"}">${lb}</text>`;
    }).join("")}
  </svg>`;
}
function sparkline(values, { w = 120, h = 34, cls = "" } = {}) {
  const pts = linePoints(values, w, h, 2);
  if (!pts.length) return "";
  return `<svg class="spark ${cls}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <polyline class="spark-line" points="${pts.map(p => p.join(",")).join(" ")}" fill="none"/>
  </svg>`;
}

/* ------------------------------ flow (sankey-ish) -------------------------- */
// Ribbon geometry for a two-column flow: one source of `total` fanning out to
// `targets` [{value}]. Returns per-target left/right y-spans in a box of
// height h with `gap` px between right-hand nodes.
function flowSpans(total, targets, h, gap = 6) {
  const sum = Math.max(total, targets.reduce((a, t) => a + t.value, 0)) || 1;
  const usable = h - gap * Math.max(0, targets.length - 1);
  let yL = 0, yR = 0;
  return targets.map(t => {
    const size = (t.value / sum) * usable;
    const span = { y0L: yL, y1L: yL + size, y0R: yR, y1R: yR + size };
    yL += size;
    yR += size + gap;
    return span;
  });
}
// Income → categories flow. targets: [{name, value, cls}]. Left node is the
// source total; a "Saved" target should be appended by the caller when
// income exceeds spending.
function flowChart(sourceLabel, total, targets, { w = 340, h = null } = {}) {
  if (!targets.length || total <= 0) return `<div class="chart-empty">Not enough data yet.</div>`;
  const height = h || Math.max(120, Math.min(230, targets.length * 34));
  const spans = flowSpans(total, targets, height);
  const xL = 6, xR = w - 116, node = 7;
  const ribbons = targets.map((t, i) => {
    const s = spans[i];
    const c1 = xL + node + (xR - xL - node) * 0.45;
    const c2 = xL + node + (xR - xL - node) * 0.55;
    return `<path class="flow-ribbon ${t.cls}" d="M${xL + node},${s.y0L}
      C${c1},${s.y0L} ${c2},${s.y0R} ${xR},${s.y0R}
      L${xR},${s.y1R} C${c2},${s.y1R} ${c1},${s.y1L} ${xL + node},${s.y1L} Z"/>`;
  }).join("");
  const rightNodes = targets.map((t, i) => {
    const s = spans[i];
    const mid = (s.y0R + s.y1R) / 2;
    return `<rect class="flow-node ${t.cls}" x="${xR}" y="${s.y0R}" width="${node}" height="${Math.max(2, s.y1R - s.y0R)}" rx="2"/>
      <text class="flow-label" x="${xR + node + 6}" y="${mid + 3.5}">${t.name}</text>`;
  }).join("");
  return `<svg class="flow-chart" viewBox="0 0 ${w} ${height + 18}" role="img" aria-label="${sourceLabel} flow">
    <g transform="translate(0, 4)">
      <rect class="flow-node source" x="${xL}" y="0" width="${node}" height="${height}" rx="2"/>
      ${ribbons}
      ${rightNodes}
    </g>
    <text class="flow-label" x="${xL}" y="${height + 16}">${sourceLabel}</text>
  </svg>`;
}

if (typeof module !== "undefined") {
  module.exports = { donutArcs, donut, linePoints, areaLine, sparkline, flowSpans, flowChart };
}
