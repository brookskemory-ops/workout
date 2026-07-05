/* ============================================================================
 * KEEL — Bills segment of the Plan tab. Recurring fixed bills with a per-
 * month paid checklist; marking paid logs a transaction dated the bill's
 * due day in the VIEWED month (clamped to month length).
 * ==========================================================================*/

function billsSegmentHTML() {
  const key = getViewedMonth();
  const bills = state.bills.slice().sort((a, b) => a.dueDay - b.dueDay);
  const total = activeBillsTotal(state.bills);
  const paidCount = bills.filter(b => b.active !== false && billPaidInMonth(b.id, key)).length;
  const activeCount = bills.filter(b => b.active !== false).length;

  const rows = bills.map(b => {
    const cat = expenseCatById(b.category);
    const paid = billPaidInMonth(b.id, key);
    return `<div class="row">
      <button class="row-tile ${paid ? "pos" : ""}" data-toggle-bill="${b.id}" aria-label="${paid ? "Mark unpaid" : "Mark paid"}"
        style="${paid ? "background:var(--pos-soft);border-color:var(--pos)" : ""}">${paid ? svgIcon("check") : catIconHTML(cat)}</button>
      <span class="row-main">
        <span class="row-title" style="${b.active === false ? "opacity:.5" : ""}">${esc(b.name)}</span>
        <span class="row-sub">${esc(cat.name)} · due day ${b.dueDay}${b.autopay ? ' · <span class="badge">Auto</span>' : ""}${b.active === false ? " · paused" : ""}</span>
      </span>
      <span class="row-end">
        <span class="money ${paid ? "fixed" : ""}">${fmtMoney(b.amount)}</span>
      </span>
      <button class="icon-btn" data-edit-bill="${b.id}" aria-label="Edit ${esc(b.name)}">${svgIcon("pencil")}</button>
    </div>`;
  }).join("");

  return `
    <div class="card">
      <div class="card-label">${fmtMonth(key)} · ${paidCount}/${activeCount} paid · ${fmtMoney(total)}/mo total</div>
      ${bills.length ? rows : emptyStateHTML("calendar", "No bills yet. Add rent, subscriptions, insurance —<br>set them once, check them off monthly.")}
    </div>
    ${subscriptionsCardHTML()}
    <div class="card">
      <div class="card-label">Add a bill</div>
      <input id="bill-name" class="input" placeholder="Name (e.g. Rent, Netflix)" />
      <div class="input-pair">
        <input id="bill-amount" class="input" inputmode="decimal" placeholder="Amount" />
        <input id="bill-day" class="input" inputmode="numeric" placeholder="Due day (1–31)" />
      </div>
      <select id="bill-category" class="select">${categoryOptionsHTML(allExpenseCategories().filter(c => c.typical === "fixed"), "rent")}
        <optgroup label="Other">${categoryOptionsHTML(allExpenseCategories().filter(c => c.typical !== "fixed"))}</optgroup>
      </select>
      <button id="bill-add" class="btn primary block">+ Add bill</button>
    </div>
  `;
}

/* ---- subscription radar: recurring charges detected from history ---- */
function subscriptionsCardHTML() {
  const subs = detectedSubscriptions();
  if (!subs.length) return "";
  const monthly = subs.reduce((a, r) => a + r.monthlyCost, 0);
  return `<div class="card">
    <div class="card-label">Detected subscriptions · ${fmtMoney(monthly)}/mo</div>
    <p class="row-sub" style="margin-bottom:6px">Recurring charges spotted in your history. Track one as a bill to get due-day reminders and autopay, or ignore it.</p>
    ${subs.map((r, i) => `<div class="row">
      <span class="row-tile">${svgIcon("repeat")}</span>
      <span class="row-main">
        <span class="row-title">${esc(r.name)}${r.priceIncreased ? ` <span class="badge warn-badge">↑ was ${fmtMoney(r.prevAmount)}</span>` : ""}</span>
        <span class="row-sub">${r.cadenceLabel} · next ~${fmtDateShort(r.nextDate)} · seen ${r.count}×</span>
      </span>
      <span class="row-end"><span class="money">${fmtMoney(r.amount)}</span></span>
    </div>
    <div class="chips" style="margin:-4px 0 10px 50px">
      <button class="chip" data-sub-track="${i}">Track as bill</button>
      <button class="chip" data-sub-ignore="${esc(r.key)}">Ignore</button>
    </div>`).join("")}
  </div>`;
}

function wireBillsSegment() {
  const subs = detectedSubscriptions();
  $$("[data-sub-track]").forEach(b => b.addEventListener("click", () => {
    const rec = subs[+b.dataset.subTrack];
    if (!rec) return;
    trackRecurringAsBill(rec);
    render(); toast(`${rec.name} is now a tracked bill ✓`);
  }));
  $$("[data-sub-ignore]").forEach(b => b.addEventListener("click", () => {
    ignoreRecurring(b.dataset.subIgnore);
    render(); toast("Ignored — it won't be suggested again");
  }));
  $("#bill-add")?.addEventListener("click", () => {
    const name = $("#bill-name").value.trim();
    const amount = parseFloat($("#bill-amount").value);
    const dueDay = Math.min(31, Math.max(1, parseInt($("#bill-day").value, 10) || 1));
    if (!name || isNaN(amount) || amount <= 0) { toast("Enter a name and amount"); return; }
    addBill({ name, amount, category: $("#bill-category").value, dueDay });
    render(); toast("Bill added ✓");
  });
  $$("[data-toggle-bill]").forEach(b => b.addEventListener("click", () => {
    toggleBillPaid(b.dataset.toggleBill, getViewedMonth());
    render();
  }));
  $$("[data-edit-bill]").forEach(b => b.addEventListener("click", () => {
    const bill = state.bills.find(x => x.id === b.dataset.editBill);
    if (bill) showBillEditModal(bill);
  }));
}

function showBillEditModal(bill) {
  modal(`
    <h2>Edit bill</h2>
    <input id="eb-name" class="input" value="${esc(bill.name)}" />
    <div class="input-pair">
      <input id="eb-amount" class="input" inputmode="decimal" value="${bill.amount}" />
      <input id="eb-day" class="input" inputmode="numeric" value="${bill.dueDay}" />
    </div>
    <select id="eb-category" class="select">${categoryOptionsHTML(allExpenseCategories(), bill.category)}</select>
    <label style="display:flex;align-items:center;gap:10px;margin:4px 0 8px;font-size:0.92rem">
      <input type="checkbox" id="eb-active" ${bill.active !== false ? "checked" : ""}/> Active (counts toward monthly total)
    </label>
    <label style="display:flex;align-items:center;gap:10px;margin:0 0 14px;font-size:0.92rem">
      <input type="checkbox" id="eb-autopay" ${bill.autopay ? "checked" : ""}/> Autopay — log it automatically on its due day
    </label>
    <button id="eb-save" class="btn primary block">Save changes</button>
    <button id="eb-delete" class="btn danger block">Delete bill</button>
  `, (root) => {
    $("#eb-save", root).addEventListener("click", () => {
      const name = $("#eb-name", root).value.trim();
      const amount = parseFloat($("#eb-amount", root).value);
      const dueDay = Math.min(31, Math.max(1, parseInt($("#eb-day", root).value, 10) || 1));
      if (!name || isNaN(amount) || amount <= 0) { toast("Enter a name and amount"); return; }
      updateBill(bill.id, { name, amount, dueDay, category: $("#eb-category", root).value, active: $("#eb-active", root).checked, autopay: $("#eb-autopay", root).checked });
      closeOverlay(root); render(); toast("Bill updated ✓");
    });
    $("#eb-delete", root).addEventListener("click", () => {
      if (confirm(`Delete "${bill.name}"? Past logged payments stay.`)) {
        deleteBill(bill.id);
        closeOverlay(root); render(); toastUndo("Bill deleted");
      }
    });
  });
}
