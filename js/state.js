/* ============================================================================
 * KEEL — state store. Owns the single persisted state object, its schema,
 * loading/migration, debounced saving, daily snapshots, and every named
 * mutation. Views never write `state` directly — they call these functions.
 *
 * The legacy "monsterMode.v1" blob (which also holds fitness data for a
 * future separate app) is READ once for migration and never written/deleted.
 * ==========================================================================*/

const STORE_KEY = "keel.v1";
const LEGACY_KEY = "monsterMode.v1";
const SNAPSHOT_PREFIX = "keel.snapshot."; // + weekday 0-6 (7-slot ring)
const SNAPSHOT_DAY_KEY = "keel.snapshotDay";

const DEFAULT_STATE = {
  version: 1,
  settings: {
    currency: "$",
    onboarded: false,
    lastBackupAt: null,   // ISO timestamp of last manual JSON export
    backupReminder: true,
  },
  income: {
    expectedIncome: null,      // per pay period, in units of incomeFrequency
    incomeFrequency: "monthly",
    payAnchor: null,           // "YYYY-MM-DD" of any known payday
  },
  customCategories: [],  // [{id, name, icon, type:'expense'|'income'}]
  bills: [],             // [{id, name, amount, category, dueDay, active}]
  transactions: [],      // [{id, date:'YYYY-MM-DD', amount, category, note, type, source, fixedBillId?}]
  budgets: {},           // categoryId -> {mode:'fixed'|'percent', value}
  goals: [],             // [{id, name, kind:'savings'|'sinking', target, targetDate, category, achieved, createdAt}]
  contributions: [],     // [{id, goalId, amount, date:'YYYY-MM-DD'}]
  debts: [],             // [{id, name, balance, apr, minPayment}]
  debtStrategy: "avalanche",
  debtExtraPayment: 0,
  invest: {
    quizAnswers: null,
    holdings: [],        // [{id, kind, symbol, quantity, costPerUnit?, manualPrice?, bucket?}]
    priceCache: {},      // 'stock:VTI'|'crypto:BTC' -> {price, at}
    monthlyOverride: null,
    finnhubKey: "",
    lastAutoRefreshAt: null,
    snapshots: [],       // [{date:'YYYY-MM-DD', total, netWorth}] max 1/day, capped
  },
  rules: [],             // [{id, match, categoryId, enabled}] auto-categorization
  bank: {
    accessUrl: null,     // SimpleFIN access URL (device-only; contains credentials)
    accounts: [],        // [{id, name, org, balance, balanceDate}]
    lastSyncAt: null,
    autoSync: true,
  },
  ui: {
    lastExpenseCategory: null,
    lastIncomeCategory: null,
    categoryUseCounts: {},
    lastRecapMonth: null,
    theme: "dark",       // 'system' | 'dark' | 'light'
    autoLog: [],         // [{date, label}] queued for the monthly recap
  },
  createdAt: null,
  migratedFrom: null,
};

/* ------------------------------ merge & load ------------------------------ */
// Recursively backfills missing keys from defaults so features added later
// never leave `undefined` holes in previously-saved state. Arrays and
// non-plain values are taken from `saved` as-is.
function mergeDefaults(defaults, saved) {
  const isPlainObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  if (!isPlainObj(defaults) || !isPlainObj(saved)) {
    return saved !== undefined ? saved : defaults;
  }
  const out = { ...defaults };
  for (const key of Object.keys(saved)) {
    out[key] = isPlainObj(defaults[key]) && isPlainObj(saved[key])
      ? mergeDefaults(defaults[key], saved[key])
      : saved[key];
  }
  return out;
}

function freshState() {
  const s = structuredClone(DEFAULT_STATE);
  s.createdAt = new Date().toISOString();
  return s;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return mergeDefaults(structuredClone(DEFAULT_STATE), JSON.parse(raw));
    // First run: migrate the finance slice out of the legacy dual-mode app,
    // leaving the legacy blob untouched for the future fitness app.
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const migrated = migrateFromMonsterMode(JSON.parse(legacyRaw));
      if (migrated) {
        const s = mergeDefaults(freshState(), migrated);
        try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) { /* quota */ }
        return s;
      }
    }
    return freshState();
  } catch (e) {
    console.warn("Failed to load state", e);
    return freshState();
  }
}

let state = typeof localStorage !== "undefined" ? loadState() : freshState();

/* ------------------------------ saving ------------------------------------ */
let saveTimer = null;
function flushSave() {
  clearTimeout(saveTimer);
  saveTimer = null;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { console.warn("Save failed", e); }
}
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 150);
}
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => { if (document.hidden) flushSave(); });
  window.addEventListener("pagehide", flushSave);
}

/* ------------------------------ snapshots --------------------------------- */
// Before the first mutation of each new local day, stash the pre-mutation
// state into a 7-slot weekday ring — a free "yesterday and last week" undo.
function snapshotIfNewDay() {
  try {
    const today = todayKey();
    if (localStorage.getItem(SNAPSHOT_DAY_KEY) === today) return;
    const slot = parseDateKey(today).getDay();
    localStorage.setItem(SNAPSHOT_PREFIX + slot, JSON.stringify({ date: today, data: state }));
    localStorage.setItem(SNAPSHOT_DAY_KEY, today);
  } catch (e) { /* quota — snapshots are best-effort */ }
}
function listSnapshots() {
  const out = [];
  for (let slot = 0; slot < 7; slot++) {
    try {
      const raw = localStorage.getItem(SNAPSHOT_PREFIX + slot);
      if (raw) out.push({ slot, date: JSON.parse(raw).date });
    } catch (e) { /* skip corrupt slot */ }
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}
function restoreSnapshot(slot) {
  const raw = localStorage.getItem(SNAPSHOT_PREFIX + slot);
  if (!raw) return false;
  const parsed = JSON.parse(raw);
  if (!parsed || !parsed.data) return false;
  state = mergeDefaults(structuredClone(DEFAULT_STATE), parsed.data);
  flushSave();
  return true;
}

/* ------------------------------ backup / restore -------------------------- */
function exportStateJSON() {
  state.settings.lastBackupAt = new Date().toISOString();
  flushSave();
  return JSON.stringify(state, null, 2);
}
// Validates and replaces the whole state. Throws with a friendly message on
// bad input; caller confirms with the user first.
function importStateJSON(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object") throw new Error("Not a Keel backup file");
  if (parsed.version !== 1) throw new Error("Unsupported backup version");
  if (!Array.isArray(parsed.transactions) || !parsed.settings) throw new Error("Backup is missing core data");
  state = mergeDefaults(structuredClone(DEFAULT_STATE), parsed);
  flushSave();
}

/* ------------------------------ mutation core ----------------------------- */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

// Every mutation flows through here: daily snapshot, apply, debounced save.
function mutate(fn) {
  snapshotIfNewDay();
  const result = fn(state);
  scheduleSave();
  return result;
}

/* ------------------------------ derived reads ----------------------------- */
function allExpenseCategories() {
  return [...EXPENSE_CATEGORIES, ...state.customCategories.filter(c => c.type === "expense")];
}
function allIncomeCategories() {
  return [...INCOME_CATEGORIES, ...state.customCategories.filter(c => c.type === "income")];
}
function expenseCatById(id) { return allExpenseCategories().find(c => c.id === id) || { id, name: id, icon: "📦" }; }
function incomeCatById(id) { return allIncomeCategories().find(c => c.id === id) || { id, name: id, icon: "➕" }; }
function catForTxn(t) {
  if (!t.category) return { id: null, name: "Uncategorized", icon: "📥" };
  return t.type === "income" ? incomeCatById(t.category) : expenseCatById(t.category);
}

// Average logged income over the last 3 months with any activity.
function suggestedMonthlyFromHistory() {
  const keys = lastNMonthKeys(3).filter(k => txnsInMonth(state.transactions, k).length > 0);
  if (!keys.length) return 0;
  return Math.round(keys.reduce((a, k) => a + monthTotals(state.transactions, state.bills, k).income, 0) / keys.length);
}
function expectedMonthlyIncome() {
  if (state.income.expectedIncome) {
    return Math.round(toMonthlyAmount(state.income.expectedIncome, state.income.incomeFrequency || "monthly"));
  }
  return suggestedMonthlyFromHistory();
}
// The one "how much is left each month" number (may be null/negative).
function currentSavingsCapacity() {
  return savingsCapacity(expectedMonthlyIncome(), state.budgets, state.bills, allExpenseCategories());
}
function billPaidInMonth(billId, key) {
  return state.transactions.some(t => t.fixedBillId === billId && monthKey(t.date) === key);
}
// budgetStatus with envelope rollover applied: carried surplus/deficit from
// prior months adjusts this month's target. The one status fn views use.
function catBudgetStatus(categoryId, key) {
  const income = expectedMonthlyIncome();
  const bs = budgetStatus(state.transactions, state.budgets, state.bills, categoryId, key, income);
  const carry = rolloverCarry(state.transactions, state.budgets, state.bills, categoryId, key, income);
  if (!carry || !bs.target) return { ...bs, carry: 0 };
  const target = Math.max(0, bs.target + carry);
  const pct = target > 0 ? Math.round((bs.spent / target) * 100) : 100;
  return { ...bs, target, pct, carry, status: pct >= 100 ? "over" : pct >= 80 ? "warn" : "good" };
}
function goalCurrent(goalId) {
  return state.contributions.filter(c => c.goalId === goalId).reduce((a, c) => a + c.amount, 0);
}
function currentNetWorth() {
  const { total } = portfolioBreakdown(state.invest.holdings, state.invest.priceCache);
  return netWorthTotal(goalsBalanceTotal(state.goals, state.contributions), total, debtsTotal(state.debts))
    + bankCashTotal();
}

/* ------------------------------ undo -------------------------------------- */
// One-slot undo buffer for deletes. Each delete registers a restore closure;
// the toast's Undo button calls undoLast().
let lastUndo = null;
function registerUndo(restoreFn) { lastUndo = restoreFn; }
function undoLast() {
  if (!lastUndo) return false;
  const fn = lastUndo;
  lastUndo = null;
  mutate(s => fn(s));
  return true;
}
// Removes matching items from an array field, remembering them for undo.
function removeWithUndo(arrayField, predicate) {
  mutate(s => {
    const kept = [], removed = [];
    for (const item of s[arrayField]) (predicate(item) ? removed : kept).push(item);
    if (!removed.length) return;
    s[arrayField] = kept;
    registerUndo(st => { st[arrayField] = st[arrayField].concat(removed); });
  });
}

/* ------------------------------ transactions ------------------------------ */
function addTransaction({ type, amount, category, note, date }) {
  return mutate(s => {
    const t = {
      id: uid(), date: date || todayKey(), amount, category, note: note || "",
      type, source: type === "income" ? "income" : "variable",
    };
    s.transactions.push(t);
    if (type === "income") s.ui.lastIncomeCategory = category;
    else s.ui.lastExpenseCategory = category;
    s.ui.categoryUseCounts[category] = (s.ui.categoryUseCounts[category] || 0) + 1;
    return t;
  });
}
function updateTransaction(id, patch) {
  mutate(s => {
    const t = s.transactions.find(x => x.id === id);
    if (t) Object.assign(t, patch);
  });
}
function deleteTransaction(id) {
  removeWithUndo("transactions", t => t.id === id);
}
function deleteTransactions(ids) {
  const set = new Set(ids);
  removeWithUndo("transactions", t => set.has(t.id));
}
function setTransactionsCategory(ids, categoryId) {
  const set = new Set(ids);
  mutate(s => s.transactions.forEach(t => {
    if (set.has(t.id)) { t.category = categoryId; t.inbox = false; t.suggestedCategory = undefined; }
  }));
}

/* ------------------------------ bills ------------------------------------- */
function addBill({ name, amount, category, dueDay }) {
  mutate(s => s.bills.push({ id: uid(), name, amount, category, dueDay: dueDay || 1, active: true }));
}
function updateBill(id, patch) {
  mutate(s => { const b = s.bills.find(x => x.id === id); if (b) Object.assign(b, patch); });
}
function deleteBill(id) {
  removeWithUndo("bills", b => b.id === id);
}
// Toggles the bill's paid transaction for the VIEWED month, stamping the
// bill's due day (clamped to that month) — not "now".
function toggleBillPaid(billId, key) {
  mutate(s => {
    const bill = s.bills.find(b => b.id === billId);
    if (!bill) return;
    const existing = s.transactions.find(t => t.fixedBillId === billId && monthKey(t.date) === key);
    if (existing) {
      s.transactions = s.transactions.filter(t => t !== existing);
    } else {
      const day = Math.min(Math.max(1, bill.dueDay || 1), daysInMonth(key));
      s.transactions.push({
        id: uid(), date: `${key}-${String(day).padStart(2, "0")}`, amount: bill.amount,
        category: bill.category, note: bill.name, type: "expense", source: "fixed", fixedBillId: bill.id,
      });
    }
  });
}

/* ------------------------------ budgets & income --------------------------- */
function setBudget(categoryId, entry) {
  mutate(s => {
    if (!entry || !(entry.value > 0)) delete s.budgets[categoryId];
    else s.budgets[categoryId] = entry;
  });
}
function setIncomeSettings(patch) {
  mutate(s => Object.assign(s.income, patch));
}
function setSetting(key, value) {
  mutate(s => { s.settings[key] = value; });
}
function addCustomCategory(name, type, icon) {
  return mutate(s => {
    const id = "custom_" + uid();
    s.customCategories.push({ id, name, icon: icon || (type === "income" ? "➕" : "📦"), type });
    return id;
  });
}
function deleteCustomCategory(id) {
  mutate(s => {
    s.customCategories = s.customCategories.filter(c => c.id !== id);
    delete s.budgets[id];
  });
}

/* ------------------------------ goals & debts ------------------------------ */
function addGoal(goal) {
  mutate(s => s.goals.push({ id: uid(), achieved: false, createdAt: todayKey(), ...goal }));
}
function updateGoal(id, patch) {
  mutate(s => { const g = s.goals.find(x => x.id === id); if (g) Object.assign(g, patch); });
}
function deleteGoal(id) {
  mutate(s => {
    const goal = s.goals.find(g => g.id === id);
    if (!goal) return;
    const contribs = s.contributions.filter(c => c.goalId === id);
    s.goals = s.goals.filter(g => g.id !== id);
    s.contributions = s.contributions.filter(c => c.goalId !== id);
    registerUndo(st => {
      st.goals.push(goal);
      st.contributions = st.contributions.concat(contribs);
    });
  });
}
function addContribution(goalId, amount) {
  mutate(s => s.contributions.push({ id: uid(), goalId, amount, date: todayKey() }));
}
function deleteContribution(id) {
  mutate(s => { s.contributions = s.contributions.filter(c => c.id !== id); });
}
function resetGoalContributions(goalId) {
  mutate(s => { s.contributions = s.contributions.filter(c => c.goalId !== goalId); });
}
function addDebt(debt) {
  mutate(s => s.debts.push({ id: uid(), ...debt }));
}
function updateDebt(id, patch) {
  mutate(s => { const d = s.debts.find(x => x.id === id); if (d) Object.assign(d, patch); });
}
function deleteDebt(id) {
  removeWithUndo("debts", d => d.id === id);
}
function setDebtOptions(patch) {
  mutate(s => Object.assign(s, patch)); // debtStrategy / debtExtraPayment live at top level
}

/* ------------------------------ invest ------------------------------------ */
function setQuizAnswer(qid, optIndex) {
  mutate(s => {
    if (!s.invest.quizAnswers) s.invest.quizAnswers = {};
    s.invest.quizAnswers[qid] = optIndex;
  });
}
function resetQuiz() { mutate(s => { s.invest.quizAnswers = null; }); }
function setInvestField(key, value) { mutate(s => { s.invest[key] = value; }); }
function addHolding(h) { mutate(s => s.invest.holdings.push({ id: uid(), ...h })); }
function updateHolding(id, patch) {
  mutate(s => { const h = s.invest.holdings.find(x => x.id === id); if (h) Object.assign(h, patch); });
}
function deleteHolding(id) {
  mutate(s => {
    const h = s.invest.holdings.find(x => x.id === id);
    if (!h) return;
    s.invest.holdings = s.invest.holdings.filter(x => x.id !== id);
    registerUndo(st => st.invest.holdings.push(h));
  });
}
function cachePrices(entries) { // entries: {priceKey: {price, at}}
  mutate(s => Object.assign(s.invest.priceCache, entries));
}
// One snapshot per local day; keeps ~2 years.
function recordPortfolioSnapshot() {
  mutate(s => {
    const date = todayKey();
    const { total } = portfolioBreakdown(s.invest.holdings, s.invest.priceCache);
    const nw = netWorthTotal(goalsBalanceTotal(s.goals, s.contributions), total, debtsTotal(s.debts));
    const last = s.invest.snapshots[s.invest.snapshots.length - 1];
    if (last && last.date === date) { last.total = total; last.netWorth = nw; }
    else s.invest.snapshots.push({ date, total, netWorth: nw });
    if (s.invest.snapshots.length > 750) s.invest.snapshots.splice(0, s.invest.snapshots.length - 750);
  });
}

/* ------------------------------ automations -------------------------------- */
// Boot-time sweep: auto-log autopay bills whose due day has passed this
// month, and this cycle's paycheck when enabled. Every action is queued for
// the monthly recap so nothing happens silently.
function runAutomations() {
  const key = currentMonthKey();
  const todayDay = +todayKey().slice(8, 10);
  let acted = false;

  for (const bill of state.bills) {
    if (!bill.autopay || bill.active === false) continue;
    if (bill.dueDay > todayDay || billPaidInMonth(bill.id, key)) continue;
    toggleBillPaid(bill.id, key);
    mutate(s => s.ui.autoLog.push({ date: todayKey(), label: `Auto-paid ${bill.name} (${fmtAutoAmount(bill.amount)})` }));
    acted = true;
  }

  const { payAnchor, incomeFrequency, expectedIncome, autologPaycheck } = state.income;
  if (autologPaycheck && payAnchor && expectedIncome) {
    const recent = nextPaydays(payAnchor, incomeFrequency, addDaysKey(todayKey(), -3), 2)
      .filter(p => p <= todayKey());
    for (const payday of recent) {
      const already = state.transactions.some(t =>
        t.type === "income" && t.category === "paycheck" && Math.abs(daysBetween(t.date, payday)) <= 3);
      if (already) continue;
      mutate(s => {
        s.transactions.push({
          id: uid(), date: payday, amount: expectedIncome, category: "paycheck",
          note: "Paycheck (auto)", type: "income", source: "income",
        });
        s.ui.autoLog.push({ date: todayKey(), label: `Auto-logged paycheck (${fmtAutoAmount(expectedIncome)})` });
      });
      acted = true;
    }
  }
  return acted;
}
function fmtAutoAmount(n) {
  return `${state.settings.currency || "$"}${Math.round(n).toLocaleString()}`;
}
// The recap fires on the first open of a new month, if last month had any
// activity worth recapping.
function shouldShowRecap() {
  const key = currentMonthKey();
  if (state.ui.lastRecapMonth === key) return false;
  const prev = addMonths(key, -1);
  const hadActivity = txnsInMonth(state.transactions, prev).length > 0;
  if (!hadActivity || !state.settings.onboarded) {
    mutate(s => { s.ui.lastRecapMonth = key; }); // don't nag a fresh/idle month
    return false;
  }
  return true;
}
function markRecapShown() {
  mutate(s => { s.ui.lastRecapMonth = currentMonthKey(); s.ui.autoLog = []; });
}

/* ------------------------------ rules -------------------------------------- */
function addRule(match, categoryId) {
  mutate(s => {
    // replace an existing rule with the same match text instead of stacking
    s.rules = s.rules.filter(r => r.match.toLowerCase() !== match.toLowerCase());
    s.rules.push({ id: uid(), match, categoryId, enabled: true });
  });
}
function updateRule(id, patch) {
  mutate(s => { const r = s.rules.find(x => x.id === id); if (r) Object.assign(r, patch); });
}
function deleteRule(id) {
  removeWithUndo("rules", r => r.id === id);
}

/* ------------------------------ import / inbox ----------------------------- */
function existingImportKeys() {
  return state.transactions.filter(t => t.importKey).map(t => t.importKey);
}
function existingBankIds() {
  return state.transactions.filter(t => t.bankId).map(t => t.bankId);
}
// Adds mapped transactions (from CSV or bank sync) into the inbox.
function importTransactions(txns) {
  mutate(s => {
    for (const t of txns) {
      s.transactions.push({
        id: uid(), note: "", ...t,
        category: null, // set during inbox triage; suggestedCategory pre-highlights
        source: t.type === "income" ? "income" : "variable",
        inbox: true,
      });
    }
  });
}
function inboxTxns() {
  return state.transactions.filter(t => t.inbox)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
function categorizeInboxTxn(id, categoryId, createRuleFromNote) {
  mutate(s => {
    const t = s.transactions.find(x => x.id === id);
    if (!t) return;
    t.category = categoryId;
    t.inbox = false;
    delete t.suggestedCategory;
    s.ui.categoryUseCounts[categoryId] = (s.ui.categoryUseCounts[categoryId] || 0) + 1;
  });
  if (createRuleFromNote) addRule(createRuleFromNote, categoryId);
}
function flipInboxTxnType(id) {
  mutate(s => {
    const t = s.transactions.find(x => x.id === id);
    if (!t) return;
    t.type = t.type === "income" ? "expense" : "income";
    t.source = t.type === "income" ? "income" : "variable";
    delete t.suggestedCategory;
  });
}

/* ------------------------------ bank sync ---------------------------------- */
function setBankAccess(accessUrl) {
  mutate(s => { s.bank.accessUrl = accessUrl; s.bank.lastSyncAt = null; });
}
function disconnectBank() {
  mutate(s => { s.bank = { accessUrl: null, accounts: [], lastSyncAt: null, autoSync: true }; });
}
function applyBankSync({ txns, accounts }) {
  mutate(s => { s.bank.accounts = accounts; s.bank.lastSyncAt = new Date().toISOString(); });
  if (txns.length) importTransactions(txns);
}
function bankCashTotal() {
  return state.bank.accounts.reduce((a, x) => a + (x.balance || 0), 0);
}

if (typeof module !== "undefined") {
  module.exports = { DEFAULT_STATE, mergeDefaults };
}
