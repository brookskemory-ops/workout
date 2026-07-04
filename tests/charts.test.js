/* Unit tests for js/charts.js — run with `node tests/charts.test.js`. */
const assert = require("assert");
const c = require("../js/charts.js");

let passed = 0;
function t(name, fn) {
  try { fn(); passed++; }
  catch (e) { console.error(`✗ ${name}\n  ${e.message}`); process.exitCode = 1; }
}

t("donutArcs: segment lengths sum to pct share of circumference, offsets chain", () => {
  const C = 100;
  const arcs = c.donutArcs([{ pct: 50, cls: "c1" }, { pct: 30, cls: "c2" }, { pct: 20, cls: "c3" }], C);
  assert.strictEqual(arcs[0].dash, "50 50");
  assert.strictEqual(arcs[1].dash, "30 70");
  assert.strictEqual(arcs[0].offset, -0);
  assert.strictEqual(arcs[1].offset, -50);
  assert.strictEqual(arcs[2].offset, -80);
  const totalLen = arcs.reduce((a, x) => a + parseFloat(x.dash), 0);
  assert.strictEqual(totalLen, 100);
});
t("donut renders one circle per segment plus track", () => {
  const svg = c.donut([{ pct: 60, cls: "c1" }, { pct: 40, cls: "c2" }], { centerLabel: "$1,000" });
  assert.strictEqual((svg.match(/donut-seg/g) || []).length, 2);
  assert(svg.includes("donut-track"));
  assert(svg.includes("$1,000"));
});
t("linePoints spans padded box, y inverted", () => {
  const pts = c.linePoints([0, 10], 100, 50, 4);
  assert.deepStrictEqual(pts[0], [4, 46]);   // min value → bottom
  assert.deepStrictEqual(pts[1], [96, 4]);   // max value → top
});
t("linePoints flat series doesn't divide by zero", () => {
  const pts = c.linePoints([5, 5, 5], 100, 50);
  assert(pts.every(p => Number.isFinite(p[1])));
});
t("areaLine handles short data and renders baseline when in range", () => {
  assert(c.areaLine([1]).includes("chart-empty"));
  const svg = c.areaLine([-10, 20, 5], { baseline: 0 });
  assert(svg.includes("area-baseline"));
  assert(svg.includes("area-line"));
  const none = c.areaLine([10, 20], { baseline: 0 }); // 0 below min → no baseline
  assert(!none.includes("area-baseline"));
});
t("sparkline empty for <2 points", () => {
  assert.strictEqual(c.sparkline([3]), "");
  assert(c.sparkline([1, 2, 3]).includes("spark-line"));
});

console.log(`charts.test.js: ${passed} passed${process.exitCode ? " (with failures)" : ""}`);
