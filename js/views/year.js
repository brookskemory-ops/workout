/* ============================================================================
 * KEEL — Year in Review: the last 12 months at a glance. Income vs spending
 * per month, category totals, best/worst months, average savings rate.
 * ==========================================================================*/

function renderYear() {
  const keys = lastNMonthKeys(12);
  const months = keys.map(k => ({ key: k, ...monthTotals(state.transactions, state.bills, k) }));
  const active = months.filter(m => m.income || m.variable || m.fixedPaid);

  if (!active.length) {
    return `${pageHeader("Year in Review", { sub: "Last 12 months" })}
      <div class="card">${emptyStateHTML("calendar", "Nothing logged in the last 12 months yet.")}</div>`;
  }

  const totalIncome = active.reduce((a, m) => a + m.income, 0);
  const totalSpend = active.reduce((a, m) => a + m.variable + m.fixedPaid, 0);
  const totalNet = totalIncome - totalSpend;
  const rates = active.filter(m => m.income > 0).map(m => (m.net / m.income) * 100);
  const avgRate = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null;
  const best = active.slice().sort((a, b) => b.net - a.net)[0];
  const worst = active.slice().sort((a, b) => a.net - b.net)[0];
  const maxBar = Math.max(1, ...months.map(m => Math.max(m.income, m.variable + m.fixedPaid)));

  const catTotals = allExpenseCategories()
    .map(c => ({ c, v: keys.reduce((a, k) => a + categorySpend(state.transactions, k, c.id), 0) }))
    .filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  const maxCat = Math.max(1, ...catTotals.map(x => x.v));

  return `
    ${pageHeader("Year in Review", { sub: `${fmtMonth(keys[0])} – ${fmtMonth(keys[11])}` })}

    <div class="card hero-card">
      <div class="card-label">Net over 12 months</div>
      <div class="hero-amount money ${totalNet >= 0 ? "pos" : "neg"}">${fmtMoneySigned(totalNet)}</div>
      <div class="hero-meta">
        <span class="money">＋ ${fmtMoney(totalIncome)} earned</span>
        <span class="money">− ${fmtMoney(totalSpend)} spent</span>
        ${avgRate != null ? `<span class="money"><i class="dot c2"></i>${avgRate}% avg savings rate</span>` : ""}
      </div>
    </div>

    <div class="card">
      <div class="card-label">Month by month <span class="row-sub">(green income · red spending)</span></div>
      ${months.map(m => `
        <div class="vol-row" style="margin:2px 0">
          <span class="vol-label">${fmtMonthShort(m.key)}</span>
          <div style="flex:1;display:flex;flex-direction:column;gap:2px">
            ${barHTML((m.income / maxBar) * 100, "pos")}
            ${barHTML(((m.variable + m.fixedPaid) / maxBar) * 100, "neg")}
          </div>
          <span class="vol-num money ${m.net >= 0 ? "pos" : "neg"}">${fmtMoneySigned(m.net)}</span>
        </div>`).join("")}
      <p class="row-sub" style="margin-top:8px">
        Best month: <strong>${fmtMonth(best.key)}</strong> (${fmtMoneySigned(best.net)}) ·
        Toughest: <strong>${fmtMonth(worst.key)}</strong> (${fmtMoneySigned(worst.net)})</p>
    </div>

    <div class="card">
      <div class="card-label">Where the year went</div>
      ${catTotals.slice(0, 10).map((x, i) => `<div class="vol-row">
        <span class="vol-label">${catIconHTML(x.c)} ${esc(x.c.name)}</span>
        ${barHTML((x.v / maxCat) * 100, `c${(i % 6) + 1}`)}
        <span class="vol-num money">${fmtMoney(x.v)}</span>
      </div>`).join("")}
    </div>
  `;
}
function wireYear() {}
