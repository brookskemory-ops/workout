/* ============================================================================
 * KEEL — CSV import wizard (bottom sheet, launched from Activity):
 * upload → map columns / date format → preview → import to Inbox.
 * ==========================================================================*/

function openImportWizard() {
  let rows = null;       // parsed CSV rows (incl. header)
  let hasHeader = true;
  let mapping = null;    // column indices
  let dateFmt = "mdy";

  const colSelect = (id, label, selectedIdx, allowNone) => {
    const header = rows[0];
    return `<label class="field-label">${label}</label>
      <select id="${id}" class="select">
        ${allowNone ? `<option value="">—</option>` : ""}
        ${header.map((h, i) => `<option value="${i}" ${i === selectedIdx ? "selected" : ""}>${esc(String(h || `Column ${i + 1}`)).slice(0, 40)}</option>`).join("")}
      </select>`;
  };

  const stepUploadHTML = () => `
    <h2>Import bank CSV</h2>
    <p class="row-sub" style="margin-bottom:12px">Download a CSV statement from your bank's website, then load it here. Rows you've already imported are skipped automatically, and everything lands in the Inbox for sorting.</p>
    <label class="btn primary block" style="text-align:center;cursor:pointer">
      Choose CSV file…<input id="imp-file" type="file" accept=".csv,text/csv" class="hidden" />
    </label>`;

  const stepMapHTML = () => {
    const data = hasHeader ? rows.slice(1) : rows;
    const sampleDates = data.slice(0, 8).map(r => mapping.date != null ? r[mapping.date] : "");
    dateFmt = guessDateFormat(sampleDates);
    const preview = mapCSVRows(data.slice(0, 5), mapping, dateFmt, state.rules, []);
    return `
      <h2>Match the columns</h2>
      <label style="display:flex;align-items:center;gap:10px;margin-bottom:10px;font-size:0.9rem">
        <input type="checkbox" id="imp-header" ${hasHeader ? "checked" : ""}/> First row is a header
      </label>
      ${colSelect("imp-date", "Date column", mapping.date)}
      ${colSelect("imp-amount", "Amount column (signed; blank if separate debit/credit)", mapping.amount, true)}
      <div class="input-pair">
        <div>${colSelect("imp-debit", "Debit (money out)", mapping.debit, true)}</div>
        <div>${colSelect("imp-credit", "Credit (money in)", mapping.credit, true)}</div>
      </div>
      ${colSelect("imp-desc", "Description", mapping.description, true)}
      <label class="field-label">Date format</label>
      <select id="imp-datefmt" class="select">
        <option value="mdy" ${dateFmt === "mdy" ? "selected" : ""}>Month/Day/Year (US)</option>
        <option value="dmy" ${dateFmt === "dmy" ? "selected" : ""}>Day/Month/Year</option>
        <option value="ymd" ${dateFmt === "ymd" ? "selected" : ""}>Year-Month-Day</option>
      </select>
      <div class="card-label" style="margin-top:8px">Preview</div>
      <div id="imp-preview">${previewHTML(preview)}</div>
      <button id="imp-run" class="btn primary block" style="margin-top:12px">Import ${hasHeader ? rows.length - 1 : rows.length} rows</button>`;
  };

  const previewHTML = (res) => res.txns.length
    ? res.txns.map(t => `<div class="vol-row">
        <span class="vol-label">${esc(t.note || "(no description)").slice(0, 30)}</span>
        <span class="row-sub">${t.date}</span>
        <span class="vol-num money ${t.type === "income" ? "pos" : "neg"}">${t.type === "income" ? "+" : "−"}${fmtMoney(t.amount)}</span>
      </div>`).join("")
    : `<p class="row-sub warn">Nothing parseable with this mapping — adjust the columns above.</p>`;

  sheet(stepUploadHTML(), (root) => {
    const rerender = (html, wirer) => {
      root.querySelector(".sheet").innerHTML = `<button class="overlay-close" aria-label="Close">✕</button>` + html;
      wirer();
    };

    const wireMapStep = () => {
      const readMapping = () => {
        const idx = (id) => { const v = $(id, root).value; return v === "" ? null : +v; };
        mapping = {
          date: idx("#imp-date"), amount: idx("#imp-amount"),
          debit: idx("#imp-debit"), credit: idx("#imp-credit"),
          description: idx("#imp-desc"), payee: null,
        };
        dateFmt = $("#imp-datefmt", root).value;
        hasHeader = $("#imp-header", root).checked;
        const data = hasHeader ? rows.slice(1) : rows;
        patch("#imp-preview", previewHTML(mapCSVRows(data.slice(0, 5), mapping, dateFmt, state.rules, [])));
      };
      ["#imp-date", "#imp-amount", "#imp-debit", "#imp-credit", "#imp-desc", "#imp-datefmt", "#imp-header"]
        .forEach(sel => $(sel, root)?.addEventListener("change", readMapping));
      $("#imp-run", root).addEventListener("click", () => {
        readMapping();
        const data = hasHeader ? rows.slice(1) : rows;
        const res = mapCSVRows(data, mapping, dateFmt, state.rules, existingImportKeys());
        importTransactions(res.txns);
        closeOverlay(root);
        render();
        toast(`Imported ${res.txns.length} · skipped ${res.skippedDupes} duplicates${res.skippedBad ? ` · ${res.skippedBad} unreadable` : ""}`);
        if (res.txns.length) navigate("inbox");
      });
    };

    $("#imp-file", root).addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        rows = parseCSV(String(reader.result));
        if (!rows.length || rows.length < 2) { toast("That file looks empty"); return; }
        mapping = detectCSVColumns(rows[0]);
        if (mapping.date == null) mapping.date = 0;
        rerender(stepMapHTML(), wireMapStep);
      };
      reader.readAsText(file);
    });
  });
}
