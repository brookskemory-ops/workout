/* ============================================================================
 * KEEL — first-run onboarding: currency → income & payday → starter budgets.
 * Skippable at every step; never shown to users migrated with existing data.
 * ==========================================================================*/

let obStep = 0;
let obPicks = null; // categoryId -> pct, chosen on the budgets step

const KEEL_MARK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4 5v8a8 8 0 0 0 16 0V5"/><path d="M12 3v18"/></svg>`;

function obDots() {
  return `<div class="wizard-dots">${[0, 1, 2].map(i => `<i class="${i <= obStep ? "on" : ""}"></i>`).join("")}</div>`;
}

function renderOnboarding() {
  if (obStep === 0) {
    return `
      <div class="welcome-hero">
        <div class="welcome-logo">${KEEL_MARK}</div>
        <h1>Keel</h1>
        <p>Money on an even keel.<br>Track spending, plan budgets, grow investments —<br>private and offline, right on your phone.</p>
      </div>
      ${obDots()}
      <button class="btn primary block" data-ob-next>Set it up</button>
      <button class="btn ghost block" data-ob-skip>Skip — just let me in</button>
    `;
  }
  if (obStep === 1) {
    const freqOptions = Object.entries(INCOME_FREQUENCIES).map(([k, f]) =>
      `<option value="${k}" ${state.income.incomeFrequency === k ? "selected" : ""}>${f.label}</option>`).join("");
    return `
      <div class="welcome-hero" style="padding-bottom:10px">
        <h1 style="font-size:1.5rem">Your income</h1>
        <p>Powers budget suggestions and payday reminders.</p>
      </div>
      ${obDots()}
      <div class="card">
        <label class="field-label">Currency symbol</label>
        <input id="ob-currency" class="input" value="${esc(currency())}" maxlength="3" />
        <label class="field-label">Take-home pay per pay period</label>
        <div class="input-pair">
          <input id="ob-income" class="input" inputmode="decimal" placeholder="e.g. 2000" value="${state.income.expectedIncome ?? ""}" />
          <select id="ob-freq" class="select">${freqOptions}</select>
        </div>
        <label class="field-label">A recent payday (optional — enables reminders)</label>
        <input id="ob-anchor" class="input" type="date" value="${state.income.payAnchor || ""}" />
      </div>
      <button class="btn primary block" data-ob-next>Continue</button>
      <button class="btn ghost block" data-ob-skip>Skip for now</button>
    `;
  }
  // step 2 — starter budgets
  if (!obPicks) {
    obPicks = {};
    for (const id of ["groceries", "dining", "transport", "entertainment", "shopping"]) {
      const r = RECOMMENDED_BUDGET_PCT[id];
      obPicks[id] = Math.round((r.min + r.max) / 2);
    }
  }
  const income = expectedMonthlyIncome();
  return `
    <div class="welcome-hero" style="padding-bottom:10px">
      <h1 style="font-size:1.5rem">Starter budgets</h1>
      <p>Commonly-cited guideline percentages — tap to toggle,<br>fine-tune anytime in Plan → Budgets.</p>
    </div>
    ${obDots()}
    <div class="card">
      ${EXPENSE_CATEGORIES.filter(c => RECOMMENDED_BUDGET_PCT[c.id] && c.typical !== "fixed").map(c => {
        const r = RECOMMENDED_BUDGET_PCT[c.id];
        const mid = Math.round((r.min + r.max) / 2);
        const on = obPicks[c.id] != null;
        const dollars = income > 0 ? ` ≈ ${fmtMoney((mid / 100) * income)}` : "";
        return `<button class="chip ${on ? "sel" : ""}" data-ob-cat="${c.id}" data-ob-pct="${mid}" style="margin:0 6px 8px 0">
          ${c.icon} ${esc(c.name)} · ${mid}%${dollars}</button>`;
      }).join("")}
    </div>
    <button class="btn primary block" data-ob-finish>Start using Keel</button>
    <button class="btn ghost block" data-ob-skip>Skip budgets</button>
  `;
}

function wireOnboarding() {
  const saveStep1 = () => {
    const cur = $("#ob-currency")?.value?.trim();
    if (cur != null) setSetting("currency", cur.replace(/[<>&"']/g, "").slice(0, 3) || "$");
    const inc = parseFloat($("#ob-income")?.value);
    setIncomeSettings({
      expectedIncome: isNaN(inc) || inc <= 0 ? null : inc,
      incomeFrequency: $("#ob-freq")?.value || "monthly",
      payAnchor: $("#ob-anchor")?.value || null,
    });
  };
  const finish = () => {
    setSetting("onboarded", true);
    obStep = 0; obPicks = null;
    navigate("home");
  };
  $("[data-ob-next]")?.addEventListener("click", () => {
    if (obStep === 1) saveStep1();
    obStep++;
    render();
  });
  $$("[data-ob-cat]").forEach(b => b.addEventListener("click", () => {
    const id = b.dataset.obCat;
    if (obPicks[id] != null) delete obPicks[id];
    else obPicks[id] = parseFloat(b.dataset.obPct);
    b.classList.toggle("sel", obPicks[id] != null);
  }));
  $("[data-ob-finish]")?.addEventListener("click", () => {
    for (const [id, pct] of Object.entries(obPicks || {})) {
      setBudget(id, { mode: "percent", value: pct });
    }
    finish();
    toast("Budgets set — adjust anytime in Plan ✓");
  });
  $("[data-ob-skip]")?.addEventListener("click", () => {
    if (obStep === 1) saveStep1();
    finish();
  });
}
