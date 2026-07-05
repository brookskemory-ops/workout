/* Unit tests for Keel v3 logic — run with `node tests/v3.test.js`. */
const assert = require("assert");
const f = require("../js/data.js");

let passed = 0;
function t(name, fn) {
  try { fn(); passed++; }
  catch (e) { console.error(`✗ ${name}\n  ${e.message}`); process.exitCode = 1; }
}
const exp = (date, amount, note, extra = {}) => ({ type: "expense", source: "variable", date, amount, note, ...extra });

/* ------------------------- merchants ------------------------- */
t("merchantKey strips processor junk and ids", () => {
  assert.strictEqual(f.merchantKey("SQ *BLUE BOTTLE #4821"), "blue bottle");
  assert.strictEqual(f.merchantKey("PAYPAL *SPOTIFY 402935"), "spotify");
  assert.strictEqual(f.merchantKey("NETFLIX.COM 866-579-7172"), "netflix com");
  assert.strictEqual(f.merchantKey("Whole Foods Market 10293"), "whole foods market");
  assert.strictEqual(f.merchantKey("AMZN Mktp US*RT4Y7"), "us");
});
t("prettyMerchant title-cases the key", () => {
  assert.strictEqual(f.prettyMerchant("SQ *BLUE BOTTLE #4821"), "Blue Bottle");
  assert.strictEqual(f.prettyMerchant("whole foods market 123"), "Whole Foods Market");
});

/* ------------------------- recurring detection ------------------------- */
t("detectRecurring: monthly subscription with 3 hits", () => {
  const txns = [
    exp("2026-04-05", 15.49, "NETFLIX.COM"),
    exp("2026-05-05", 15.49, "NETFLIX.COM"),
    exp("2026-06-05", 15.49, "NETFLIX.COM"),
  ];
  const r = f.detectRecurring(txns);
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].cadence, "monthly");
  assert.strictEqual(r[0].nextDate, "2026-07-05");
  assert.strictEqual(Math.round(r[0].monthlyCost), 15);
  assert.strictEqual(r[0].priceIncreased, false);
});
t("detectRecurring: price increase flagged", () => {
  const r = f.detectRecurring([
    exp("2026-04-05", 9.99, "SPOTIFY"),
    exp("2026-05-05", 9.99, "SPOTIFY"),
    exp("2026-06-05", 11.99, "SPOTIFY"),
  ]);
  assert.strictEqual(r[0].priceIncreased, true);
  assert.strictEqual(r[0].amount, 11.99);
  assert.strictEqual(r[0].prevAmount, 9.99);
});
t("detectRecurring: weekly needs >=3, irregular gaps rejected, bills excluded", () => {
  // only 2 weekly hits -> too few
  assert.strictEqual(f.detectRecurring([exp("2026-06-01", 5, "GYM"), exp("2026-06-08", 5, "GYM")]).length, 0);
  // irregular spacing
  assert.strictEqual(f.detectRecurring([
    exp("2026-03-01", 40, "SHOP X"), exp("2026-03-29", 40, "SHOP X"), exp("2026-06-25", 40, "SHOP X"),
  ]).length, 0);
  // bill-linked excluded
  assert.strictEqual(f.detectRecurring([
    exp("2026-04-01", 15, "HULU", { fixedBillId: "b1" }),
    exp("2026-05-01", 15, "HULU", { fixedBillId: "b1" }),
    exp("2026-06-01", 15, "HULU", { fixedBillId: "b1" }),
  ]).length, 0);
  // amounts that don't cluster rejected
  assert.strictEqual(f.detectRecurring([
    exp("2026-04-03", 20, "CAFE"), exp("2026-05-03", 90, "CAFE"), exp("2026-06-03", 20, "CAFE"),
  ]).length, 0);
});
t("detectRecurring: ignored keys skipped; annual detected", () => {
  const annual = [exp("2025-06-10", 99, "AMAZON PRIME"), exp("2026-06-10", 99, "AMAZON PRIME")];
  assert.strictEqual(f.detectRecurring(annual)[0].cadence, "annual");
  assert.strictEqual(f.detectRecurring(annual, ["amazon prime"]).length, 0);
});

/* ------------------------- forecast ------------------------- */
t("forecastMonth: paydays and bills land on their days; safePerDay sane", () => {
  const income = { expectedIncome: 2000, incomeFrequency: "semimonthly", payAnchor: "2026-07-01" };
  const bills = [{ id: "b1", name: "Rent", amount: 1500, category: "rent", dueDay: 25, active: true }];
  const txns = [
    { type: "income", source: "income", date: "2026-07-01", amount: 2000, category: "paycheck", note: "" },
    exp("2026-07-03", 120, "GROCER"),
  ];
  const fc = f.forecastMonth({ transactions: txns, bills, income, recurringList: [
    { key: "netflix", name: "Netflix", amount: 15, monthlyCost: 15, nextDate: "2026-07-20", cadence: "monthly" },
  ], key: "2026-07", today: "2026-07-04" });
  assert.strictEqual(fc.series.length, 31);
  const evByKind = Object.fromEntries(fc.events.map(e => [e.kind, e]));
  assert.strictEqual(evByKind.payday.date, "2026-07-16");   // semimonthly partner of the 1st
  assert.strictEqual(evByKind.bill.date, "2026-07-25");
  assert.strictEqual(evByKind.renewal.date, "2026-07-20");
  // actuals: day 4 cumulative = 2000 - 120 = 1880
  assert.strictEqual(fc.series[3], 1880);
  // monotonic bumps: day 16 adds payday
  assert(fc.series[15] > fc.series[14]);
  // safePerDay: income 4000/mo(2 checks), bills 1500, subs 15, spent 120, 28 days left
  const expected = (4000 - 1500 - 15 - 120) / 28;
  assert(Math.abs(fc.safePerDay - expected) < 0.01, `safePerDay ${fc.safePerDay} vs ${expected}`);
  assert(fc.projectedNet !== null && Number.isFinite(fc.projectedNet));
});
t("forecastMonth: no income schedule → safePerDay null; paid bills not double-counted", () => {
  const bills = [{ id: "b1", name: "Rent", amount: 1500, category: "rent", dueDay: 25, active: true }];
  const txns = [{ type: "expense", source: "fixed", fixedBillId: "b1", date: "2026-07-02", amount: 1500, category: "rent", note: "Rent" }];
  const fc = f.forecastMonth({ transactions: txns, bills, income: {}, recurringList: [], key: "2026-07", today: "2026-07-04" });
  assert.strictEqual(fc.safePerDay, null);
  assert.strictEqual(fc.events.filter(e => e.kind === "bill").length, 0);
});

/* ------------------------- insights ------------------------- */
t("spendingAnomalies: flags pace >130% of 3-mo avg, respects floors", () => {
  const txns = [
    exp("2026-04-10", 100, "food"), exp("2026-05-10", 100, "food"), exp("2026-06-10", 100, "food"),
    exp("2026-07-02", 90, "food"),
  ].map(x => ({ ...x, category: "dining" }));
  // by Jul 4 (frac 4/31), pace = 90/(4/31) ≈ 697 vs avg 100 → flagged
  const a = f.spendingAnomalies(txns, "2026-07", "2026-07-04");
  assert.strictEqual(a.length, 1);
  assert.strictEqual(a[0].category.id, "dining");
  assert(a[0].pacePct > 100);
  // low avg categories ignored
  const tiny = [
    exp("2026-04-10", 3, "x"), exp("2026-05-10", 3, "x"), exp("2026-07-02", 9, "x"),
  ].map(x => ({ ...x, category: "gifts" }));
  assert.strictEqual(f.spendingAnomalies(tiny, "2026-07", "2026-07-04").length, 0);
});
t("topMerchants groups by cleaned key", () => {
  const txns = [
    exp("2026-07-01", 20, "SQ *BLUE BOTTLE #1"),
    exp("2026-07-02", 25, "SQ *BLUE BOTTLE #2"),
    exp("2026-07-03", 100, "COSTCO WHOLESALE 887"),
  ];
  const top = f.topMerchants(txns, "2026-07", 5);
  assert.strictEqual(top[0].name, "Costco Wholesale");
  assert.strictEqual(top[1].total, 45);
  assert.strictEqual(top[1].count, 2);
});

/* ------------------------- import mappers carry rawNote ------------------------- */
t("mapCSVRows produces pretty note + rawNote", () => {
  const res = f.mapCSVRows([["07/01/2026", "-20.00", "SQ *BLUE BOTTLE #4821"]],
    { date: 0, amount: 1, description: 2 }, "mdy", [], []);
  assert.strictEqual(res.txns[0].note, "Blue Bottle");
  assert.strictEqual(res.txns[0].rawNote, "SQ *BLUE BOTTLE #4821");
});

console.log(`v3.test.js: ${passed} passed${process.exitCode ? " (with failures)" : ""}`);

/* ------------------------- flow chart geometry ------------------------- */
const c = require("../js/charts.js");
{
  let ok = true;
  try {
    const spans = c.flowSpans(100, [{ value: 60 }, { value: 40 }], 106, 6);
    assert.strictEqual(Math.round(spans[0].y1L - spans[0].y0L), 60);
    assert.strictEqual(Math.round(spans[1].y1L - spans[1].y0L), 40);
    assert.strictEqual(spans[1].y0R - spans[0].y1R, 6); // gap between right nodes
    const svg = c.flowChart("Income", 100, [{ name: "Rent", value: 60, cls: "c1" }, { name: "Saved", value: 40, cls: "c2" }]);
    assert.strictEqual((svg.match(/flow-ribbon/g) || []).length, 2);
    assert(svg.includes("Income"));
    assert(c.flowChart("Income", 0, []).includes("chart-empty"));
  } catch (e) { ok = false; console.error("✗ flowChart geometry\n  " + e.message); process.exitCode = 1; }
  if (ok) { passed++; console.log(`(+flow) v3 total: ${passed} passed`); }
}
