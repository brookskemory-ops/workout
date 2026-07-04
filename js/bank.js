/* ============================================================================
 * KEEL — SimpleFIN bank sync. Zero-server design: the user connects their
 * banks at SimpleFIN Bridge (bridge.simplefin.org, a paid third-party
 * service), pastes a one-time setup token here, and the app talks to the
 * bridge directly from the browser (it sends CORS headers). The access URL —
 * which embeds credentials — never leaves this device.
 * ==========================================================================*/

const BANK_TIMEOUT_MS = 15000;
const BANK_AUTO_SYNC_MS = 6 * 60 * 60 * 1000; // ≤4/day, far under the 24/day limit
const BANK_OVERLAP_DAYS = 3;                  // re-fetch window so nothing is missed
const BANK_FIRST_SYNC_DAYS = 60;

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

// Pulls new transactions + balances into the app. silent=true for the
// on-open auto-sync (no toasts, no error noise when offline).
let bankSyncInFlight = false;
async function syncBank(silent) {
  const bank = state.bank;
  if (!bank.accessUrl || bankSyncInFlight) return;
  bankSyncInFlight = true;
  try {
    const sinceDays = bank.lastSyncAt ? BANK_OVERLAP_DAYS : BANK_FIRST_SYNC_DAYS;
    const startDate = Math.floor((bank.lastSyncAt ? new Date(bank.lastSyncAt).getTime() : Date.now()) / 1000) - sinceDays * 86400;
    const data = await bankFetch(bank.accessUrl, "/accounts", { "start-date": startDate });
    if (data.errors && data.errors.length && !silent) toast(String(data.errors[0]).slice(0, 80));
    const mapped = mapSimplefinTransactions(data, existingBankIds(), state.rules);
    applyBankSync(mapped);
    if (currentRoute() !== "welcome") render();
    if (!silent) {
      toast(mapped.txns.length
        ? `Synced ✓ · ${mapped.txns.length} new transaction${mapped.txns.length > 1 ? "s" : ""} in the Inbox`
        : "Synced ✓ · nothing new");
    }
  } catch (e) {
    if (!silent) toast(navigator.onLine === false ? "You're offline — try again later" : e.message);
  } finally {
    bankSyncInFlight = false;
  }
}

// Called at boot and on Home render.
function maybeAutoSyncBank() {
  const bank = state.bank;
  if (!bank.accessUrl || !bank.autoSync || navigator.onLine === false) return;
  if (bank.lastSyncAt && Date.now() - new Date(bank.lastSyncAt).getTime() < BANK_AUTO_SYNC_MS) return;
  syncBank(true);
}
