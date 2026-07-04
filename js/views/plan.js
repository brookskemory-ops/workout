/* ============================================================================
 * KEEL — Plan tab: Budgets · Bills · Goals under one segmented control.
 * This file holds the shell and the Budgets segment; bills.js and goals.js
 * render the other two. Budget math uses the corrected "a budget is the
 * TOTAL planned spend for the category, bills included" semantics.
 * ==========================================================================*/

function renderPlan() {
  const route = currentRoute(); // plan | plan-bills | plan-goals
  const seg = route === "plan-bills" ? "plan-bills" : route === "plan-goals" ? "plan-goals" : "plan";
  const content = seg === "plan-bills" ? billsSegmentHTML() : seg === "plan-goals" ? goalsSegmentHTML() : budgetsSegmentHTML();
  return `
    ${pageHeader("Plan", { stepper: true })}
    ${segmentedHTML([
      { id: "plan", label: "Budgets" },
      { id: "plan-bills", label: "Bills" },
      { id: "plan-goals", label: "Goals" },
    ], seg, "plan-seg")}
    ${content}
  `;
}
function wirePlan() {
  $$("[data-plan-seg]").forEach(b => b.addEventListener("click", () => navigate(b.dataset.planSeg)));
  const route = currentRoute();
  if (route === "plan-bills") wireBillsSegment();
  else if (route === "plan-goals") wireGoalsSegment();
  else wireBudgetsSegment();
}

/* ============================ BUDGETS ===================================== */
function incomeCardHTML() {
  const { expectedIncome, incomeFrequency, payAnchor } = state.income;
  const freqOptions = Object.entries(INCOME_FREQUENCIES).map(([k, f]) =>
    `<option value="${k}" ${incomeFrequency === k ? "selected" : ""}>${f.label}</option>`).join("");
  const monthly = expectedMonthlyIncome();
  const suggested = suggestedMonthlyFromHistory();
  return `<div class="card">
    <div class="card-label">Income</div>
    <label class="field-label">Amount per pay period</label>
    <div class="input-pair">
      <input id="inc-amount" class="input" inputmode="decimal" placeholder="${suggested ? Math.round(fromMonthlyAmount(suggested, incomeFrequency)) : "e.g. 2000"}" value="${expectedIncome ?? ""}" />
      <select id="inc-freq" class="select">${freqOptions}</select>
    </div>
    <label class="field-label">A recent payday (enables payday reminders)</label>
    <input id="inc-anchor" class="input" type="date" value="${payAnchor || ""}" />
    <div class="row-sub">${monthly > 0 ? `≈ ${fmtMoney(monthly)}/month.` : "Auto-suggested from logged income once you log some paychecks."}</div>
  </div>`;
}

function budgetOverviewHTML() {
  const income = expectedMonthlyIncome();
  const cats = allExpenseCategories();
  const capacity = savingsCapacity(income, state.budgets, state.bills, cats);
  const planned = plannedSpendTotal(state.budgets, state.bills, cats, income);
  const billsOnly = cats.filter(c => normalizeBudgetEntry(state.budgets[c.id]) == null)
    .reduce((a, c) => a + activeBillsTotal(state.bills, c.id), 0);
  const budgeted = planned - billsOnly;

  let msg, cls;
  const pct = income > 0 && capacity != null ? Math.round((capacity / income) * 100) : null;
  if (capacity == null) {
    msg = "Set your income above to see how much is left each month for saving and investing.";
    cls = "";
  } else if (capacity < 0) {
    msg = `Planned spending exceeds income by ${fmtMoney(-capacity)} — trim a budget below.`;
    cls = "neg";
  } else if (pct >= RECOMMENDED_SAVINGS_PCT) {
    msg = `${pct}% of income unallocated — at or above the common ${RECOMMENDED_SAVINGS_PCT}% savings guideline. Put it to work in Goals or Invest.`;
    cls = "pos";
  } else {
    msg = `${pct}% left for savings — the common guideline is ~${RECOMMENDED_SAVINGS_PCT}%.`;
    cls = "warn";
  }

  const activeGoals = state.goals.filter(g => !g.achieved);
  return `<div class="card hero-card">
    <div class="card-label">Left after planned spending</div>
    <div class="hero-amount money ${cls}">${capacity == null ? "—" : fmtMoney(capacity)}${pct != null ? `<span class="row-sub" style="font-size:1rem"> (${pct}%)</span>` : ""}</div>
    <div class="hero-meta">
      <span class="money">▤ ${fmtMoney(billsOnly)} bills (unbudgeted cats)</span>
      <span class="money">◔ ${fmtMoney(budgeted)} budgets</span>
    </div>
    <div class="row-sub" style="margin-top:8px">${msg}</div>
    ${capacity > 0 && activeGoals.length ? `
      <div class="input-pair" style="margin-top:12px">
        <select id="leftover-goal" class="select">${activeGoals.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join("")}</select>
        <input id="leftover-amount" class="input" inputmode="decimal" value="${Math.max(0, Math.round(capacity))}" />
      </div>
      <button id="leftover-log" class="btn block">Move it to a goal</button>` : ""}
  </div>`;
}

function budgetRowHTML(c) {
  const income = expectedMonthlyIncome();
  const entry = normalizeBudgetEntry(state.budgets[c.id]);
  const mode = entry ? entry.mode : "fixed";
  const bs = budgetStatus(state.transactions, state.budgets, state.bills, c.id, getViewedMonth(), income);
  const billsFloor = activeBillsTotal(state.bills, c.id);
  const avg = categoryAverage(state.transactions, c.id, 3);
  const rec = RECOMMENDED_BUDGET_PCT[c.id];
  const recMid = rec ? Math.round((rec.min + rec.max) / 2) : null;
  const perCheck = bs.target && state.income.incomeFrequency !== "monthly" && state.income.incomeFrequency !== "annually"
    ? Math.round(fromMonthlyAmount(bs.target, state.income.incomeFrequency)) : null;

  return `<div class="budget-row" data-budget-row="${c.id}" style="padding:12px 0;border-bottom:1px solid var(--line)">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
      <span style="font-weight:700">${c.icon} ${esc(c.name)}</span>
      <div class="segmented" style="--seg-count:2;margin:0;width:130px;padding:2px">
        <button class="seg-btn ${mode === "fixed" ? "active" : ""}" data-bmode="fixed" data-bcat="${c.id}">${currency()}</button>
        <button class="seg-btn ${mode === "percent" ? "active" : ""}" data-bmode="percent" data-bcat="${c.id}">%</button>
      </div>
    </div>
    ${rec ? `<div class="row-sub" style="margin:4px 0">Guideline: ${rec.min}–${rec.max}% of income
      <button class="chip" style="padding:3px 10px" data-use-rec="${c.id}" data-rec-pct="${recMid}">Use ${recMid}%</button></div>` : ""}
    <div class="input-pair" style="margin-top:6px">
      <input class="input budget-input" data-bcat="${c.id}" data-bmode-cur="${mode}" inputmode="decimal"
        placeholder="${mode === "percent" ? "% of income" : "no target"}" value="${entry ? entry.value : ""}" style="margin-bottom:0" />
      <div class="row-sub" style="align-self:center">
        ${entry && mode === "percent" ? (bs.target ? `= ${fmtMoney(bs.target)}/mo` : "set income first") : ""}
        ${perCheck ? ` · ≈ ${fmtMoney(perCheck)}/check` : ""}
      </div>
    </div>
    ${billsFloor > 0 ? `<div class="row-sub info" style="margin-top:4px">includes ${fmtMoney(billsFloor)}/mo committed to bills${entry && bs.target === billsFloor && budgetTargetAmount(entry, income) < billsFloor ? " (floored)" : ""}</div>` : ""}
    ${bs.target ? `${barHTML(bs.pct, statusCls(bs.status))}
      <div class="row-sub money">${fmtMoney(bs.spent)} / ${fmtMoney(bs.target)} this month${avg ? ` · avg ${fmtMoney(avg)}/mo` : ""}</div>`
      : avg ? `<div class="row-sub money">avg ${fmtMoney(avg)}/mo${bs.spent ? ` · ${fmtMoney(bs.spent)} this month` : ""}</div>` : ""}
  </div>`;
}

function budgetsSegmentHTML() {
  const cats = allExpenseCategories();
  const variable = cats.filter(c => c.typical !== "fixed");
  const fixed = cats.filter(c => c.typical === "fixed");
  return `
    ${incomeCardHTML()}
    ${budgetOverviewHTML()}
    <div class="card">
      <div class="card-label">Day-to-day budgets</div>
      ${variable.map(budgetRowHTML).join("")}
    </div>
    <div class="card">
      <div class="card-label">Bill-heavy categories</div>
      <p class="row-sub" style="margin-bottom:6px">A budget here is the total plan for the category — bills count toward it, so nothing is double-counted.</p>
      ${fixed.map(budgetRowHTML).join("")}
    </div>
  `;
}

function wireBudgetsSegment() {
  $("#inc-amount")?.addEventListener("change", (e) => {
    const v = parseFloat(e.target.value);
    setIncomeSettings({ expectedIncome: isNaN(v) || v <= 0 ? null : v });
    render();
  });
  $("#inc-freq")?.addEventListener("change", (e) => { setIncomeSettings({ incomeFrequency: e.target.value }); render(); });
  $("#inc-anchor")?.addEventListener("change", (e) => { setIncomeSettings({ payAnchor: e.target.value || null }); render(); });

  $("#leftover-log")?.addEventListener("click", () => {
    const goalId = $("#leftover-goal")?.value;
    const amount = parseFloat($("#leftover-amount")?.value);
    if (!goalId || isNaN(amount) || amount <= 0) { toast("Enter an amount"); return; }
    addContribution(goalId, amount);
    render(); toast("Contribution logged ✓");
  });

  $$("[data-bmode]").forEach(b => b.addEventListener("click", () => {
    const cat = b.dataset.bcat, newMode = b.dataset.bmode;
    const income = expectedMonthlyIncome();
    const current = normalizeBudgetEntry(state.budgets[cat]);
    if (!current) {
      // switching mode with no value yet: prefill percent from the guideline
      if (newMode === "percent" && RECOMMENDED_BUDGET_PCT[cat]) {
        const r = RECOMMENDED_BUDGET_PCT[cat];
        setBudget(cat, { mode: "percent", value: Math.round((r.min + r.max) / 2) });
      }
      render(); return;
    }
    if (newMode === current.mode) return;
    const value = newMode === "percent"
      ? (income > 0 ? Math.round((budgetTargetAmount(current, income) / income) * 100) : 0)
      : budgetTargetAmount(current, income);
    setBudget(cat, value > 0 ? { mode: newMode, value } : null);
    render();
  }));
  $$("[data-use-rec]").forEach(b => b.addEventListener("click", () => {
    setBudget(b.dataset.useRec, { mode: "percent", value: parseFloat(b.dataset.recPct) });
    render(); toast(`Set to ${b.dataset.recPct}% of income`);
  }));
  $$(".budget-input").forEach(inp => inp.addEventListener("change", () => {
    const v = parseFloat(inp.value);
    setBudget(inp.dataset.bcat, isNaN(v) || v <= 0 ? null : { mode: inp.dataset.bmodeCur, value: v });
    render();
  }));
}
