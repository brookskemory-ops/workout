/* ============================================================================
 * KEEL — Activity: browse, search, filter, and EDIT transactions for any
 * month. The list re-renders surgically on search input (no scroll churn).
 * ==========================================================================*/

let actSearch = "";
let actType = "all";       // all | expense | income
let actCategory = "all";
let actSelectMode = false;
const actSelected = new Set();

function activityFilteredTxns(key) {
  const q = actSearch.trim().toLowerCase();
  // a search spans ALL months (capped); browsing stays within the viewed month
  let txns = q ? state.transactions.slice() : txnsInMonth(state.transactions, key);
  if (actType !== "all") txns = txns.filter(t => t.type === actType);
  if (actCategory !== "all") txns = txns.filter(t => t.category === actCategory);
  if (q) {
    txns = txns.filter(t =>
      (t.note || "").toLowerCase().includes(q) ||
      (t.rawNote || "").toLowerCase().includes(q) ||
      catForTxn(t).name.toLowerCase().includes(q) ||
      String(t.amount).includes(q));
  }
  txns.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return q ? txns.slice(0, 100) : txns;
}

function activityListHTML(key) {
  const txns = activityFilteredTxns(key);
  if (!txns.length) {
    return emptyStateHTML("search",
      actSearch || actType !== "all" || actCategory !== "all"
        ? "Nothing matches these filters."
        : "No transactions this month.<br>Tap ＋ to log one.");
  }
  const byDay = new Map();
  for (const t of txns) {
    const d = dateKey(t.date);
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d).push(t);
  }
  let html = actSearch.trim()
    ? `<p class="row-sub" style="margin-bottom:4px">Searching all months · ${txns.length}${txns.length === 100 ? "+" : ""} result${txns.length === 1 ? "" : "s"}</p>`
    : "";
  for (const [day, list] of byDay) {
    const dayNet = list.reduce((a, t) => a + (t.type === "income" ? t.amount : -t.amount), 0);
    html += `<div class="day-head"><span>${fmtDay(day)}</span><span class="money">${fmtMoneySigned(dayNet)}</span></div>`;
    html += list.map(t => actSelectMode ? selectableTxnRowHTML(t) : txnRowHTML(t, true)).join("");
  }
  return html;
}

function selectableTxnRowHTML(t) {
  const cat = catForTxn(t);
  const on = actSelected.has(t.id);
  return `<button class="row txn-row ${on ? "row-selected" : ""}" data-select-txn="${t.id}">
    <span class="row-tile" style="${on ? "background:var(--accent-soft);border-color:var(--accent)" : ""}">${on ? svgIcon("check") : catIconHTML(cat)}</span>
    <span class="row-main">
      <span class="row-title">${esc(t.note || cat.name)}</span>
      <span class="row-sub">${esc(cat.name)}</span>
    </span>
    <span class="row-end"><span class="money">${t.type === "income" ? "+" : "−"}${fmtMoney(t.amount)}</span></span>
  </button>`;
}

function bulkBarHTML() {
  if (!actSelectMode) return "";
  return `<div class="card" id="bulk-bar">
    <div class="card-label">${actSelected.size} selected</div>
    <div class="input-pair">
      <select id="bulk-category" class="select" style="margin-bottom:0">
        <option value="">Set category…</option>
        ${categoryOptionsHTML(allExpenseCategories())}
      </select>
      <button id="bulk-delete" class="btn danger" ${actSelected.size ? "" : "disabled"}>Delete</button>
    </div>
  </div>`;
}

function renderActivity() {
  const key = getViewedMonth();
  const t = monthTotals(state.transactions, state.bills, key);
  const usedCats = [...new Set(txnsInMonth(state.transactions, key).map(x => x.category))]
    .map(id => allExpenseCategories().find(c => c.id === id) || allIncomeCategories().find(c => c.id === id))
    .filter(Boolean);
  const inboxCount = inboxTxns().length;
  return `
    ${pageHeader("Activity", { stepper: true })}
    ${bankStatusChipHTML()}
    ${inboxCount ? `<button class="nudge" data-nav="inbox" style="width:100%;text-align:left;cursor:pointer">
      <div class="nudge-body">${svgIcon("inbox")} <strong>${inboxCount}</strong> transaction${inboxCount > 1 ? "s" : ""} waiting to be sorted</div>
      <span class="btn small">Sort now</span>
    </button>` : ""}
    <div class="card">
      <div class="hero-meta" style="margin:0 0 12px">
        <span class="money pos"><i class="dot pos"></i>${fmtMoney(t.income)} in</span>
        <span class="money fixed"><i class="dot fixed"></i>${fmtMoney(t.fixedPaid)} bills</span>
        <span class="money neg"><i class="dot neg"></i>${fmtMoney(t.variable)} out</span>
        <span class="money ${t.net >= 0 ? "pos" : "neg"}">= ${fmtMoneySigned(t.net)}</span>
      </div>
      <input id="act-search" class="input" placeholder="Search notes, categories, amounts…" value="${esc(actSearch)}" autocomplete="off" />
      ${segmentedHTML([
        { id: "all", label: "All" }, { id: "expense", label: "Expenses" }, { id: "income", label: "Income" },
      ], actType, "act-type")}
      ${usedCats.length > 1 ? `<select id="act-category" class="select">
        <option value="all">All categories</option>
        ${categoryOptionsHTML(usedCats, actCategory)}
      </select>` : ""}
      <div class="chips">
        <button class="chip" id="act-import">${svgIcon("upload")} Import CSV</button>
        <button class="chip ${actSelectMode ? "sel" : ""}" id="act-select">${actSelectMode ? "Done selecting" : `${svgIcon("check-square")} Select`}</button>
      </div>
    </div>
    ${bulkBarHTML()}
    <div id="txn-list" class="card">${activityListHTML(key)}</div>
  `;
}

function wireActivity() {
  wireBankChip();
  const key = getViewedMonth();
  let debounce = null;
  $("#act-search")?.addEventListener("input", (e) => {
    actSearch = e.target.value;
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      patch("#txn-list", activityListHTML(getViewedMonth()));
      wireTxnRows();
    }, 120);
  });
  $$("[data-act-type]").forEach(b => b.addEventListener("click", () => {
    actType = b.dataset.actType; render();
  }));
  $("#act-category")?.addEventListener("change", (e) => { actCategory = e.target.value; render(); });
  $("#act-import")?.addEventListener("click", openImportWizard);
  $("#act-select")?.addEventListener("click", () => {
    actSelectMode = !actSelectMode;
    actSelected.clear();
    render();
  });
  $("#bulk-category")?.addEventListener("change", (e) => {
    if (!e.target.value || !actSelected.size) return;
    setTransactionsCategory([...actSelected], e.target.value);
    actSelected.clear(); actSelectMode = false;
    render(); toast("Categories updated ✓");
  });
  $("#bulk-delete")?.addEventListener("click", () => {
    if (!actSelected.size) return;
    if (!confirm(`Delete ${actSelected.size} transaction${actSelected.size > 1 ? "s" : ""}?`)) return;
    deleteTransactions([...actSelected]);
    actSelected.clear(); actSelectMode = false;
    render(); toastUndo("Transactions deleted");
  });
  wireTxnRows();
}
function wireTxnRows() {
  $$("[data-edit-txn]").forEach(b => b.addEventListener("click", () => {
    const t = state.transactions.find(x => x.id === b.dataset.editTxn);
    if (t) showTxnEditModal(t);
  }));
  $$("[data-select-txn]").forEach(b => b.addEventListener("click", () => {
    const id = b.dataset.selectTxn;
    actSelected.has(id) ? actSelected.delete(id) : actSelected.add(id);
    render(); // scroll-preserving
  }));
}

/* ------------------------------ edit modal --------------------------------- */
function showTxnEditModal(t) {
  const isFixed = t.source === "fixed";
  const cats = t.type === "income" ? allIncomeCategories() : allExpenseCategories();
  modal(`
    <h2>Edit ${t.type === "income" ? "income" : "expense"}</h2>
    ${isFixed ? `<div class="nudge"><div class="nudge-body">This entry mirrors a bill payment (${esc(t.note || "bill")}). You can adjust the amount or note; unchecking the bill in Plan → Bills removes it.</div></div>` : ""}
    <label class="field-label">Amount</label>
    <input id="et-amount" class="input amount-input" inputmode="decimal" value="${t.amount}" />
    ${!isFixed ? `
      <label class="field-label">Category</label>
      <select id="et-category" class="select">${categoryOptionsHTML(cats, t.category)}</select>
      <label class="field-label">Date</label>
      <input id="et-date" class="input" type="date" value="${dateKey(t.date)}" />
    ` : ""}
    <label class="field-label">Note</label>
    <input id="et-note" class="input" value="${esc(t.note || "")}" placeholder="Note (optional)" />
    <button id="et-save" class="btn primary block">Save changes</button>
    ${!isFixed ? `<button id="et-split" class="btn block">Split across categories…</button>
    <button id="et-delete" class="btn danger block">Delete transaction</button>` : ""}
  `, (root) => {
    $("#et-split", root)?.addEventListener("click", () => {
      closeOverlay(root);
      setTimeout(() => showSplitModal(t), 200);
    });
    $("#et-save", root).addEventListener("click", () => {
      const amount = parseFloat($("#et-amount", root).value);
      if (isNaN(amount) || amount <= 0) { toast("Enter a valid amount"); return; }
      const patchObj = { amount, note: $("#et-note", root).value.trim() };
      if (!isFixed) {
        patchObj.category = $("#et-category", root).value;
        patchObj.date = $("#et-date", root).value || dateKey(t.date);
      }
      updateTransaction(t.id, patchObj);
      closeOverlay(root); render(); toast("Updated ✓");
    });
    $("#et-delete", root)?.addEventListener("click", () => {
      if (confirm("Delete this transaction?")) {
        deleteTransaction(t.id);
        closeOverlay(root); render(); toastUndo("Transaction deleted");
      }
    });
  });
}

/* ------------------------------ split modal --------------------------------- */
// Divide one transaction across categories; parts must add up exactly.
function showSplitModal(t) {
  const cats = allExpenseCategories();
  const half = Math.round((t.amount / 2) * 100) / 100;
  let rows = [
    { category: t.category || "misc", amount: half },
    { category: t.category || "misc", amount: Math.round((t.amount - half) * 100) / 100 },
  ];
  const rowsHTML = () => rows.map((r, i) => `
    <div class="input-pair" style="margin-bottom:10px">
      <select class="select split-cat" data-i="${i}" style="margin-bottom:0">${categoryOptionsHTML(cats, r.category)}</select>
      <input class="input split-amt" data-i="${i}" inputmode="decimal" value="${r.amount}" style="margin-bottom:0" />
    </div>`).join("");
  const remainder = () => Math.round((t.amount - rows.reduce((a, r) => a + (parseFloat(r.amount) || 0), 0)) * 100) / 100;

  modal(`
    <h2>Split ${fmtMoney(t.amount)}</h2>
    <p class="row-sub" style="margin-bottom:12px">${esc(t.note || "Transaction")} · ${fmtDateShort(t.date)}</p>
    <div id="split-rows">${rowsHTML()}</div>
    <button id="split-add-row" class="btn ghost small block">+ Another part</button>
    <div id="split-remainder" class="row-sub money" style="margin:8px 0"></div>
    <button id="split-save" class="btn primary block">Split it</button>
  `, (root) => {
    const refresh = () => {
      const rem = remainder();
      const el = $("#split-remainder", root);
      el.textContent = rem === 0 ? "Adds up ✓" : rem > 0 ? `${fmtMoney(rem)} left to assign` : `${fmtMoney(-rem)} over the original`;
      el.className = "row-sub money " + (rem === 0 ? "pos" : "warn");
      $("#split-save", root).disabled = rem !== 0 || rows.some(r => !(parseFloat(r.amount) > 0));
    };
    const wireRows = () => {
      $$(".split-cat", root).forEach(sel => sel.addEventListener("change", () => { rows[+sel.dataset.i].category = sel.value; }));
      $$(".split-amt", root).forEach(inp => inp.addEventListener("input", () => { rows[+inp.dataset.i].amount = parseFloat(inp.value) || 0; refresh(); }));
    };
    $("#split-add-row", root).addEventListener("click", () => {
      rows.push({ category: t.category || "misc", amount: 0 });
      patch("#split-rows", rowsHTML());
      wireRows(); refresh();
    });
    $("#split-save", root).addEventListener("click", () => {
      splitTransaction(t.id, rows.map(r => ({ category: r.category, amount: parseFloat(r.amount) })));
      closeOverlay(root); render(); toastUndo("Transaction split");
    });
    wireRows(); refresh();
  });
}
