/* ============================================================================
 * KEEL — shared UI kit: DOM helpers, formatters, router with scroll
 * preservation, tab bar + FAB, overlays (modal / bottom sheet), and small
 * reusable component builders. Views register themselves in ROUTES (app.js).
 * ==========================================================================*/

/* ------------------------------ DOM helpers ------------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Replace one container's contents without a full view re-render.
function patch(sel, html) {
  const el = $(sel);
  if (el) el.innerHTML = html;
  return el;
}

function toast(msg, opts = {}) {
  let t = $("#toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  if (opts.action) {
    const btn = document.createElement("button");
    btn.className = "toast-action";
    btn.textContent = opts.action;
    btn.addEventListener("click", () => { t.classList.remove("show"); opts.onAction?.(); });
    t.appendChild(btn);
  }
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), opts.action ? 6000 : 1900);
}
// Delete confirmation pattern: the delete already happened; offer to undo it.
function toastUndo(msg) {
  toast(msg, { action: "Undo", onAction: () => { if (undoLast()) { render(); toast("Restored ✓"); } } });
}

/* ------------------------------ formatters -------------------------------- */
function currency() { return state.settings.currency || "$"; }
// Whole-dollar money: "$1,234" / "-$56". Used for totals and rows.
function fmtMoney(n) {
  const sign = n < 0 ? "−" : "";
  return `${sign}${currency()}${Math.round(Math.abs(n || 0)).toLocaleString()}`;
}
// Explicit +/− coloring is done via .pos/.neg classes; this adds the "+".
function fmtMoneySigned(n) {
  return `${n >= 0 ? "+" : "−"}${currency()}${Math.round(Math.abs(n || 0)).toLocaleString()}`;
}
// Per-unit prices need decimals (crypto can be < $1).
function fmtPrice(n) {
  if (n == null || isNaN(n)) return "—";
  const opts = n >= 1000 ? { maximumFractionDigits: 0 }
    : { minimumFractionDigits: 2, maximumFractionDigits: n < 1 ? 4 : 2 };
  return currency() + n.toLocaleString(undefined, opts);
}
function fmtDay(keyOrIso) {
  return parseDateKey(keyOrIso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function fmtDateShort(keyOrIso) {
  return parseDateKey(keyOrIso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function fmtAgo(iso) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

/* ------------------------------ viewed month ------------------------------ */
// Home and Activity share one "viewed month" so stepping back on one carries
// to the other. Resets to the current month on app load only.
let viewedMonth = null;
function getViewedMonth() { return viewedMonth || currentMonthKey(); }
function monthStepperHTML() {
  const key = getViewedMonth();
  const isCurrent = key === currentMonthKey();
  return `<div class="month-stepper">
    <button class="stepper-btn" data-month-step="-1" aria-label="Previous month">‹</button>
    <button class="stepper-label ${isCurrent ? "" : "off-month"}" data-month-reset title="Jump to current month">${fmtMonth(key)}</button>
    <button class="stepper-btn" data-month-step="1" aria-label="Next month" ${isCurrent ? "disabled" : ""}>›</button>
  </div>`;
}
function wireMonthStepper() {
  $$("[data-month-step]").forEach(b => b.addEventListener("click", () => {
    const next = addMonths(getViewedMonth(), parseInt(b.dataset.monthStep, 10));
    viewedMonth = next > currentMonthKey() ? currentMonthKey() : next;
    render();
  }));
  $("[data-month-reset]")?.addEventListener("click", () => { viewedMonth = null; render(); });
}

/* ------------------------------ page header ------------------------------- */
function pageHeader(title, { stepper = false, sub = "" } = {}) {
  return `<header class="page-head">
    <div class="page-head-row">
      <h1>${title}</h1>
      <button class="icon-btn gear-btn" data-nav="settings" aria-label="Settings">${svgIcon("sliders")}</button>
    </div>
    ${stepper ? monthStepperHTML() : sub ? `<p class="page-sub">${sub}</p>` : ""}
  </header>`;
}

/* ------------------------------ router ------------------------------------ */
// ROUTES is defined in app.js: { route: {render, wire, tab} }
let lastRenderedRoute = null;
function currentRoute() {
  if (!state.settings.onboarded) return "welcome";
  const r = location.hash.replace("#", "");
  return ROUTES[r] ? r : "home";
}
function navigate(route) {
  if (location.hash === "#" + route) render();
  else location.hash = route;
}
function render(opts = {}) {
  const route = currentRoute();
  const view = $("#view");
  const routeChanged = route !== lastRenderedRoute;
  const keepScroll = !routeChanged && opts.preserveScroll !== false;
  const top = keepScroll ? view.scrollTop : 0;
  view.innerHTML = ROUTES[route].render();
  ROUTES[route].wire?.();
  view.scrollTop = top;
  lastRenderedRoute = route;
  // chrome: tab highlight + FAB visibility
  const tab = ROUTES[route].tab;
  $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.route === tab));
  $("#fab")?.classList.toggle("hidden", route === "welcome");
  document.body.classList.toggle("onboarding", route === "welcome");
  // shared wiring available on every page
  $$("[data-nav]").forEach(b => b.addEventListener("click", () => navigate(b.dataset.nav)));
  wireMonthStepper();
}
window.addEventListener("hashchange", () => render());

/* ------------------------------ tab bar + FAB ------------------------------ */
const tabIcon = (paths) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
const TABS = [
  { route: "home",     label: "Home",     ico: tabIcon('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>') },
  { route: "activity", label: "Activity", ico: tabIcon('<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>') },
  { route: "plan",     label: "Plan",     ico: tabIcon('<path d="M21.2 14A9 9 0 1 1 10 2.8"/><path d="M12 12V3a9 9 0 0 1 9 9h-9z"/>') },
  { route: "invest",   label: "Invest",   ico: tabIcon('<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>') },
];
function buildTabBar() {
  const [a, b, c, d] = TABS;
  const tabHTML = (t) => `<a class="tab" data-route="${t.route}" href="#${t.route}">
    <span class="ico" aria-hidden="true">${t.ico}</span><span>${t.label}</span></a>`;
  $("#tabbar").innerHTML = `${tabHTML(a)}${tabHTML(b)}<span class="tab-spacer" aria-hidden="true"></span>${tabHTML(c)}${tabHTML(d)}`;
  const fab = document.createElement("button");
  fab.id = "fab";
  fab.setAttribute("aria-label", "Log a transaction");
  fab.innerHTML = svgIcon("plus");
  fab.addEventListener("click", () => openQuickLog());
  document.body.appendChild(fab);
}

/* ------------------------------ overlays ---------------------------------- */
// modal(): centered-ish bottom card for edit forms. sheet(): full bottom
// sheet for the quick-log. Both close on backdrop tap / ✕ and return the
// overlay root so callers can wire their controls.
function openOverlay(className, innerHTML, wireFn) {
  const backdrop = document.createElement("div");
  backdrop.className = "overlay-backdrop";
  backdrop.innerHTML = `<div class="${className}" role="dialog" aria-modal="true">
    <button class="overlay-close" aria-label="Close">✕</button>${innerHTML}</div>`;
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop || e.target.classList.contains("overlay-close")) closeOverlay(backdrop);
  });
  document.body.appendChild(backdrop);
  requestAnimationFrame(() => backdrop.classList.add("open"));
  wireFn?.(backdrop);
  return backdrop;
}
function closeOverlay(el) {
  const backdrop = el?.closest?.(".overlay-backdrop") || el;
  if (!backdrop) return;
  backdrop.classList.remove("open");
  setTimeout(() => backdrop.remove(), 180);
}
function modal(html, wireFn) { return openOverlay("modal", html, wireFn); }
function sheet(html, wireFn) { return openOverlay("sheet", html, wireFn); }

/* ------------------------------ components -------------------------------- */
function segmentedHTML(items, activeId, attr) {
  return `<div class="segmented" style="--seg-count:${items.length}">
    ${items.map(i => `<button class="seg-btn ${i.id === activeId ? "active" : ""}" data-${attr}="${i.id}">${i.label}</button>`).join("")}
  </div>`;
}
// Icon HTML for a category — legacy custom categories may still carry emoji
// in `icon`; svgIcon falls back to the tag glyph for any unknown name.
function catIconHTML(cat, cls) { return svgIcon(cat.icon, cls); }
function categoryOptionsHTML(cats, selectedId) {
  return cats.map(c => `<option value="${c.id}" ${c.id === selectedId ? "selected" : ""}>${esc(c.name)}</option>`).join("");
}
// Expense categories ordered for logging: day-to-day first, bill-like under
// an optgroup so "Rent" never sits at the top of a quick expense.
function expenseOptionsGroupedHTML(selectedId) {
  const cats = allExpenseCategories();
  const variable = cats.filter(c => c.typical !== "fixed");
  const fixed = cats.filter(c => c.typical === "fixed");
  return categoryOptionsHTML(variable, selectedId) +
    `<optgroup label="Usually bills">${categoryOptionsHTML(fixed, selectedId)}</optgroup>`;
}
function barHTML(pct, statusCls) {
  return `<div class="bar"><div class="bar-fill ${statusCls || ""}" style="width:${Math.max(0, Math.min(100, pct || 0))}%"></div></div>`;
}
function statusCls(status) {
  return status === "over" ? "neg" : status === "warn" ? "warn" : "pos";
}
function emptyStateHTML(icon, text, ctaLabel, ctaAttr) {
  return `<div class="empty-state">
    <div class="empty-ico" aria-hidden="true">${svgIcon(icon)}</div>
    <p>${text}</p>
    ${ctaLabel ? `<button class="btn small" ${ctaAttr}>${ctaLabel}</button>` : ""}
  </div>`;
}
// Transaction list row. `editable` rows carry data-edit-txn for the Activity
// edit modal; wiring is the caller's job.
function txnRowHTML(t, editable) {
  const cat = catForTxn(t);
  const amountCls = t.type === "income" ? "pos" : t.source === "fixed" ? "fixed" : "neg";
  const sign = t.type === "income" ? "+" : "−";
  return `<${editable ? "button" : "div"} class="row txn-row" ${editable ? `data-edit-txn="${t.id}"` : ""}>
    <span class="row-tile" aria-hidden="true">${catIconHTML(cat)}</span>
    <span class="row-main">
      <span class="row-title">${esc(t.note || cat.name).replace(/#([\w-]+)/g, '<span class="tag-hl">#$1</span>')}</span>
      <span class="row-sub">${esc(cat.name)}${t.source === "fixed" ? " · bill" : ""}</span>
    </span>
    <span class="row-end">
      <span class="money ${amountCls}">${sign}${fmtMoney(t.amount)}</span>
      <span class="row-sub">${fmtDateShort(t.date)}</span>
    </span>
  </${editable ? "button" : "div"}>`;
}

/* ------------------------------ bank status chip --------------------------- */
// "Bank · synced 12m ago" under the header on money views. Tapping forces a
// manual sync; the icon spins while a sync is in flight.
function bankStatusChipHTML() {
  if (!state.bank.accessUrl) return "";
  const busy = typeof bankSyncInFlight !== "undefined" && bankSyncInFlight;
  return `<button class="bank-chip ${busy ? "busy" : ""}" id="bank-chip" aria-label="Sync bank now">
    ${svgIcon("refresh")} Bank · ${busy ? "syncing…" : state.bank.lastSyncAt ? `synced ${fmtAgo(state.bank.lastSyncAt)}` : "not synced yet"}
  </button>`;
}
function wireBankChip() {
  $("#bank-chip")?.addEventListener("click", () => syncBank(false));
}

/* ------------------------------ pull-to-refresh ---------------------------- */
// Custom PTR (standalone PWAs have no native one): pull down from the top of
// the view to sync the bank + refresh prices. Skips pulls that start on the
// inbox drag card.
function initPullToRefresh() {
  const view = $("#view");
  const ptr = document.createElement("div");
  ptr.id = "ptr";
  ptr.innerHTML = svgIcon("refresh");
  document.body.appendChild(ptr);

  let startY = null, pulling = false, dist = 0;
  const THRESHOLD = 70;

  view.addEventListener("touchstart", (e) => {
    if (view.scrollTop > 0 || e.target.closest?.(".inbox-card, .overlay-backdrop")) { startY = null; return; }
    startY = e.touches[0].clientY;
    dist = 0;
  }, { passive: true });

  view.addEventListener("touchmove", (e) => {
    if (startY == null) return;
    dist = e.touches[0].clientY - startY;
    if (dist <= 0) { if (pulling) endPull(); return; }
    pulling = true;
    const eased = Math.min(dist * 0.45, 90);
    ptr.style.transform = `translateX(-50%) translateY(${eased}px) rotate(${eased * 3}deg)`;
    ptr.classList.add("visible");
    ptr.classList.toggle("armed", dist * 0.45 >= THRESHOLD * 0.45 && dist >= THRESHOLD);
  }, { passive: true });

  const endPull = () => {
    const fire = pulling && dist >= THRESHOLD;
    pulling = false; startY = null;
    ptr.classList.remove("armed");
    if (fire) {
      ptr.classList.add("spinning");
      ptr.style.transform = `translateX(-50%) translateY(46px)`;
      const done = () => { ptr.classList.remove("visible", "spinning"); ptr.style.transform = ""; };
      const tasks = [];
      if (state.bank.accessUrl) tasks.push(syncBank(false));
      if (state.invest.holdings.length) tasks.push(refreshInvestPrices(true));
      if (!tasks.length) { render(); toast("Refreshed"); }
      Promise.allSettled(tasks).then(() => setTimeout(done, 400));
    } else {
      ptr.classList.remove("visible");
      ptr.style.transform = "";
    }
  };
  view.addEventListener("touchend", endPull, { passive: true });
  view.addEventListener("touchcancel", endPull, { passive: true });
}

/* ------------------------------ confetti ---------------------------------- */
function launchConfetti() {
  const wrap = document.createElement("div");
  wrap.className = "confetti-wrap";
  for (let i = 0; i < 36; i++) {
    const p = document.createElement("i");
    p.className = `confetti c${(i % 6) + 1}`;
    p.style.left = Math.random() * 100 + "vw";
    p.style.animationDelay = Math.random() * 0.4 + "s";
    p.style.animationDuration = 1.4 + Math.random() * 1.2 + "s";
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 3200);
}
