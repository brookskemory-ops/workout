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

if (typeof module !== "undefined") {
  module.exports = { donutArcs, donut, linePoints, areaLine, sparkline };
}
