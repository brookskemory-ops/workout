/* ============================================================================
 * KEEL — SimpleFIN bank sync. Zero-server design: the user connects their
 * banks at SimpleFIN Bridge (bridge.simplefin.org, a paid third-party
 * service), pastes a one-time setup token here, and the app talks to the
 * bridge directly from the browser (it sends CORS headers). The access URL —
 * which embeds credentials — never leaves this device.
 * ==========================================================================*/

const BANK_TIMEOUT_MS = 15000;
const BANK_AUTO_SYNC_MS = 60 * 60 * 1000; // hourly while in use; the daily budget below enforces the 24/day cap
const BANK_OVERLAP_DAYS = 3;                  // re-fetch window so nothing is missed

// fetch() rejects URLs with embedded credentials, so split them into a
// Basic Authorization header.
function bankRequestParts(accessUrl, path, params) {
  const u = new URL(accessUrl);
  const auth = "Basic " + btoa(`${decodeURIComponent(u.username)}:${decodeURIComponent(u.password)}`);
  u.username = ""; u.password = "";
  const url = new URL(u.href.replace(/\/$/, "") + path);
  for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, v);
  return { url: url.href, auth };
}

async function bankFetch(accessUrl, path, params) {
  const { url, auth } = bankRequestParts(accessUrl, path, params);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), BANK_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { Authorization: auth }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`Bank sync failed (HTTP ${res.status})`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Accepts either a setup token (base64 claim URL — one-time exchange) or an
// already-claimed access URL pasted directly.
async function connectBank(input) {
  const trimmed = input.trim();
  if (/^https:\/\//.test(trimmed)) {
    if (!new URL(trimmed).username) throw new Error("That URL is missing its credentials part");
    return trimmed;
  }
  let claimUrl;
  try {
    claimUrl = atob(trimmed).trim();
    if (!/^https:\/\//.test(claimUrl)) throw new Error();
  } catch {
    throw new Error("That doesn't look like a SimpleFIN setup token");
  }
  // The claim POST is a CORS "simple request" (no custom headers).
  const res = await fetch(claimUrl, { method: "POST" });
  if (!res.ok) throw new Error(`Claim failed (HTTP ${res.status}) — tokens are single-use; generate a fresh one`);
  const accessUrl = (await res.text()).trim();
  if (!/^https:\/\//.test(accessUrl)) throw new Error("Bridge returned an unexpected response");
  return accessUrl;
}

// Pulls new transactions + balances into the app. silent=true for automatic
// syncs (no status toasts, no error noise when offline) — but NEW
// transactions always announce themselves so the app feels live.
let bankSyncInFlight = false;
async function syncBank(silent) {
  const bank = state.bank;
  if (!bank.accessUrl || bankSyncInFlight) return 0;
  const budget = syncBudget(bank.syncsToday, todayKey());
  if (!budget.manualAllowed) {
    if (!silent) toast("Bank rate limit reached for today — resets tomorrow");
    return 0;
  }
  bankSyncInFlight = true;
  if (currentRoute() !== "welcome") render(); // spin the status chip
  try {
    bumpSyncCount();
    // Only this month's activity is pulled: the first sync starts at the 1st,
    // and later syncs re-fetch a small overlap window (never crossing back
    // past the month start).
    const monthStart = parseDateKey(`${currentMonthKey()}-01`).getTime();
    const overlapStart = bank.lastSyncAt
      ? new Date(bank.lastSyncAt).getTime() - BANK_OVERLAP_DAYS * 86400000
      : monthStart;
    const startDate = Math.floor(Math.max(monthStart, overlapStart) / 1000);
    const data = await bankFetch(bank.accessUrl, "/accounts", { "start-date": startDate });
    if (data.errors && data.errors.length && !silent) toast(String(data.errors[0]).slice(0, 80));
    const mapped = mapSimplefinTransactions(data, existingBankIds(), state.rules);
    // belt-and-braces: drop anything the bank returns from before this month
    mapped.txns = mapped.txns.filter(t => monthKey(t.date) === currentMonthKey());
    applyBankSync(mapped);
    if (currentRoute() !== "welcome") render();
    const n = mapped.txns.length;
    if (n) {
      toast(`${n} new transaction${n > 1 ? "s" : ""} from your bank`,
        { action: "Sort", onAction: () => navigate("inbox") });
    } else if (!silent) {
      toast("Synced ✓ · nothing new");
    }
    return n;
  } catch (e) {
    if (!silent) toast(navigator.onLine === false ? "You're offline — try again later" : e.message);
    return 0;
  } finally {
    bankSyncInFlight = false;
    if (currentRoute() !== "welcome") render();
  }
}

// Called at boot, when the app returns to the foreground, and by a slow
// foreground timer — the throttle + daily budget decide if a request is due.
function maybeAutoSyncBank() {
  const bank = state.bank;
  if (!bank.accessUrl || !bank.autoSync || navigator.onLine === false) return;
  if (document.hidden) return;
  if (!syncBudget(bank.syncsToday, todayKey()).autoAllowed) return;
  if (bank.lastSyncAt && Date.now() - new Date(bank.lastSyncAt).getTime() < BANK_AUTO_SYNC_MS) return;
  syncBank(true);
}
// Returning to the app is the natural "check my money" moment.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) maybeAutoSyncBank();
  });
}
