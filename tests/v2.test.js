/* Unit tests for Keel v2 pure logic — run with `node tests/v2.test.js`. */
const assert = require("assert");
const f = require("../js/data.js");

let passed = 0;
function t(name, fn) {
  try { fn(); passed++; }
  catch (e) { console.error(`✗ ${name}\n  ${e.message}`); process.exitCode = 1; }
}

/* ------------------------------ rules ------------------------------------- */
t("applyRules matches case-insensitively across texts, respects order+enabled", () => {
  const rules = [
    { match: "starbucks", categoryId: "dining", enabled: false },
    { match: "UBER", categoryId: "transport" },
    { match: "star", categoryId: "shopping" },
  ];
  assert.strictEqual(f.applyRules(rules, "Uber Trip 123"), "transport");
  assert.strictEqual(f.applyRules(rules, null, "STARBUCKS #42"), "shopping"); // disabled rule skipped
  assert.strictEqual(f.applyRules(rules, "grocery run"), null);
  assert.strictEqual(f.applyRules([], "anything"), null);
});

/* ------------------------------ CSV parser -------------------------------- */
t("parseCSV: quotes, escaped quotes, CRLF, embedded newlines/commas", () => {
  const rows = f.parseCSV('a,b,c\r\n"1,5","say ""hi""","line1\nline2"\r\nx,y,z');
  assert.deepStrictEqual(rows[0], ["a", "b", "c"]);
  assert.deepStrictEqual(rows[1], ["1,5", 'say "hi"', "line1\nline2"]);
  assert.deepStrictEqual(rows[2], ["x", "y", "z"]);
});
t("parseCSV: semicolon delimiter auto-detected", () => {
  const rows = f.parseCSV("Datum;Betrag;Details\n01.02.2026;-12,50;Kaffee");
  assert.deepStrictEqual(rows[1], ["01.02.2026", "-12,50", "Kaffee"]);
});
t("detectCSVColumns finds standard bank headers", () => {
  const m = f.detectCSVColumns(["Transaction Date", "Description", "Debit", "Credit", "Balance"]);
  assert.strictEqual(m.date, 0);
  assert.strictEqual(m.description, 1);
  assert.strictEqual(m.debit, 2);
  assert.strictEqual(m.credit, 3);
  assert.strictEqual(m.amount, null);
});
t("guessDateFormat: dmy when first part >12, ymd for ISO, mdy default", () => {
  assert.strictEqual(f.guessDateFormat(["13/02/2026", "01/03/2026"]), "dmy");
  assert.strictEqual(f.guessDateFormat(["2026-02-13"]), "ymd");
  assert.strictEqual(f.guessDateFormat(["02/13/2026"]), "mdy"); // middle >12
  assert.strictEqual(f.guessDateFormat(["01/02/2026"]), "mdy");
});
t("parseCSVDate handles iso, mdy, dmy, 2-digit years; rejects garbage", () => {
  assert.strictEqual(f.parseCSVDate("2026-02-13", "mdy"), "2026-02-13");
  assert.strictEqual(f.parseCSVDate("02/13/2026", "mdy"), "2026-02-13");
  assert.strictEqual(f.parseCSVDate("13.02.2026", "dmy"), "2026-02-13");
  assert.strictEqual(f.parseCSVDate("1/2/26", "mdy"), "2026-01-02");
  assert.strictEqual(f.parseCSVDate("13/13/2026", "mdy"), null);
  assert.strictEqual(f.parseCSVDate("not a date", "mdy"), null);
});
t("parseCSVAmount: US, EU, parentheses-negative, currency symbols", () => {
  assert.strictEqual(f.parseCSVAmount("1,234.56"), 1234.56);
  assert.strictEqual(f.parseCSVAmount("1.234,56"), 1234.56);
  assert.strictEqual(f.parseCSVAmount("-12,50"), -12.5);
  assert.strictEqual(f.parseCSVAmount("$45.00"), 45);
  assert.strictEqual(f.parseCSVAmount("(30.25)"), -30.25);
  assert.strictEqual(f.parseCSVAmount(""), null);
});
t("mapCSVRows: signed amount, dedupe by importKey, rules applied, bad rows skipped", () => {
  const rows = [
    ["02/01/2026", "-20.00", "UBER TRIP"],
    ["02/02/2026", "1500.00", "EMPLOYER PAYROLL"],
    ["02/01/2026", "-20.00", "UBER TRIP"],   // dupe within file
    ["garbage", "x", "y"],
  ];
  const rules = [{ match: "uber", categoryId: "transport" }];
  const res = f.mapCSVRows(rows, { date: 0, amount: 1, description: 2 }, "mdy", rules, []);
  assert.strictEqual(res.txns.length, 2);
  assert.strictEqual(res.skippedDupes, 1);
  assert.strictEqual(res.skippedBad, 1);
  assert.strictEqual(res.txns[0].type, "expense");
  assert.strictEqual(res.txns[0].amount, 20);
  assert.strictEqual(res.txns[0].suggestedCategory, "transport");
  assert.strictEqual(res.txns[1].type, "income");
  // existing keys skip on re-import
  const again = f.mapCSVRows(rows, { date: 0, amount: 1, description: 2 }, "mdy", rules, res.txns.map(t => t.importKey));
  assert.strictEqual(again.txns.length, 0);
  assert.strictEqual(again.skippedDupes, 3);
});
t("mapCSVRows: split debit/credit columns", () => {
  const rows = [["01/05/2026", "12.00", "", "COFFEE"], ["01/06/2026", "", "500.00", "REFUND"]];
  const res = f.mapCSVRows(rows, { date: 0, debit: 1, credit: 2, description: 3 }, "mdy", [], []);
  assert.strictEqual(res.txns[0].type, "expense");
  assert.strictEqual(res.txns[1].type, "income");
  assert.strictEqual(res.txns[1].amount, 500);
});

/* ------------------------------ simplefin mapper --------------------------- */
t("mapSimplefinTransactions: signs, pending skip, bankId dedupe, balances", () => {
  const resp = { accounts: [{
    id: "ACT-1", name: "Checking", org: { name: "Demo Bank" }, balance: "1024.50", "balance-date": 1751600000,
    transactions: [
      { id: "T1", posted: 1751500000, amount: "-35.50", description: "bait", payee: "Johns Fishin Shack" },
      { id: "T2", posted: 1751500000, amount: "2000.00", description: "PAYROLL" },
      { id: "T3", posted: 1751500000, amount: "-9.99", description: "pending thing", pending: true },
      { id: "T4", posted: 1751500000, amount: "0", description: "zero" },
    ],
  }]};
  const rules = [{ match: "fishin", categoryId: "entertainment" }];
  const r = f.mapSimplefinTransactions(resp, [], rules);
  assert.strictEqual(r.txns.length, 2);
  assert.strictEqual(r.txns[0].type, "expense");
  assert.strictEqual(r.txns[0].suggestedCategory, "entertainment");
  assert.strictEqual(r.txns[0].bankId, "ACT-1:T1");
  assert.strictEqual(r.txns[0].inbox, true);
  assert.strictEqual(r.txns[1].type, "income");
  assert.strictEqual(r.accounts[0].balance, 1024.5);
  assert.strictEqual(r.accounts[0].org, "Demo Bank");
  // dedupe on second sync
  const r2 = f.mapSimplefinTransactions(resp, r.txns.map(t => t.bankId), rules);
  assert.strictEqual(r2.txns.length, 0);
});

/* ------------------------------ rollover ----------------------------------- */
t("rolloverCarry: surplus and deficit accumulate across closed months", () => {
  const budgets = { groceries: { mode: "fixed", value: 400, rollover: true, rolloverSince: "2026-01" } };
  const txns = [
    { type: "expense", source: "variable", category: "groceries", amount: 300, date: "2026-01-10" }, // +100
    { type: "expense", source: "variable", category: "groceries", amount: 450, date: "2026-02-10" }, // −50
  ];
  assert.strictEqual(f.rolloverCarry(txns, budgets, [], "groceries", "2026-03", 5000), 50);
  // current month spend doesn't count toward carry
  assert.strictEqual(f.rolloverCarry(txns, budgets, [], "groceries", "2026-02", 5000), 100);
  // disabled → 0
  assert.strictEqual(f.rolloverCarry(txns, { groceries: { mode: "fixed", value: 400 } }, [], "groceries", "2026-03", 5000), 0);
});

console.log(`v2.test.js: ${passed} passed${process.exitCode ? " (with failures)" : ""}`);
