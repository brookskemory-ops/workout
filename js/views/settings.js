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
      <label class="field-label">Theme</label>
      <select id="set-theme" class="select">
        <option value="dark" ${state.ui.theme === "dark" ? "selected" : ""}>Dark</option>
        <option value="light" ${state.ui.theme === "light" ? "selected" : ""}>Light</option>
        <option value="system" ${state.ui.theme === "system" ? "selected" : ""}>Match system</option>
      </select>
      <label style="display:flex;align-items:center;gap:10px;font-size:0.92rem">
        <input type="checkbox" id="set-backup-reminder" ${state.settings.backupReminder ? "checked" : ""}/>
        Remind me to back up when data piles up
      </label>
    </div>

    <div class="card">
      <div class="card-label">PIN lock</div>
      ${hasPIN() ? `
        <p class="row-sub" style="margin-bottom:10px">${svgIcon("lock")} On — the app locks when opened and after 2 minutes in the background.</p>
        <button id="pin-change" class="btn block">Change PIN</button>
        <button id="pin-off" class="btn danger block">Turn off PIN</button>
      ` : `
        <p class="row-sub" style="margin-bottom:10px">Add a 4–6 digit PIN so your money data isn't one pocket-unlock away. No recovery exists — if you forget it, the only way back in is erasing the app's data (keep a JSON backup!).</p>
        <div class="input-pair">
          <input id="pin-new" class="input" inputmode="numeric" maxlength="6" placeholder="New PIN" style="margin-bottom:0" />
          <input id="pin-confirm" class="input" inputmode="numeric" maxlength="6" placeholder="Confirm" style="margin-bottom:0" />
        </div>
        <button id="pin-on" class="btn primary block" style="margin-top:10px">${svgIcon("lock")} Turn on PIN lock</button>
      `}
    </div>

    <div class="card">
      <div class="card-label">Custom categories</div>
      ${customCats.length ? customCats.map(c => `<div class="vol-row">
        <span class="vol-label">${catIconHTML(c)} ${esc(c.name)}</span>
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
      <div class="card-label">Bank sync <span class="row-sub">(via SimpleFIN Bridge)</span></div>
      ${state.bank.accessUrl ? `
        <p class="row-sub" style="margin-bottom:10px">Connected · ${state.bank.accounts.length} account${state.bank.accounts.length === 1 ? "" : "s"}${state.bank.lastSyncAt ? ` · synced ${fmtAgo(state.bank.lastSyncAt)}` : ""}</p>
        ${state.bank.accounts.map(a => `<div class="vol-row">
          <span class="vol-label">${svgIcon("landmark")} ${esc(a.name)}</span>
          <span class="row-sub">${esc(a.org)}</span>
          <span class="vol-num money">${fmtMoney(a.balance)}</span>
        </div>`).join("")}
        <label style="display:flex;align-items:center;gap:10px;margin:10px 0;font-size:0.92rem">
          <input type="checkbox" id="bank-autosync" ${state.bank.autoSync ? "checked" : ""}/>
          Auto-sync about hourly while the app is open
        </label>
        <p class="row-sub">${syncBudget(state.bank.syncsToday, todayKey()).used} of ${SYNC_DAILY_CAP} daily syncs used (bank data itself usually updates a few times a day).</p>
        <button id="bank-sync-now" class="btn primary block" style="margin-top:10px">${svgIcon("refresh")} Sync now</button>
        <button id="bank-disconnect" class="btn danger block">Disconnect (removes the stored access key)</button>
      ` : `
        <p class="row-sub" style="margin-bottom:10px">Pull transactions from your real bank accounts automatically — no server involved, your credentials never touch this app.
        <br><br>1. Create an account at <strong>bridge.simplefin.org</strong> (small monthly fee, paid to them) and connect your banks there.
        <br>2. Generate a <strong>setup token</strong> ("Connect an app") and paste it below — one time only.
        <br>3. New transactions land in your Inbox automatically (about every hour while you use the app — pull down to refresh anytime), and balances feed your net worth.</p>
        <input id="bank-token" class="input" placeholder="Paste SimpleFIN setup token (or access URL)" />
        <button id="bank-connect" class="btn primary block">Connect</button>
        <p class="row-sub">The resulting access key is stored only on this device. Anyone with access to this phone and no PIN could read it — consider the PIN lock below.</p>
      `}
    </div>

    <div class="card">
      <div class="card-label">Auto-categorization rules</div>
      ${state.rules.length ? state.rules.map(r => `<div class="vol-row">
        <span class="vol-label">"${esc(r.match)}"</span>
        <span class="row-sub">→ ${esc(expenseCatById(r.categoryId).name)}</span>
        <button class="icon-btn" data-del-rule="${r.id}" aria-label="Delete rule">✕</button>
      </div>`).join("") : `<p class="row-sub" style="margin-bottom:10px">Rules file imported transactions automatically ("uber" → Transport). The Inbox creates them for you as you sort, or add one here.</p>`}
      <div class="input-pair" style="margin-top:8px">
        <input id="rule-match" class="input" placeholder="Text to match" style="margin-bottom:0" />
        <select id="rule-category" class="select" style="margin-bottom:0">${categoryOptionsHTML(allExpenseCategories())}</select>
      </div>
      <button id="rule-add" class="btn block" style="margin-top:10px">+ Add rule</button>
    </div>

    <div class="card">
      <div class="card-label">Back up & export</div>
      <p class="row-sub" style="margin-bottom:10px">Your data lives only in this browser. ${last ? `Last backup: ${fmtAgo(last)}.` : `<strong class="warn">Never backed up.</strong>`}</p>
      <button id="export-json" class="btn primary block">${svgIcon("download")} Download full backup (JSON)</button>
      <button id="export-csv" class="btn block">${svgIcon("download")} Export transactions (CSV)</button>
      <label class="btn block" style="text-align:center;cursor:pointer">
        ${svgIcon("upload")} Restore from backup…<input id="import-json" type="file" accept=".json,application/json" class="hidden" />
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
  $("#set-theme")?.addEventListener("change", (e) => {
    mutate(s => { s.ui.theme = e.target.value; });
    applyTheme();
    render();
  });

  const validPin = (p) => /^\d{4,6}$/.test(p);
  $("#pin-on")?.addEventListener("click", async () => {
    const pin = $("#pin-new").value, confirmPin = $("#pin-confirm").value;
    if (!validPin(pin)) { toast("PIN must be 4–6 digits"); return; }
    if (pin !== confirmPin) { toast("PINs don't match"); return; }
    await setPIN(pin);
    render(); toast("PIN lock on ✓");
  });
  $("#pin-change")?.addEventListener("click", () => {
    showLockScreen(() => {
      clearPIN();
      render(); toast("Verified — set your new PIN");
    });
  });
  $("#pin-off")?.addEventListener("click", () => {
    showLockScreen(() => {
      clearPIN();
      render(); toast("PIN lock off");
    });
  });

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

  $("#bank-connect")?.addEventListener("click", async (e) => {
    const input = $("#bank-token").value;
    if (!input.trim()) { toast("Paste your setup token first"); return; }
    e.target.disabled = true; e.target.textContent = "Connecting…";
    try {
      const accessUrl = await connectBank(input);
      setBankAccess(accessUrl);
      toast("Connected ✓ — syncing…");
      render();
      syncBank(false);
    } catch (err) {
      toast(err.message);
      e.target.disabled = false; e.target.textContent = "Connect";
    }
  });
  $("#bank-autosync")?.addEventListener("change", (e) => {
    mutate(s => { s.bank.autoSync = e.target.checked; });
  });
  $("#bank-sync-now")?.addEventListener("click", (e) => {
    e.target.disabled = true; e.target.textContent = "⏳ Syncing…";
    syncBank(false);
  });
  $("#bank-disconnect")?.addEventListener("click", () => {
    if (confirm("Disconnect bank sync? The stored access key is deleted from this device. Already-imported transactions stay.")) {
      disconnectBank(); render(); toast("Disconnected");
    }
  });

  $("#rule-add")?.addEventListener("click", () => {
    const match = $("#rule-match").value.trim();
    if (!match) { toast("Enter text to match"); return; }
    addRule(match, $("#rule-category").value);
    render(); toast("Rule added ✓");
  });
  $$("[data-del-rule]").forEach(b => b.addEventListener("click", () => {
    deleteRule(b.dataset.delRule);
    render(); toastUndo("Rule deleted");
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
