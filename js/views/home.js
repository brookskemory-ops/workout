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
    <button class="btn small" data-log-payday="${near}">Log it</button>
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

function bankPromoHTML() {
  if (state.bank.accessUrl || state.ui.dismissedBankPromo) return "";
  return `<div class="card hero-card" id="bank-promo">
    <button class="promo-close" data-dismiss-promo aria-label="Dismiss">${svgIcon("x")}</button>
    <div class="card-label">${svgIcon("landmark")} Link your bank</div>
    <p class="row-sub" style="margin:4px 0 12px">New transactions flow straight into your Inbox to sort — synced automatically about every hour you're using the app, with balances feeding your net worth.</p>
    <button class="btn primary block" data-nav="settings">Connect a bank</button>
  </div>`;
}

function renewalNudgesHTML() {
  if (getViewedMonth() !== currentMonthKey()) return "";
  const today = todayKey();
  const soon = detectedSubscriptions()
    .filter(r => daysBetween(today, r.nextDate) >= 0 && daysBetween(today, r.nextDate) <= 3)
    .slice(0, 2);
  return soon.map(r => `<div class="nudge warn">
    <div class="nudge-body"><strong>${esc(r.name)}</strong> (~${fmtMoney(r.amount)}) renews ${r.nextDate === today ? "today" : fmtDateShort(r.nextDate)}</div>
    <button class="btn small" data-nav="plan-bills">Review</button>
  </div>`).join("");
}

function anomalyNudgesHTML(key) {
  return spendingAnomalies(state.transactions, key).map(a => `<div class="nudge warn">
    <div class="nudge-body"><strong>${esc(a.category.name)}</strong> is pacing ${a.pacePct}% above your recent average (${fmtMoney(a.spent)} so far vs ~${fmtMoney(a.avg)}/mo).</div>
  </div>`).join("");
}

/* ------------------------------ forecast ----------------------------------- */
function forecastCardHTML(key) {
  if (key !== currentMonthKey()) return "";
  const fc = forecastMonth({
    transactions: state.transactions, bills: state.bills, income: state.income,
    recurringList: detectedSubscriptions(), key,
  });
  if (!fc.series.some(v => v !== 0)) return "";
  return `<button class="card" data-nav="calendar">
    <div class="card-label">This month's trajectory</div>
    ${areaLine(fc.series, { baseline: 0, labels: ["1", `today (${fc.todayDay})`, String(fc.series.length)] })}
    <div class="hero-meta">
      <span class="money ${fc.projectedNet >= 0 ? "pos" : "neg"}">Projected month end: ${fmtMoneySigned(fc.projectedNet)}</span>
      ${fc.safePerDay != null ? `<span class="money">Safe to spend: ~${fmtMoney(fc.safePerDay)}/day</span>` : ""}
    </div>
    <div class="row-sub" style="margin-top:6px">Actuals so far, then expected paydays, bills, renewals, and your average daily spend. Tap for the calendar.</div>
  </button>`;
}

function topMerchantsCardHTML(key) {
  const top = topMerchants(state.transactions, key, 5);
  if (top.length < 2) return "";
  const max = top[0].total;
  return `<div class="card">
    <div class="card-label">Top merchants · ${fmtMonth(key)}</div>
    ${top.map((m, i) => `<div class="vol-row">
      <span class="vol-label">${esc(m.name)}</span>
      ${barHTML((m.total / max) * 100, `c${(i % 6) + 1}`)}
      <span class="vol-num money">${fmtMoney(m.total)}${m.count > 1 ? ` · ${m.count}×` : ""}</span>
    </div>`).join("")}
  </div>`;
}

function incomeFlowCardHTML(key) {
  const t = monthTotals(state.transactions, state.bills, key);
  if (t.income <= 0) return "";
  const spend = allExpenseCategories()
    .map(c => ({ c, v: categorySpend(state.transactions, key, c.id) }))
    .filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  if (!spend.length) return "";
  const top = spend.slice(0, 5);
  const otherV = spend.slice(5).reduce((a, x) => a + x.v, 0);
  const targets = top.map((x, i) => ({ name: esc(x.c.name), value: x.v, cls: `c${i + 1}` }));
  if (otherV > 0) targets.push({ name: "Other", value: otherV, cls: "c6" });
  const spent = spend.reduce((a, x) => a + x.v, 0);
  if (t.income > spent) targets.push({ name: "Saved", value: t.income - spent, cls: "saved" });
  return `<div class="card">
    <div class="card-label">Where income went · ${fmtMonth(key)}</div>
    ${flowChart(`Income ${fmtMoney(t.income)}`, Math.max(t.income, spent), targets)}
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
      <span class="money"><i class="dot pos"></i>${fmtMoney(t.income)} income</span>
      <span class="money"><i class="dot fixed"></i>${fmtMoney(t.fixedExpected)} bills</span>
      <span class="money"><i class="dot neg"></i>${fmtMoney(t.variable)} spending</span>
    </div>
  </div>`;
}

function budgetAlertsHTML(key) {
  const hot = allExpenseCategories()
    .map(c => ({ c, bs: catBudgetStatus(c.id, key) }))
    .filter(x => x.bs.hasBudget && (x.bs.status === "over" || x.bs.status === "warn"))
    .sort((a, b) => b.bs.pct - a.bs.pct)
    .slice(0, 4);
  if (!hot.length) return "";
  return `<button class="card" data-nav="plan">
    <div class="card-label">Budgets running hot</div>
    ${hot.map(({ c, bs }) => `<div class="vol-row">
      <span class="vol-label">${catIconHTML(c)} ${esc(c.name)}</span>
      ${barHTML(bs.pct, statusCls(bs.status))}
      <span class="vol-num money ${statusCls(bs.status)}">${fmtMoney(bs.spent)} / ${fmtMoney(bs.target)}</span>
    </div>`).join("")}
  </button>`;
}

function netWorthCardHTML() {
  const hasAnything = state.goals.length || state.invest.holdings.length || state.debts.length || state.bank.accounts.length;
  if (!hasAnything) return "";
  const nw = currentNetWorth();
  const cash = bankCashTotal();
  const series = state.invest.snapshots.slice(-30).map(s => s.netWorth);
  return `<button class="card" data-nav="invest">
    <div class="card-label">Net worth</div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
      <div class="hero-amount money ${nw >= 0 ? "" : "neg"}" style="font-size:1.6rem">${fmtMoney(nw)}</div>
      ${series.length >= 2 ? sparkline(series) : ""}
    </div>
    <div class="row-sub" style="margin-top:4px">${cash ? `${fmtMoney(cash)} cash + ` : ""}savings + portfolio − debts</div>
  </button>`;
}

function inboxNudgeHTML() {
  const n = inboxTxns().length;
  if (!n) return "";
  return `<button class="nudge" data-nav="inbox" style="width:100%;text-align:left;cursor:pointer">
    <div class="nudge-body">${svgIcon("inbox")} <strong>${n}</strong> new transaction${n > 1 ? "s" : ""} to sort into categories</div>
    <span class="btn small">Sort</span>
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
    ${(() => {
      const prior = keys.slice(0, -1).filter(k => vals[keys.indexOf(k)] > 0);
      if (prior.length < 2) return "";
      const avg = prior.reduce((a, k) => a + vals[keys.indexOf(k)], 0) / prior.length;
      const cur = vals[vals.length - 1];
      if (!avg || !cur) return "";
      const delta = Math.round(((cur - avg) / avg) * 100);
      return `<div class="row-sub money ${delta > 15 ? "warn" : delta < -15 ? "pos" : ""}">this month: ${delta >= 0 ? "+" : ""}${delta}% vs your ${prior.length}-month average</div>`;
    })()}
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

/* ------------------------------ monthly recap ------------------------------ */
function maybeShowMonthlyRecap() {
  if (!shouldShowRecap()) return;
  const key = addMonths(currentMonthKey(), -1);
  const t = monthTotals(state.transactions, state.bills, key);
  const savingsRate = t.income > 0 ? Math.round((t.net / t.income) * 100) : null;
  const spend = allExpenseCategories()
    .map(c => ({ c, v: categorySpend(state.transactions, key, c.id) }))
    .filter(x => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 3);
  const budgeted = allExpenseCategories()
    .map(c => catBudgetStatus(c.id, key))
    .filter(bs => bs.hasBudget && bs.target);
  const met = budgeted.filter(bs => bs.status !== "over").length;
  const autoLogs = state.ui.autoLog || [];
  const green = t.net > 0 && (savingsRate == null || savingsRate >= RECOMMENDED_SAVINGS_PCT);

  sheet(`
    <h2>${fmtMonth(key)} recap</h2>
    <div class="hero-amount money ${t.net >= 0 ? "pos" : "neg"}">${fmtMoneySigned(t.net)}</div>
    <div class="row-sub" style="margin-bottom:12px">net cash flow${savingsRate != null ? ` · ${savingsRate}% savings rate` : ""}</div>
    ${spend.length ? `<div class="card-label">Top spending</div>
      ${spend.map(x => `<div class="vol-row"><span class="vol-label">${x.c.icon} ${esc(x.c.name)}</span>
        <span class="vol-num money">${fmtMoney(x.v)}</span></div>`).join("")}` : ""}
    ${budgeted.length ? `<div class="card-label" style="margin-top:10px">Budgets</div>
      <p class="row-sub">${met}/${budgeted.length} stayed under target${met === budgeted.length ? " — clean sweep" : ""}</p>` : ""}
    ${autoLogs.length ? `<div class="card-label" style="margin-top:10px">Done for you</div>
      ${autoLogs.slice(-8).map(a => `<p class="row-sub">${svgIcon("cpu")} ${esc(a.label)}</p>`).join("")}` : ""}
    <button class="btn primary block" style="margin-top:16px" data-recap-close>On to ${fmtMonth(currentMonthKey())} →</button>
  `, (root) => {
    if (green) launchConfetti();
    markRecapShown();
    $("[data-recap-close]", root).addEventListener("click", () => closeOverlay(root));
  });
}

/* ------------------------------ view -------------------------------------- */
function renderHome() {
  const key = getViewedMonth();
  const recent = txnsInMonth(state.transactions, key).slice().sort((a, b) => b.date < a.date ? -1 : 1).slice(0, 5);
  return `
    ${pageHeader("Keel", { stepper: true })}
    ${bankStatusChipHTML()}
    ${bankPromoHTML()}
    ${inboxNudgeHTML()}
    ${backupNudgeHTML()}
    ${billNudgesHTML()}
    ${renewalNudgesHTML()}
    ${paydayNudgeHTML()}
    ${anomalyNudgesHTML(key)}
    ${heroCardHTML(key)}
    ${forecastCardHTML(key)}
    ${budgetAlertsHTML(key)}
    ${netWorthCardHTML()}
    ${spendingDonutHTML(key)}
    ${incomeFlowCardHTML(key)}
    ${topMerchantsCardHTML(key)}
    ${cashflowTrendHTML(key)}
    ${categoryTrendHTML(key)}
    <button class="card" data-nav="year"><div class="card-label">${svgIcon("calendar")} Year in Review — 12-month totals & trends</div></button>
    ${goalTeaserHTML()}
    <div class="card">
      <div class="card-label">Recent activity</div>
      ${recent.length
        ? recent.map(t => txnRowHTML(t, false)).join("") +
          `<button class="btn ghost block" data-nav="activity" style="margin-top:10px">See all activity</button>`
        : emptyStateHTML("feather", "Nothing logged this month yet.<br>Tap the ＋ button to add your first transaction.")}
    </div>
  `;
}
function wireHome() {
  maybeAutoSyncBank();
  wireBankChip();
  $("[data-dismiss-promo]")?.addEventListener("click", (e) => {
    e.stopPropagation();
    mutate(s => { s.ui.dismissedBankPromo = true; });
    render();
  });
  $$("[data-pay-bill]").forEach(b => b.addEventListener("click", () => {
    toggleBillPaid(b.dataset.payBill, currentMonthKey());
    buzz(); toast("Bill marked paid ✓");
    render();
  }));
  $$("[data-log-payday]").forEach(b => b.addEventListener("click", () => {
    addTransaction({ type: "income", amount: state.income.expectedIncome, category: "paycheck", note: "Paycheck", date: b.dataset.logPayday });
    buzz(); toast("Paycheck logged ✓");
    render();
  }));
  $("#trend-cat")?.addEventListener("change", (e) => { trendCategory = e.target.value; render(); });
}
