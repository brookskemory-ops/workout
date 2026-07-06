/* ============================================================================
 * KEEL — pure data & logic layer. No DOM, no state access: everything here
 * takes plain arguments and returns plain values, so it runs in the browser
 * (globals) and under node (module.exports guard) for unit tests.
 * ==========================================================================*/

/* ------------------------------ categories -------------------------------- */
// `typical` hints which list a category belongs to by default (bills vs
// day-to-day spending) — any category can be used for either.
const EXPENSE_CATEGORIES = [
  { id: "groceries",     name: "Groceries",        icon: "cart", typical: "variable" },
  { id: "dining",        name: "Dining Out",       icon: "utensils", typical: "variable" },
  { id: "transport",     name: "Transport / Gas",  icon: "fuel", typical: "variable" },
  { id: "shopping",      name: "Shopping",         icon: "bag", typical: "variable" },
  { id: "entertainment", name: "Entertainment",    icon: "film", typical: "variable" },
  { id: "health",        name: "Health / Medical", icon: "heart-pulse", typical: "variable" },
  { id: "personal",      name: "Personal Care",    icon: "scissors", typical: "variable" },
  { id: "travel",        name: "Travel",           icon: "plane", typical: "variable" },
  { id: "gifts",         name: "Gifts / Donations",icon: "gift", typical: "variable" },
  { id: "misc",          name: "Misc",             icon: "box", typical: "variable" },
  { id: "rent",          name: "Rent / Mortgage",  icon: "home", typical: "fixed" },
  { id: "utilities",     name: "Utilities",        icon: "zap", typical: "fixed" },
  { id: "insurance",     name: "Insurance",        icon: "shield", typical: "fixed" },
  { id: "subscriptions", name: "Subscriptions",    icon: "tv", typical: "fixed" },
  { id: "loan",          name: "Loan / Debt Payment", icon: "landmark", typical: "fixed" },
];

const INCOME_CATEGORIES = [
  { id: "paycheck",     name: "Paycheck",                icon: "briefcase" },
  { id: "freelance",    name: "Freelance / Side Income", icon: "file-text" },
  { id: "bonus",        name: "Bonus",                   icon: "star" },
  { id: "gift_in",      name: "Gift Received",           icon: "gift" },
  { id: "other_income", name: "Other Income",            icon: "plus-circle" },
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
      date, amount: Math.abs(amount),
      note: prettyMerchant(desc) || desc, rawNote: desc,
      type: amount < 0 ? "expense" : "income",
      suggestedCategory: applyRules(rules, desc, prettyMerchant(desc)),
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
    label: "Conservative", icon: "shield",
    blurb: "Capital preservation first. Mostly bonds and cash, a modest stock allocation, no crypto.",
    allocation: { us: 30, intl: 10, bonds: 50, cash: 10, crypto: 0 },
  },
  balanced: {
    label: "Balanced", icon: "scale",
    blurb: "A classic middle ground — mostly stocks for growth, a real bond cushion, a token crypto position.",
    allocation: { us: 45, intl: 15, bonds: 32, cash: 3, crypto: 5 },
  },
  growth: {
    label: "Growth", icon: "sprout",
    blurb: "Long-horizon growth. Stock-heavy with a small bond buffer and a satellite crypto position.",
    allocation: { us: 55, intl: 20, bonds: 15, cash: 2, crypto: 8 },
  },
  aggressive: {
    label: "Aggressive", icon: "rocket",
    blurb: "Maximum growth for a long horizon and a strong stomach. Nearly all stocks, crypto at the common ~10% ceiling.",
    allocation: { us: 60, intl: 25, bonds: 3, cash: 2, crypto: 10 },
  },
};

// `cls` maps to the CSS chart palette (--chart-1..6) — no hex in JS.
const ALLOCATION_BUCKETS = [
  { id: "us",     name: "US stocks",            icon: "trending-up", cls: "c1", examples: [
    { symbol: "VTI", name: "Vanguard Total US Market" },
    { symbol: "VOO", name: "Vanguard S&P 500" },
    { symbol: "SCHB", name: "Schwab Broad Market" },
  ]},
  { id: "intl",   name: "International stocks", icon: "globe", cls: "c2", examples: [
    { symbol: "VXUS", name: "Vanguard Total International" },
    { symbol: "IXUS", name: "iShares Total International" },
  ]},
  { id: "bonds",  name: "Bonds",                icon: "landmark", cls: "c6", examples: [
    { symbol: "BND", name: "Vanguard Total Bond" },
    { symbol: "AGG", name: "iShares Core US Bond" },
  ]},
  { id: "cash",   name: "Cash / T-bills",       icon: "banknote", cls: "c4", examples: [
    { symbol: "SGOV", name: "iShares 0–3 Month Treasury" },
    { symbol: "HYSA", name: "High-yield savings account" },
  ]},
  { id: "crypto", name: "Crypto",               icon: "bitcoin",  cls: "c3", examples: [
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

/* ------------------------------ merchants ---------------------------------- */
// Canonical grouping key for a merchant: lowercase, processor prefixes and
// store/transaction numbers stripped, first three meaningful tokens.
const MERCHANT_PREFIX_RE = /^(sq ?\*|tst ?\*|py ?\*|paypal ?\*?|pp ?\*|amzn mktp|amazon\.com\*?|pos debit[ -]*|debit card purchase[ -]*|ach debit[ -]*|checkcard[ -]*|visa dda pur[ -]*)/i;
function merchantKey(desc) {
  let s = String(desc || "").toLowerCase().trim();
  s = s.replace(MERCHANT_PREFIX_RE, "");
  s = s.replace(/[#*]\s*\w+/g, " ");           // "#4821", "*XYZ12"
  s = s.replace(/\b\d{3,}\b/g, " ");            // long digit runs (store/txn ids)
  s = s.replace(/[^a-z&' ]/g, " ").replace(/\s+/g, " ").trim();
  return s.split(" ").slice(0, 3).join(" ");
}
// Human-friendly merchant name from a raw bank descriptor.
function prettyMerchant(desc) {
  const key = merchantKey(desc);
  if (!key) return String(desc || "").trim();
  return key.replace(/\b[a-z]/g, c => c.toUpperCase());
}

/* ------------------------------ recurring detection ------------------------ */
const CADENCES = [
  { id: "weekly",    label: "weekly",    min: 6,   max: 8,   perMonth: 52 / 12, minCount: 3 },
  { id: "biweekly",  label: "every 2 weeks", min: 12, max: 16, perMonth: 26 / 12, minCount: 3 },
  { id: "monthly",   label: "monthly",   min: 26,  max: 35,  perMonth: 1,       minCount: 2 },
  { id: "quarterly", label: "quarterly", min: 80,  max: 100, perMonth: 1 / 3,   minCount: 2 },
  { id: "annual",    label: "yearly",    min: 350, max: 380, perMonth: 1 / 12,  minCount: 2 },
];
function median(nums) {
  const s = nums.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
// Finds subscription-like charges: same merchant, similar amount, regular
// interval. Bill-linked transactions are excluded (already tracked).
function detectRecurring(transactions, ignoredKeys) {
  const ignored = new Set(ignoredKeys || []);
  const groups = new Map();
  for (const t of transactions) {
    if (t.type !== "expense" || t.fixedBillId) continue;
    const key = merchantKey(t.rawNote || t.note);
    if (!key || ignored.has(key)) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }
  const out = [];
  for (const [key, txns] of groups) {
    if (txns.length < 2) continue;
    const sorted = txns.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    const gaps = [];
    for (let i = 1; i < sorted.length; i++) gaps.push(daysBetween(sorted[i - 1].date, sorted[i].date));
    const gap = median(gaps);
    const cadence = CADENCES.find(c => gap >= c.min && gap <= c.max);
    if (!cadence || sorted.length < cadence.minCount) continue;
    // gaps must be reasonably regular (every gap within the cadence window ±40%)
    if (!gaps.every(g => g >= cadence.min * 0.6 && g <= cadence.max * 1.4)) continue;
    const amounts = sorted.map(t => t.amount);
    const latest = amounts[amounts.length - 1];
    const priorMedian = amounts.length > 1 ? median(amounts.slice(0, -1)) : latest;
    if (Math.abs(latest - priorMedian) > priorMedian * 0.3) continue; // amounts don't cluster
    const last = sorted[sorted.length - 1];
    // next renewal follows the cadence, not the raw gap: monthly-ish charges
    // land on the same day-of-month (clamped), week-based ones step by days
    const monthsAhead = { monthly: 1, quarterly: 3, annual: 12 }[cadence.id];
    const nextDate = monthsAhead
      ? (() => {
          const mk = addMonths(monthKey(last.date), monthsAhead);
          return `${mk}-${String(Math.min(+last.date.slice(8, 10), daysInMonth(mk))).padStart(2, "0")}`;
        })()
      : addDaysKey(last.date, cadence.id === "weekly" ? 7 : 14);
    out.push({
      key,
      name: prettyMerchant(last.rawNote || last.note),
      amount: latest,
      prevAmount: priorMedian,
      priceIncreased: latest > priorMedian * 1.02,
      cadence: cadence.id,
      cadenceLabel: cadence.label,
      lastDate: last.date,
      nextDate,
      monthlyCost: latest * cadence.perMonth,
      count: sorted.length,
      category: last.category || null,
    });
  }
  return out.sort((a, b) => b.monthlyCost - a.monthlyCost);
}

/* ------------------------------ cash-flow forecast ------------------------- */
// Average daily variable spend over the trailing 60 days, excluding known
// recurring merchants (they're forecast as discrete events instead).
function avgDailyVariableSpend(transactions, excludeKeys, fromKey) {
  const exclude = new Set(excludeKeys || []);
  const end = fromKey || todayKey();
  const start = addDaysKey(end, -60);
  let total = 0;
  for (const t of transactions) {
    if (t.type !== "expense" || t.source === "fixed") continue;
    if (t.date < start || t.date >= end) continue;
    if (exclude.has(merchantKey(t.rawNote || t.note))) continue;
    total += t.amount;
  }
  return total / 60;
}
// Day-by-day projection for `key` (the current month): actual cumulative net
// so far, then expected paydays, unpaid bills, subscription renewals, and
// average daily variable spend through month end.
function forecastMonth({ transactions, bills, income, recurringList, key, today }) {
  const tKey = today || todayKey();
  const days = daysInMonth(key);
  const monthTxns = txnsInMonth(transactions, key);
  const dailyAvg = avgDailyVariableSpend(transactions, (recurringList || []).map(r => r.key), tKey);

  const events = [];
  const todayDay = monthKey(tKey) === key ? +tKey.slice(8, 10) : days;
  // expected paydays after today
  if (income && income.payAnchor && income.expectedIncome) {
    for (const p of nextPaydays(income.payAnchor, income.incomeFrequency, addDaysKey(tKey, 1), 4)) {
      if (monthKey(p) === key) events.push({ date: p, label: "Payday", amount: income.expectedIncome, kind: "payday" });
    }
  }
  // unpaid active bills with due days still ahead
  for (const b of bills || []) {
    if (b.active === false) continue;
    const due = Math.min(b.dueDay || 1, days);
    if (due <= todayDay) continue;
    if (monthTxns.some(t => t.fixedBillId === b.id)) continue;
    events.push({ date: `${key}-${String(due).padStart(2, "0")}`, label: b.name, amount: -b.amount, kind: "bill" });
  }
  // subscription renewals in the rest of the month
  for (const r of recurringList || []) {
    if (monthKey(r.nextDate) === key && +r.nextDate.slice(8, 10) > todayDay) {
      events.push({ date: r.nextDate, label: r.name, amount: -r.amount, kind: "renewal" });
    }
  }

  // cumulative curve: actuals to today, projection afterwards
  const series = [];
  let cum = 0;
  for (let d = 1; d <= days; d++) {
    const dk = `${key}-${String(d).padStart(2, "0")}`;
    if (d <= todayDay) {
      for (const t of monthTxns) {
        if (t.date === dk) cum += t.type === "income" ? t.amount : -t.amount;
      }
    } else {
      cum -= dailyAvg;
      for (const e of events) if (e.date === dk) cum += e.amount;
    }
    series.push(Math.round(cum));
  }

  // "safe to spend": what's left of expected income after bills +
  // subscriptions + what's already been spent, spread over remaining days
  const expectedIncome = income && income.expectedIncome
    ? Math.round(toMonthlyAmount(income.expectedIncome, income.incomeFrequency || "monthly")) : 0;
  const billsTotal = activeBillsTotal(bills || []);
  const subsMonthly = (recurringList || []).reduce((a, r) => a + r.monthlyCost, 0);
  const variableSpentSoFar = monthTxns
    .filter(t => t.type === "expense" && t.source !== "fixed")
    .reduce((a, t) => a + t.amount, 0);
  const daysLeft = Math.max(1, days - todayDay + 1);
  const safePerDay = expectedIncome > 0
    ? Math.max(0, (expectedIncome - billsTotal - subsMonthly - variableSpentSoFar) / daysLeft)
    : null;

  return { series, events: events.sort((a, b) => (a.date < b.date ? -1 : 1)), projectedNet: series[series.length - 1], safePerDay, todayDay };
}

/* ------------------------------ insights ----------------------------------- */
// Categories pacing well above their own 3-month average this month.
function spendingAnomalies(transactions, key, today) {
  const tKey = today || todayKey();
  const dayOfMonth = monthKey(tKey) === key ? +tKey.slice(8, 10) : daysInMonth(key);
  const frac = Math.max(0.15, dayOfMonth / daysInMonth(key)); // early-month noise guard
  const out = [];
  const priorKeys = lastNMonthKeys(4, key).slice(0, 3);
  for (const c of EXPENSE_CATEGORIES) {
    const activePrior = priorKeys.filter(k => txnsInMonth(transactions, k).length > 0);
    if (activePrior.length < 2) continue;
    const avg = activePrior.reduce((a, k) => a + categorySpend(transactions, k, c.id), 0) / activePrior.length;
    if (avg < 10) continue;
    const spent = categorySpend(transactions, key, c.id);
    const pace = spent / frac;
    // require real dollars, not just extrapolation: actual spend must already
    // exceed the pro-rated expectation by $25+ (keeps a lone early-month
    // subscription charge from reading as a 500% blowout)
    if (pace > avg * 1.3 && spent >= 25 && spent - avg * frac > 25) {
      out.push({ category: c, pacePct: Math.round(((pace - avg) / avg) * 100), spent, avg: Math.round(avg) });
    }
  }
  return out.sort((a, b) => b.pacePct - a.pacePct).slice(0, 2);
}
// Biggest merchants of the month by total spend.
function topMerchants(transactions, key, n) {
  const groups = new Map();
  for (const t of txnsInMonth(transactions, key)) {
    if (t.type !== "expense") continue;
    const mk = merchantKey(t.rawNote || t.note) || "(no description)";
    const g = groups.get(mk) || { key: mk, name: prettyMerchant(t.rawNote || t.note) || "(no description)", total: 0, count: 0 };
    g.total += t.amount;
    g.count++;
    groups.set(mk, g);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total).slice(0, n || 5);
}

/* ------------------------------ sync rate budget --------------------------- */
// SimpleFIN allows <=24 requests/day. Auto-syncs stop earlier so manual pulls
// always have headroom.
const SYNC_DAILY_CAP = 24;
const SYNC_AUTO_CAP = 20;
function syncBudget(syncsToday, today) {
  const count = syncsToday && syncsToday.date === today ? syncsToday.count : 0;
  return {
    used: count,
    autoAllowed: count < SYNC_AUTO_CAP,
    manualAllowed: count < SYNC_DAILY_CAP,
    left: Math.max(0, SYNC_DAILY_CAP - count),
  };
}

/* ------------------------------ bank sync (SimpleFIN) --------------------- */
// Maps a SimpleFIN /accounts response into importable transactions,
// INCLUDING pending ones (they're most of the recent week's card activity) —
// flagged so the UI can badge them and later syncs can update them in place
// when they post (or prune them if the bank voids them).
// Amounts are strings: negative = money out (expense).
// monthFilterKey (optional): keep a transaction when EITHER its transacted
// or posted date falls in that month, dated by whichever is in-month.
function mapSimplefinTransactions(accountsResponse, existingBankIds, rules, monthFilterKey) {
  const seen = new Set(existingBankIds || []);
  const txns = [], updates = [], accounts = [];
  const fetchedIds = [];
  for (const acct of accountsResponse.accounts || []) {
    accounts.push({
      id: acct.id,
      name: acct.name || "Account",
      org: (acct.org && acct.org.name) || "",
      balance: parseFloat(acct.balance) || 0,
      balanceDate: acct["balance-date"] ? dateKey(new Date(acct["balance-date"] * 1000)) : null,
    });
    for (const t of acct.transactions || []) {
      const amount = parseFloat(t.amount);
      if (!amount) continue;
      const bankId = `${acct.id}:${t.id}`;
      const tDate = t.transacted_at ? dateKey(new Date(t.transacted_at * 1000)) : null;
      const pDate = t.posted ? dateKey(new Date(t.posted * 1000)) : tDate;
      let date = tDate || pDate;
      if (!date) continue;
      if (monthFilterKey) {
        const tIn = tDate && monthKey(tDate) === monthFilterKey;
        const pIn = pDate && monthKey(pDate) === monthFilterKey;
        if (!tIn && !pIn) continue;
        date = tIn ? tDate : pDate;
      }
      fetchedIds.push(bankId);
      const desc = [t.payee, t.description].filter(Boolean).join(" · ");
      const rec = {
        date,
        amount: Math.abs(amount),
        type: amount < 0 ? "expense" : "income",
        note: prettyMerchant(t.payee || t.description) || desc, rawNote: desc,
        suggestedCategory: applyRules(rules, t.payee, t.description, prettyMerchant(t.payee || t.description)),
        bankId, accountId: acct.id, inbox: true,
        pending: !!t.pending,
      };
      if (seen.has(bankId)) updates.push(rec);
      else { seen.add(bankId); txns.push(rec); }
    }
  }
  return { txns, updates, fetchedIds, accounts };
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
    merchantKey, prettyMerchant, detectRecurring, avgDailyVariableSpend,
    forecastMonth, spendingAnomalies, topMerchants,
    syncBudget, SYNC_DAILY_CAP, SYNC_AUTO_CAP,
  };
}
