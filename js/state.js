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
  ui: {
    lastExpenseCategory: null,
    lastIncomeCategory: null,
    categoryUseCounts: {},
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
function catForTxn(t) { return t.type === "income" ? incomeCatById(t.category) : expenseCatById(t.category); }

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
function goalCurrent(goalId) {
  return state.contributions.filter(c => c.goalId === goalId).reduce((a, c) => a + c.amount, 0);
}
function currentNetWorth() {
  const { total } = portfolioBreakdown(state.invest.holdings, state.invest.priceCache);
  return netWorthTotal(goalsBalanceTotal(state.goals, state.contributions), total, debtsTotal(state.debts));
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
  mutate(s => { s.transactions = s.transactions.filter(t => t.id !== id); });
}

/* ------------------------------ bills ------------------------------------- */
function addBill({ name, amount, category, dueDay }) {
  mutate(s => s.bills.push({ id: uid(), name, amount, category, dueDay: dueDay || 1, active: true }));
}
function updateBill(id, patch) {
  mutate(s => { const b = s.bills.find(x => x.id === id); if (b) Object.assign(b, patch); });
}
function deleteBill(id) {
  mutate(s => { s.bills = s.bills.filter(b => b.id !== id); });
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
    s.goals = s.goals.filter(g => g.id !== id);
    s.contributions = s.contributions.filter(c => c.goalId !== id);
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
  mutate(s => { s.debts = s.debts.filter(d => d.id !== id); });
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
  mutate(s => { s.invest.holdings = s.invest.holdings.filter(h => h.id !== id); });
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

if (typeof module !== "undefined") {
  module.exports = { DEFAULT_STATE, mergeDefaults };
}
