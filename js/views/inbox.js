/* ============================================================================
 * KEEL — Inbox: triage for imported/synced transactions. One card at a time
 * over a category chip grid — tap a chip to file it, or DRAG the card onto a
 * chip. "Always do this" turns the decision into an auto-categorization rule.
 * ==========================================================================*/

function renderInbox() {
  const queue = inboxQueue();
  if (!queue.length) {
    return `
      ${pageHeader("Inbox", { sub: "Sort incoming transactions" })}
      <div class="card">${emptyStateHTML("🎉", "Inbox zero — everything's categorized.", "Back to Activity", 'data-nav="activity"')}</div>
    `;
  }
  const t = queue[0];
  const acct = t.accountId ? state.bank.accounts.find(a => a.id === t.accountId) : null;
  const suggested = t.suggestedCategory;
  const cats = t.type === "income" ? allIncomeCategories() : allExpenseCategories();
  // most-used categories first so the likely chip is near the thumb
  const counts = state.ui.categoryUseCounts || {};
  const ordered = cats.slice().sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0));

  return `
    ${pageHeader("Inbox", { sub: `${queue.length} to sort` })}
    <div class="card hero-card inbox-card" id="inbox-card" data-txn="${t.id}">
      <div class="row-sub">${fmtDay(t.date)}${acct ? ` · ${esc(acct.name)}` : t.importKey ? " · imported" : ""}</div>
      <div class="hero-amount money ${t.type === "income" ? "pos" : "neg"}" style="font-size:1.8rem">
        ${t.type === "income" ? "+" : "−"}${fmtMoney(t.amount)}</div>
      <div style="font-weight:600;margin-top:2px">${esc(t.note || "(no description)")}</div>
      <div class="row-sub" style="margin-top:8px">Tap a category below — or drag this card onto one.</div>
    </div>

    ${suggested ? `<div class="nudge pos"><div class="nudge-body">Suggested: <strong>${esc((t.type === "income" ? incomeCatById(suggested) : expenseCatById(suggested)).name)}</strong> (from your rules)</div>
      <button class="btn small" data-inbox-cat="${suggested}">✓ Accept</button></div>` : ""}

    <div class="card">
      <div class="chips inbox-chips">
        ${ordered.map(c => `<button class="chip inbox-chip ${c.id === suggested ? "sel" : ""}" data-inbox-cat="${c.id}">${c.icon} ${esc(c.name)}</button>`).join("")}
      </div>
      <label style="display:flex;align-items:center;gap:10px;margin-top:14px;font-size:0.88rem" class="muted">
        <input type="checkbox" id="inbox-make-rule" ${suggested ? "" : "checked"} />
        Always file <strong>"${esc(ruleTextForTxn(t))}"</strong> this way
      </label>
    </div>

    <div class="grid-2">
      <button class="card center" id="inbox-skip"><div class="card-label">Skip for now →</div></button>
      <button class="card center" id="inbox-flip"><div class="card-label">It's ${t.type === "income" ? "an expense" : "income"} ⇄</div></button>
    </div>
    <button class="btn danger block" id="inbox-delete">Delete this transaction</button>
  `;
}

// The memorable part of the description becomes the rule text (first chunk
// before separators, trimmed of numbers-only noise).
function ruleTextForTxn(t) {
  const raw = (t.note || "").split("·")[0].trim();
  const words = raw.split(/\s+/).filter(w => !/^[\d#*\-.]+$/.test(w)).slice(0, 3).join(" ");
  return (words || raw || "").slice(0, 30);
}

// Session-only "skip" rotation: skipped ids sink to the back of the queue.
const inboxSkipped = new Set();
function inboxQueue() {
  const all = inboxTxns();
  if (all.length && all.every(t => inboxSkipped.has(t.id))) inboxSkipped.clear();
  return [...all.filter(t => !inboxSkipped.has(t.id)), ...all.filter(t => inboxSkipped.has(t.id))];
}

function wireInbox() {
  const queue = inboxQueue();
  if (!queue.length) return;
  const t = queue[0];

  const fileIt = (categoryId) => {
    const makeRule = $("#inbox-make-rule")?.checked && ruleTextForTxn(t);
    categorizeInboxTxn(t.id, categoryId, makeRule || null);
    toast(makeRule ? `Filed ✓ · rule saved for "${makeRule}"` : "Filed ✓");
    render();
  };

  $$("[data-inbox-cat]").forEach(b => b.addEventListener("click", () => fileIt(b.dataset.inboxCat)));
  $("#inbox-skip")?.addEventListener("click", () => {
    inboxSkipped.add(t.id);
    render();
  });
  $("#inbox-flip")?.addEventListener("click", () => { flipInboxTxnType(t.id); render(); });
  $("#inbox-delete")?.addEventListener("click", () => {
    deleteTransaction(t.id);
    render(); toastUndo("Transaction deleted");
  });

  wireInboxDrag(fileIt);
}

// Pointer-based drag: lift the card, drop it on a chip. Tap remains primary.
function wireInboxDrag(fileIt) {
  const card = $("#inbox-card");
  if (!card) return;
  let dragging = false, startX = 0, startY = 0, hoverChip = null;

  card.addEventListener("pointerdown", (e) => {
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    card.setPointerCapture(e.pointerId);
  });
  card.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (Math.abs(dx) + Math.abs(dy) < 6) return;
    card.classList.add("dragging");
    // pointer capture keeps events flowing here even with hit-testing off,
    // so elementFromPoint sees the chip underneath instead of this card
    card.style.pointerEvents = "none";
    card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 40}deg)`;
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const chip = under?.closest?.(".inbox-chip");
    if (chip !== hoverChip) {
      hoverChip?.classList.remove("drop-target");
      hoverChip = chip || null;
      hoverChip?.classList.add("drop-target");
    }
  });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    card.classList.remove("dragging");
    card.style.transform = "";
    card.style.pointerEvents = "";
    if (hoverChip) {
      const cat = hoverChip.dataset.inboxCat;
      hoverChip.classList.remove("drop-target");
      hoverChip = null;
      if (cat) fileIt(cat);
    }
  };
  card.addEventListener("pointerup", endDrag);
  card.addEventListener("pointercancel", endDrag);
}
