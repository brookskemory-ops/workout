/* ============================================================================
 * KEEL — Settings (gear icon on every header): currency, custom categories,
 * and the data-safety suite — CSV export, JSON backup/restore, daily
 * snapshot restore, backup reminders, reset.
 * ==========================================================================*/

function downloadFile(filename, text, mime) {
  const blob = new Blob([text], { type: mime || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function renderSettings() {
  const snaps = listSnapshots();
  const last = state.settings.lastBackupAt;
  const customCats = state.customCategories;
  return `
    ${pageHeader("Settings", { sub: "Preferences, categories & data safety" })}

    <div class="card">
      <div class="card-label">Preferences</div>
      <label class="field-label">Currency symbol</label>
      <input id="set-currency" class="input" value="${esc(currency())}" maxlength="3" />
      <label style="display:flex;align-items:center;gap:10px;font-size:0.92rem">
        <input type="checkbox" id="set-backup-reminder" ${state.settings.backupReminder ? "checked" : ""}/>
        Remind me to back up when data piles up
      </label>
    </div>

    <div class="card">
      <div class="card-label">Custom categories</div>
      ${customCats.length ? customCats.map(c => `<div class="vol-row">
        <span class="vol-label">${c.icon} ${esc(c.name)}</span>
        <span class="vol-num">${c.type}</span>
        <button class="icon-btn" data-del-cat="${c.id}" aria-label="Delete ${esc(c.name)}">✕</button>
      </div>`).join("") : `<p class="row-sub" style="margin-bottom:10px">None yet — the built-in list covers the basics.</p>`}
      <div class="input-pair" style="margin-top:8px">
        <input id="cc-name" class="input" placeholder="Category name" style="margin-bottom:0" />
        <select id="cc-type" class="select" style="margin-bottom:0">
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </div>
      <button id="cc-add" class="btn block" style="margin-top:10px">+ Add category</button>
    </div>

    <div class="card">
      <div class="card-label">Back up & export</div>
      <p class="row-sub" style="margin-bottom:10px">Your data lives only in this browser. ${last ? `Last backup: ${fmtAgo(last)}.` : `<strong class="warn">Never backed up.</strong>`}</p>
      <button id="export-json" class="btn primary block">⬇ Download full backup (JSON)</button>
      <button id="export-csv" class="btn block">⬇ Export transactions (CSV)</button>
      <label class="btn block" style="text-align:center;cursor:pointer">
        ⬆ Restore from backup…<input id="import-json" type="file" accept=".json,application/json" class="hidden" />
      </label>
    </div>

    <div class="card">
      <div class="card-label">Daily snapshots</div>
      <p class="row-sub" style="margin-bottom:10px">Keel automatically keeps a rolling week of on-device snapshots — restore one if something goes wrong.</p>
      ${snaps.length ? snaps.map(s => `<div class="vol-row">
        <span class="vol-label">${fmtDay(s.date)}</span>
        <button class="btn small" data-restore-snap="${s.slot}">Restore</button>
      </div>`).join("") : `<p class="row-sub">No snapshots yet — one is taken before the first change each day.</p>`}
    </div>

    <div class="card">
      <div class="card-label">About</div>
      <p class="row-sub">Keel — private, offline-first personal finance. No account, no server; everything stays on your device except optional live price lookups. Budget guidelines and investing suggestions are commonly-cited rules of thumb, not financial advice.${state.migratedFrom ? "<br><br>Migrated from Monster Mode — your old fitness data is untouched and waiting for its own app." : ""}</p>
    </div>

    <div class="card">
      <div class="card-label">Danger zone</div>
      <button id="reset-all" class="btn danger block">Erase all Keel data</button>
    </div>
  `;
}

function wireSettings() {
  $("#set-currency")?.addEventListener("change", (e) => {
    setSetting("currency", e.target.value.trim().replace(/[<>&"']/g, "").slice(0, 3) || "$");
    render();
  });
  $("#set-backup-reminder")?.addEventListener("change", (e) => setSetting("backupReminder", e.target.checked));

  $("#cc-add")?.addEventListener("click", () => {
    const name = $("#cc-name").value.trim();
    if (!name) { toast("Enter a category name"); return; }
    addCustomCategory(name, $("#cc-type").value);
    render(); toast("Category added ✓");
  });
  $$("[data-del-cat]").forEach(b => b.addEventListener("click", () => {
    const c = state.customCategories.find(x => x.id === b.dataset.delCat);
    if (c && confirm(`Delete "${c.name}"? Existing transactions keep the category id.`)) {
      deleteCustomCategory(c.id);
      render(); toast("Category deleted");
    }
  }));

  $("#export-json")?.addEventListener("click", () => {
    downloadFile(`keel-backup-${todayKey()}.json`, exportStateJSON(), "application/json");
    render(); toast("Backup downloaded ✓");
  });
  $("#export-csv")?.addEventListener("click", () => {
    const names = Object.fromEntries([...allExpenseCategories(), ...allIncomeCategories()].map(c => [c.id, c.name]));
    downloadFile(`keel-transactions-${todayKey()}.csv`, transactionsToCSV(state.transactions, names), "text/csv");
    toast("CSV downloaded ✓");
  });
  $("#import-json")?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (!confirm("Replace ALL current Keel data with this backup?")) return;
        importStateJSON(reader.result);
        render(); toast("Backup restored ✓");
      } catch (err) {
        toast(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  });
  $$("[data-restore-snap]").forEach(b => b.addEventListener("click", () => {
    if (confirm("Replace current data with this snapshot?")) {
      if (restoreSnapshot(b.dataset.restoreSnap)) { render(); toast("Snapshot restored ✓"); }
      else toast("Snapshot unavailable");
    }
  }));

  $("#reset-all")?.addEventListener("click", () => {
    if (confirm("Erase ALL Keel data on this device? This cannot be undone (download a backup first!).") &&
        confirm("Really erase everything?")) {
      localStorage.removeItem(STORE_KEY);
      for (let i = 0; i < 7; i++) localStorage.removeItem(SNAPSHOT_PREFIX + i);
      localStorage.removeItem(SNAPSHOT_DAY_KEY);
      location.hash = "";
      location.reload();
    }
  });
}
