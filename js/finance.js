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

// Pay-period frequencies, so "expected income" can be entered as a per-check
// amount (very common for biweekly payroll) instead of forcing a monthly
// figure. perYear drives the conversion to/from a monthly-equivalent.
const INCOME_FREQUENCIES = {
  weekly:      { label: "Weekly",                    perYear: 52 },
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

/* ============================================================================
 * INVESTING — risk quiz, model allocations, and portfolio helpers.
 * Everything here is commonly-cited rule-of-thumb guidance for educational
 * use (age/horizon-based allocation, broad low-cost index funds, crypto as a
 * small satellite position) — NOT personalized financial advice.
 * ==========================================================================*/

// Each answer carries points; more points = more capacity to take risk.
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

// Model portfolios. Percentages sum to 100. Crypto stays a small satellite
// even at the aggressive end (a commonly-cited 5–10% ceiling for volatile
// speculative assets).
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

// Asset-class buckets with example instruments (well-known broad, low-cost
// index ETFs and the two largest cryptocurrencies — examples, not picks).
const ALLOCATION_BUCKETS = [
  { id: "us",     name: "US stocks",            icon: "📈", color: "#51cf66", examples: [
    { symbol: "VTI", name: "Vanguard Total US Market" },
    { symbol: "VOO", name: "Vanguard S&P 500" },
    { symbol: "SCHB", name: "Schwab Broad Market" },
  ]},
  { id: "intl",   name: "International stocks", icon: "🌍", color: "#22b8cf", examples: [
    { symbol: "VXUS", name: "Vanguard Total International" },
    { symbol: "IXUS", name: "iShares Total International" },
  ]},
  { id: "bonds",  name: "Bonds",                icon: "🏛️", color: "#8a9bb0", examples: [
    { symbol: "BND", name: "Vanguard Total Bond" },
    { symbol: "AGG", name: "iShares Core US Bond" },
  ]},
  { id: "cash",   name: "Cash / T-bills",       icon: "💵", color: "#fcc419", examples: [
    { symbol: "SGOV", name: "iShares 0–3 Month Treasury" },
    { symbol: "HYSA", name: "High-yield savings account" },
  ]},
  { id: "crypto", name: "Crypto",               icon: "₿",  color: "#ff9f43", examples: [
    { symbol: "BTC", name: "Bitcoin (~70% of crypto slice)" },
    { symbol: "ETH", name: "Ethereum (~30% of crypto slice)" },
  ]},
];
const BUCKET_BY_ID = Object.fromEntries(ALLOCATION_BUCKETS.map(b => [b.id, b]));

// Scores the quiz and applies two safety gates that override raw score:
// money needed within ~3 years shouldn't ride the stock market, and
// investing before any emergency fund exists is putting the cart first.
function scoreRiskQuiz(answers) {
  if (!answers) return null;
  for (const q of RISK_QUIZ) if (answers[q.id] == null) return null; // incomplete
  const score = RISK_QUIZ.reduce((a, q) => a + q.opts[answers[q.id]].pts, 0);
  const frac = score / RISK_QUIZ_MAX;
  let profileId = frac < 0.38 ? "conservative" : frac < 0.62 ? "balanced" : frac < 0.85 ? "growth" : "aggressive";
  const flags = [];
  if (answers.horizon === 0) {
    profileId = "conservative";
    flags.push("shortHorizon");
  }
  if (answers.efund === 0) {
    if (profileId === "growth" || profileId === "aggressive") profileId = "balanced";
    flags.push("noEmergencyFund");
  } else if (answers.efund === 1) {
    flags.push("thinEmergencyFund");
  }
  return { score, max: RISK_QUIZ_MAX, profileId, flags };
}

// Splits a monthly dollar amount across a profile's allocation, rounding to
// whole dollars while keeping the total exactly equal to `monthly`.
function buildInvestPlan(profileId, monthly) {
  const profile = RISK_PROFILES[profileId];
  if (!profile || !(monthly > 0)) return [];
  const rows = ALLOCATION_BUCKETS
    .map(b => ({ bucket: b, pct: profile.allocation[b.id] || 0 }))
    .filter(r => r.pct > 0)
    .map(r => ({ ...r, amount: Math.floor((r.pct / 100) * monthly) }));
  let leftover = Math.round(monthly) - rows.reduce((a, r) => a + r.amount, 0);
  // hand out remainder dollars to the largest buckets first
  const byPct = rows.slice().sort((a, b) => b.pct - a.pct);
  for (let i = 0; leftover > 0; i = (i + 1) % byPct.length, leftover--) byPct[i].amount++;
  return rows;
}

// Symbol → CoinGecko id for live crypto prices (free API, no key). Unknown
// symbols fall back to a manual price on the holding.
const CRYPTO_COINGECKO_IDS = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", XRP: "ripple", ADA: "cardano",
  DOGE: "dogecoin", DOT: "polkadot", LINK: "chainlink", LTC: "litecoin",
  AVAX: "avalanche-2", MATIC: "matic-network", POL: "polygon-ecosystem-token",
  UNI: "uniswap", ATOM: "cosmos", XLM: "stellar", BCH: "bitcoin-cash",
  SHIB: "shiba-inu", NEAR: "near", APT: "aptos", ARB: "arbitrum", OP: "optimism",
  TON: "the-open-network", TRX: "tron", BNB: "binancecoin", SUI: "sui",
  USDC: "usd-coin", USDT: "tether",
};

// Best-guess asset-class bucket for well-known tickers, so the actual-vs-
// target comparison works without manual tagging. Individual stocks default
// to "us" (editable on the holding).
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

// Current value of one holding, preferring a live cached price, then a
// manually-entered price, then cost basis (so a brand-new holding isn't $0).
function holdingValue(h, priceCache) {
  const cached = priceCache && priceCache[holdingPriceKey(h)];
  const price = (cached && cached.price) ?? h.manualPrice ?? h.costPerUnit ?? 0;
  return h.quantity * price;
}
function holdingPriceKey(h) {
  return h.kind === "crypto" ? `crypto:${(h.symbol || "").toUpperCase()}` : `stock:${(h.symbol || "").toUpperCase()}`;
}

// Actual portfolio mix by bucket → [{bucket, value, pct}] for buckets > 0.
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

if (typeof module !== "undefined") {
  module.exports = {
    EXPENSE_CATEGORIES, INCOME_CATEGORIES, EXPENSE_CAT_BY_ID, INCOME_CAT_BY_ID,
    RECOMMENDED_BUDGET_PCT, RECOMMENDED_SAVINGS_PCT,
    INCOME_FREQUENCIES, toMonthlyAmount, fromMonthlyAmount,
    monthKey, currentMonthKey, fmtMonth, addMonths, lastNMonthKeys, daysInMonth,
    RISK_QUIZ, RISK_QUIZ_MAX, RISK_PROFILES, ALLOCATION_BUCKETS, BUCKET_BY_ID,
    scoreRiskQuiz, buildInvestPlan, CRYPTO_COINGECKO_IDS, STOCK_BUCKET_GUESS,
    guessBucketForSymbol, holdingValue, holdingPriceKey, portfolioBreakdown,
  };
}
