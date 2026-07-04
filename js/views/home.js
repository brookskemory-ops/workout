/* ============================================================================
 * KEEL — Home: the month at a glance. Net cash-flow hero, bill nudges,
 * payday card, budget alerts, net worth, insights (donut + trend), teasers,
 * recent activity. Absorbs the old Reports tab.
 * ==========================================================================*/

/* ------------------------------ nudges ------------------------------------ */
function billNudgesHTML() {
  if (getViewedMonth() !== currentMonthKey()) return "";
  const key = currentMonthKey();
  const todayDay = +todayKey().slice(8, 10);
  const unpaid = state.bills.filter(b => b.active !== false && !billPaidInMonth(b.id, key));
  const overdue = unpaid.filter(b => b.dueDay < todayDay);
  const dueSoon = unpaid.filter(b => b.dueDay >= todayDay && b.dueDay <= todayDay + 5);
  const rowFor = (b, cls, label) => `<div class="nudge ${cls}">
    <div class="nudge-body"><strong>${esc(b.name)}</strong> · ${fmtMoney(b.amount)} ${label} (day ${b.dueDay})</div>
    <button class="btn small" data-pay-bill="${b.id}">✓ Paid</button>
  </div>`;
  return overdue.map(b => rowFor(b, "neg", "overdue")).join("") +
    dueSoon.map(b => rowFor(b, "warn", "due soon")).join("");
}

function paydayNudgeHTML() {
  const { payAnchor, incomeFrequency, expectedIncome } = state.income;
  if (!payAnchor || !expectedIncome || getViewedMonth() !== currentMonthKey()) return "";
  const today = todayKey();
  // A payday counts as "current" from 3 days before through 3 days after.
  const windowStart = addDaysKey(today, -3);
  const upcoming = nextPaydays(payAnchor, incomeFrequency, windowStart, 2);
  const near = upcoming.find(p => Math.abs(daysBetween(today, p)) <= 3);
  if (!near) return "";
  const logged = state.transactions.some(t =>
    t.type === "income" && t.category === "paycheck" && Math.abs(daysBetween(t.date, near)) <= 3);
  if (logged) return "";
  const when = near === today ? "today" : daysBetween(today, near) > 0 ? fmtDateShort(near) : `${-daysBetween(today, near)}d ago`;
  return `<div class="nudge pos">
    <div class="nudge-body"><strong>Payday ${when}</strong> · log your ${fmtMoney(expectedIncome)} paycheck?</div>
    <button class="btn small" data-log-payday="${near}">＋ Log it</button>
  </div>`;
}

function backupNudgeHTML() {
  if (!state.settings.backupReminder) return "";
  const last = state.settings.lastBackupAt;
  const stale = !last || (Date.now() - new Date(last).getTime()) > 30 * 86400000;
  const txnsSince = last ? state.transactions.filter(t => parseDateKey(t.date) > new Date(last)).length : state.transactions.length;
  if (!stale || txnsSince < 10) return "";
  return `<div class="nudge">
    <div class="nudge-body">It's been a while since your last backup — your data lives only on this device.</div>
    <button class="btn small" data-nav="settings">Back up</button>
  </div>`;
}

/* ------------------------------ cards -------------------------------------- */
function heroCardHTML(key) {
  const t = monthTotals(state.transactions, state.bills, key);
  const cls = t.net >= 0 ? "pos" : "neg";
  return `<div class="card hero-card">
    <div class="card-label">Net cash flow · ${fmtMonth(key)}</div>
    <div class="hero-amount money ${cls}">${fmtMoneySigned(t.net)}</div>
    <div class="hero-meta">
      <span class="money">＋ ${fmtMoney(t.income)} income</span>
      <span class="money">▤ ${fmtMoney(t.fixedExpected)} bills</span>
      <span class="money">− ${fmtMoney(t.variable)} spending</span>
    </div>
  </div>`;
}

function budgetAlertsHTML(key) {
  const income = expectedMonthlyIncome();
  const hot = allExpenseCategories()
    .map(c => ({ c, bs: budgetStatus(state.transactions, state.budgets, state.bills, c.id, key, income) }))
    .filter(x => x.bs.hasBudget && (x.bs.status === "over" || x.bs.status === "warn"))
    .sort((a, b) => b.bs.pct - a.bs.pct)
    .slice(0, 4);
  if (!hot.length) return "";
  return `<button class="card" data-nav="plan">
    <div class="card-label">Budgets running hot</div>
    ${hot.map(({ c, bs }) => `<div class="vol-row">
      <span class="vol-label">${c.icon} ${esc(c.name)}</span>
      ${barHTML(bs.pct, statusCls(bs.status))}
      <span class="vol-num money ${statusCls(bs.status)}">${fmtMoney(bs.spent)} / ${fmtMoney(bs.target)}</span>
    </div>`).join("")}
  </button>`;
}

function netWorthCardHTML() {
  const hasAnything = state.goals.length || state.invest.holdings.length || state.debts.length;
  if (!hasAnything) return "";
  const nw = currentNetWorth();
  const series = state.invest.snapshots.slice(-30).map(s => s.netWorth);
  return `<button class="card" data-nav="invest">
    <div class="card-label">Net worth</div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
      <div class="hero-amount money ${nw >= 0 ? "" : "neg"}" style="font-size:1.6rem">${fmtMoney(nw)}</div>
      ${series.length >= 2 ? sparkline(series) : ""}
    </div>
    <div class="row-sub" style="margin-top:4px">savings + portfolio − debts</div>
  </button>`;
}

function spendingDonutHTML(key) {
  const spend = allExpenseCategories()
    .map(c => ({ c, v: categorySpend(state.transactions, key, c.id) }))
    .filter(x => x.v > 0)
    .sort((a, b) => b.v - a.v);
  if (!spend.length) return "";
  const total = spend.reduce((a, x) => a + x.v, 0);
  const top = spend.slice(0, 5);
  const otherV = total - top.reduce((a, x) => a + x.v, 0);
  const segs = top.map((x, i) => ({ pct: (x.v / total) * 100, cls: `c${i + 1}`, name: x.c.name, icon: x.c.icon, v: x.v }));
  if (otherV > 0) segs.push({ pct: (otherV / total) * 100, cls: "c6", name: "Other", icon: "…", v: otherV });
  return `<div class="card">
    <div class="card-label">Where it went · ${fmtMonth(key)}</div>
    <div class="donut-wrap">
      ${donut(segs, { centerLabel: fmtMoney(total), centerSub: "spent" })}
      <div class="donut-legend">
        ${segs.map(s => `<div class="leg-row"><span class="dot ${s.cls}"></span>
          <span class="leg-name">${esc(s.name)}</span>
          <span class="money">${fmtMoney(s.v)}</span></div>`).join("")}
      </div>
    </div>
  </div>`;
}

function cashflowTrendHTML(key) {
  const keys = lastNMonthKeys(6, key);
  const nets = keys.map(k => monthTotals(state.transactions, state.bills, k).net);
  if (!nets.some(v => v !== 0)) return "";
  return `<div class="card">
    <div class="card-label">Cash flow · last 6 months</div>
    ${areaLine(nets, { baseline: 0, labels: keys.map(fmtMonthShort) })}
  </div>`;
}

let trendCategory = null;
function categoryTrendHTML(key) {
  const cats = allExpenseCategories().filter(c =>
    lastNMonthKeys(6, key).some(k => categorySpend(state.transactions, k, c.id) > 0));
  if (!cats.length) return "";
  const sel = cats.find(c => c.id === trendCategory) ? trendCategory : cats[0].id;
  const keys = lastNMonthKeys(6, key);
  const vals = keys.map(k => categorySpend(state.transactions, k, sel));
  const max = Math.max(1, ...vals);
  const income = expectedMonthlyIncome();
  const planned = categoryPlanned(state.budgets, state.bills, sel, income);
  return `<div class="card">
    <div class="card-label">Category trend</div>
    <select id="trend-cat" class="select">${categoryOptionsHTML(cats, sel)}</select>
    ${keys.map((k, i) => `<div class="vol-row">
      <span class="vol-label">${fmtMonthShort(k)}</span>
      ${barHTML((vals[i] / max) * 100, planned && vals[i] > planned ? "neg" : "c2")}
      <span class="vol-num money">${fmtMoney(vals[i])}</span>
    </div>`).join("")}
    ${planned ? `<div class="row-sub">planned: ${fmtMoney(planned)}/mo — red bars ran over</div>` : ""}
  </div>`;
}

function goalTeaserHTML() {
  const active = state.goals.filter(g => !g.achieved);
  if (!active.length) return "";
  const next = active.slice().sort((a, b) => {
    if (a.targetDate && b.targetDate) return a.targetDate < b.targetDate ? -1 : 1;
    return a.targetDate ? -1 : b.targetDate ? 1 : 0;
  })[0];
  const current = goalCurrent(next.id);
  const pct = Math.min(100, (current / next.target) * 100);
  return `<button class="card" data-nav="plan-goals">
    <div class="card-label">${next.kind === "sinking" ? "Sinking fund" : "Goal"} · ${esc(next.name)}</div>
    ${barHTML(pct, "pos")}
    <div class="row-sub money">${fmtMoney(current)} / ${fmtMoney(next.target)}${active.length > 1 ? ` · +${active.length - 1} more` : ""}</div>
  </button>`;
}

/* ------------------------------ view -------------------------------------- */
function renderHome() {
  const key = getViewedMonth();
  const recent = txnsInMonth(state.transactions, key).slice().sort((a, b) => b.date < a.date ? -1 : 1).slice(0, 5);
  return `
    ${pageHeader("Keel", { stepper: true })}
    ${backupNudgeHTML()}
    ${billNudgesHTML()}
    ${paydayNudgeHTML()}
    ${heroCardHTML(key)}
    ${budgetAlertsHTML(key)}
    ${netWorthCardHTML()}
    ${spendingDonutHTML(key)}
    ${cashflowTrendHTML(key)}
    ${categoryTrendHTML(key)}
    ${goalTeaserHTML()}
    <div class="card">
      <div class="card-label">Recent activity</div>
      ${recent.length
        ? recent.map(t => txnRowHTML(t, false)).join("") +
          `<button class="btn ghost block" data-nav="activity" style="margin-top:10px">See all activity</button>`
        : emptyStateHTML("🪶", "Nothing logged this month yet.<br>Tap the ＋ button to add your first transaction.")}
    </div>
  `;
}
function wireHome() {
  $$("[data-pay-bill]").forEach(b => b.addEventListener("click", () => {
    toggleBillPaid(b.dataset.payBill, currentMonthKey());
    toast("Bill marked paid ✓");
    render();
  }));
  $$("[data-log-payday]").forEach(b => b.addEventListener("click", () => {
    addTransaction({ type: "income", amount: state.income.expectedIncome, category: "paycheck", note: "Paycheck", date: b.dataset.logPayday });
    toast("Paycheck logged ✓");
    render();
  }));
  $("#trend-cat")?.addEventListener("change", (e) => { trendCategory = e.target.value; render(); });
}
