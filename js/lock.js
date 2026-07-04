/* ============================================================================
 * KEEL — device polish & privacy: PIN lock (WebCrypto-hashed, stored under a
 * separate localStorage key excluded from backups), theme switching, haptics.
 * ==========================================================================*/

const LOCK_KEY = "keel.lock";
const LOCK_AFTER_HIDDEN_MS = 2 * 60 * 1000;
const LOCK_MAX_ATTEMPTS = 5;
const LOCK_COOLDOWN_MS = 30 * 1000;

/* ------------------------------ haptics ----------------------------------- */
function buzz(ms = 8) {
  try { navigator.vibrate?.(ms); } catch (e) { /* unsupported */ }
}

/* ------------------------------ theme -------------------------------------- */
function applyTheme() {
  const pref = state.ui.theme || "dark";
  const root = document.documentElement;
  if (pref === "system") {
    const light = window.matchMedia?.("(prefers-color-scheme: light)").matches;
    root.dataset.theme = light ? "light" : "dark";
  } else {
    root.dataset.theme = pref;
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = root.dataset.theme === "light" ? "#F4F6FA" : "#090D13";
}
if (typeof window !== "undefined" && window.matchMedia) {
  window.matchMedia("(prefers-color-scheme: light)").addEventListener?.("change", () => {
    if ((state.ui.theme || "dark") === "system") applyTheme();
  });
}

/* ------------------------------ PIN hashing -------------------------------- */
async function hashPin(salt, pin) {
  const data = new TextEncoder().encode(salt + ":" + pin);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function hasPIN() {
  try { return !!localStorage.getItem(LOCK_KEY); } catch (e) { return false; }
}
async function setPIN(pin) {
  const salt = [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(16).padStart(2, "0")).join("");
  // `len` lets the lock screen verify exactly when enough digits are in —
  // a wrong guess fails immediately instead of waiting for a 6th digit.
  localStorage.setItem(LOCK_KEY, JSON.stringify({ salt, hash: await hashPin(salt, pin), len: pin.length }));
}
function pinLength() {
  try { return JSON.parse(localStorage.getItem(LOCK_KEY)).len || 6; } catch (e) { return 6; }
}
function clearPIN() { localStorage.removeItem(LOCK_KEY); }
async function verifyPIN(pin) {
  try {
    const { salt, hash } = JSON.parse(localStorage.getItem(LOCK_KEY));
    return (await hashPin(salt, pin)) === hash;
  } catch (e) { return false; }
}

/* ------------------------------ lock screen -------------------------------- */
let lockVisible = false;
function showLockScreen(onUnlock) {
  if (lockVisible) return;
  lockVisible = true;
  let entered = "";
  let attempts = 0;
  let coolingUntil = 0;
  const len = pinLength();

  const el = document.createElement("div");
  el.className = "lock-screen";
  el.innerHTML = `
    <div class="welcome-logo" aria-hidden="true">${KEEL_MARK}</div>
    <div style="font-weight:800;font-size:1.2rem">Enter your PIN</div>
    <div class="pin-dots" id="pin-dots">${"<i></i>".repeat(pinLength())}</div>
    <div class="row-sub" id="pin-msg" style="min-height:1.2em"></div>
    <div class="keypad">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-key="${n}">${n}</button>`).join("")}
      <button class="key-aux" data-key="forgot">Forgot?</button>
      <button data-key="0">0</button>
      <button class="key-aux" data-key="del">⌫</button>
    </div>`;
  document.body.appendChild(el);

  const dots = el.querySelector("#pin-dots");
  const msg = el.querySelector("#pin-msg");
  const paint = () => {
    [...dots.children].forEach((d, i) => d.classList.toggle("on", i < entered.length));
  };
  const fail = () => {
    attempts++;
    entered = "";
    paint();
    dots.classList.add("shake");
    buzz(40);
    setTimeout(() => dots.classList.remove("shake"), 400);
    if (attempts >= LOCK_MAX_ATTEMPTS) {
      coolingUntil = Date.now() + LOCK_COOLDOWN_MS;
      attempts = 0;
      const tick = () => {
        const left = Math.ceil((coolingUntil - Date.now()) / 1000);
        if (left > 0) { msg.textContent = `Too many tries — wait ${left}s`; setTimeout(tick, 500); }
        else msg.textContent = "";
      };
      tick();
    } else {
      msg.textContent = "Wrong PIN";
      setTimeout(() => { if (msg.textContent === "Wrong PIN") msg.textContent = ""; }, 1200);
    }
  };
  const tryVerify = async () => {
    if (await verifyPIN(entered)) {
      lockVisible = false;
      el.remove();
      buzz();
      onUnlock?.();
    } else fail();
  };

  el.addEventListener("click", (e) => {
    const key = e.target.dataset?.key;
    if (!key || Date.now() < coolingUntil) return;
    if (key === "del") { entered = entered.slice(0, -1); paint(); return; }
    if (key === "forgot") {
      if (confirm("There is no PIN recovery — your data lives only on this device.\n\nErase ALL Keel data and start over?") &&
          confirm("Really erase everything? A JSON backup (if you made one) can restore it afterwards.")) {
        clearPIN();
        localStorage.removeItem(STORE_KEY);
        for (let i = 0; i < 7; i++) localStorage.removeItem(SNAPSHOT_PREFIX + i);
        localStorage.removeItem(SNAPSHOT_DAY_KEY);
        location.reload();
      }
      return;
    }
    if (entered.length >= len) return;
    entered += key;
    buzz(4);
    paint();
    if (entered.length === len) tryVerify();
  });
}

// Boot gate: resolves immediately when no PIN; otherwise after unlock.
function lockOnBootIfEnabled() {
  return new Promise((resolve) => {
    if (!hasPIN()) return resolve();
    showLockScreen(resolve);
  });
}
// Relock after the app has been backgrounded for a while.
let hiddenAt = null;
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (hiddenAt && hasPIN() && Date.now() - hiddenAt > LOCK_AFTER_HIDDEN_MS) showLockScreen();
    hiddenAt = null;
  });
}
