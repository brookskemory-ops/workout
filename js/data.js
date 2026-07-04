/* ============================================================================
 * KEEL — pure data & logic layer. No DOM, no state access: everything here
 * takes plain arguments and returns plain values, so it runs in the browser
 * (globals) and under node (module.exports guard) for unit tests.
 * ==========================================================================*/

/* ------------------------------ categories -------------------------------- */
// `typical` hints which list a category belongs to by default (bills vs
// day-to-day spending) — any category can be used for either.
const EXPENSE_CATEGORIES = [
  { id: "groceries",     name: "Groceries",        icon: "🛒", typical: "variable" },
  { id: "dining",        name: "Dining Out",       icon: "🍽️", typical: "variable" },
  { id: "transport",     name: "Transport / Gas",  icon: "⛽", typical: "variable" },
  { id: "shopping",      name: "Shopping",         icon: "🛍️", typical: "variable" },
  { id: "entertainment", name: "Entertainment",    icon: "🎬", typical: "variable" },
  { id: "health",        name: "Health / Medical", icon: "💊", typical: "variable" },
  { id: "personal",      name: "Personal Care",    icon: "💇", typical: "variable" },
  { id: "travel",        name: "Travel",           icon: "✈️", typical: "variable" },
  { id: "gifts",         name: "Gifts / Donations",icon: "🎁", typical: "variable" },
  { id: "misc",          name: "Misc",             icon: "📦", typical: "variable" },
  { id: "rent",          name: "Rent / Mortgage",  icon: "🏠", typical: "fixed" },
  { id: "utilities",     name: "Utilities",        icon: "💡", typical: "fixed" },
  { id: "insurance",     name: "Insurance",        icon: "🛡️", typical: "fixed" },
  { id: "subscriptions", name: "Subscriptions",    icon: "📺", typical: "fixed" },
  { id: "loan",          name: "Loan / Debt Payment", icon: "🏦", typical: "fixed" },
];

const INCOME_CATEGORIES = [
  { id: "paycheck",     name: "Paycheck",                icon: "💼" },
  { id: "freelance",    name: "Freelance / Side Income", icon: "🧾" },
  { id: "bonus",        name: "Bonus",                   icon: "🎉" },
  { id: "gift_in",      name: "Gift Received",           icon: "🎁" },
  { id: "other_income", name: "Other Income",            icon: "➕" },
];

const EXPENSE_CAT_BY_ID = Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.id, c]));
const INCOME_CAT_BY_ID = Object.fromEntries(INCOME_CATEGORIES.map(c => [c.id, c]));

// Commonly-cited rule-of-thumb ranges for what share of monthly income a
// category might take — a starting suggestion, not personalized advice.
const RECOMMENDED_BUDGET_PCT = {
  rent: { min: 25, max: 35 },
  utilities: { min: 5, max: 10 },
  insurance: { min: 5, max: 10 },
  subscriptions: { min: 1, max: 3 },
  loan: { min: 5, max: 15 },
  groceries: { min: 10, max: 15 },
  dining: { min: 3, max: 7 },
  transport: { min: 10, max: 15 },
  shopping: { min: 3, max: 8 },
  entertainment: { min: 3, max: 5 },
  health: { min: 3, max: 8 },
  personal: { min: 2, max: 5 },
  travel: { min: 2, max: 5 },
  gifts: { min: 1, max: 3 },
  misc: { min: 2, max: 5 },
};
const RECOMMENDED_SAVINGS_PCT = 20; // the "20" in 50/30/20

/* ------------------------------ pay frequency ----------------------------- */
const INCOME_FREQUENCIES = {
  weekly:      { label: "Weekly",                     perYear: 52 },
  biweekly:    { label: "Biweekly (every 2 weeks)",   perYear: 26 },
  semimonthly: { label: "Semi-monthly (twice/month)", perYear: 24 },
  monthly:     { label: "Monthly",                    perYear: 12 },
  annually:    { label: "Annually",                   perYear: 1 },
};
function toMonthlyAmount(amount, frequency) {
  const f = INCOME_FREQUENCIES[frequency] || INCOME_FREQUENCIES.monthly;
  return (amount * f.perYear) / 12;
}
function fromMonthlyAmount(monthlyAmount, frequency) {
  const f = INCOME_FREQUENCIES[frequency] || INCOME_FREQUENCIES.monthly;
  return (monthlyAmount * 12) / f.perYear;
}

/* ------------------------------ dates (LOCAL) ----------------------------- */
// All keys are LOCAL-time based ("YYYY-MM-DD" / "YYYY-MM"), never UTC — a
// transaction logged at 11pm belongs to the day the user experienced.
function dateKey(d) {
  const dt = d instanceof Date ? d : parseDateKey(d);
  const p = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}
// Parses "YYYY-MM-DD" (or any string starting with it, e.g. legacy ISO
// timestamps) into a local-noon Date, dodging TZ day-shift.
function parseDateKey(s) {
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return new Date(s);
  return new Date(+m[1], +m[2] - 1, +m[3], 12);
}
function todayKey() { return dateKey(new Date()); }
function monthKey(d) { return dateKey(d).slice(0, 7); }
function currentMonthKey() { return monthKey(new Date()); }
function fmtMonth(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
function fmtMonthShort(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}
function addMonths(key, n) {
  const [y, m] = key.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + n, 1, 12));
}
function lastNMonthKeys(n, endKey) {
  const end = endKey || currentMonthKey();
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(addMonths(end, -i));
  return out;
}
function daysInMonth(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}
function addDaysKey(key, n) {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}
// Days between two date keys (b − a), sign-aware.
function daysBetween(a, b) {
  return Math.round((parseDateKey(b) - parseDateKey(a)) / 86400000);
}

/* ------------------------------ payday schedule --------------------------- */
// Next `n` paydays on/after `fromKey`, given a known payday `anchorKey` and a
// pay frequency. Semi-monthly uses the anchor's day-of-month plus its
// "opposite" day 15 apart (e.g. anchor on the 1st → 1st & 16th; on the 15th
// → 15th & 30th, clamped to month length). Monthly/annual clamp the anchor
// day to short months.
function nextPaydays(anchorKey, frequency, fromKey, n) {
  if (!anchorKey) return [];
  n = n || 1;
  const from = fromKey || todayKey();
  const out = [];

  if (frequency === "weekly" || frequency === "biweekly") {
    const step = frequency === "weekly" ? 7 : 14;
    let diff = daysBetween(anchorKey, from);
    let k = Math.ceil(diff / step) * step; // first multiple landing on/after `from`
    for (let i = 0; i < n; i++) out.push(addDaysKey(anchorKey, k + i * step));
    return out;
  }

  const anchorDay = +anchorKey.slice(8, 10);
  let days;
  if (frequency === "semimonthly") {
    const other = anchorDay <= 13 ? anchorDay + 15 : anchorDay - 15;
    days = [Math.min(anchorDay, other), Math.max(anchorDay, other)];
  } else {
    days = [anchorDay];
  }

  if (frequency === "annually") {
    const anchorMonth = +anchorKey.slice(5, 7);
    let y = +from.slice(0, 4);
    while (out.length < n) {
      const mk = `${y}-${String(anchorMonth).padStart(2, "0")}`;
      const key = `${mk}-${String(Math.min(anchorDay, daysInMonth(mk))).padStart(2, "0")}`;
      if (key >= from) out.push(key);
      y++;
    }
    return out;
  }

  // monthly & semimonthly: walk months emitting each pay day
  let mk = from.slice(0, 7);
  while (out.length < n) {
    for (const d of days) {
      const key = `${mk}-${String(Math.min(d, daysInMonth(mk))).padStart(2, "0")}`;
      if (key >= from && out.length < n) out.push(key);
    }
    mk = addMonths(mk, 1);
  }
  return out;
}

/* ------------------------------ aggregation ------------------------------- */
function txnsInMonth(transactions, key) {
  return transactions.filter(t => monthKey(t.date) === key);
}
function monthTotals(transactions, bills, key) {
  let income = 0, variable = 0, fixedPaid = 0;
  for (const t of txnsInMonth(transactions, key)) {
    if (t.type === "income") income += t.amount;
    else if (t.source === "fixed") fixedPaid += t.amount;
    else variable += t.amount;
  }
  const fixedExpected = activeBillsTotal(bills);
  return { income, variable, fixedPaid, fixedExpected, net: income - variable - fixedExpected };
}
// All expense spend in a category for a month; sourceFilter narrows to
// 'variable' or 'fixed' when needed.
function categorySpend(transactions, key, categoryId, sourceFilter) {
  return txnsInMonth(transactions, key)
    .filter(t => t.type === "expense" && t.category === categoryId && (!sourceFilter || t.source === sourceFilter))
    .reduce((a, t) => a + t.amount, 0);
}
// Rolling average of a category's total spend across months with any logged
// activity (skips dead pre-tracking months).
function categoryAverage(transactions, categoryId, months, endKey) {
  const keys = lastNMonthKeys(months || 3, endKey);
  const active = keys.filter(k => txnsInMonth(transactions, k).length > 0);
  if (!active.length) return 0;
  return active.reduce((a, k) => a + categorySpend(transactions, k, categoryId), 0) / active.length;
}

/* ------------------------------ budget math ------------------------------- */
// SEMANTICS: a category budget is the TOTAL planned monthly spend for that
// category, bills included. A category's planned amount is therefore its
// budget target if one is set (floored at its committed bills), else just its
// bills total. This is what fixes the old double-count where a $1500 rent
// bill AND a $1500 rent budget subtracted $3000 from income.
function normalizeBudgetEntry(raw) {
  if (raw == null) return null;
  if (typeof raw === "number") return { mode: "fixed", value: raw }; // legacy shape
  return raw;
}
function budgetTargetAmount(entry, monthlyIncome) {
  if (!entry) return null;
  if (entry.mode === "percent") {
    return monthlyIncome > 0 ? Math.round((entry.value / 100) * monthlyIncome) : 0;
  }
  return entry.value;
}
function activeBillsTotal(bills, categoryId) {
  return (bills || [])
    .filter(b => b.active !== false && (categoryId == null || b.category === categoryId))
    .reduce((a, b) => a + b.amount, 0);
}
function categoryPlanned(budgets, bills, categoryId, monthlyIncome) {
  const billTotal = activeBillsTotal(bills, categoryId);
  const target = budgetTargetAmount(normalizeBudgetEntry(budgets[categoryId]), monthlyIncome);
  return target != null ? Math.max(target, billTotal) : billTotal;
}
function plannedSpendTotal(budgets, bills, categories, monthlyIncome) {
  return categories.reduce((a, c) => a + categoryPlanned(budgets, bills, c.id, monthlyIncome), 0);
}
// The single source of truth for "how much is left each month" — used by the
// Budgets overview AND the Invest monthly suggestion. Can be negative.
function savingsCapacity(monthlyIncome, budgets, bills, categories) {
  if (!(monthlyIncome > 0)) return null;
  return Math.round(monthlyIncome - plannedSpendTotal(budgets, bills, categories, monthlyIncome));
}
// Progress vs target counts ALL spend in the category (bills + variable),
// matching the "total planned" meaning of a budget.
function budgetStatus(transactions, budgets, bills, categoryId, key, monthlyIncome) {
  const target = categoryPlanned(budgets, bills, categoryId, monthlyIncome);
  const hasBudget = normalizeBudgetEntry(budgets[categoryId]) != null;
  const spent = categorySpend(transactions, key, categoryId);
  if (!target) return { spent, target: null, pct: null, status: "none", hasBudget };
  const pct = Math.round((spent / target) * 100);
  const status = pct >= 100 ? "over" : pct >= 80 ? "warn" : "good";
  return { spent, target, pct, status, hasBudget };
}

/* ------------------------------ debt payoff ------------------------------- */
// Month-by-month simulation: interest accrues, minimums are always paid, and
// (extra + freed-up minimums from cleared debts) cascade onto whichever debt
// the chosen strategy targets first.
function computePayoffPlan(debts, strategy, extra, startKey) {
  if (!debts || !debts.length) return null;
  const list = debts.map(d => ({ id: d.id, name: d.name, balance: d.balance, apr: d.apr || 0, minPayment: d.minPayment, interestPaid: 0, paidOffMonth: null }));
  const order = strategy === "snowball"
    ? list.slice().sort((a, b) => a.balance - b.balance)
    : list.slice().sort((a, b) => (b.apr || 0) - (a.apr || 0));
  const maxMonths = 600;
  let month = 0, freedUp = 0;
  while (order.some(d => d.balance > 0.01) && month < maxMonths) {
    month++;
    const pool = (extra || 0) + freedUp;
    freedUp = 0;
    const target = order.find(d => d.balance > 0.01);
    for (const d of order) {
      if (d.balance <= 0.01) continue;
      const interest = d.balance * (d.apr / 100 / 12);
      d.interestPaid += interest;
      d.balance += interest;
      const payment = Math.min(d.minPayment + (d === target ? pool : 0), d.balance);
      d.balance -= payment;
      if (d.balance <= 0.01 && d.paidOffMonth === null) {
        d.paidOffMonth = month;
        freedUp += d.minPayment;
      }
    }
  }
  const capped = order.some(d => d.paidOffMonth === null);
  const totalMonths = capped ? maxMonths : Math.max(...order.map(d => d.paidOffMonth));
  const totalInterest = order.reduce((a, d) => a + d.interestPaid, 0);
  const debtFreeDate = capped ? null : addMonths(startKey || currentMonthKey(), totalMonths);
  return { order, totalMonths, totalInterest, debtFreeDate, capped };
}

/* ------------------------------ net worth --------------------------------- */
function goalsBalanceTotal(goals, contributions) {
  const activeIds = new Set((goals || []).filter(g => !g.achieved).map(g => g.id));
  return (contributions || []).filter(c => activeIds.has(c.goalId)).reduce((a, c) => a + c.amount, 0);
}
function debtsTotal(debts) {
  return (debts || []).reduce((a, d) => a + d.balance, 0);
}
function netWorthTotal(goalBalance, portfolioTotal, debtTotal) {
  return (goalBalance || 0) + (portfolioTotal || 0) - (debtTotal || 0);
}

/* ------------------------------ CSV export -------------------------------- */
// RFC-4180: quote fields containing commas, quotes, or newlines; double
// embedded quotes.
function csvField(v) {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function transactionsToCSV(transactions, categoryNameById) {
  const header = "date,type,source,category,categoryName,amount,note";
  const rows = transactions.slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map(t => [
      dateKey(t.date), t.type, t.source || "", t.category,
      (categoryNameById && categoryNameById[t.category]) || t.category,
      t.amount, t.note || "",
    ].map(csvField).join(","));
  return [header, ...rows].join("\r\n");
}

/* ------------------------------ category rules ---------------------------- */
// First enabled rule whose `match` appears (case-insensitive) in any of the
// given texts wins. Used to auto-categorize imported/synced transactions.
function applyRules(rules, ...texts) {
  const haystacks = texts.filter(Boolean).map(t => String(t).toLowerCase());
  for (const r of rules || []) {
    if (r.enabled === false || !r.match) continue;
    const needle = r.match.toLowerCase();
    if (haystacks.some(h => h.includes(needle))) return r.categoryId;
  }
  return null;
}

/* ------------------------------ CSV import -------------------------------- */
// RFC-4180-ish parser: quoted fields (with "" escapes), CR/LF/CRLF rows,
// auto-detected `,` or `;` delimiter. Returns array of string rows.
function parseCSV(text) {
  const firstLine = text.slice(0, text.indexOf("\n") + 1 || text.length);
  const delim = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ",";
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.length > 1 || row[0] !== "") rows.push(row);
  return rows;
}

// Guesses which column is which from a header row. Returns indices or null.
function detectCSVColumns(header) {
  const h = header.map(x => String(x).toLowerCase().trim());
  const find = (...names) => {
    for (const n of names) {
      const i = h.findIndex(col => col === n);
      if (i >= 0) return i;
    }
    for (const n of names) {
      const i = h.findIndex(col => col.includes(n));
      if (i >= 0) return i;
    }
    return null;
  };
  return {
    date: find("date", "posted", "transaction date", "datum"),
    amount: find("amount", "value", "betrag"),
    debit: find("debit", "withdrawal", "money out", "paid out"),
    credit: find("credit", "deposit", "money in", "paid in"),
    description: find("description", "memo", "details", "narrative", "reference", "name"),
    payee: find("payee", "merchant", "counterparty"),
  };
}

// Date-format guess across sample strings: if any first-part > 12 → day-first;
// if any middle-part > 12 → month-first; 4-digit lead → ISO.
function guessDateFormat(samples) {
  let sawBigFirst = false;
  for (const s of samples) {
    const m = String(s).trim().match(/^(\d{1,4})[\/\-.](\d{1,2})[\/\-.](\d{1,4})/);
    if (!m) continue;
    if (m[1].length === 4) return "ymd";
    if (+m[1] > 12) sawBigFirst = true;
    if (+m[2] > 12) return "mdy";
  }
  return sawBigFirst ? "dmy" : "mdy";
}
function parseCSVDate(s, fmt) {
  const str = String(s).trim();
  let m = str.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/); // ISO-ish
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (!m) return null;
  let [_, a, b, y] = m;
  if (y.length === 2) y = "20" + y;
  const [mo, d] = fmt === "dmy" ? [b, a] : [a, b];
  if (+mo < 1 || +mo > 12 || +d < 1 || +d > 31) return null;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}
function parseCSVAmount(s) {
  if (s == null || s === "") return null;
  const cleaned = String(s).replace(/[^0-9.,\-()]/g, "");
  const negParen = /^\(.*\)$/.test(String(s).trim());
  // 1.234,56 (EU) vs 1,234.56 (US): last separator wins as decimal point
  let normalized = cleaned.replace(/[()]/g, "");
  const lastComma = normalized.lastIndexOf(","), lastDot = normalized.lastIndexOf(".");
  if (lastComma > lastDot) normalized = normalized.replace(/\./g, "").replace(",", ".");
  else normalized = normalized.replace(/,/g, "");
  const n = parseFloat(normalized);
  if (isNaN(n)) return null;
  return negParen ? -Math.abs(n) : n;
}
function normalizeImportDesc(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
}
// Stable dedupe key so re-importing an overlapping statement skips rows the
// app has already seen.
function txnImportKey(date, amount, desc) {
  return `${date}|${Math.round(Math.abs(amount) * 100)}|${normalizeImportDesc(desc)}`;
}

// Maps parsed CSV rows through a column mapping into importable transactions.
// mapping: {date, amount|debit+credit, description?, payee?}, all indices.
function mapCSVRows(rows, mapping, dateFmt, rules, existingKeys) {
  const out = [], seen = new Set(existingKeys || []);
  let skippedDupes = 0, skippedBad = 0;
  for (const row of rows) {
    const date = parseCSVDate(row[mapping.date], dateFmt);
    let amount = null;
    if (mapping.amount != null) amount = parseCSVAmount(row[mapping.amount]);
    else {
      const debit = parseCSVAmount(mapping.debit != null ? row[mapping.debit] : null);
      const credit = parseCSVAmount(mapping.credit != null ? row[mapping.credit] : null);
      if (debit) amount = -Math.abs(debit);
      else if (credit) amount = Math.abs(credit);
    }
    if (!date || amount == null || amount === 0) { skippedBad++; continue; }
    const desc = [mapping.payee != null ? row[mapping.payee] : "", mapping.description != null ? row[mapping.description] : ""]
      .filter(Boolean).join(" · ").trim();
    const key = txnImportKey(date, amount, desc);
    if (seen.has(key)) { skippedDupes++; continue; }
    seen.add(key);
    out.push({
      date, amount: Math.abs(amount), note: desc,
      type: amount < 0 ? "expense" : "income",
      suggestedCategory: applyRules(rules, desc),
      importKey: key,
    });
  }
  return { txns: out, skippedDupes, skippedBad };
}

/* ============================================================================
 * INVESTING — risk quiz, model allocations, portfolio helpers. Commonly-cited
 * rule-of-thumb guidance for educational use — NOT personalized advice.
 * ==========================================================================*/
const RISK_QUIZ = [
  { id: "age", q: "How old are you?", opts: [
    { label: "Under 30", pts: 4 }, { label: "30–45", pts: 3 },
    { label: "45–60", pts: 2 }, { label: "60+", pts: 1 },
  ]},
  { id: "horizon", q: "When do you expect to need this money?", opts: [
    { label: "Under 3 years", pts: 0 }, { label: "3–7 years", pts: 2 },
    { label: "7–15 years", pts: 3 }, { label: "15+ years", pts: 4 },
  ]},
  { id: "reaction", q: "Your portfolio drops 25% in a month. What do you do?", opts: [
    { label: "Sell everything", pts: 0 }, { label: "Sell some", pts: 1 },
    { label: "Hold and wait", pts: 3 }, { label: "Buy more", pts: 4 },
  ]},
  { id: "experience", q: "How much investing experience do you have?", opts: [
    { label: "None yet", pts: 1 }, { label: "Some", pts: 2 }, { label: "Comfortable", pts: 3 },
  ]},
  { id: "stability", q: "How stable is your income?", opts: [
    { label: "Unpredictable", pts: 1 }, { label: "Somewhat stable", pts: 2 }, { label: "Very stable", pts: 3 },
  ]},
  { id: "efund", q: "Emergency fund: how many months of expenses do you have saved?", opts: [
    { label: "None", pts: 0 }, { label: "Under 3 months", pts: 1 },
    { label: "3–6 months", pts: 2 }, { label: "6+ months", pts: 3 },
  ]},
];
const RISK_QUIZ_MAX = RISK_QUIZ.reduce((a, q) => a + Math.max(...q.opts.map(o => o.pts)), 0);

const RISK_PROFILES = {
  conservative: {
    label: "Conservative", icon: "🛡️",
    blurb: "Capital preservation first. Mostly bonds and cash, a modest stock allocation, no crypto.",
    allocation: { us: 30, intl: 10, bonds: 50, cash: 10, crypto: 0 },
  },
  balanced: {
    label: "Balanced", icon: "⚖️",
    blurb: "A classic middle ground — mostly stocks for growth, a real bond cushion, a token crypto position.",
    allocation: { us: 45, intl: 15, bonds: 32, cash: 3, crypto: 5 },
  },
  growth: {
    label: "Growth", icon: "🌱",
    blurb: "Long-horizon growth. Stock-heavy with a small bond buffer and a satellite crypto position.",
    allocation: { us: 55, intl: 20, bonds: 15, cash: 2, crypto: 8 },
  },
  aggressive: {
    label: "Aggressive", icon: "🚀",
    blurb: "Maximum growth for a long horizon and a strong stomach. Nearly all stocks, crypto at the common ~10% ceiling.",
    allocation: { us: 60, intl: 25, bonds: 3, cash: 2, crypto: 10 },
  },
};

// `cls` maps to the CSS chart palette (--chart-1..6) — no hex in JS.
const ALLOCATION_BUCKETS = [
  { id: "us",     name: "US stocks",            icon: "📈", cls: "c1", examples: [
    { symbol: "VTI", name: "Vanguard Total US Market" },
    { symbol: "VOO", name: "Vanguard S&P 500" },
    { symbol: "SCHB", name: "Schwab Broad Market" },
  ]},
  { id: "intl",   name: "International stocks", icon: "🌍", cls: "c2", examples: [
    { symbol: "VXUS", name: "Vanguard Total International" },
    { symbol: "IXUS", name: "iShares Total International" },
  ]},
  { id: "bonds",  name: "Bonds",                icon: "🏛️", cls: "c6", examples: [
    { symbol: "BND", name: "Vanguard Total Bond" },
    { symbol: "AGG", name: "iShares Core US Bond" },
  ]},
  { id: "cash",   name: "Cash / T-bills",       icon: "💵", cls: "c4", examples: [
    { symbol: "SGOV", name: "iShares 0–3 Month Treasury" },
    { symbol: "HYSA", name: "High-yield savings account" },
  ]},
  { id: "crypto", name: "Crypto",               icon: "₿",  cls: "c3", examples: [
    { symbol: "BTC", name: "Bitcoin (~70% of crypto slice)" },
    { symbol: "ETH", name: "Ethereum (~30% of crypto slice)" },
  ]},
];
const BUCKET_BY_ID = Object.fromEntries(ALLOCATION_BUCKETS.map(b => [b.id, b]));

// Safety gates override the raw score: money needed within ~3 years
// shouldn't ride the stock market, and investing before any emergency fund
// exists is the cart before the horse.
function scoreRiskQuiz(answers) {
  if (!answers) return null;
  for (const q of RISK_QUIZ) if (answers[q.id] == null) return null;
  const score = RISK_QUIZ.reduce((a, q) => a + q.opts[answers[q.id]].pts, 0);
  const frac = score / RISK_QUIZ_MAX;
  let profileId = frac < 0.38 ? "conservative" : frac < 0.62 ? "balanced" : frac < 0.85 ? "growth" : "aggressive";
  const flags = [];
  if (answers.horizon === 0) { profileId = "conservative"; flags.push("shortHorizon"); }
  if (answers.efund === 0) {
    if (profileId === "growth" || profileId === "aggressive") profileId = "balanced";
    flags.push("noEmergencyFund");
  } else if (answers.efund === 1) {
    flags.push("thinEmergencyFund");
  }
  return { score, max: RISK_QUIZ_MAX, profileId, flags };
}

// Whole-dollar split that always sums exactly to `monthly`.
function buildInvestPlan(profileId, monthly) {
  const profile = RISK_PROFILES[profileId];
  if (!profile || !(monthly > 0)) return [];
  const rows = ALLOCATION_BUCKETS
    .map(b => ({ bucket: b, pct: profile.allocation[b.id] || 0 }))
    .filter(r => r.pct > 0)
    .map(r => ({ ...r, amount: Math.floor((r.pct / 100) * monthly) }));
  let leftover = Math.round(monthly) - rows.reduce((a, r) => a + r.amount, 0);
  const byPct = rows.slice().sort((a, b) => b.pct - a.pct);
  for (let i = 0; leftover > 0; i = (i + 1) % byPct.length, leftover--) byPct[i].amount++;
  return rows;
}

const CRYPTO_COINGECKO_IDS = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", XRP: "ripple", ADA: "cardano",
  DOGE: "dogecoin", DOT: "polkadot", LINK: "chainlink", LTC: "litecoin",
  AVAX: "avalanche-2", MATIC: "matic-network", POL: "polygon-ecosystem-token",
  UNI: "uniswap", ATOM: "cosmos", XLM: "stellar", BCH: "bitcoin-cash",
  SHIB: "shiba-inu", NEAR: "near", APT: "aptos", ARB: "arbitrum", OP: "optimism",
  TON: "the-open-network", TRX: "tron", BNB: "binancecoin", SUI: "sui",
  USDC: "usd-coin", USDT: "tether",
};

const STOCK_BUCKET_GUESS = {
  VTI: "us", VOO: "us", SPY: "us", IVV: "us", SCHB: "us", ITOT: "us", FXAIX: "us",
  QQQ: "us", VUG: "us", VTV: "us", SCHD: "us", VIG: "us",
  VXUS: "intl", IXUS: "intl", VEA: "intl", VWO: "intl", IEFA: "intl", IEMG: "intl", SCHF: "intl",
  BND: "bonds", AGG: "bonds", BNDX: "bonds", TLT: "bonds", IEF: "bonds", VGIT: "bonds", VTEB: "bonds",
  SGOV: "cash", BIL: "cash", SHV: "cash", HYSA: "cash",
};
function guessBucketForSymbol(symbol) {
  return STOCK_BUCKET_GUESS[(symbol || "").toUpperCase()] || "us";
}

// Live cached price > manual price > cost basis (so a new holding isn't $0).
function holdingValue(h, priceCache) {
  const cached = priceCache && priceCache[holdingPriceKey(h)];
  const price = (cached && cached.price) ?? h.manualPrice ?? h.costPerUnit ?? 0;
  return h.quantity * price;
}
function holdingPriceKey(h) {
  return h.kind === "crypto" ? `crypto:${(h.symbol || "").toUpperCase()}` : `stock:${(h.symbol || "").toUpperCase()}`;
}
function portfolioBreakdown(holdings, priceCache) {
  const totals = {};
  let total = 0;
  for (const h of holdings) {
    const bucketId = h.kind === "crypto" ? "crypto" : (h.bucket || guessBucketForSymbol(h.symbol));
    const v = holdingValue(h, priceCache);
    totals[bucketId] = (totals[bucketId] || 0) + v;
    total += v;
  }
  const rows = ALLOCATION_BUCKETS
    .filter(b => totals[b.id] > 0)
    .map(b => ({ bucket: b, value: totals[b.id], pct: total > 0 ? (totals[b.id] / total) * 100 : 0 }));
  return { rows, total };
}

/* ------------------------------ bank sync (SimpleFIN) --------------------- */
// Maps a SimpleFIN /accounts response into importable transactions. Pending
// transactions are skipped (they change/disappear); dedupe via bankId.
// Amounts are strings: negative = money out (expense).
function mapSimplefinTransactions(accountsResponse, existingBankIds, rules) {
  const seen = new Set(existingBankIds || []);
  const txns = [];
  const accounts = [];
  for (const acct of accountsResponse.accounts || []) {
    accounts.push({
      id: acct.id,
      name: acct.name || "Account",
      org: (acct.org && acct.org.name) || "",
      balance: parseFloat(acct.balance) || 0,
      balanceDate: acct["balance-date"] ? dateKey(new Date(acct["balance-date"] * 1000)) : null,
    });
    for (const t of acct.transactions || []) {
      if (t.pending) continue;
      const bankId = `${acct.id}:${t.id}`;
      if (seen.has(bankId)) continue;
      seen.add(bankId);
      const amount = parseFloat(t.amount);
      if (!amount) continue;
      const desc = [t.payee, t.description].filter(Boolean).join(" · ");
      txns.push({
        date: dateKey(new Date((t.transacted_at || t.posted) * 1000)),
        amount: Math.abs(amount),
        type: amount < 0 ? "expense" : "income",
        note: desc,
        suggestedCategory: applyRules(rules, t.payee, t.description),
        bankId, accountId: acct.id, inbox: true,
      });
    }
  }
  return { txns, accounts };
}

/* ------------------------------ rollover budgets --------------------------- */
// Envelope carry for a category: Σ over closed months since rolloverSince of
// (planned − spent), surplus and deficit both. Capped at 24 months back.
function rolloverCarry(transactions, budgets, bills, categoryId, key, monthlyIncome) {
  const entry = normalizeBudgetEntry(budgets[categoryId]);
  if (!entry || !entry.rollover || !entry.rolloverSince) return 0;
  const planned = categoryPlanned(budgets, bills, categoryId, monthlyIncome);
  if (!planned) return 0;
  let carry = 0;
  let m = entry.rolloverSince > addMonths(key, -24) ? entry.rolloverSince : addMonths(key, -24);
  while (m < key) {
    carry += planned - categorySpend(transactions, m, categoryId);
    m = addMonths(m, 1);
  }
  return Math.round(carry);
}

/* ------------------------------ migration --------------------------------- */
// Pure mapper: parsed legacy "monsterMode.v1" blob → the Keel state fields it
// carries. Returns null when there's nothing to migrate. NEVER mutates or
// deletes the legacy blob — the future fitness app still reads it.
function migrateFromMonsterMode(old) {
  const fin = old && old.finance;
  if (!fin) return null;
  const budgets = {};
  for (const [cat, raw] of Object.entries(fin.budgets || {})) {
    const e = normalizeBudgetEntry(raw);
    if (e) budgets[cat] = e;
  }
  const normDate = (d) => (d ? dateKey(new Date(d)) : todayKey());
  const hasData = (fin.transactions || []).length > 0 || (fin.fixedExpenses || []).length > 0;
  return {
    settings: { currency: fin.currency || "$", onboarded: hasData },
    income: {
      expectedIncome: fin.expectedIncome ?? null,
      incomeFrequency: fin.incomeFrequency || "monthly",
      payAnchor: null,
    },
    customCategories: fin.customCategories || [],
    bills: (fin.fixedExpenses || []).map(b => ({ ...b })),
    transactions: (fin.transactions || []).map(t => ({ ...t, date: normDate(t.date) })),
    budgets,
    goals: (fin.goals || []).map(g => ({ ...g })),
    contributions: (fin.contributions || []).map(c => ({ ...c, date: normDate(c.date) })),
    debts: (fin.debts || []).map(d => ({ ...d })),
    debtStrategy: fin.debtStrategy || "avalanche",
    debtExtraPayment: fin.debtExtraPayment || 0,
    invest: {
      quizAnswers: fin.invest?.quizAnswers ?? null,
      holdings: fin.invest?.holdings || [],
      priceCache: fin.invest?.priceCache || {},
      monthlyOverride: fin.invest?.monthlyOverride ?? null,
      finnhubKey: fin.invest?.finnhubKey || "",
      lastAutoRefreshAt: null,
      snapshots: [],
    },
    migratedFrom: "monsterMode.v1",
  };
}

if (typeof module !== "undefined") {
  module.exports = {
    EXPENSE_CATEGORIES, INCOME_CATEGORIES, EXPENSE_CAT_BY_ID, INCOME_CAT_BY_ID,
    RECOMMENDED_BUDGET_PCT, RECOMMENDED_SAVINGS_PCT,
    INCOME_FREQUENCIES, toMonthlyAmount, fromMonthlyAmount,
    dateKey, parseDateKey, todayKey, monthKey, currentMonthKey, fmtMonth, fmtMonthShort,
    addMonths, lastNMonthKeys, daysInMonth, addDaysKey, daysBetween,
    nextPaydays,
    txnsInMonth, monthTotals, categorySpend, categoryAverage,
    normalizeBudgetEntry, budgetTargetAmount, activeBillsTotal, categoryPlanned,
    plannedSpendTotal, savingsCapacity, budgetStatus,
    computePayoffPlan, goalsBalanceTotal, debtsTotal, netWorthTotal,
    csvField, transactionsToCSV,
    RISK_QUIZ, RISK_QUIZ_MAX, RISK_PROFILES, ALLOCATION_BUCKETS, BUCKET_BY_ID,
    scoreRiskQuiz, buildInvestPlan, CRYPTO_COINGECKO_IDS, STOCK_BUCKET_GUESS,
    guessBucketForSymbol, holdingValue, holdingPriceKey, portfolioBreakdown,
    migrateFromMonsterMode,
    applyRules, parseCSV, detectCSVColumns, guessDateFormat, parseCSVDate,
    parseCSVAmount, normalizeImportDesc, txnImportKey, mapCSVRows,
    mapSimplefinTransactions, rolloverCarry,
  };
}
