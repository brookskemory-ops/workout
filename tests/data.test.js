/* Unit tests for js/data.js — run with `node tests/data.test.js`. Zero deps. */
const assert = require("assert");
const f = require("../js/data.js");

let passed = 0;
function t(name, fn) {
  try { fn(); passed++; }
  catch (e) { console.error(`✗ ${name}\n  ${e.message}`); process.exitCode = 1; }
}

/* ------------------------------ dates ------------------------------------- */
t("dateKey uses LOCAL components", () => {
  // 23:30 local on Jan 31 must stay Jan 31 regardless of the UTC date
  const d = new Date(2026, 0, 31, 23, 30);
  assert.strictEqual(f.dateKey(d), "2026-01-31");
  assert.strictEqual(f.monthKey(d), "2026-01");
});
t("dateKey/monthKey accept date keys and legacy ISO strings", () => {
  assert.strictEqual(f.dateKey("2026-03-05"), "2026-03-05");
  assert.strictEqual(f.monthKey("2026-03-05T23:59:00.000Z"), "2026-03");
});
t("addMonths / daysInMonth / addDaysKey / daysBetween", () => {
  assert.strictEqual(f.addMonths("2026-01", -1), "2025-12");
  assert.strictEqual(f.addMonths("2026-12", 1), "2027-01");
  assert.strictEqual(f.daysInMonth("2026-02"), 28);
  assert.strictEqual(f.daysInMonth("2024-02"), 29);
  assert.strictEqual(f.addDaysKey("2026-01-31", 1), "2026-02-01");
  assert.strictEqual(f.daysBetween("2026-01-01", "2026-01-31"), 30);
  assert.strictEqual(f.daysBetween("2026-01-31", "2026-01-01"), -30);
});
t("lastNMonthKeys ends at endKey, oldest first", () => {
  assert.deepStrictEqual(f.lastNMonthKeys(3, "2026-02"), ["2025-12", "2026-01", "2026-02"]);
});

/* ------------------------------ paydays ----------------------------------- */
t("nextPaydays biweekly steps 14 days from anchor", () => {
  assert.deepStrictEqual(
    f.nextPaydays("2026-01-02", "biweekly", "2026-01-10", 3),
    ["2026-01-16", "2026-01-30", "2026-02-13"]);
  // anchor itself counts when >= from
  assert.deepStrictEqual(f.nextPaydays("2026-01-02", "biweekly", "2026-01-02", 1), ["2026-01-02"]);
  // from before anchor still lands on anchor
  assert.deepStrictEqual(f.nextPaydays("2026-01-02", "weekly", "2025-12-30", 2), ["2026-01-02", "2026-01-09"]);
});
t("nextPaydays monthly clamps to short months", () => {
  assert.deepStrictEqual(
    f.nextPaydays("2026-01-31", "monthly", "2026-02-01", 3),
    ["2026-02-28", "2026-03-31", "2026-04-30"]);
});
t("nextPaydays semimonthly pairs anchor day with its +/-15 partner", () => {
  assert.deepStrictEqual(
    f.nextPaydays("2026-01-01", "semimonthly", "2026-01-01", 4),
    ["2026-01-01", "2026-01-16", "2026-02-01", "2026-02-16"]);
  assert.deepStrictEqual(
    f.nextPaydays("2026-01-30", "semimonthly", "2026-02-01", 2),
    ["2026-02-15", "2026-02-28"]); // 30th clamps in Feb
});
t("nextPaydays annually", () => {
  assert.deepStrictEqual(f.nextPaydays("2025-06-15", "annually", "2026-01-01", 2), ["2026-06-15", "2027-06-15"]);
});
t("nextPaydays with no anchor returns []", () => {
  assert.deepStrictEqual(f.nextPaydays(null, "monthly", "2026-01-01", 2), []);
});

/* ------------------------------ budget math ------------------------------- */
const CATS = f.EXPENSE_CATEGORIES;
const rentBill = { id: "b1", name: "Rent", amount: 1500, category: "rent", dueDay: 1, active: true };
t("budget == bill → planned = bill (the old double-count case)", () => {
  const budgets = { rent: { mode: "fixed", value: 1500 } };
  assert.strictEqual(f.categoryPlanned(budgets, [rentBill], "rent", 5000), 1500);
  // capacity: income 5000 − 1500 = 3500, NOT 5000 − 3000 = 2000
  assert.strictEqual(f.savingsCapacity(5000, budgets, [rentBill], CATS), 3500);
});
t("budget > bill → planned = budget", () => {
  const budgets = { rent: { mode: "fixed", value: 1800 } };
  assert.strictEqual(f.categoryPlanned(budgets, [rentBill], "rent", 5000), 1800);
});
t("budget < bill → floored at bill total", () => {
  const budgets = { rent: { mode: "fixed", value: 1000 } };
  assert.strictEqual(f.categoryPlanned(budgets, [rentBill], "rent", 5000), 1500);
});
t("no budget → planned = bills only; pure-variable unchanged", () => {
  assert.strictEqual(f.categoryPlanned({}, [rentBill], "rent", 5000), 1500);
  assert.strictEqual(f.categoryPlanned({ groceries: { mode: "fixed", value: 400 } }, [rentBill], "groceries", 5000), 400);
});
t("percent budgets resolve via income; legacy plain numbers normalize", () => {
  const budgets = { groceries: { mode: "percent", value: 10 }, dining: 200 };
  assert.strictEqual(f.categoryPlanned(budgets, [], "groceries", 5000), 500);
  assert.strictEqual(f.categoryPlanned(budgets, [], "dining", 5000), 200);
});
t("inactive bills don't count", () => {
  const inactive = { ...rentBill, active: false };
  assert.strictEqual(f.categoryPlanned({}, [inactive], "rent", 5000), 0);
});
t("savingsCapacity null without income, negative when over-planned", () => {
  assert.strictEqual(f.savingsCapacity(0, {}, [], CATS), null);
  assert.strictEqual(f.savingsCapacity(1000, { misc: { mode: "fixed", value: 1500 } }, [], CATS), -500);
});
t("budgetStatus counts fixed + variable spend against the target", () => {
  const txns = [
    { type: "expense", source: "fixed", category: "rent", amount: 1500, date: "2026-01-01" },
    { type: "expense", source: "variable", category: "rent", amount: 100, date: "2026-01-10" },
  ];
  const bs = f.budgetStatus(txns, { rent: { mode: "fixed", value: 1500 } }, [rentBill], "rent", "2026-01", 5000);
  assert.strictEqual(bs.spent, 1600);
  assert.strictEqual(bs.target, 1500);
  assert.strictEqual(bs.status, "over");
});

/* ------------------------------ aggregation ------------------------------- */
t("monthTotals splits income/fixed/variable and nets against expected fixed", () => {
  const txns = [
    { type: "income", amount: 3000, date: "2026-01-05" },
    { type: "expense", source: "fixed", category: "rent", amount: 1500, date: "2026-01-01" },
    { type: "expense", source: "variable", category: "dining", amount: 200, date: "2026-01-08" },
    { type: "expense", source: "variable", category: "dining", amount: 50, date: "2026-02-01" }, // other month
  ];
  const mt = f.monthTotals(txns, [rentBill], "2026-01");
  assert.deepStrictEqual(
    { income: mt.income, variable: mt.variable, fixedPaid: mt.fixedPaid, fixedExpected: mt.fixedExpected, net: mt.net },
    { income: 3000, variable: 200, fixedPaid: 1500, fixedExpected: 1500, net: 1300 });
});

/* ------------------------------ payoff sim -------------------------------- */
t("payoff: zero-APR debt pays off on schedule; freed minimums cascade", () => {
  const debts = [
    { id: "a", name: "A", balance: 1000, apr: 0, minPayment: 100 },
    { id: "b", name: "B", balance: 500, apr: 0, minPayment: 50 },
  ];
  const plan = f.computePayoffPlan(debts, "snowball", 0, "2026-01");
  const a = plan.order.find(d => d.id === "a"), b = plan.order.find(d => d.id === "b");
  assert.strictEqual(b.paidOffMonth, 10);         // 500/50
  assert.strictEqual(a.paidOffMonth, 10);         // 100/mo ×10 = 1000... cascade makes it exactly 10
  assert.strictEqual(plan.capped, false);
  assert.strictEqual(plan.debtFreeDate, "2026-11");
});
t("payoff: avalanche orders by APR and accrues interest", () => {
  const debts = [
    { id: "lo", name: "Low", balance: 1000, apr: 5, minPayment: 50 },
    { id: "hi", name: "High", balance: 1000, apr: 25, minPayment: 50 },
  ];
  const plan = f.computePayoffPlan(debts, "avalanche", 100, "2026-01");
  const hi = plan.order.find(d => d.id === "hi"), lo = plan.order.find(d => d.id === "lo");
  assert(hi.paidOffMonth < lo.paidOffMonth, "high APR should clear first");
  assert(plan.totalInterest > 0);
});
t("payoff: impossible payment caps at 600 months", () => {
  const plan = f.computePayoffPlan([{ id: "x", name: "X", balance: 100000, apr: 40, minPayment: 10 }], "avalanche", 0);
  assert.strictEqual(plan.capped, true);
  assert.strictEqual(plan.debtFreeDate, null);
});

/* ------------------------------ net worth --------------------------------- */
t("net worth = active goal balances + portfolio − debts", () => {
  const goals = [{ id: "g1", achieved: false }, { id: "g2", achieved: true }];
  const contribs = [
    { goalId: "g1", amount: 400 }, { goalId: "g1", amount: 100 }, { goalId: "g2", amount: 999 },
  ];
  assert.strictEqual(f.goalsBalanceTotal(goals, contribs), 500);
  assert.strictEqual(f.debtsTotal([{ balance: 300 }]), 300);
  assert.strictEqual(f.netWorthTotal(500, 1000, 300), 1200);
});

/* ------------------------------ CSV --------------------------------------- */
t("CSV escapes commas, quotes, newlines; sorts by date", () => {
  const txns = [
    { date: "2026-02-01", type: "expense", source: "variable", category: "dining", amount: 12.5, note: 'say "hi", ok?' },
    { date: "2026-01-15", type: "income", source: "income", category: "paycheck", amount: 2000, note: "line1\nline2" },
  ];
  const csv = f.transactionsToCSV(txns, { dining: "Dining Out", paycheck: "Paycheck" });
  const lines = csv.split("\r\n");
  assert.strictEqual(lines[0], "date,type,source,category,categoryName,amount,note");
  assert(lines[1].startsWith("2026-01-15"), "sorted ascending");
  assert(lines[1].includes('"line1\nline2"'));
  assert(lines[2].includes('"say ""hi"", ok?"'));
});

/* ------------------------------ invest (regression) ----------------------- */
t("risk quiz gates and allocations still hold", () => {
  const maxA = { age: 0, horizon: 3, reaction: 3, experience: 2, stability: 2, efund: 3 };
  assert.strictEqual(f.scoreRiskQuiz(maxA).profileId, "aggressive");
  assert.strictEqual(f.scoreRiskQuiz({ ...maxA, horizon: 0 }).profileId, "conservative");
  assert.strictEqual(f.scoreRiskQuiz({ ...maxA, efund: 0 }).profileId, "balanced");
  for (const [id, p] of Object.entries(f.RISK_PROFILES)) {
    assert.strictEqual(Object.values(p.allocation).reduce((a, b) => a + b, 0), 100, id);
  }
  for (const monthly of [7, 333, 1234]) {
    for (const id of Object.keys(f.RISK_PROFILES)) {
      const total = f.buildInvestPlan(id, monthly).reduce((a, r) => a + r.amount, 0);
      assert.strictEqual(total, monthly, `${id} @ ${monthly}`);
    }
  }
});
t("holding valuation prefers live > manual > cost; breakdown groups buckets", () => {
  const h = { kind: "crypto", symbol: "BTC", quantity: 0.5, costPerUnit: 40000, manualPrice: 50000 };
  assert.strictEqual(f.holdingValue(h, {}), 25000);
  assert.strictEqual(f.holdingValue(h, { "crypto:BTC": { price: 60000 } }), 30000);
  const bd = f.portfolioBreakdown([
    { kind: "stock", symbol: "BND", quantity: 10, manualPrice: 70 },
    { kind: "crypto", symbol: "ETH", quantity: 1, manualPrice: 300 },
  ], {});
  assert.strictEqual(bd.total, 1000);
  assert.strictEqual(bd.rows.find(r => r.bucket.id === "bonds").pct, 70);
});

/* ------------------------------ migration --------------------------------- */
t("migrateFromMonsterMode maps fields, normalizes budgets and dates", () => {
  const old = {
    profile: { name: "Brooks" }, sessions: [{ big: "fitness blob" }],
    finance: {
      currency: "€",
      fixedExpenses: [{ id: "b1", name: "Rent", amount: 900, category: "rent", dueDay: 1, active: true }],
      transactions: [{ id: "t1", date: "2026-05-02T18:30:00.000Z", amount: 20, category: "dining", type: "expense", source: "variable" }],
      budgets: { dining: 150, groceries: { mode: "percent", value: 12 } },
      customCategories: [{ id: "custom_x", name: "Pets", icon: "🐕", type: "expense" }],
      goals: [{ id: "g1", name: "EF", kind: "savings", target: 3000, achieved: false }],
      contributions: [{ id: "c1", goalId: "g1", amount: 100, date: "2026-05-01T10:00:00.000Z" }],
      debts: [{ id: "d1", name: "Visa", balance: 1200, apr: 22, minPayment: 40 }],
      debtStrategy: "snowball", debtExtraPayment: 50,
      expectedIncome: 2000, incomeFrequency: "biweekly",
      invest: { quizAnswers: { age: 0 }, holdings: [{ id: "h1", kind: "crypto", symbol: "BTC", quantity: 0.1 }], priceCache: {}, monthlyOverride: null, finnhubKey: "k" },
    },
  };
  const m = f.migrateFromMonsterMode(old);
  assert.strictEqual(m.settings.currency, "€");
  assert.strictEqual(m.settings.onboarded, true);
  assert.strictEqual(m.income.expectedIncome, 2000);
  assert.strictEqual(m.income.incomeFrequency, "biweekly");
  assert.strictEqual(m.bills.length, 1);
  assert.match(m.transactions[0].date, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepStrictEqual(m.budgets.dining, { mode: "fixed", value: 150 });
  assert.deepStrictEqual(m.budgets.groceries, { mode: "percent", value: 12 });
  assert.strictEqual(m.debtStrategy, "snowball");
  assert.strictEqual(m.invest.finnhubKey, "k");
  assert.deepStrictEqual(m.invest.snapshots, []);
  assert.strictEqual(m.migratedFrom, "monsterMode.v1");
  // pure: input untouched
  assert.strictEqual(old.finance.budgets.dining, 150);
});
t("migrateFromMonsterMode returns null without a finance slice; empty data → not onboarded", () => {
  assert.strictEqual(f.migrateFromMonsterMode({ profile: {} }), null);
  assert.strictEqual(f.migrateFromMonsterMode(null), null);
  const m = f.migrateFromMonsterMode({ finance: { transactions: [], fixedExpenses: [] } });
  assert.strictEqual(m.settings.onboarded, false);
});

console.log(`data.test.js: ${passed} passed${process.exitCode ? " (with failures)" : ""}`);
