/* ============================================================================
 * FINANCE — categories and pure date/format helpers (no state dependency).
 * Mirrors the pattern in exercises.js: static reference data + pure functions.
 * ==========================================================================*/

// Expense categories. `typical` is just a UI hint (which list to suggest first
// when adding a fixed bill vs a variable expense) — any category can be used
// for either.
const EXPENSE_CATEGORIES = [
  { id: "rent",          name: "Rent / Mortgage", icon: "🏠", typical: "fixed" },
  { id: "utilities",     name: "Utilities",       icon: "💡", typical: "fixed" },
  { id: "insurance",     name: "Insurance",       icon: "🛡️", typical: "fixed" },
  { id: "subscriptions", name: "Subscriptions",   icon: "📺", typical: "fixed" },
  { id: "loan",          name: "Loan / Debt Payment", icon: "🏦", typical: "fixed" },
  { id: "groceries",     name: "Groceries",       icon: "🛒", typical: "variable" },
  { id: "dining",        name: "Dining Out",      icon: "🍽️", typical: "variable" },
  { id: "transport",     name: "Transport / Gas", icon: "⛽", typical: "variable" },
  { id: "shopping",      name: "Shopping",        icon: "🛍️", typical: "variable" },
  { id: "entertainment", name: "Entertainment",   icon: "🎬", typical: "variable" },
  { id: "health",        name: "Health / Medical",icon: "💊", typical: "variable" },
  { id: "personal",      name: "Personal Care",   icon: "💇", typical: "variable" },
  { id: "travel",        name: "Travel",          icon: "✈️", typical: "variable" },
  { id: "gifts",         name: "Gifts / Donations", icon: "🎁", typical: "variable" },
  { id: "misc",          name: "Misc",            icon: "📦", typical: "variable" },
];

const INCOME_CATEGORIES = [
  { id: "paycheck",      name: "Paycheck",        icon: "💼" },
  { id: "freelance",     name: "Freelance / Side Income", icon: "🧾" },
  { id: "bonus",         name: "Bonus",           icon: "🎉" },
  { id: "gift_in",       name: "Gift Received",   icon: "🎁" },
  { id: "other_income",  name: "Other Income",    icon: "➕" },
];

const EXPENSE_CAT_BY_ID = Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.id, c]));
const INCOME_CAT_BY_ID = Object.fromEntries(INCOME_CATEGORIES.map(c => [c.id, c]));

// General financial-planning guidelines for what share of monthly income a
// category might reasonably take up (commonly-cited rule-of-thumb ranges —
// not personalized financial advice). Used to suggest a starting budget %;
// the user can always override with their own fixed $ or % target.
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
// A commonly-cited overall savings-rate guideline (the "20" in 50/30/20).
const RECOMMENDED_SAVINGS_PCT = 20;

/* -------------------------------- date helpers ----------------------------- */
function monthKey(d) { return new Date(d).toISOString().slice(0, 7); } // 'YYYY-MM'
function currentMonthKey() { return monthKey(new Date()); }
function fmtMonth(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
function addMonths(key, n) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return monthKey(d);
}
// Most recent `n` month keys, oldest first, ending at `endKey` (default current month).
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

if (typeof module !== "undefined") {
  module.exports = {
    EXPENSE_CATEGORIES, INCOME_CATEGORIES, EXPENSE_CAT_BY_ID, INCOME_CAT_BY_ID,
    RECOMMENDED_BUDGET_PCT, RECOMMENDED_SAVINGS_PCT,
    monthKey, currentMonthKey, fmtMonth, addMonths, lastNMonthKeys, daysInMonth,
  };
}
