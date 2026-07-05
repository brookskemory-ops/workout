/* ============================================================================
 * KEEL — money calendar: when cash lands and leaves. Paydays, bill due days,
 * detected subscription renewals, and actual daily nets on a month grid.
 * ==========================================================================*/

let calSelectedDay = null;

function calendarEvents(key) {
  const events = [];
  const days = daysInMonth(key);
  // paydays (whole month, schedule-based)
  const { payAnchor, incomeFrequency, expectedIncome } = state.income;
  if (payAnchor && expectedIncome) {
    for (const p of nextPaydays(payAnchor, incomeFrequency, `${key}-01`, 6)) {
      if (monthKey(p) === key) events.push({ date: p, label: "Payday", amount: expectedIncome, kind: "payday" });
    }
  }
  // bills on due days
  for (const b of state.bills) {
    if (b.active === false) continue;
    const due = Math.min(b.dueDay || 1, days);
    events.push({
      date: `${key}-${String(due).padStart(2, "0")}`, label: b.name, amount: -b.amount,
      kind: "bill", paid: billPaidInMonth(b.id, key),
    });
  }
  // detected subscription renewals
  for (const r of detectedSubscriptions()) {
    if (monthKey(r.nextDate) === key) events.push({ date: r.nextDate, label: `${r.name} renews`, amount: -r.amount, kind: "renewal" });
  }
  return events;
}

function renderCalendar() {
  const key = getViewedMonth();
  const days = daysInMonth(key);
  const events = calendarEvents(key);
  const today = todayKey();
  const firstDow = parseDateKey(`${key}-01`).getDay(); // 0 = Sunday
  const byDay = new Map();
  for (const e of events) {
    const d = +e.date.slice(8, 10);
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d).push(e);
  }
  // actual net per day for context shading
  const netByDay = new Map();
  for (const t of txnsInMonth(state.transactions, key)) {
    const d = +t.date.slice(8, 10);
    netByDay.set(d, (netByDay.get(d) || 0) + (t.type === "income" ? t.amount : -t.amount));
  }

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(`<div class="cal-cell empty"></div>`);
  for (let d = 1; d <= days; d++) {
    const dk = `${key}-${String(d).padStart(2, "0")}`;
    const evs = byDay.get(d) || [];
    const net = netByDay.get(d);
    cells.push(`<button class="cal-cell ${dk === today ? "today" : ""} ${calSelectedDay === d ? "sel" : ""}" data-cal-day="${d}">
      <span class="cal-num">${d}</span>
      <span class="cal-dots">${evs.slice(0, 3).map(e =>
        `<i class="dot ${e.kind === "payday" ? "pos" : e.kind === "renewal" ? "warn" : "fixed"}"></i>`).join("")}</span>
      ${net ? `<span class="cal-net money ${net > 0 ? "pos" : "neg"}">${net > 0 ? "+" : "−"}${Math.round(Math.abs(net))}</span>` : ""}
    </button>`);
  }

  const sel = calSelectedDay && byDay.get(calSelectedDay);
  const monthTotal = events.reduce((a, e) => a + e.amount, 0);

  return `
    ${pageHeader("Calendar", { stepper: true })}
    <div class="card">
      <div class="cal-grid cal-head">${["S", "M", "T", "W", "T", "F", "S"].map(d => `<span>${d}</span>`).join("")}</div>
      <div class="cal-grid">${cells.join("")}</div>
      <div class="hero-meta" style="margin-top:12px">
        <span><i class="dot pos"></i>payday</span>
        <span><i class="dot fixed"></i>bill</span>
        <span><i class="dot warn"></i>renewal</span>
        <span class="money">scheduled net: ${fmtMoneySigned(monthTotal)}</span>
      </div>
    </div>
    <div id="cal-day-detail">
      ${sel ? calDayDetailHTML(calSelectedDay, sel) : `<div class="card"><p class="row-sub">Tap a day to see what's scheduled.</p></div>`}
    </div>
    ${events.length ? `<div class="card">
      <div class="card-label">Everything this month</div>
      ${events.slice().sort((a, b) => (a.date < b.date ? -1 : 1)).map(e => `<div class="vol-row">
        <span class="vol-label">${fmtDateShort(e.date)} · ${esc(e.label)}${e.paid ? " ✓" : ""}</span>
        <span class="vol-num money ${e.amount > 0 ? "pos" : e.kind === "renewal" ? "warn" : "fixed"}">${fmtMoneySigned(e.amount)}</span>
      </div>`).join("")}
    </div>` : ""}
  `;
}
function calDayDetailHTML(d, evs) {
  return `<div class="card">
    <div class="card-label">${fmtDay(`${getViewedMonth()}-${String(d).padStart(2, "0")}`)}</div>
    ${evs.map(e => `<div class="vol-row">
      <span class="vol-label">${esc(e.label)}${e.paid ? " · paid ✓" : ""}</span>
      <span class="vol-num money ${e.amount > 0 ? "pos" : "neg"}">${fmtMoneySigned(e.amount)}</span>
    </div>`).join("")}
  </div>`;
}
function wireCalendar() {
  $$("[data-cal-day]").forEach(b => b.addEventListener("click", () => {
    calSelectedDay = +b.dataset.calDay;
    render();
  }));
}
