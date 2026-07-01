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
    monthKey, currentMonthKey, fmtMonth, addMonths, lastNMonthKeys, daysInMonth,
  };
}
