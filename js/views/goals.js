/* ============================================================================
 * KEEL — Goals segment of the Plan tab: savings goals, sinking funds, and
 * the debt payoff planner (avalanche / snowball simulation from data.js).
 * ==========================================================================*/

function goalPacing(goal) {
  if (!goal.targetDate) return null;
  const current = goalCurrent(goal.id);
  const remaining = Math.max(0, goal.target - current);
  const today = todayKey();
  const overdue = goal.targetDate < today && remaining > 0;
  const monthsRemaining = Math.max(1, Math.round(daysBetween(today, goal.targetDate) / 30.44));
  const neededPerMonth = remaining / monthsRemaining;
  const contribs = state.contributions.filter(c => c.goalId === goal.id);
  let onTrack = null;
  if (contribs.length && remaining > 0) {
    const first = contribs.map(c => c.date).sort()[0];
    const monthsSinceStart = Math.max(1, Math.round(daysBetween(first, today) / 30.44));
    onTrack = current / monthsSinceStart >= neededPerMonth * 0.9;
  }
  return { remaining, neededPerMonth, onTrack, overdue };
}

function goalCardHTML(g) {
  const current = goalCurrent(g.id);
  const pct = Math.min(100, (current / g.target) * 100);
  const pacing = goalPacing(g);
  let pacingLine = "";
  if (pacing) {
    pacingLine = pacing.overdue
      ? `<div class="row-sub neg">Target date passed — ${fmtMoney(pacing.remaining)} still needed.</div>`
      : `<div class="row-sub">Need ${fmtMoney(pacing.neededPerMonth)}/mo to hit ${fmtMonth(monthKey(g.targetDate))}${pacing.onTrack === true ? " · on track ✓" : pacing.onTrack === false ? " · behind pace" : ""}</div>`;
  }
  return `<div style="padding:13px 0;border-bottom:1px solid var(--line)">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
      <div>
        <div style="font-weight:700">${esc(g.name)}</div>
        <div class="row-sub">${g.kind === "sinking" ? "Sinking fund" : "Savings goal"}${g.targetDate ? ` · by ${fmtMonth(monthKey(g.targetDate))}` : ""}</div>
      </div>
      <button class="icon-btn" data-edit-goal="${g.id}" aria-label="Edit ${esc(g.name)}">${svgIcon("pencil")}</button>
    </div>
    ${barHTML(pct, pacing && pacing.onTrack === false ? "warn" : "pos")}
    <div class="row-sub money">${fmtMoney(current)} / ${fmtMoney(g.target)}</div>
    ${pacingLine}
    <div class="input-pair" style="margin-top:10px">
      <input class="input" data-goal-amt="${g.id}" inputmode="decimal" placeholder="Add ${currency()}" style="margin-bottom:0" />
      <button class="btn" data-goal-add="${g.id}">Add</button>
    </div>
    <button class="btn ghost block small" style="margin-top:8px" data-goal-complete="${g.id}">
      ${g.kind === "sinking" ? "Spend it (log expense & reset)" : "Mark reached"}</button>
  </div>`;
}

function debtPlannerHTML() {
  const debts = state.debts;
  const strategy = state.debtStrategy || "avalanche";
  const extra = state.debtExtraPayment || 0;
  const plan = debts.length ? computePayoffPlan(debts, strategy, extra) : null;

  return `<div class="card">
    <div class="card-label">Debt payoff planner</div>
    ${debts.length ? debts.map(d => {
      const p = plan?.order.find(x => x.id === d.id);
      return `<div class="row">
        <span class="row-tile">${svgIcon("credit-card")}</span>
        <span class="row-main">
          <span class="row-title">${esc(d.name)}</span>
          <span class="row-sub money">${fmtMoney(d.balance)} · ${d.apr || 0}% APR · min ${fmtMoney(d.minPayment)}/mo${p ? ` · gone in ${p.paidOffMonth ?? "600+"} mo` : ""}</span>
        </span>
        <button class="icon-btn" data-edit-debt="${d.id}" aria-label="Edit ${esc(d.name)}">${svgIcon("pencil")}</button>
      </div>`;
    }).join("") : `<p class="row-sub" style="margin-bottom:10px">Track loans and cards to see a payoff date and total interest.</p>`}
    ${debts.length ? `
      ${segmentedHTML([
        { id: "avalanche", label: "Avalanche (least interest)" },
        { id: "snowball", label: "Snowball (quick wins)" },
      ], strategy, "debt-strategy")}
      <input id="debt-extra" class="input" inputmode="decimal" placeholder="Extra ${currency()}/mo toward debt" value="${extra || ""}" />
      ${plan ? `<div class="nudge ${plan.capped ? "warn" : "pos"}"><div class="nudge-body">
        ${plan.capped
          ? "Even with this payment, payoff is 50+ years out — raise the monthly amount."
          : `Debt-free in <strong>${plan.totalMonths} months</strong> (${fmtMonth(plan.debtFreeDate)}) · ~${fmtMoney(plan.totalInterest)} total interest.`}
      </div></div>` : ""}
    ` : ""}
    <details>
      <summary class="row-sub" style="cursor:pointer">+ Add a debt</summary>
      <div style="margin-top:10px">
        <input id="debt-name" class="input" placeholder="Name (e.g. Car loan, Visa)" />
        <div class="input-pair">
          <input id="debt-balance" class="input" inputmode="decimal" placeholder="Balance" />
          <input id="debt-apr" class="input" inputmode="decimal" placeholder="APR %" />
        </div>
        <input id="debt-min" class="input" inputmode="decimal" placeholder="Minimum payment / mo" />
        <button id="debt-add" class="btn block">+ Add debt</button>
      </div>
    </details>
  </div>`;
}

function goalsSegmentHTML() {
  const active = state.goals.filter(g => !g.achieved);
  const achieved = state.goals.filter(g => g.achieved);
  return `
    <div class="card">
      <div class="card-label">Active goals</div>
      ${active.length ? active.map(goalCardHTML).join("")
        : emptyStateHTML("target", "No goals yet. Start an emergency fund,<br>a trip, or a sinking fund for annual bills.")}
    </div>
    <div class="card">
      <div class="card-label">New goal</div>
      <input id="goal-name" class="input" placeholder="Name (e.g. Emergency Fund)" />
      ${segmentedHTML([
        { id: "savings", label: "Savings goal" },
        { id: "sinking", label: "Sinking fund" },
      ], "savings", "goal-kind")}
      <div class="input-pair">
        <input id="goal-target" class="input" inputmode="decimal" placeholder="Target amount" />
        <input id="goal-date" class="input" type="date" />
      </div>
      <select id="goal-category" class="select hidden">${categoryOptionsHTML(allExpenseCategories(), "misc")}</select>
      <p class="row-sub" style="margin-bottom:10px">A sinking fund is money set aside for a predictable irregular cost (annual insurance, holidays). "Spend it" logs the expense and resets the fund.</p>
      <button id="goal-add" class="btn primary block">+ Add goal</button>
    </div>
    ${achieved.length ? `<div class="card">
      <div class="card-label">Completed</div>
      ${achieved.map(g => `<div class="vol-row"><span class="vol-label">${esc(g.name)}</span><span class="vol-num money">${fmtMoney(g.target)}</span></div>`).join("")}
    </div>` : ""}
    ${debtPlannerHTML()}
  `;
}

function wireGoalsSegment() {
  let goalKind = "savings";
  $$("[data-goal-kind]").forEach(b => b.addEventListener("click", () => {
    goalKind = b.dataset.goalKind;
    $$("[data-goal-kind]").forEach(x => x.classList.toggle("active", x === b));
    $("#goal-category")?.classList.toggle("hidden", goalKind !== "sinking");
  }));
  $("#goal-add")?.addEventListener("click", () => {
    const name = $("#goal-name").value.trim();
    const target = parseFloat($("#goal-target").value);
    if (!name || isNaN(target) || target <= 0) { toast("Enter a name and target"); return; }
    addGoal({
      name, kind: goalKind, target,
      targetDate: $("#goal-date").value || null,
      category: goalKind === "sinking" ? $("#goal-category").value : null,
    });
    render(); toast("Goal added ✓");
  });
  $$("[data-goal-add]").forEach(b => b.addEventListener("click", () => {
    const amount = parseFloat($(`[data-goal-amt="${b.dataset.goalAdd}"]`)?.value);
    if (isNaN(amount) || amount <= 0) { toast("Enter an amount"); return; }
    addContribution(b.dataset.goalAdd, amount);
    render(); toast("Contribution logged ✓");
  }));
  $$("[data-goal-complete]").forEach(b => b.addEventListener("click", () => {
    const g = state.goals.find(x => x.id === b.dataset.goalComplete);
    if (!g) return;
    if (g.kind === "sinking") {
      const current = goalCurrent(g.id);
      const amount = current > 0 ? Math.min(current, g.target) : g.target;
      addTransaction({ type: "expense", amount, category: g.category || "misc", note: g.name });
      resetGoalContributions(g.id);
      render(); toast(`${g.name} spent & reset for next cycle`);
    } else {
      updateGoal(g.id, { achieved: true });
      buzz(30);
      launchConfetti();
      render(); toast(`${g.name} reached!`);
    }
  }));
  $$("[data-edit-goal]").forEach(b => b.addEventListener("click", () => {
    const g = state.goals.find(x => x.id === b.dataset.editGoal);
    if (g) showGoalEditModal(g);
  }));

  // debts
  $$("[data-debt-strategy]").forEach(b => b.addEventListener("click", () => {
    setDebtOptions({ debtStrategy: b.dataset.debtStrategy }); render();
  }));
  $("#debt-extra")?.addEventListener("change", (e) => {
    setDebtOptions({ debtExtraPayment: parseFloat(e.target.value) || 0 }); render();
  });
  $("#debt-add")?.addEventListener("click", () => {
    const name = $("#debt-name").value.trim();
    const balance = parseFloat($("#debt-balance").value);
    const minPayment = parseFloat($("#debt-min").value);
    if (!name || isNaN(balance) || balance <= 0 || isNaN(minPayment) || minPayment <= 0) {
      toast("Enter a name, balance, and minimum payment"); return;
    }
    addDebt({ name, balance, apr: parseFloat($("#debt-apr").value) || 0, minPayment });
    render(); toast("Debt added ✓");
  });
  $$("[data-edit-debt]").forEach(b => b.addEventListener("click", () => {
    const d = state.debts.find(x => x.id === b.dataset.editDebt);
    if (d) showDebtEditModal(d);
  }));
}

function showGoalEditModal(g) {
  const contribRows = state.contributions.filter(c => c.goalId === g.id).slice().reverse().map(c => `
    <div class="vol-row"><span class="vol-label money">${fmtMoney(c.amount)}</span>
      <span class="vol-num">${fmtDateShort(c.date)}</span>
      <button class="icon-btn" data-del-contrib="${c.id}" aria-label="Remove contribution">✕</button></div>`).join("")
    || '<p class="row-sub">No contributions yet.</p>';
  modal(`
    <h2>Edit goal</h2>
    <input id="eg-name" class="input" value="${esc(g.name)}" />
    <div class="input-pair">
      <input id="eg-target" class="input" inputmode="decimal" value="${g.target}" />
      <input id="eg-date" class="input" type="date" value="${g.targetDate ? dateKey(g.targetDate) : ""}" />
    </div>
    ${g.kind === "sinking" ? `<select id="eg-category" class="select">${categoryOptionsHTML(allExpenseCategories(), g.category)}</select>` : ""}
    <div class="card-label" style="margin-top:6px">Contributions</div>
    ${contribRows}
    <button id="eg-save" class="btn primary block" style="margin-top:12px">Save changes</button>
    <button id="eg-delete" class="btn danger block">Delete goal</button>
  `, (root) => {
    $$("[data-del-contrib]", root).forEach(b => b.addEventListener("click", () => {
      deleteContribution(b.dataset.delContrib);
      closeOverlay(root); render(); toast("Contribution removed");
    }));
    $("#eg-save", root).addEventListener("click", () => {
      const name = $("#eg-name", root).value.trim();
      const target = parseFloat($("#eg-target", root).value);
      if (!name || isNaN(target) || target <= 0) { toast("Enter a name and target"); return; }
      updateGoal(g.id, {
        name, target,
        targetDate: $("#eg-date", root).value || null,
        ...(g.kind === "sinking" ? { category: $("#eg-category", root).value } : {}),
      });
      closeOverlay(root); render(); toast("Goal updated ✓");
    });
    $("#eg-delete", root).addEventListener("click", () => {
      if (confirm(`Delete "${g.name}" and its contribution history?`)) {
        deleteGoal(g.id);
        closeOverlay(root); render(); toastUndo("Goal deleted");
      }
    });
  });
}

function showDebtEditModal(d) {
  modal(`
    <h2>Edit debt</h2>
    <input id="ed-name" class="input" value="${esc(d.name)}" />
    <div class="input-pair">
      <input id="ed-balance" class="input" inputmode="decimal" value="${d.balance}" />
      <input id="ed-apr" class="input" inputmode="decimal" value="${d.apr || 0}" />
    </div>
    <input id="ed-min" class="input" inputmode="decimal" value="${d.minPayment}" />
    <button id="ed-save" class="btn primary block">Save changes</button>
    <button id="ed-delete" class="btn danger block">Delete debt</button>
  `, (root) => {
    $("#ed-save", root).addEventListener("click", () => {
      const name = $("#ed-name", root).value.trim();
      const balance = parseFloat($("#ed-balance", root).value);
      const minPayment = parseFloat($("#ed-min", root).value);
      if (!name || isNaN(balance) || balance < 0 || isNaN(minPayment) || minPayment <= 0) { toast("Check your inputs"); return; }
      updateDebt(d.id, { name, balance, apr: parseFloat($("#ed-apr", root).value) || 0, minPayment });
      closeOverlay(root); render(); toast("Debt updated ✓");
    });
    $("#ed-delete", root).addEventListener("click", () => {
      if (confirm(`Delete "${d.name}"?`)) {
        deleteDebt(d.id);
        closeOverlay(root); render(); toastUndo("Debt deleted");
      }
    });
  });
}
