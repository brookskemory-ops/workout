/* ============================================================================
 * KEEL — quick-log bottom sheet, opened from the center FAB on any tab.
 * Defaults to the last-used expense category; day-to-day categories first.
 * ==========================================================================*/

function defaultExpenseCategory() {
  if (state.ui.lastExpenseCategory) return state.ui.lastExpenseCategory;
  const counts = state.ui.categoryUseCounts || {};
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : "groceries";
}

// Live "how much room is left" hint for the selected expense category.
function quickLogBudgetHintHTML(categoryId, key) {
  if (!categoryId) return "";
  const bs = budgetStatus(state.transactions, state.budgets, state.bills, categoryId, key, expectedMonthlyIncome());
  if (!bs.target) return `<span class="faint">No budget set for this category yet.</span>`;
  const remaining = bs.target - bs.spent;
  const cls = statusCls(bs.status);
  return `<span class="${cls}">${fmtMoney(bs.spent)} of ${fmtMoney(bs.target)} used
    · ${remaining >= 0 ? `${fmtMoney(remaining)} left` : `${fmtMoney(-remaining)} over`}</span>`;
}

function openQuickLog(presetType) {
  let curType = presetType || "expense";
  const html = `
    <h2>Log it</h2>
    ${segmentedHTML([
      { id: "expense", label: "− Expense" },
      { id: "income", label: "+ Income" },
    ], curType, "ql-type")}
    <input id="ql-amount" class="input amount-input" inputmode="decimal" placeholder="0" autocomplete="off" />
    <select id="ql-category" class="select"></select>
    <div id="ql-hint" class="small" style="margin:-4px 0 12px"></div>
    <input id="ql-note" class="input" placeholder="Note (optional)" />
    <input id="ql-date" class="input" type="date" value="${todayKey()}" />
    <button id="ql-add" class="btn primary block">Add</button>
  `;
  sheet(html, (root) => {
    const catSelect = $("#ql-category", root);
    const amount = $("#ql-amount", root);
    const dateInput = $("#ql-date", root);

    const refreshCategories = () => {
      if (curType === "income") {
        catSelect.innerHTML = categoryOptionsHTML(allIncomeCategories(), state.ui.lastIncomeCategory || "paycheck");
      } else {
        catSelect.innerHTML = expenseOptionsGroupedHTML(defaultExpenseCategory());
      }
      refreshHint();
      maybePrefillPaycheck();
    };
    const refreshHint = () => {
      patch("#ql-hint", curType === "income" ? "" : quickLogBudgetHintHTML(catSelect.value, monthKey(dateInput.value || todayKey())));
    };
    // Expected income is stored per pay period, so a Paycheck entry can
    // prefill straight from it (only if nothing typed yet).
    const maybePrefillPaycheck = () => {
      if (curType === "income" && catSelect.value === "paycheck" && state.income.expectedIncome && !amount.value) {
        amount.value = state.income.expectedIncome;
      }
    };

    $$("[data-ql-type]", root).forEach(b => b.addEventListener("click", () => {
      curType = b.dataset.qlType;
      $$("[data-ql-type]", root).forEach(x => x.classList.toggle("active", x === b));
      refreshCategories();
    }));
    catSelect.addEventListener("change", () => { refreshHint(); maybePrefillPaycheck(); });
    dateInput.addEventListener("change", refreshHint);

    $("#ql-add", root).addEventListener("click", () => {
      const amt = parseFloat(amount.value);
      if (isNaN(amt) || amt <= 0) { toast("Enter a valid amount"); return; }
      addTransaction({
        type: curType, amount: amt, category: catSelect.value,
        note: $("#ql-note", root).value.trim(),
        date: dateInput.value || todayKey(),
      });
      closeOverlay(root);
      toast(`${curType === "income" ? "Income" : "Expense"} logged ✓`);
      render();
    });

    refreshCategories();
    setTimeout(() => amount.focus(), 220);
  });
}
