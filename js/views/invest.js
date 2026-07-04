/* ============================================================================
 * KEEL — Invest: risk quiz → model portfolio tied to budget capacity, plus a
 * live-priced holdings tracker with drift view and value-over-time history.
 * Prices: CoinGecko (crypto, keyless) + optional finnhub.io key (stocks),
 * fetched in parallel with timeouts, cached in state for offline.
 * Educational rules of thumb — not financial advice.
 * ==========================================================================*/

const PRICE_TIMEOUT_MS = 8000;
const AUTO_REFRESH_MS = 15 * 60 * 1000;

function fetchWithTimeout(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PRICE_TIMEOUT_MS);
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

// Refresh every holding's price in parallel. silent=true (auto-refresh)
// skips toasts and the button spinner.
async function refreshInvestPrices(silent) {
  const inv = state.invest;
  if (!inv.holdings.length) { if (!silent) toast("Add a holding first"); return; }
  const now = new Date().toISOString();
  const updates = {};
  let ok = 0, needKey = 0, manual = 0, failed = 0;

  const tasks = [];
  const cryptos = inv.holdings.filter(h => h.kind === "crypto");
  const knownCryptos = cryptos.filter(h => CRYPTO_COINGECKO_IDS[h.symbol.toUpperCase()]);
  manual += cryptos.length - knownCryptos.length;
  if (knownCryptos.length) {
    const ids = [...new Set(knownCryptos.map(h => CRYPTO_COINGECKO_IDS[h.symbol.toUpperCase()]))];
    tasks.push(
      fetchWithTimeout(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd`)
        .then(res => { if (!res.ok) throw new Error(res.status); return res.json(); })
        .then(data => knownCryptos.forEach(h => {
          const price = data[CRYPTO_COINGECKO_IDS[h.symbol.toUpperCase()]]?.usd;
          if (price > 0) { updates[holdingPriceKey(h)] = { price, at: now }; ok++; }
          else failed++;
        }))
        .catch(() => { failed += knownCryptos.length; })
    );
  }

  const stocks = inv.holdings.filter(h => h.kind === "stock" && h.symbol.toUpperCase() !== "HYSA");
  if (stocks.length && !inv.finnhubKey) needKey += stocks.length;
  else {
    for (const h of stocks) {
      tasks.push(
        fetchWithTimeout(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(h.symbol.toUpperCase())}&token=${encodeURIComponent(inv.finnhubKey)}`)
          .then(res => { if (!res.ok) throw new Error(res.status); return res.json(); })
          .then(data => {
            if (data.c > 0) { updates[holdingPriceKey(h)] = { price: data.c, at: now }; ok++; }
            else failed++;
          })
          .catch(() => { failed++; })
      );
    }
  }

  await Promise.allSettled(tasks);
  if (ok > 0) {
    cachePrices(updates);
    recordPortfolioSnapshot();
  }
  setInvestField("lastAutoRefreshAt", now);
  if (currentRoute() === "invest") render();
  if (!silent) {
    const bits = [`${ok} updated`];
    if (needKey) bits.push(`${needKey} need a Finnhub key`);
    if (manual) bits.push(`${manual} manual-price only`);
    if (failed) bits.push(`${failed} failed${navigator.onLine === false ? " (offline)" : ""}`);
    toast(`Prices: ${bits.join(" · ")}`);
  }
}

/* ------------------------------ quiz & plan -------------------------------- */
function investQuizHTML(inv) {
  const answers = inv.quizAnswers || {};
  const result = scoreRiskQuiz(inv.quizAnswers);
  if (result) {
    const p = RISK_PROFILES[result.profileId];
    return `<div class="card hero-card">
      <div class="card-label">Your risk profile</div>
      <div class="hero-amount" style="font-size:1.6rem">${p.icon} ${p.label}</div>
      <div class="row-sub" style="margin-top:6px">${p.blurb} (Score ${result.score}/${result.max}.)</div>
      <button id="quiz-retake" class="btn ghost small" style="margin-top:12px">↺ Retake quiz</button>
    </div>`;
  }
  const answered = RISK_QUIZ.filter(q => answers[q.id] != null).length;
  return `<div class="card hero-card">
    <div class="card-label">Risk quiz · ${answered}/${RISK_QUIZ.length}</div>
    <p class="row-sub" style="margin-bottom:4px">Six quick questions build your suggested mix of stocks, bonds, cash and crypto.</p>
    ${RISK_QUIZ.map(q => `<div class="quiz-q">
      <div class="quiz-question">${q.q}</div>
      <div class="chips">${q.opts.map((o, i) =>
        `<button class="chip ${answers[q.id] === i ? "sel" : ""}" data-quiz-q="${q.id}" data-quiz-opt="${i}">${o.label}</button>`).join("")}</div>
    </div>`).join("")}
  </div>`;
}

function investFlagsHTML(flags) {
  const msgs = {
    shortHorizon: "You may need this money within ~3 years, so the plan is capped at Conservative — short-term money usually belongs in high-yield savings or T-bills.",
    noEmergencyFund: "No emergency fund yet — common advice is ~3 months of expenses (start one in Plan → Goals) before investing seriously. Plan capped at Balanced.",
    thinEmergencyFund: "Your emergency fund is under 3 months — consider splitting monthly savings between finishing it and investing.",
  };
  return flags.map(f => msgs[f] ? `<div class="nudge warn"><div class="nudge-body">${msgs[f]}</div></div>` : "").join("");
}

function investPlanHTML(inv, result) {
  if (!result) return "";
  const capacity = currentSavingsCapacity();
  const monthly = inv.monthlyOverride ?? Math.max(0, capacity ?? 0);
  const plan = buildInvestPlan(result.profileId, monthly);
  const alloc = RISK_PROFILES[result.profileId].allocation;
  const capacityNote = capacity === null
    ? "Set your income in Plan → Budgets to auto-suggest a monthly amount."
    : capacity <= 0
      ? `Budgets currently leave nothing over (${fmtMoney(capacity)}) — trim one in Plan → Budgets to free up money.`
      : `Auto-suggested from your plan: ${fmtMoney(capacity)}/mo left after bills & budgets.`;

  return `<div class="card">
    <div class="card-label">Monthly investing plan</div>
    ${investFlagsHTML(result.flags)}
    <div class="input-pair">
      <input id="invest-monthly" class="input" inputmode="decimal"
        placeholder="${capacity && capacity > 0 ? capacity : "Monthly amount"}" value="${inv.monthlyOverride ?? ""}" />
      <div class="row-sub" style="align-self:center">${currency()}/month to invest</div>
    </div>
    <div class="row-sub" style="margin-bottom:10px">${capacityNote}</div>
    ${ALLOCATION_BUCKETS.filter(b => alloc[b.id] > 0).map(b => {
      const row = plan.find(r => r.bucket.id === b.id);
      return `<div class="vol-row">
        <span class="vol-label">${b.icon} ${esc(b.name)}</span>
        ${barHTML(alloc[b.id], b.cls)}
        <span class="vol-num money">${alloc[b.id]}%${row && monthly > 0 ? ` · ${fmtMoney(row.amount)}` : ""}</span>
      </div>
      <div class="row-sub" style="margin:-2px 0 8px calc(40% + 10px)">e.g. ${b.examples.map(e => `<strong>${e.symbol}</strong>`).join(" · ")}</div>`;
    }).join("")}
    <div class="row-sub">Rules of thumb: broad low-cost index funds, automate the monthly buy, rebalance ~yearly, keep crypto a slice you could lose entirely.</div>
  </div>`;
}

/* ------------------------------ portfolio ---------------------------------- */
function holdingRowHTML(h, inv) {
  const cached = inv.priceCache[holdingPriceKey(h)];
  const price = (cached && cached.price) ?? h.manualPrice ?? h.costPerUnit ?? null;
  const value = holdingValue(h, inv.priceCache);
  const src = cached ? `live · ${fmtAgo(cached.at)}` : h.manualPrice != null ? "manual price" : h.costPerUnit != null ? "at cost" : "no price";
  let gain = "";
  if (h.costPerUnit > 0 && price != null) {
    const pct = ((price - h.costPerUnit) / h.costPerUnit) * 100;
    gain = ` · <span class="money ${pct >= 0 ? "pos" : "neg"}">${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%</span>`;
  }
  const bucket = h.kind === "crypto" ? BUCKET_BY_ID.crypto : BUCKET_BY_ID[h.bucket || guessBucketForSymbol(h.symbol)];
  return `<div class="row">
    <span class="row-tile">${h.kind === "crypto" ? "₿" : "📈"}</span>
    <span class="row-main">
      <span class="row-title">${esc(h.symbol.toUpperCase())} <span class="row-sub">× ${h.quantity}</span></span>
      <span class="row-sub">${esc(bucket.name)} · ${fmtPrice(price)} · ${src}${gain}</span>
    </span>
    <span class="row-end"><span class="money">${fmtMoney(value)}</span></span>
    <button class="icon-btn" data-edit-holding="${h.id}" aria-label="Edit ${esc(h.symbol)}">✎</button>
  </div>`;
}

function portfolioCardHTML(inv) {
  const { total } = portfolioBreakdown(inv.holdings, inv.priceCache);
  return `<div class="card">
    <div class="card-label">Portfolio${inv.holdings.length ? ` · ${fmtMoney(total)}` : ""}</div>
    ${inv.holdings.length
      ? inv.holdings.map(h => holdingRowHTML(h, inv)).join("") +
        `<button id="invest-refresh" class="btn ghost block" style="margin-top:10px">↻ Refresh prices</button>`
      : emptyStateHTML("📊", "Track what you own — ETF shares or crypto —<br>and compare it to your plan.")}
    <div class="card-label" style="margin-top:14px">Add a holding</div>
    ${segmentedHTML([
      { id: "stock", label: "📈 Stock / ETF" },
      { id: "crypto", label: "₿ Crypto" },
    ], "stock", "holding-kind")}
    <div class="input-pair">
      <input id="holding-symbol" class="input" placeholder="Ticker (e.g. VTI)" autocapitalize="characters" />
      <input id="holding-qty" class="input" inputmode="decimal" placeholder="Quantity" />
    </div>
    <input id="holding-cost" class="input" inputmode="decimal" placeholder="Avg cost per unit (optional)" />
    <button id="holding-add" class="btn primary block">+ Add holding</button>
    <details style="margin-top:8px">
      <summary class="row-sub" style="cursor:pointer">Live price settings</summary>
      <p class="row-sub" style="margin:8px 0">Crypto prices come from CoinGecko automatically. Stock/ETF quotes need a free API key from <strong>finnhub.io</strong>. Prices are USD and cached for offline. Any holding can carry a manual price instead (tap ✎).</p>
      <input id="invest-finnhub" class="input" placeholder="Finnhub API key (optional)" value="${esc(inv.finnhubKey || "")}" />
    </details>
  </div>`;
}

function driftCardHTML(inv, result) {
  if (!result || !inv.holdings.length) return "";
  const { rows, total } = portfolioBreakdown(inv.holdings, inv.priceCache);
  if (total <= 0) return "";
  const alloc = RISK_PROFILES[result.profileId].allocation;
  const ids = new Set([...rows.map(r => r.bucket.id), ...ALLOCATION_BUCKETS.filter(b => alloc[b.id] > 0).map(b => b.id)]);
  return `<div class="card">
    <div class="card-label">Actual vs target mix</div>
    ${ALLOCATION_BUCKETS.filter(b => ids.has(b.id)).map(b => {
      const actual = rows.find(r => r.bucket.id === b.id)?.pct || 0;
      const target = alloc[b.id] || 0;
      const drift = actual - target;
      const flag = Math.abs(drift) >= 5
        ? `<span class="${drift > 0 ? "warn" : "info"}"> ${drift > 0 ? "▲" : "▼"}${Math.abs(drift).toFixed(0)}</span>` : "";
      return `<div class="vol-row">
        <span class="vol-label">${b.icon} ${esc(b.name)}</span>
        <div class="bar compare-bar"><div class="bar-fill ${b.cls}" style="width:${Math.min(100, actual)}%"></div>
          <div class="target-tick" style="left:${Math.min(100, target)}%"></div></div>
        <span class="vol-num money">${actual.toFixed(0)}%/${target}%${flag}</span>
      </div>`;
    }).join("")}
    <div class="row-sub">Ticks mark targets. 5+ points of drift = point new monthly buys at the underweight bucket.</div>
  </div>`;
}

function portfolioHistoryHTML(inv) {
  const snaps = inv.snapshots || [];
  if (snaps.length < 2) return "";
  const recent = snaps.slice(-90);
  return `<div class="card">
    <div class="card-label">Portfolio value over time</div>
    ${areaLine(recent.map(s => s.total), { labels: [fmtDateShort(recent[0].date), fmtDateShort(recent[recent.length - 1].date)] })}
    <div class="row-sub">Snapshotted daily whenever prices refresh.</div>
  </div>`;
}

/* ------------------------------ view --------------------------------------- */
function renderInvest() {
  const inv = state.invest;
  const result = scoreRiskQuiz(inv.quizAnswers);
  return `
    ${pageHeader("Invest", { sub: "Risk-based plan · stocks & crypto" })}
    ${investQuizHTML(inv)}
    ${investPlanHTML(inv, result)}
    ${portfolioCardHTML(inv)}
    ${driftCardHTML(inv, result)}
    ${portfolioHistoryHTML(inv)}
    <p class="row-sub center" style="padding:0 10px">Educational rules of thumb only — not financial advice. Markets can lose money; crypto especially can.</p>
  `;
}

function wireInvest() {
  const inv = state.invest;

  // silent auto-refresh at most every 15 minutes
  const stale = !inv.lastAutoRefreshAt || (Date.now() - new Date(inv.lastAutoRefreshAt).getTime()) > AUTO_REFRESH_MS;
  if (inv.holdings.length && stale && navigator.onLine !== false) refreshInvestPrices(true);

  $$("[data-quiz-q]").forEach(b => b.addEventListener("click", () => {
    setQuizAnswer(b.dataset.quizQ, parseInt(b.dataset.quizOpt, 10));
    render();
  }));
  $("#quiz-retake")?.addEventListener("click", () => { resetQuiz(); render(); });
  $("#invest-monthly")?.addEventListener("change", (e) => {
    const v = parseFloat(e.target.value);
    setInvestField("monthlyOverride", isNaN(v) || v < 0 ? null : v);
    render();
  });
  $("#invest-finnhub")?.addEventListener("change", (e) => {
    setInvestField("finnhubKey", e.target.value.trim());
    toast(e.target.value.trim() ? "Key saved — refreshing" : "Key cleared");
    if (e.target.value.trim()) refreshInvestPrices(true);
  });
  $("#invest-refresh")?.addEventListener("click", (e) => {
    e.target.disabled = true; e.target.textContent = "⏳ Fetching…";
    refreshInvestPrices(false);
  });

  let holdingKind = "stock";
  $$("[data-holding-kind]").forEach(b => b.addEventListener("click", () => {
    holdingKind = b.dataset.holdingKind;
    $$("[data-holding-kind]").forEach(x => x.classList.toggle("active", x === b));
    $("#holding-symbol").placeholder = holdingKind === "crypto" ? "Symbol (e.g. BTC)" : "Ticker (e.g. VTI)";
  }));
  $("#holding-add")?.addEventListener("click", () => {
    const symbol = $("#holding-symbol").value.trim().toUpperCase();
    const quantity = parseFloat($("#holding-qty").value);
    const cost = parseFloat($("#holding-cost").value);
    if (!symbol || isNaN(quantity) || quantity <= 0) { toast("Enter a symbol and quantity"); return; }
    addHolding({
      kind: holdingKind, symbol, quantity,
      costPerUnit: isNaN(cost) || cost <= 0 ? null : cost,
      manualPrice: null,
      bucket: holdingKind === "stock" ? guessBucketForSymbol(symbol) : null,
    });
    render(); toast(`${symbol} added ✓`);
    refreshInvestPrices(true);
  });
  $$("[data-edit-holding]").forEach(b => b.addEventListener("click", () => {
    const h = inv.holdings.find(x => x.id === b.dataset.editHolding);
    if (h) showHoldingEditModal(h);
  }));
}

function showHoldingEditModal(h) {
  const stockBuckets = ALLOCATION_BUCKETS.filter(b => b.id !== "crypto");
  const unknownCrypto = h.kind === "crypto" && !CRYPTO_COINGECKO_IDS[h.symbol.toUpperCase()];
  modal(`
    <h2>${esc(h.symbol.toUpperCase())}</h2>
    <label class="field-label">Quantity</label>
    <input id="eh-qty" class="input" inputmode="decimal" value="${h.quantity}" />
    <label class="field-label">Avg cost per unit (enables gain/loss)</label>
    <input id="eh-cost" class="input" inputmode="decimal" value="${h.costPerUnit ?? ""}" placeholder="—" />
    <label class="field-label">Manual price per unit (used when no live price)</label>
    <input id="eh-price" class="input" inputmode="decimal" value="${h.manualPrice ?? ""}" placeholder="—" />
    ${unknownCrypto ? `<div class="nudge warn"><div class="nudge-body">${esc(h.symbol.toUpperCase())} isn't in the built-in CoinGecko list — keep the manual price updated.</div></div>` : ""}
    ${h.kind === "stock" ? `
      <label class="field-label">Asset class (for the drift view)</label>
      <select id="eh-bucket" class="select">${stockBuckets.map(b =>
        `<option value="${b.id}" ${(h.bucket || guessBucketForSymbol(h.symbol)) === b.id ? "selected" : ""}>${b.icon} ${esc(b.name)}</option>`).join("")}</select>` : ""}
    <button id="eh-save" class="btn primary block">Save changes</button>
    <button id="eh-delete" class="btn danger block">Delete holding</button>
  `, (root) => {
    $("#eh-save", root).addEventListener("click", () => {
      const qty = parseFloat($("#eh-qty", root).value);
      if (isNaN(qty) || qty <= 0) { toast("Enter a valid quantity"); return; }
      const cost = parseFloat($("#eh-cost", root).value);
      const price = parseFloat($("#eh-price", root).value);
      updateHolding(h.id, {
        quantity: qty,
        costPerUnit: isNaN(cost) || cost <= 0 ? null : cost,
        manualPrice: isNaN(price) || price <= 0 ? null : price,
        ...(h.kind === "stock" ? { bucket: $("#eh-bucket", root).value } : {}),
      });
      closeOverlay(root); render(); toast("Holding updated ✓");
    });
    $("#eh-delete", root).addEventListener("click", () => {
      if (confirm(`Delete ${h.symbol.toUpperCase()}? This only removes it from tracking.`)) {
        deleteHolding(h.id);
        closeOverlay(root); render(); toastUndo("Holding deleted");
      }
    });
  });
}
