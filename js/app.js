/* ============================================================================
 * MONSTER MODE — personal fitness dashboard
 * Vanilla JS, offline-first PWA. All data lives in localStorage on your phone.
 * ==========================================================================*/

const STORE_KEY = "monsterMode.v1";

const DEFAULT_STATE = {
  profile: {
    name: "",
    unit: "lb",          // 'lb' | 'kg'  (default imperial)
    heightIn: null,      // height stored in total inches (ft/in entry)
    bodyweight: null,
    goal: "gain",        // 'gain' | 'cut' | 'maintain'
    experience: "advanced", // 'beginner' | 'intermediate' | 'advanced'
    calorieGoal: null,
    proteinGoal: null,
    waterGoal: 120,      // oz
    stepGoal: 10000,
    barWeight: null,     // null = auto (45 lb / 20 kg)
  },
  program: null,
  programOpts: { split: "ppl6", equipment: [] },
  sessions: [],          // completed workout sessions
  exerciseHistory: {},   // exerciseId -> [{date, sets:[{weight,reps}]}]
  prs: {},               // exerciseId -> { bestWeight, bestE1RM }
  prLog: [],             // [{date, exerciseId, type:'weight'|'e1rm', value, weight, reps}]
  foodLog: {},           // 'YYYY-MM-DD' -> [{name,kcal,protein,carbs,fat,time}]
  bodyweightLog: [],     // [{date, weight}]
  measurements: [],      // [{date, waist, arms, chest, thighs}]
  waterLog: {},          // 'YYYY-MM-DD' -> oz
  stepsLog: {},          // 'YYYY-MM-DD' -> steps
  cardioLog: [],         // [{date, type, minutes, kcal}]
  finance: {
    currency: "$",
    fixedExpenses: [],   // [{id, name, amount, category, dueDay, active}]
    transactions: [],    // [{id, date, amount, category, note, type:'expense'|'income', source:'fixed'|'variable'|'income', fixedBillId?}]
    budgets: {},         // categoryId -> monthly target amount
    customCategories: [],// [{id, name, icon, type:'expense'|'income'}] user-added, merged with the built-ins
    goals: [],           // [{id, name, kind:'savings'|'sinking', target, targetDate, category, achieved, createdAt}]
    contributions: [],   // [{id, goalId, amount, date}]
    debts: [],           // [{id, name, balance, apr, minPayment}]
    debtStrategy: "avalanche", // 'avalanche' | 'snowball'
    debtExtraPayment: 0,
  },
  createdAt: new Date().toISOString(),
};

// active targets scaled by the user's experience level
function targets() { return scaledTargets(state.profile.experience || "intermediate"); }
function jumpMult() { return (EXPERIENCE[state.profile.experience] || EXPERIENCE.intermediate).jumpMult; }

let state = loadState();

/* ----------------------------- storage ------------------------------------ */
// Recursively backfills missing keys from `defaults` into `saved`, so a
// feature added later (e.g. new fields under state.finance) doesn't leave
// `undefined` holes in state that was saved before that feature existed.
// Arrays and non-plain-objects are taken from `saved` as-is (never merged
// element-wise) — only plain object keys get filled in one level at a time.
function mergeDefaults(defaults, saved) {
  const isPlainObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  if (!isPlainObj(defaults) || !isPlainObj(saved)) {
    return saved !== undefined ? saved : defaults;
  }
  const out = { ...defaults };
  for (const key of Object.keys(saved)) {
    out[key] = isPlainObj(defaults[key]) && isPlainObj(saved[key])
      ? mergeDefaults(defaults[key], saved[key])
      : saved[key];
  }
  return out;
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    return mergeDefaults(structuredClone(DEFAULT_STATE), JSON.parse(raw));
  } catch (e) {
    console.warn("Failed to load state", e);
    return structuredClone(DEFAULT_STATE);
  }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { console.warn("Save failed", e); }
}

/* ----------------------------- helpers ------------------------------------ */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const todayKey = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const unit = () => state.profile.unit;
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function toast(msg) {
  let t = $("#toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 1800);
}

/* ----------------------------- app mode / router --------------------------- */
// appMode is intentionally NOT persisted — every fresh app open asks the user
// to pick Fitness or Finance. It only lives in memory for the current session.
let appMode = null; // null | 'fitness' | 'finance'

const MODES = {
  fitness: {
    label: "Fitness", default: "dashboard",
    tabs: [
      { route: "dashboard", ico: "🏠", label: "Home" },
      { route: "workout",   ico: "🏋️", label: "Workout" },
      { route: "food",      ico: "🍽️", label: "Food" },
      { route: "library",   ico: "📚", label: "Library" },
      { route: "progress",  ico: "📈", label: "Progress" },
      { route: "settings",  ico: "⚙️", label: "Setup" },
    ],
    // routes reachable via a button/link but not shown in the tab bar
    extraRoutes: ["builder"],
    extraActiveTab: { builder: "settings" }, // which tab to highlight while on an extra route
    render: {
      dashboard: renderDashboard, workout: renderWorkout, food: renderFood,
      library: renderLibrary, progress: renderProgress, settings: renderSettings,
      builder: renderBuilder,
    },
    wire: {
      dashboard: wireDashboard, workout: wireWorkout, food: wireFood,
      library: wireLibrary, progress: wireProgress, settings: wireSettings,
      builder: wireBuilder,
    },
  },
  finance: {
    label: "Finance", default: "fin-home",
    tabs: [
      { route: "fin-home",    ico: "🏠", label: "Home" },
      { route: "fin-log",     ico: "🧾", label: "Log" },
      { route: "fin-bills",   ico: "📅", label: "Bills" },
      { route: "fin-goals",   ico: "🐷", label: "Goals" },
      { route: "fin-budgets", ico: "🎯", label: "Budgets" },
      { route: "fin-reports", ico: "📊", label: "Reports" },
    ],
    render: {
      "fin-home": renderFinHome, "fin-log": renderFinLog, "fin-bills": renderFinBills,
      "fin-goals": renderFinGoals, "fin-budgets": renderFinBudgets, "fin-reports": renderFinReports,
    },
    wire: {
      "fin-home": wireFinHome, "fin-log": wireFinLog, "fin-bills": wireFinBills,
      "fin-goals": wireFinGoals, "fin-budgets": wireFinBudgets, "fin-reports": wireFinReports,
    },
  },
};

function currentRoute() {
  const mode = MODES[appMode];
  const r = location.hash.replace("#", "");
  const valid = mode.tabs.some(t => t.route === r) || (mode.extraRoutes || []).includes(r);
  return valid ? r : mode.default;
}
function navigate(route) {
  // manually re-render even if the hash is unchanged (e.g. re-picking the same
  // route after a mode switch), since 'hashchange' won't fire in that case
  if (location.hash === "#" + route) render();
  else location.hash = route;
}
window.addEventListener("hashchange", render);

function chooseMode(mode) {
  appMode = mode;
  buildTabBar();
  location.hash = MODES[mode].default;
  render(); // covers the case where the hash didn't change and 'hashchange' won't fire
}
function switchMode() {
  appMode = null;
  $("#tabbar").innerHTML = "";
  render();
}

function buildTabBar() {
  const mode = MODES[appMode];
  $("#tabbar").innerHTML = mode.tabs.map(t =>
    `<a class="tab" data-route="${t.route}" href="#${t.route}"><span class="ico">${t.ico}</span><span>${t.label}</span></a>`
  ).join("");
}

/* ============================ RENDER ROOT ================================== */
function render() {
  if (!appMode) {
    $("#tabbar").innerHTML = "";
    $("#view").innerHTML = renderLauncher();
    wireLauncher();
    return;
  }
  const mode = MODES[appMode];
  const route = currentRoute();
  const activeTab = (mode.extraActiveTab && mode.extraActiveTab[route]) || route;
  $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.route === activeTab));
  const view = $("#view");
  view.scrollTop = 0;
  view.innerHTML = mode.render[route]();
  mode.wire[route]?.();
}

/* ============================ LAUNCHER ==================================== */
function renderLauncher() {
  return `
    <div class="launcher">
      <div class="launcher-title">
        <div class="launcher-logo">🦍</div>
        <h1>Monster Mode</h1>
        <p class="muted">What are we working on?</p>
      </div>
      <button class="mode-card mode-fitness" data-mode="fitness">
        <span class="mode-ico">🏋️</span>
        <span class="mode-name">Fitness</span>
        <span class="mode-sub">Workouts · Food · Progress</span>
      </button>
      <button class="mode-card mode-finance" data-mode="finance">
        <span class="mode-ico">💰</span>
        <span class="mode-name">Finance</span>
        <span class="mode-sub">Expenses · Bills · Budgets</span>
      </button>
    </div>
  `;
}
function wireLauncher() {
  $$("[data-mode]").forEach(b => b.addEventListener("click", () => chooseMode(b.dataset.mode)));
}

/* ============================ DASHBOARD =================================== */
function nextWorkoutIndex() {
  if (!state.program) return 0;
  return state.sessions.length % state.program.days.length;
}

function renderDashboard() {
  const p = state.profile;
  const greeting = p.name ? `Let's build, ${esc(p.name)}.` : "Let's build a monster.";
  const food = foodTotals(todayKey());
  const calGoal = p.calorieGoal || estimateCalories();
  const proGoal = p.proteinGoal || estimateProtein();
  const streak = computeStreak();

  let nextCard;
  if (state.program) {
    const idx = nextWorkoutIndex();
    const day = state.program.days[idx];
    nextCard = `
      <div class="card accent">
        <div class="card-label">Next Workout</div>
        <div class="big">${esc(day.name)}</div>
        <div class="muted">${day.exercises.length} exercises · ${state.program.splitName}</div>
        <a class="btn primary block" href="#workout">Start Workout →</a>
      </div>`;
  } else {
    nextCard = `
      <div class="card accent">
        <div class="card-label">No program yet</div>
        <div class="big">Generate your split</div>
        <div class="muted">Auto-build a balanced routine that hits every muscle group.</div>
        <a class="btn primary block" href="#settings">Set up program →</a>
      </div>`;
  }

  return `
    <header class="page-head">
      <h1>${greeting}</h1>
      <p class="muted">${new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})}</p>
    </header>
    ${nextCard}
    <div class="grid-2">
      <div class="card">
        <div class="card-label">Calories</div>
        <div class="big">${Math.round(food.kcal)}<span class="unit">/${calGoal}</span></div>
        ${progressBar(food.kcal, calGoal, "#ff6b35")}
      </div>
      <div class="card">
        <div class="card-label">Protein</div>
        <div class="big">${Math.round(food.protein)}<span class="unit">/${proGoal}g</span></div>
        ${progressBar(food.protein, proGoal, "#22b8cf")}
      </div>
    </div>
    <div class="grid-2">
      <div class="card center">
        <div class="big">${streak}🔥</div>
        <div class="card-label">Day streak</div>
      </div>
      <div class="card center">
        <div class="big">${state.sessions.length}</div>
        <div class="card-label">Workouts logged</div>
      </div>
    </div>
    ${renderActivityCard()}
    ${renderRecentPRs()}
    ${state.program ? renderVolumeSnapshot() : ""}
    <div class="card">
      <div class="card-label">Today's principle</div>
      <p class="principle">${dailyPrinciple()}</p>
    </div>
  `;
}

function renderActivityCard() {
  const key = todayKey();
  const water = state.waterLog[key] || 0;
  const steps = state.stepsLog[key] || 0;
  const cardioToday = state.cardioLog.filter(c => c.date.slice(0,10) === key);
  const cardioMin = cardioToday.reduce((a,c) => a + (c.minutes||0), 0);
  const wGoal = state.profile.waterGoal || 120;
  const sGoal = state.profile.stepGoal || 10000;
  return `
    <div class="card">
      <div class="card-label">Today's activity</div>
      <div class="activity-row">
        <div class="activity-stat">
          <div class="big">${water}<span class="unit">/${wGoal}oz</span></div>
          ${progressBar(water, wGoal, "#22b8cf")}
          <div class="water-btns">
            <button class="chip" data-water="8">+8oz</button>
            <button class="chip" data-water="16">+16oz</button>
            <button class="chip" data-water="-8">−8</button>
          </div>
        </div>
      </div>
      <div class="grid-2" style="margin-top:6px">
        <div>
          <div class="card-label">Steps</div>
          <div class="macro-inputs">
            <input id="steps-input" class="input" inputmode="numeric" placeholder="${steps||sGoal}" />
            <button id="steps-save" class="btn">Set</button>
          </div>
          ${progressBar(steps, sGoal, "#51cf66")}
        </div>
        <div>
          <div class="card-label">Cardio ${cardioMin?`· ${cardioMin}min today`:""}</div>
          <button id="add-cardio" class="btn block">+ Log cardio</button>
        </div>
      </div>
    </div>`;
}

function renderVolumeSnapshot() {
  const cov = weeklyActualCoverage();
  const T = targets();
  const rows = Object.entries(cov).map(([m, c]) => {
    const t = T[m];
    const pct = Math.min(100, (c.sets / t.max) * 100);
    const color = c.status === "good" ? "#51cf66" : c.status === "low" ? "#ff8787" : "#fcc419";
    return `<div class="vol-row">
      <span class="vol-label">${MUSCLES[m].label}</span>
      <div class="bar"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
      <span class="vol-num">${c.sets}/${t.min}-${t.max}</span>
    </div>`;
  }).join("");
  return `<div class="card">
    <div class="card-label">This week's volume (sets logged)</div>
    ${rows}
    <div class="muted small">Targets scaled for <strong>${esc((EXPERIENCE[state.profile.experience]||EXPERIENCE.intermediate).label)}</strong> · Nippard's 10–20 hard sets/muscle, 2×+/week.</div>
  </div>`;
}

function prLineHTML(ev) {
  const ex = EXERCISE_BY_ID[ev.exerciseId];
  const what = ev.type === "e1rm"
    ? `est. 1RM ${ev.value} ${unit()} (${ev.weight}×${ev.reps})`
    : `top weight ${ev.value} ${unit()} (×${ev.reps})`;
  return `<div class="food-item">
    <div><div class="food-name">🏆 ${esc(ex ? ex.name : ev.exerciseId)}</div>
      <div class="muted small">${what}</div></div>
    <div class="muted small">${fmtDate(ev.date)}</div>
  </div>`;
}

function renderRecentPRs() {
  const log = (state.prLog || []);
  if (!log.length) return "";
  const recent = log.slice(-3).reverse();
  return `<div class="card">
    <div class="card-label">Recent PRs 🏆</div>
    ${recent.map(prLineHTML).join("")}
  </div>`;
}

function wireDashboard() {
  const key = todayKey();
  $$("[data-water]").forEach(b => b.addEventListener("click", () => {
    const cur = state.waterLog[key] || 0;
    state.waterLog[key] = Math.max(0, cur + parseInt(b.dataset.water, 10));
    save(); render();
  }));
  $("#steps-save")?.addEventListener("click", () => {
    const v = parseInt($("#steps-input").value, 10);
    if (isNaN(v)) { toast("Enter steps"); return; }
    state.stepsLog[key] = v; save(); render(); toast("Steps saved ✔");
  });
  $("#add-cardio")?.addEventListener("click", () => {
    const type = prompt("Cardio type? (e.g. Incline walk, Bike, Run)");
    if (!type) return;
    const minutes = parseFloat(prompt("Minutes?")) || 0;
    const kcal = parseFloat(prompt("Calories burned? (optional)")) || 0;
    state.cardioLog.push({ date: new Date().toISOString(), type, minutes, kcal });
    save(); render(); toast("Cardio logged ✔");
  });
}

/* ============================ WORKOUT ==================================== */
function renderWorkout() {
  if (!state.program) {
    return `<header class="page-head"><h1>Workout</h1></header>
      <div class="card center">
        <p>No program generated yet.</p>
        <a class="btn primary" href="#settings">Generate a program</a>
      </div>`;
  }
  const idx = nextWorkoutIndex();
  // allow choosing any day
  const dayPicker = state.program.days.map((d, i) =>
    `<option value="${i}" ${i === idx ? "selected" : ""}>${esc(d.name)}</option>`).join("");

  return `
    <header class="page-head">
      <h1>Workout</h1>
      <select id="day-select" class="select">${dayPicker}</select>
    </header>
    <div id="workout-body"></div>
  `;
}

function wireWorkout() {
  const sel = $("#day-select");
  if (!sel) return;
  const renderDay = () => { $("#workout-body").innerHTML = renderWorkoutDay(+sel.value); wireWorkoutDay(+sel.value); };
  sel.addEventListener("change", renderDay);
  renderDay();
}

function renderWorkoutDay(dayIdx) {
  const day = state.program.days[dayIdx];
  const cards = day.exercises.map((item, i) => {
    const ex = EXERCISE_BY_ID[item.exerciseId];
    const hist = (state.exerciseHistory[item.exerciseId] || []);
    const last = hist[hist.length - 1];
    const sugg = progressionSuggestion(ex, last ? last.sets : null, { jumpMult: jumpMult() });
    const lastTxt = last
      ? `Last: ${last.sets.map(s => `${s.weight}×${s.reps}`).join(", ")} <span class="muted">(${fmtDate(last.date)})</span>`
      : `<span class="muted">No history yet</span>`;

    const setRows = Array.from({ length: item.sets }, (_, si) => {
      const pw = sugg.suggestWeight ?? "";
      return `<div class="set-row" data-set="${si}">
        <span class="set-no">${si + 1}</span>
        <input class="set-weight" inputmode="decimal" placeholder="${pw || unit()}" />
        <span class="x">×</span>
        <input class="set-reps" inputmode="numeric" placeholder="reps" />
        <button class="set-done" aria-label="done">✓</button>
      </div>`;
    }).join("");

    return `<div class="card exercise-card" data-ex="${item.exerciseId}" data-idx="${i}">
      <div class="ex-head">
        <div>
          <div class="ex-name">${esc(ex.name)}</div>
          <div class="ex-meta">${item.sets} sets · ${item.repRange[0]}–${item.repRange[1]} reps · ${item.rir} RIR</div>
        </div>
        <div class="ex-btns">
          <button class="icon-btn calc-btn" data-calc="${item.exerciseId}" title="Plates & warm-up">🧮</button>
          <button class="icon-btn swap-btn" data-swap="${item.exerciseId}" title="Swap exercise">⇄</button>
          <button class="icon-btn info-btn" data-ex-info="${item.exerciseId}" title="How to">ⓘ</button>
        </div>
      </div>
      <div class="last-line">${lastTxt}</div>
      <div class="suggestion suggestion-${sugg.action}">⬆ ${esc(sugg.text)}</div>
      <div class="set-rows">${setRows}</div>
      <button class="btn small save-ex">Save ${esc(ex.name.split(" ")[0])} sets</button>
    </div>`;
  }).join("");

  return `<div class="day-title">${esc(day.name)}</div>${cards}
    <button id="finish-workout" class="btn primary block lg">Finish & Log Workout</button>`;
}

function wireWorkoutDay(dayIdx) {
  // mark a set done -> start the rest timer
  $$(".set-done").forEach(b => b.addEventListener("click", () => {
    const row = b.closest(".set-row");
    row.classList.toggle("done");
    if (row.classList.contains("done")) RestTimer.start();
  }));
  // info popups
  $$("[data-ex-info]").forEach(b => b.addEventListener("click", () => showExerciseModal(b.dataset.exInfo)));
  // swap exercise
  $$("[data-swap]").forEach(b => b.addEventListener("click", () => {
    const card = b.closest(".exercise-card");
    showSwapModal(dayIdx, +card.dataset.idx, b.dataset.swap);
  }));
  // plate + warm-up calculator
  $$("[data-calc]").forEach(b => b.addEventListener("click", () => {
    const card = b.closest(".exercise-card");
    // prefill: typed weight on set 1 → suggested weight → last top weight
    const typed = parseFloat($(".set-weight", card)?.value);
    showPlateCalc(b.dataset.calc, isNaN(typed) ? null : typed);
  }));
  // save a single exercise's sets to history
  $$(".save-ex").forEach(b => b.addEventListener("click", () => {
    const card = b.closest(".exercise-card");
    saveExerciseSets(card);
    toast("Saved ✔");
  }));
  $("#finish-workout")?.addEventListener("click", () => finishWorkout(dayIdx));
}

function readSetsFromCard(card) {
  return $$(".set-row", card).map(row => {
    const w = parseFloat($(".set-weight", row).value);
    const r = parseInt($(".set-reps", row).value, 10);
    if (isNaN(w) || isNaN(r)) return null;
    return { weight: w, reps: r };
  }).filter(Boolean);
}

// Commit a set of sets to history and detect any new personal records.
// Returns an array of PR events (empty if none / first-time baseline).
function commitSets(exId, sets) {
  if (!state.exerciseHistory[exId]) state.exerciseHistory[exId] = [];
  state.exerciseHistory[exId].push({ date: new Date().toISOString(), sets });
  return detectPRs(exId, sets);
}

function detectPRs(exId, sets) {
  state.prs = state.prs || {};
  state.prLog = state.prLog || [];
  const rec = state.prs[exId] || { bestWeight: 0, bestE1RM: 0 };
  const hadHistory = rec.bestE1RM > 0;     // don't celebrate the very first log
  let bestWeight = rec.bestWeight, bestE1RM = rec.bestE1RM, e1rmSet = null, wSet = null;
  sets.forEach(s => {
    if (s.weight == null || s.reps == null) return;
    const e1 = s.weight * (1 + s.reps / 30); // Epley estimate
    if (e1 > bestE1RM) { bestE1RM = e1; e1rmSet = s; }
    if (s.weight > bestWeight) { bestWeight = s.weight; wSet = s; }
  });
  const events = [];
  if (hadHistory && e1rmSet && bestE1RM > rec.bestE1RM + 0.01) {
    events.push({ type: "e1rm", exerciseId: exId, value: Math.round(bestE1RM), weight: e1rmSet.weight, reps: e1rmSet.reps });
  }
  if (hadHistory && wSet && bestWeight > rec.bestWeight + 0.01) {
    events.push({ type: "weight", exerciseId: exId, value: bestWeight, weight: wSet.weight, reps: wSet.reps });
  }
  state.prs[exId] = { bestWeight, bestE1RM };
  const now = new Date().toISOString();
  events.forEach(ev => state.prLog.push({ ...ev, date: now }));
  return events;
}

function saveExerciseSets(card) {
  const exId = card.dataset.ex;
  const sets = readSetsFromCard(card);
  if (!sets.length) return false;
  const prs = commitSets(exId, sets);
  save();
  if (prs.length) celebratePRs(prs);
  return true;
}

function finishWorkout(dayIdx) {
  const day = state.program.days[dayIdx];
  const entries = [];
  let any = false;
  const allPRs = [];
  $$(".exercise-card").forEach(card => {
    const sets = readSetsFromCard(card);
    if (sets.length) {
      any = true;
      const exId = card.dataset.ex;
      // avoid double-committing if user already hit "save" for these exact sets this minute
      const hist = state.exerciseHistory[exId] || (state.exerciseHistory[exId] = []);
      const last = hist[hist.length - 1];
      const justSaved = last && (Date.now() - new Date(last.date).getTime() < 60000)
        && JSON.stringify(last.sets) === JSON.stringify(sets);
      if (!justSaved) allPRs.push(...commitSets(exId, sets));
      entries.push({ exerciseId: exId, sets });
    }
  });
  if (!any) { toast("Log at least one set first"); return; }
  state.sessions.push({ date: new Date().toISOString(), dayName: day.name, dayIdx, entries });
  save();
  if (allPRs.length) celebratePRs(allPRs);
  else toast("Workout logged! 🔥");
  navigate("dashboard");
}

/* ----------------------------- rest timer --------------------------------- */
const RestTimer = {
  remaining: 0, interval: null, default: 150,
  el() {
    let e = $("#rest-timer");
    if (!e) {
      e = document.createElement("div");
      e.id = "rest-timer";
      e.innerHTML = `
        <button class="rt-adj" data-rt="-15">−15</button>
        <div class="rt-main"><span class="rt-time">2:30</span><span class="rt-label">REST</span></div>
        <button class="rt-adj" data-rt="15">+15</button>
        <button class="rt-stop">✕</button>`;
      document.body.appendChild(e);
      e.querySelector(".rt-stop").addEventListener("click", () => RestTimer.stop());
      e.querySelectorAll("[data-rt]").forEach(b =>
        b.addEventListener("click", () => RestTimer.add(parseInt(b.dataset.rt, 10))));
    }
    return e;
  },
  fmt(s) { const m = Math.floor(s/60); const sec = String(Math.max(0,s)%60).padStart(2,"0"); return `${m}:${sec}`; },
  start(seconds) {
    this.remaining = seconds || this.default;
    this.el().classList.add("show");
    this.tick();
    clearInterval(this.interval);
    this.interval = setInterval(() => this.tick(), 1000);
  },
  tick() {
    const e = this.el();
    e.querySelector(".rt-time").textContent = this.fmt(this.remaining);
    e.classList.toggle("done", this.remaining <= 0);
    if (this.remaining <= 0) {
      clearInterval(this.interval);
      e.querySelector(".rt-label").textContent = "GO! 💪";
      try { navigator.vibrate && navigator.vibrate([200,100,200]); } catch {}
      setTimeout(() => this.stop(), 4000);
      return;
    }
    this.remaining--;
  },
  add(s) { this.remaining = Math.max(0, this.remaining + s); this.tick(); },
  stop() { clearInterval(this.interval); this.el().classList.remove("show","done"); this.el().querySelector(".rt-label").textContent = "REST"; },
};

/* ============================ FOOD ======================================= */
const QUICK_FOODS = [
  { name: "Chicken breast (100g)", kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: "Whole eggs (2)", kcal: 156, protein: 12, carbs: 1, fat: 11 },
  { name: "Whey scoop", kcal: 120, protein: 24, carbs: 3, fat: 1.5 },
  { name: "White rice (1 cup)", kcal: 205, protein: 4, carbs: 45, fat: 0.4 },
  { name: "Oats (80g)", kcal: 303, protein: 11, carbs: 51, fat: 5 },
  { name: "Greek yogurt (170g)", kcal: 100, protein: 17, carbs: 6, fat: 0.7 },
  { name: "Banana", kcal: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  { name: "Olive oil (1 tbsp)", kcal: 119, protein: 0, carbs: 0, fat: 14 },
  { name: "Almonds (28g)", kcal: 164, protein: 6, carbs: 6, fat: 14 },
  { name: "Lean ground beef (100g)", kcal: 176, protein: 20, carbs: 0, fat: 10 },
];

function foodTotals(dateKey) {
  const items = state.foodLog[dateKey] || [];
  return items.reduce((a, x) => ({
    kcal: a.kcal + (x.kcal || 0), protein: a.protein + (x.protein || 0),
    carbs: a.carbs + (x.carbs || 0), fat: a.fat + (x.fat || 0),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

function renderFood() {
  const key = todayKey();
  const items = state.foodLog[key] || [];
  const t = foodTotals(key);
  const calGoal = state.profile.calorieGoal || estimateCalories();
  const proGoal = state.profile.proteinGoal || estimateProtein();

  const list = items.length ? items.map((f, i) => `
    <div class="food-item">
      <div>
        <div class="food-name">${esc(f.name)}</div>
        <div class="food-macros muted small">${Math.round(f.kcal)} kcal · ${f.protein}P / ${f.carbs}C / ${f.fat}F</div>
      </div>
      <button class="del-food" data-i="${i}">✕</button>
    </div>`).join("") : `<p class="muted center">No food logged today. Add your first meal 👇</p>`;

  const quick = QUICK_FOODS.map((f, i) =>
    `<button class="chip" data-quick="${i}">${esc(f.name)}</button>`).join("");

  return `
    <header class="page-head"><h1>Food Log</h1>
      <p class="muted">${new Date().toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"})}</p>
    </header>
    <div class="card">
      <div class="macro-summary">
        <div><div class="big">${Math.round(t.kcal)}</div><div class="card-label">/ ${calGoal} kcal</div></div>
        <div><div class="big">${Math.round(t.protein)}</div><div class="card-label">/ ${proGoal}g protein</div></div>
      </div>
      ${progressBar(t.kcal, calGoal, "#ff6b35")}
      <div class="macro-mini">
        <span>🥩 ${Math.round(t.protein)}g P</span>
        <span>🍚 ${Math.round(t.carbs)}g C</span>
        <span>🥑 ${Math.round(t.fat)}g F</span>
      </div>
    </div>

    <div class="card">
      <div class="card-label">Quick add</div>
      <div class="chips">${quick}</div>
    </div>

    <div class="card">
      <div class="card-label">Custom entry</div>
      <input id="f-name" class="input" placeholder="Food name" />
      <div class="macro-inputs">
        <input id="f-kcal" class="input" inputmode="numeric" placeholder="kcal" />
        <input id="f-p" class="input" inputmode="numeric" placeholder="P" />
        <input id="f-c" class="input" inputmode="numeric" placeholder="C" />
        <input id="f-f" class="input" inputmode="numeric" placeholder="F" />
      </div>
      <button id="add-food" class="btn primary block">Add food</button>
    </div>

    <div class="card">
      <div class="card-label">Today's meals</div>
      ${list}
    </div>
  `;
}

function wireFood() {
  $("#add-food")?.addEventListener("click", () => {
    const name = $("#f-name").value.trim();
    const kcal = parseFloat($("#f-kcal").value) || 0;
    let p = parseFloat($("#f-p").value) || 0;
    let c = parseFloat($("#f-c").value) || 0;
    let f = parseFloat($("#f-f").value) || 0;
    if (!name) { toast("Enter a food name"); return; }
    addFood({ name, kcal: kcal || (p*4 + c*4 + f*9), protein: p, carbs: c, fat: f });
  });
  $$("[data-quick]").forEach(b => b.addEventListener("click", () => {
    addFood({ ...QUICK_FOODS[+b.dataset.quick] });
  }));
  $$(".del-food").forEach(b => b.addEventListener("click", () => {
    const key = todayKey();
    state.foodLog[key].splice(+b.dataset.i, 1);
    save(); render();
  }));
}

function addFood(item) {
  const key = todayKey();
  if (!state.foodLog[key]) state.foodLog[key] = [];
  item.time = new Date().toISOString();
  state.foodLog[key].push(item);
  save();
  toast(`Added ${item.name}`);
  render();
}

/* ============================ LIBRARY ==================================== */
function renderLibrary() {
  const groups = {};
  for (const ex of EXERCISES) {
    const g = primaryGroup(ex);
    (groups[g] = groups[g] || []).push(ex);
  }
  const order = ["chest","back","sideDelts","rearDelts","frontDelts","biceps","triceps","quads","hamstrings","glutes","calves","abs"];
  const sections = order.filter(g => groups[g]).map(g => `
    <div class="lib-group">
      <h2 class="lib-h" style="border-color:${MUSCLES[g].color}">${MUSCLES[g].label}</h2>
      ${groups[g].map(ex => `
        <button class="lib-item" data-ex-info="${ex.id}">
          <span>${esc(ex.name)}</span>
          <span class="tag ${ex.type}">${ex.type}</span>
        </button>`).join("")}
    </div>`).join("");

  return `
    <header class="page-head"><h1>Exercise Library</h1>
      <p class="muted">${EXERCISES.length} movements · evidence-based descriptions & cues</p>
    </header>
    <input id="lib-search" class="input" placeholder="🔍 Search exercises…" />
    <div id="lib-list">${sections}</div>
  `;
}

function primaryGroup(ex) {
  const m = ex.primary[0];
  return m === "lats" ? "back" : m;
}

function wireLibrary() {
  $$("[data-ex-info]").forEach(b => b.addEventListener("click", () => showExerciseModal(b.dataset.exInfo)));
  $("#lib-search")?.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    $$(".lib-item").forEach(it => {
      const match = it.textContent.toLowerCase().includes(q);
      it.style.display = match ? "" : "none";
    });
    $$(".lib-group").forEach(g => {
      const anyVisible = $$(".lib-item", g).some(it => it.style.display !== "none");
      g.style.display = anyVisible ? "" : "none";
    });
  });
}

function showExerciseModal(exId) {
  const ex = EXERCISE_BY_ID[exId];
  if (!ex) return;
  const muscles = [...ex.primary, ...(ex.secondary||[])]
    .map(m => MUSCLES[m] ? `<span class="pill" style="background:${MUSCLES[m].color}22;color:${MUSCLES[m].color}">${MUSCLES[m].label}</span>` : "")
    .join("");
  const cues = ex.cues.map(c => `<li>${esc(c)}</li>`).join("");
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal">
      <button class="modal-close">✕</button>
      <h2>${esc(ex.name)}</h2>
      <div class="pills">${muscles}</div>
      <div class="ex-tags">
        <span class="tag ${ex.type}">${ex.type}</span>
        <span class="tag eq">${esc(ex.equipment)}</span>
        <span class="tag rep">${ex.repRange[0]}–${ex.repRange[1]} reps · ${ex.rir} RIR</span>
      </div>
      <p class="ex-desc">${esc(ex.description)}</p>
      <h3>How to do it</h3>
      <ul class="cues">${cues}</ul>
      <div class="nippard-note"><strong>🔬 Science note:</strong> ${esc(ex.nippard)}</div>
    </div>`;
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.classList.contains("modal-close")) modal.remove();
  });
  document.body.appendChild(modal);
}

// Every exercise except the current one is a valid swap target — same-muscle,
// equipment-matched options are just sorted to the top for convenience.
function swapCandidates(exId) {
  const cur = EXERCISE_BY_ID[exId];
  if (!cur) return [];
  const group = primaryGroup(cur);
  const avail = state.programOpts.equipment || [];
  return EXERCISES
    .filter(ex => ex.id !== exId)
    .sort((a, b) => {
      const aGroup = primaryGroup(a) === group ? 0 : 1;
      const bGroup = primaryGroup(b) === group ? 0 : 1;
      if (aGroup !== bGroup) return aGroup - bGroup;
      const aAvail = !avail.length || avail.includes(a.equipment) ? 0 : 1;
      const bAvail = !avail.length || avail.includes(b.equipment) ? 0 : 1;
      if (aAvail !== bAvail) return aAvail - bAvail;
      const aType = a.type === cur.type ? 0 : 1;
      const bType = b.type === cur.type ? 0 : 1;
      if (aType !== bType) return aType - bType;
      return a.name.localeCompare(b.name);
    });
}

function showSwapModal(dayIdx, idx, exId) {
  const cur = EXERCISE_BY_ID[exId];
  const group = primaryGroup(cur);
  const cands = swapCandidates(exId);
  const sameGroup = cands.filter(ex => primaryGroup(ex) === group);
  const others = cands.filter(ex => primaryGroup(ex) !== group);
  const othersByGroup = {};
  others.forEach(ex => { const g = primaryGroup(ex); (othersByGroup[g] = othersByGroup[g] || []).push(ex); });
  const order = ["chest","back","sideDelts","rearDelts","frontDelts","biceps","triceps","quads","hamstrings","glutes","calves","abs"];
  const itemHTML = (ex) => `<button class="lib-item" data-pick="${ex.id}">
      <span>${esc(ex.name)}</span>
      <span class="tag ${ex.type}">${esc(ex.equipment)}</span>
    </button>`;
  const sameGroupHTML = sameGroup.length ? `
    <div class="lib-group">
      <h2 class="lib-h" style="border-color:${MUSCLES[group].color}">Same target: ${MUSCLES[group].label}</h2>
      ${sameGroup.map(itemHTML).join("")}
    </div>` : "";
  const othersHTML = order.filter(g => othersByGroup[g]).map(g => `
    <div class="lib-group">
      <h2 class="lib-h" style="border-color:${MUSCLES[g].color}">${MUSCLES[g].label}</h2>
      ${othersByGroup[g].map(itemHTML).join("")}
    </div>`).join("");

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal">
      <button class="modal-close">✕</button>
      <h2>Swap exercise</h2>
      <p class="muted small">Replacing <strong>${esc(cur.name)}</strong> — swap to any of the ${EXERCISES.length} exercises in the library, not just ${MUSCLES[group].label}.</p>
      <input id="swap-search" class="input" placeholder="🔍 Search all exercises…" />
      <div class="swap-list">${sameGroupHTML}${othersHTML}</div>
    </div>`;
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.classList.contains("modal-close")) { modal.remove(); return; }
    const pick = e.target.closest("[data-pick]");
    if (pick) { applySwap(dayIdx, idx, pick.dataset.pick); modal.remove(); }
  });
  modal.querySelector("#swap-search").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    modal.querySelectorAll(".lib-item").forEach(it => {
      it.style.display = it.textContent.toLowerCase().includes(q) ? "" : "none";
    });
    modal.querySelectorAll(".lib-group").forEach(g => {
      const any = [...g.querySelectorAll(".lib-item")].some(it => it.style.display !== "none");
      g.style.display = any ? "" : "none";
    });
  });
  document.body.appendChild(modal);
}

function applySwap(dayIdx, idx, newId) {
  const ex = EXERCISE_BY_ID[newId];
  if (!ex || !state.program) return;
  const day = state.program.days[dayIdx];
  const old = day.exercises[idx];
  // keep the planned set count; adopt the new movement's rep range & RIR
  day.exercises[idx] = {
    exerciseId: ex.id,
    sets: old ? old.sets : ex.sets,
    repRange: ex.repRange.slice(),
    rir: ex.rir,
  };
  // recompute coverage so the dashboard stays accurate
  state.program.weeklyVolume = computeWeeklyVolume(state.program.days);
  state.program.coverage = assessCoverage(state.program.weeklyVolume, targets());
  save();
  // re-render the workout day
  $("#workout-body").innerHTML = renderWorkoutDay(dayIdx);
  wireWorkoutDay(dayIdx);
  toast(`Swapped to ${ex.name}`);
}

/* ------------------------- plate + warm-up calculator --------------------- */
function barWeight() {
  return state.profile.barWeight || (unit() === "kg" ? 20 : 45);
}
function plateSizes() {
  return unit() === "kg" ? [25, 20, 15, 10, 5, 2.5, 1.25] : [45, 35, 25, 10, 5, 2.5];
}
// Decompose one side of the bar into plates (greedy).
function platesPerSide(target, bar) {
  const perSide = (target - bar) / 2;
  if (perSide <= 0) return { perSide: Math.max(0, perSide), plates: [], leftover: 0 };
  let rem = perSide;
  const plates = [];
  for (const s of plateSizes()) {
    const count = Math.floor(rem / s + 1e-9);
    if (count > 0) { plates.push({ size: s, count }); rem -= count * s; }
  }
  return { perSide, plates, leftover: Math.round(rem * 100) / 100 };
}
// Warm-up ramp toward a working weight.
function warmupSets(work, isBarbell) {
  const bar = barWeight();
  const step = unit() === "kg" ? 2.5 : 5;
  const round = (w) => Math.round(w / step) * step;
  if (!work || work <= 0) return [];
  const raw = [];
  if (isBarbell && work > bar) raw.push({ weight: bar, reps: "8–10", tag: "bar" });
  raw.push({ weight: round(work * 0.5), reps: 5, tag: "50%" });
  raw.push({ weight: round(work * 0.7), reps: 3, tag: "70%" });
  raw.push({ weight: round(work * 0.85), reps: 1, tag: "85%" });
  // keep only sub-working, ascending, de-duplicated weights
  const out = [];
  for (const s of raw) {
    if (s.weight >= work || s.weight <= 0) continue;
    if (out.length && s.weight <= out[out.length - 1].weight) continue;
    out.push(s);
  }
  return out;
}

function calcBodyHTML(ex, weight) {
  const isBarbell = ex.equipment === "Barbell";
  const u = unit();
  let html = "";
  // warm-up ramp
  const warmups = warmupSets(weight, isBarbell);
  if (warmups.length) {
    html += `<h3>Warm-up ramp</h3><div class="calc-table">`;
    warmups.forEach((w, i) => {
      html += `<div class="calc-row"><span class="calc-tag">${w.tag}</span>
        <span class="calc-w">${w.weight} ${u}</span><span class="calc-x">× ${w.reps}</span></div>`;
    });
    html += `<div class="calc-row work"><span class="calc-tag">WORK</span>
      <span class="calc-w">${weight} ${u}</span><span class="calc-x">× your sets</span></div></div>`;
  } else {
    html += `<p class="muted small">Enter a working weight to generate a warm-up ramp.</p>`;
  }
  // plate breakdown
  if (isBarbell && weight) {
    const { plates, leftover, perSide } = platesPerSide(weight, barWeight());
    if (perSide <= 0) {
      html += `<h3>Plates per side</h3><p class="muted small">That's at or below the empty bar (${barWeight()} ${u}).</p>`;
    } else {
      const chips = plates.map(p => `<span class="plate-chip">${p.count} × ${p.size}</span>`).join("");
      html += `<h3>Plates per side <span class="muted small">(bar ${barWeight()} ${u})</span></h3>
        <div class="plate-row">${chips || '<span class="muted">—</span>'}</div>
        <div class="muted small">${perSide} ${u} per side${leftover ? ` · ${leftover} ${u} can't be matched with standard plates` : ""}</div>`;
    }
  } else if (!isBarbell) {
    html += `<p class="muted small">Plate math applies to barbell lifts. For ${esc(ex.equipment.toLowerCase())}, just use the warm-up ramp above.</p>`;
  }
  return html;
}

function showPlateCalc(exId, prefill) {
  const ex = EXERCISE_BY_ID[exId];
  if (!ex) return;
  // fall back to progression suggestion / history for the prefill
  if (prefill == null) {
    const hist = state.exerciseHistory[exId] || [];
    const last = hist[hist.length - 1];
    const sugg = progressionSuggestion(ex, last ? last.sets : null, { jumpMult: jumpMult() });
    prefill = sugg.suggestWeight ?? (last ? Math.max(...last.sets.map(s => s.weight)) : "");
  }
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal">
      <button class="modal-close">✕</button>
      <h2>Plates & warm-up</h2>
      <p class="muted small">${esc(ex.name)}</p>
      <label class="card-label">Working weight (${unit()})</label>
      <input id="calc-weight" class="input" inputmode="decimal" value="${prefill || ""}" placeholder="e.g. 225" />
      <div id="calc-body">${calcBodyHTML(ex, parseFloat(prefill) || 0)}</div>
    </div>`;
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.classList.contains("modal-close")) modal.remove();
  });
  document.body.appendChild(modal);
  const input = modal.querySelector("#calc-weight");
  input.addEventListener("input", () => {
    modal.querySelector("#calc-body").innerHTML = calcBodyHTML(ex, parseFloat(input.value) || 0);
  });
}

/* ------------------------- PR celebrations -------------------------------- */
function celebratePRs(events) {
  try { navigator.vibrate && navigator.vibrate([60, 40, 120]); } catch {}
  launchConfetti();
  const rows = events.map(ev => {
    const ex = EXERCISE_BY_ID[ev.exerciseId];
    const label = ev.type === "e1rm"
      ? `Est. 1RM <strong>${ev.value} ${unit()}</strong> <span class="muted">(${ev.weight}×${ev.reps})</span>`
      : `Top weight <strong>${ev.value} ${unit()}</strong> <span class="muted">(×${ev.reps})</span>`;
    return `<div class="pr-line"><span class="pr-ex">${esc(ex ? ex.name : ev.exerciseId)}</span>${label}</div>`;
  }).join("");
  const modal = document.createElement("div");
  modal.className = "modal-backdrop pr-backdrop";
  modal.innerHTML = `
    <div class="modal pr-modal">
      <div class="pr-trophy">🏆</div>
      <h2>New PR${events.length > 1 ? "s" : ""}!</h2>
      <p class="muted">You beat your best. That's progressive overload. 💪</p>
      <div class="pr-list">${rows}</div>
      <button class="btn primary block pr-go">Let's go 🔥</button>
    </div>`;
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.classList.contains("pr-go")) modal.remove();
  });
  document.body.appendChild(modal);
}

function launchConfetti() {
  const colors = ["#ff6b35", "#ff9f43", "#22b8cf", "#51cf66", "#f783ac", "#fcc419"];
  const wrap = document.createElement("div");
  wrap.className = "confetti";
  for (let i = 0; i < 60; i++) {
    const p = document.createElement("i");
    p.style.left = Math.random() * 100 + "vw";
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = (Math.random() * 0.4) + "s";
    p.style.animationDuration = (1.6 + Math.random() * 1.2) + "s";
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 3200);
}

/* ============================ PROGRESS =================================== */
function renderProgress() {
  const bw = state.bodyweightLog;
  const bwChart = bw.length ? sparkline(bw.map(x => x.weight)) : "";
  const lastBw = bw.length ? bw[bw.length-1].weight : "";

  // top lifts (best e1RM-ish: heaviest weight logged per big lift)
  const prRows = ["barbell-bench","barbell-squat","romanian-deadlift","overhead-press","weighted-pullup","barbell-row"]
    .map(id => {
      const ex = EXERCISE_BY_ID[id];
      const hist = state.exerciseHistory[id] || [];
      if (!hist.length) return `<div class="vol-row"><span class="vol-label">${esc(ex.name)}</span><span class="muted">—</span></div>`;
      let best = 0, bestReps = 0;
      hist.forEach(h => h.sets.forEach(s => {
        const e1rm = s.weight * (1 + s.reps/30); // Epley estimate
        if (e1rm > best) { best = e1rm; bestReps = s.reps; }
      }));
      return `<div class="vol-row"><span class="vol-label">${esc(ex.name)}</span>
        <span class="vol-num">~${Math.round(best)} ${unit()} e1RM</span></div>`;
    }).join("");

  const sessionsList = state.sessions.slice().reverse().slice(0, 12).map(s => `
    <div class="food-item">
      <div><div class="food-name">${esc(s.dayName)}</div>
        <div class="muted small">${s.entries.length} exercises · ${s.entries.reduce((a,e)=>a+e.sets.length,0)} sets</div></div>
      <div class="muted small">${fmtDate(s.date)}</div>
    </div>`).join("") || `<p class="muted center">No workouts logged yet.</p>`;

  return `
    <header class="page-head"><h1>Progress</h1></header>

    <div class="card">
      <div class="card-label">Bodyweight (${unit()})</div>
      <div class="big">${lastBw || "—"}</div>
      ${bwChart}
      <div class="macro-inputs" style="margin-top:10px">
        <input id="bw-input" class="input" inputmode="decimal" placeholder="Log today's weight" />
        <button id="bw-add" class="btn primary">Log</button>
      </div>
    </div>

    <div class="card">
      <div class="card-label">Body measurements (${unit() === "kg" ? "cm" : "in"})</div>
      ${renderMeasurements()}
      <div class="macro-inputs" style="margin-top:10px">
        <input id="m-chest" class="input" inputmode="decimal" placeholder="Chest" />
        <input id="m-arms" class="input" inputmode="decimal" placeholder="Arms" />
        <input id="m-waist" class="input" inputmode="decimal" placeholder="Waist" />
        <input id="m-thighs" class="input" inputmode="decimal" placeholder="Thighs" />
      </div>
      <button id="m-save" class="btn primary block">Log measurements</button>
    </div>

    <div class="card">
      <div class="card-label">Estimated strength (top sets)</div>
      ${prRows}
    </div>

    <div class="card">
      <div class="card-label">PR history 🏆</div>
      ${(state.prLog && state.prLog.length)
        ? state.prLog.slice().reverse().slice(0, 15).map(prLineHTML).join("")
        : '<p class="muted center">No PRs yet — beat a logged set to set one!</p>'}
    </div>

    <div class="card">
      <div class="card-label">Recent cardio</div>
      ${renderCardioHistory()}
    </div>

    ${state.program ? renderVolumeSnapshot() : ""}

    <div class="card">
      <div class="card-label">Recent workouts</div>
      ${sessionsList}
    </div>
  `;
}

function renderMeasurements() {
  const m = state.measurements;
  if (!m.length) return `<div class="muted small">No measurements yet. Log your first set below to start tracking.</div>`;
  const last = m[m.length - 1];
  const prev = m.length > 1 ? m[m.length - 2] : null;
  const cell = (label, key) => {
    const v = last[key]; if (v == null) return "";
    let delta = "";
    if (prev && prev[key] != null) {
      const d = (v - prev[key]).toFixed(1);
      if (+d !== 0) delta = `<span class="${+d>0?"up":"down"}">${+d>0?"+":""}${d}</span>`;
    }
    return `<div class="meas-cell"><div class="meas-val">${v}${delta}</div><div class="card-label">${label}</div></div>`;
  };
  return `<div class="meas-grid">
    ${cell("Chest","chest")}${cell("Arms","arms")}${cell("Waist","waist")}${cell("Thighs","thighs")}
  </div><div class="muted small">Last: ${fmtDate(last.date)}</div>`;
}

function renderCardioHistory() {
  if (!state.cardioLog.length) return `<p class="muted center">No cardio logged yet.</p>`;
  return state.cardioLog.slice().reverse().slice(0, 8).map(c => `
    <div class="food-item">
      <div><div class="food-name">${esc(c.type)}</div>
        <div class="muted small">${c.minutes||0} min${c.kcal?` · ${c.kcal} kcal`:""}</div></div>
      <div class="muted small">${fmtDate(c.date)}</div>
    </div>`).join("");
}

function wireProgress() {
  $("#bw-add")?.addEventListener("click", () => {
    const v = parseFloat($("#bw-input").value);
    if (isNaN(v)) { toast("Enter a number"); return; }
    state.bodyweightLog.push({ date: new Date().toISOString(), weight: v });
    state.profile.bodyweight = v;
    save(); render(); toast("Logged ✔");
  });
  $("#m-save")?.addEventListener("click", () => {
    const entry = { date: new Date().toISOString() };
    let any = false;
    [["chest","#m-chest"],["arms","#m-arms"],["waist","#m-waist"],["thighs","#m-thighs"]].forEach(([k, sel]) => {
      const v = parseFloat($(sel).value); if (!isNaN(v)) { entry[k] = v; any = true; }
    });
    if (!any) { toast("Enter at least one measurement"); return; }
    state.measurements.push(entry); save(); render(); toast("Measurements logged ✔");
  });
}

/* ============================ SETTINGS =================================== */
function renderSettings() {
  const p = state.profile;
  const o = state.programOpts;
  const splitOptions = Object.entries(SPLITS).map(([k, s]) =>
    `<option value="${k}" ${o.split === k ? "selected" : ""}>${esc(s.name)}</option>`).join("");
  const equipList = ["Barbell","Dumbbells","Machine","Cable","Bodyweight"];
  const equipChecks = equipList.map(eq =>
    `<label class="check"><input type="checkbox" class="equip" value="${eq}" ${(!o.equipment.length || o.equipment.includes(eq)) ? "checked":""}/> ${eq}</label>`).join("");

  return `
    <header class="page-head"><h1>Setup</h1></header>

    <div class="card">
      <div class="card-label">Profile</div>
      <input id="s-name" class="input" placeholder="Name" value="${esc(p.name||"")}" />
      <div class="macro-inputs">
        <input id="s-bw" class="input" inputmode="decimal" placeholder="Bodyweight" value="${p.bodyweight||""}" />
        <select id="s-unit" class="select">
          <option value="lb" ${p.unit==="lb"?"selected":""}>lb / inches</option>
          <option value="kg" ${p.unit==="kg"?"selected":""}>kg / cm</option>
        </select>
      </div>
      ${p.unit === "kg" ? `
      <input id="s-ht-cm" class="input" inputmode="numeric" placeholder="Height (cm)" value="${p.heightIn ? Math.round(p.heightIn*2.54) : ""}" />
      ` : `
      <div class="macro-inputs">
        <input id="s-ht-ft" class="input" inputmode="numeric" placeholder="Height (ft)" value="${p.heightIn ? Math.floor(p.heightIn/12) : ""}" />
        <input id="s-ht-in" class="input" inputmode="numeric" placeholder="Height (in)" value="${p.heightIn ? p.heightIn%12 : ""}" />
      </div>`}
      <select id="s-goal" class="select block">
        <option value="gain" ${p.goal==="gain"?"selected":""}>Goal: Build muscle (surplus)</option>
        <option value="maintain" ${p.goal==="maintain"?"selected":""}>Goal: Maintain / recomp</option>
        <option value="cut" ${p.goal==="cut"?"selected":""}>Goal: Lose fat (deficit)</option>
      </select>
      <select id="s-exp" class="select block">
        <option value="beginner" ${p.experience==="beginner"?"selected":""}>Experience: Beginner (lower volume, bigger jumps)</option>
        <option value="intermediate" ${p.experience==="intermediate"?"selected":""}>Experience: Intermediate</option>
        <option value="advanced" ${p.experience==="advanced"?"selected":""}>Experience: Advanced (higher volume, micro-jumps)</option>
      </select>
      <div class="macro-inputs">
        <input id="s-cal" class="input" inputmode="numeric" placeholder="Calorie goal (auto)" value="${p.calorieGoal||""}" />
        <input id="s-pro" class="input" inputmode="numeric" placeholder="Protein g (auto)" value="${p.proteinGoal||""}" />
      </div>
      <div class="macro-inputs">
        <input id="s-water" class="input" inputmode="numeric" placeholder="Water goal (oz)" value="${p.waterGoal||""}" />
        <input id="s-steps" class="input" inputmode="numeric" placeholder="Step goal" value="${p.stepGoal||""}" />
      </div>
      <input id="s-bar" class="input" inputmode="decimal" placeholder="Barbell weight (default ${p.unit==='kg'?'20kg':'45lb'})" value="${p.barWeight||""}" />
      <button id="save-profile" class="btn primary block">Save profile</button>
    </div>

    <div class="card">
      <div class="card-label">Your program</div>
      ${state.program ? `
        <div class="big" style="font-size:1.3rem">${esc(state.program.splitName)}</div>
        <p class="muted small">${state.program.days.length} day${state.program.days.length===1?"":"s"} · ${o.custom ? "built by you" : "auto-generated"}</p>
      ` : `<p class="muted">No program yet — generate one below, or build your own.</p>`}
      <button id="open-builder" class="btn primary block">✏️ ${state.program ? "Edit in Program Builder" : "Build your own program"}</button>
    </div>

    <div class="card">
      <div class="card-label">Auto-generate program</div>
      <select id="s-split" class="select block">${splitOptions}</select>
      <p class="muted small" id="split-blurb">${esc((SPLITS[o.split] || SPLITS.ppl6).blurb)}</p>
      <div class="card-label">Available equipment</div>
      <div class="checks">${equipChecks}</div>
      <button id="gen-program" class="btn primary block lg">⚡ Generate balanced program</button>
      ${state.program ? `<button id="regen-program" class="btn block">🔄 Re-roll exercises (keep split)</button>` : ""}
      ${state.program ? renderCoverageReport() : ""}
    </div>

    <div class="card">
      <div class="card-label">Data</div>
      <button id="export-data" class="btn block">⬇ Export my data (JSON)</button>
      <button id="import-data" class="btn block">⬆ Import data</button>
      <input id="import-file" type="file" accept="application/json" hidden />
      <button id="reset-data" class="btn block danger">⚠ Reset everything</button>
    </div>

    <div class="card">
      <div class="card-label">App</div>
      <button id="switch-mode" class="btn block">🔀 Switch app (Fitness / Finance)</button>
    </div>

    <div class="card">
      <div class="card-label">About</div>
      <p class="muted small">Monster Mode is a private, offline dashboard. Training principles draw on Jeff Nippard's evidence-based hypertrophy work (volume, frequency, stretch, progressive overload) and TNF / Joel Twinem's simple, sustainable, progressable natural-lifting approach. Add it to your home screen for an app-like shortcut.</p>
    </div>
  `;
}

function renderCoverageReport() {
  const cov = state.program.coverage;
  const rows = Object.entries(cov).map(([m, c]) => {
    const icon = c.status === "good" ? "✅" : c.status === "low" ? "⚠️" : "🔼";
    return `<div class="vol-row"><span class="vol-label">${icon} ${MUSCLES[m].label}</span>
      <span class="vol-num">${c.sets} sets/wk <span class="muted">(${c.min}-${c.max})</span></span></div>`;
  }).join("");
  const lows = Object.values(cov).filter(c => c.status === "low").length;
  const note = lows === 0
    ? `<div class="suggestion">✅ Every muscle group is inside its weekly target range. Balanced!</div>`
    : `<div class="suggestion suggestion-add-reps">⚠️ ${lows} muscle(s) below target — re-roll, switch to a higher-frequency split, or the lighter muscles will catch up across the week's sessions.</div>`;
  return `<div class="coverage"><div class="card-label">Planned weekly coverage</div>${rows}${note}</div>`;
}

function wireSettings() {
  $("#save-profile")?.addEventListener("click", () => {
    state.profile.name = $("#s-name").value.trim();
    state.profile.bodyweight = parseFloat($("#s-bw").value) || null;
    state.profile.unit = $("#s-unit").value;
    if (state.profile.unit === "kg") {
      const cm = parseFloat($("#s-ht-cm")?.value);
      state.profile.heightIn = isNaN(cm) ? state.profile.heightIn : Math.round(cm / 2.54);
    } else {
      const ft = parseInt($("#s-ht-ft")?.value, 10) || 0;
      const inch = parseInt($("#s-ht-in")?.value, 10) || 0;
      state.profile.heightIn = (ft || inch) ? ft * 12 + inch : state.profile.heightIn;
    }
    state.profile.goal = $("#s-goal").value;
    state.profile.experience = $("#s-exp").value;
    state.profile.calorieGoal = parseInt($("#s-cal").value) || null;
    state.profile.proteinGoal = parseInt($("#s-pro").value) || null;
    state.profile.waterGoal = parseInt($("#s-water").value) || 120;
    state.profile.stepGoal = parseInt($("#s-steps").value) || 10000;
    state.profile.barWeight = parseFloat($("#s-bar").value) || null;
    save(); toast("Profile saved ✔");
  });
  $("#s-split")?.addEventListener("change", (e) => {
    $("#split-blurb").textContent = SPLITS[e.target.value].blurb;
  });
  $("#gen-program")?.addEventListener("click", () => doGenerate());
  $("#regen-program")?.addEventListener("click", () => doGenerate());

  $("#export-data")?.addEventListener("click", exportData);
  $("#import-data")?.addEventListener("click", () => $("#import-file").click());
  $("#import-file")?.addEventListener("change", importData);
  $("#reset-data")?.addEventListener("click", () => {
    if (confirm("Reset ALL data? This cannot be undone.")) {
      state = structuredClone(DEFAULT_STATE); save(); render(); toast("Reset complete");
    }
  });
  $("#switch-mode")?.addEventListener("click", switchMode);
  $("#open-builder")?.addEventListener("click", openProgramBuilder);
}

function doGenerate() {
  const split = $("#s-split").value;
  const equipment = $$(".equip:checked").map(c => c.value);
  state.programOpts = { split, equipment, custom: false };
  state.program = generateProgram({ split, equipment, targets: targets() });
  save(); render();
  toast("Program generated! 💪");
}

/* ============================ PROGRAM BUILDER ============================= */
// A working draft, separate from state.program until explicitly saved, so
// in-progress edits never clobber the active program if the user backs out.
let programDraft = null;

function openProgramBuilder() {
  programDraft = state.program
    ? { splitName: state.program.splitName, days: structuredClone(state.program.days) }
    : { splitName: "My Program", days: [] };
  navigate("builder");
}

function renderBuilder() {
  if (!programDraft) {
    programDraft = state.program
      ? { splitName: state.program.splitName, days: structuredClone(state.program.days) }
      : { splitName: "My Program", days: [] };
  }
  const daysHTML = programDraft.days.map((day, di) => `
    <div class="card builder-day">
      <div class="builder-day-head">
        <input class="input builder-day-name" data-day-name="${di}" value="${esc(day.name)}" placeholder="Day name" />
        <button class="icon-btn danger" data-del-day="${di}" title="Delete day">🗑</button>
      </div>
      <div class="builder-ex-list">
        ${day.exercises.map((item, ei) => {
          const ex = EXERCISE_BY_ID[item.exerciseId];
          const group = ex ? primaryGroup(ex) : null;
          return `<div class="builder-ex-row">
            <div class="builder-ex-info">
              <div class="bill-name">${ex ? esc(ex.name) : item.exerciseId}</div>
              <div class="muted small">${group ? MUSCLES[group].label : ""}</div>
            </div>
            <input class="builder-num" data-field="sets" data-day="${di}" data-ex-idx="${ei}" inputmode="numeric" value="${item.sets}" title="Sets" />
            <input class="builder-num" data-field="repLo" data-day="${di}" data-ex-idx="${ei}" inputmode="numeric" value="${item.repRange[0]}" title="Rep min" />
            <span class="muted">–</span>
            <input class="builder-num" data-field="repHi" data-day="${di}" data-ex-idx="${ei}" inputmode="numeric" value="${item.repRange[1]}" title="Rep max" />
            <button class="icon-btn danger" data-del-ex="${di}:${ei}" title="Remove">✕</button>
          </div>`;
        }).join("") || '<p class="muted small">No exercises yet — add one below.</p>'}
      </div>
      <button class="btn small" data-add-ex="${di}">+ Add exercise</button>
    </div>`).join("");

  return `
    <header class="page-head"><h1>Program Builder</h1>
      <p class="muted">Pick any exercise for any day — full control.</p>
    </header>
    <div class="card">
      <div class="card-label">Program name</div>
      <input id="builder-name" class="input" value="${esc(programDraft.splitName)}" />
    </div>
    ${daysHTML}
    <button id="add-day" class="btn block">+ Add day</button>
    <button id="save-builder" class="btn primary block lg">💾 Save program</button>
    <button id="cancel-builder" class="btn block">Cancel</button>
  `;
}

function wireBuilder() {
  $("#builder-name")?.addEventListener("change", (e) => {
    programDraft.splitName = e.target.value.trim() || "My Program";
  });
  $("#add-day")?.addEventListener("click", () => {
    programDraft.days.push({ name: `Day ${programDraft.days.length + 1}`, exercises: [] });
    render();
  });
  $$("[data-del-day]").forEach(b => b.addEventListener("click", () => {
    if (confirm("Delete this day and its exercises?")) {
      programDraft.days.splice(+b.dataset.delDay, 1);
      render();
    }
  }));
  $$("[data-day-name]").forEach(inp => inp.addEventListener("change", () => {
    programDraft.days[+inp.dataset.dayName].name = inp.value.trim() || "Day";
  }));
  $$("[data-add-ex]").forEach(b => b.addEventListener("click", () => showExercisePicker(+b.dataset.addEx)));
  $$("[data-del-ex]").forEach(b => b.addEventListener("click", () => {
    const [di, ei] = b.dataset.delEx.split(":").map(Number);
    programDraft.days[di].exercises.splice(ei, 1);
    render();
  }));
  $$(".builder-num").forEach(inp => inp.addEventListener("change", () => {
    const di = +inp.dataset.day, ei = +inp.dataset.exIdx, field = inp.dataset.field;
    const item = programDraft.days[di]?.exercises[ei];
    if (!item) return;
    const v = parseInt(inp.value, 10);
    if (isNaN(v) || v <= 0) { render(); return; } // snap back to the last valid value
    if (field === "sets") item.sets = v;
    else if (field === "repLo") item.repRange[0] = v;
    else if (field === "repHi") item.repRange[1] = v;
  }));
  $("#save-builder")?.addEventListener("click", saveBuilderProgram);
  $("#cancel-builder")?.addEventListener("click", () => { programDraft = null; navigate("settings"); });
}

// Full-library exercise picker for the builder — search + browse by muscle,
// with zero restriction on which muscle group can go on which day.
function showExercisePicker(dayIdx) {
  const groups = {};
  for (const ex of EXERCISES) { const g = primaryGroup(ex); (groups[g] = groups[g] || []).push(ex); }
  const order = ["chest","back","sideDelts","rearDelts","frontDelts","biceps","triceps","quads","hamstrings","glutes","calves","abs"];
  const sections = order.filter(g => groups[g]).map(g => `
    <div class="lib-group">
      <h2 class="lib-h" style="border-color:${MUSCLES[g].color}">${MUSCLES[g].label}</h2>
      ${groups[g].map(ex => `<button class="lib-item" data-pick-ex="${ex.id}">
        <span>${esc(ex.name)}</span><span class="tag ${ex.type}">${esc(ex.equipment)}</span>
      </button>`).join("")}
    </div>`).join("");

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal">
      <button class="modal-close">✕</button>
      <h2>Add exercise</h2>
      <p class="muted small">Any exercise can go on any day — search or browse all ${EXERCISES.length}.</p>
      <input id="picker-search" class="input" placeholder="🔍 Search all exercises…" />
      <div id="picker-list">${sections}</div>
    </div>`;
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.classList.contains("modal-close")) { modal.remove(); return; }
    const pick = e.target.closest("[data-pick-ex]");
    if (pick) {
      const ex = EXERCISE_BY_ID[pick.dataset.pickEx];
      programDraft.days[dayIdx].exercises.push({
        exerciseId: ex.id, sets: ex.sets, repRange: ex.repRange.slice(), rir: ex.rir,
      });
      modal.remove();
      render();
    }
  });
  modal.querySelector("#picker-search").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    modal.querySelectorAll(".lib-item").forEach(it => {
      it.style.display = it.textContent.toLowerCase().includes(q) ? "" : "none";
    });
    modal.querySelectorAll(".lib-group").forEach(g => {
      const any = [...g.querySelectorAll(".lib-item")].some(it => it.style.display !== "none");
      g.style.display = any ? "" : "none";
    });
  });
  document.body.appendChild(modal);
}

function saveBuilderProgram() {
  const cleanDays = programDraft.days.filter(d => d.exercises.length);
  if (!cleanDays.length) { toast("Add at least one exercise to a day first"); return; }
  const weeklyVolume = computeWeeklyVolume(cleanDays);
  state.program = {
    splitKey: "custom",
    splitName: programDraft.splitName || "My Program",
    blurb: "Custom program you built yourself.",
    days: cleanDays,
    weeklyVolume,
    coverage: assessCoverage(weeklyVolume, targets()),
    generatedAt: new Date().toISOString(),
  };
  state.programOpts = { split: "custom", equipment: state.programOpts.equipment || [], custom: true };
  programDraft = null;
  save();
  toast("Program saved ✔");
  navigate("settings");
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `monster-mode-${todayKey()}.json`; a.click();
  URL.revokeObjectURL(url);
}
function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = mergeDefaults(structuredClone(DEFAULT_STATE), JSON.parse(reader.result));
      save(); render(); toast("Data imported ✔");
    } catch { toast("Invalid file"); }
  };
  reader.readAsText(file);
}

/* ============================ FINANCE ===================================== */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function financeCurrency() { return state.finance.currency || "$"; }
function fmtMoneyShort(n) {
  const sign = n < 0 ? "-" : "";
  return `${sign}${financeCurrency()}${Math.round(Math.abs(n || 0)).toLocaleString()}`;
}
function allExpenseCategories() {
  return [...EXPENSE_CATEGORIES, ...state.finance.customCategories.filter(c => c.type === "expense")];
}
function allIncomeCategories() {
  return [...INCOME_CATEGORIES, ...state.finance.customCategories.filter(c => c.type === "income")];
}
function expenseCatById(id) { return allExpenseCategories().find(c => c.id === id) || { id, name: id, icon: "📦" }; }
function incomeCatById(id) { return allIncomeCategories().find(c => c.id === id) || { id, name: id, icon: "➕" }; }
function catById(t) { return t.type === "income" ? incomeCatById(t.category) : expenseCatById(t.category); }

/* ---- aggregation ---- */
function fixedMonthlyTotal() {
  return state.finance.fixedExpenses.filter(b => b.active !== false).reduce((a, b) => a + b.amount, 0);
}
function transactionsInMonth(key) {
  return state.finance.transactions.filter(t => monthKey(t.date) === key);
}
function monthTotals(key) {
  const txns = transactionsInMonth(key);
  let income = 0, variable = 0, fixedPaid = 0;
  txns.forEach(t => {
    if (t.type === "income") income += t.amount;
    else if (t.source === "fixed") fixedPaid += t.amount;
    else variable += t.amount;
  });
  const fixedExpected = fixedMonthlyTotal();
  return { income, variable, fixedPaid, fixedExpected, net: income - variable - fixedExpected };
}
function categorySpend(key, categoryId, sourceFilter) {
  return transactionsInMonth(key)
    .filter(t => t.type === "expense" && t.category === categoryId && (!sourceFilter || t.source === sourceFilter))
    .reduce((a, t) => a + t.amount, 0);
}
// Rolling average variable spend for a category, over months that actually
// have logged activity (avoids diluting the average with pre-tracking months).
function categoryAverage(categoryId, months) {
  const keys = lastNMonthKeys(months || 3);
  const activeKeys = keys.filter(k => transactionsInMonth(k).length > 0);
  if (!activeKeys.length) return 0;
  const sum = activeKeys.reduce((a, k) => a + categorySpend(k, categoryId, "variable"), 0);
  return sum / activeKeys.length;
}
function budgetStatus(categoryId, key) {
  const target = state.finance.budgets[categoryId];
  const spent = categorySpend(key || currentMonthKey(), categoryId, "variable");
  if (!target) return { spent, target: null, pct: null, status: "none" };
  const pct = Math.round((spent / target) * 100);
  const status = pct >= 100 ? "over" : pct >= 80 ? "warn" : "good";
  return { spent, target, pct, status };
}

/* ---- bills ---- */
function billPaidThisMonth(billId, key) {
  return transactionsInMonth(key || currentMonthKey()).some(t => t.fixedBillId === billId);
}
function toggleBillPaid(billId) {
  const bill = state.finance.fixedExpenses.find(b => b.id === billId);
  if (!bill) return;
  const key = currentMonthKey();
  const existing = state.finance.transactions.find(t => t.fixedBillId === billId && monthKey(t.date) === key);
  if (existing) {
    state.finance.transactions = state.finance.transactions.filter(t => t !== existing);
  } else {
    state.finance.transactions.push({
      id: uid(), date: new Date().toISOString(), amount: bill.amount, category: bill.category,
      note: bill.name, type: "expense", source: "fixed", fixedBillId: bill.id,
    });
  }
  save();
}
function addFixedBill({ name, amount, category, dueDay }) {
  state.finance.fixedExpenses.push({ id: uid(), name, amount, category, dueDay: dueDay || 1, active: true });
  save();
}
function updateFixedBill(id, patch) {
  const b = state.finance.fixedExpenses.find(x => x.id === id);
  if (b) Object.assign(b, patch);
  save();
}
function deleteFixedBill(id) {
  state.finance.fixedExpenses = state.finance.fixedExpenses.filter(b => b.id !== id);
  save();
}

/* ---- transactions & categories ---- */
function addTransaction({ type, amount, category, note, date }) {
  state.finance.transactions.push({
    id: uid(), date: date || new Date().toISOString(), amount, category, note: note || "",
    type, source: type === "income" ? "income" : "variable",
  });
  save();
}
function deleteTransaction(id) {
  state.finance.transactions = state.finance.transactions.filter(t => t.id !== id);
  save();
}
function addCustomCategory(name, type, icon) {
  const id = "custom_" + uid();
  state.finance.customCategories.push({ id, name, icon: icon || (type === "income" ? "➕" : "📦"), type });
  save();
  return id;
}

function txnLineHTML(t, deletable) {
  const cat = catById(t);
  const sign = t.type === "income" ? "+" : "−";
  const color = t.type === "income" ? "#51cf66" : (t.source === "fixed" ? "#8a9bb0" : "#ff8787");
  const delBtn = deletable && t.source !== "fixed"
    ? `<button class="del-food" data-del-txn="${t.id}">✕</button>` : "";
  return `<div class="food-item">
    <div><div class="food-name">${cat.icon} ${esc(t.note || cat.name)}</div>
      <div class="muted small">${esc(cat.name)}${t.source === "fixed" ? " · fixed" : ""}</div></div>
    <div class="fin-txn-right">
      <div class="fin-txn-stack">
        <div class="fin-txn-amt" style="color:${color}">${sign}${fmtMoneyShort(t.amount)}</div>
        <div class="muted small">${fmtDate(t.date)}</div>
      </div>
      ${delBtn}
    </div>
  </div>`;
}

/* ---- Finance: Home ---- */
function renderFinHome() {
  const key = currentMonthKey();
  const t = monthTotals(key);
  const netClass = t.net >= 0 ? "pos" : "neg";
  const bills = state.finance.fixedExpenses.filter(b => b.active !== false);
  const paidCount = bills.filter(b => billPaidThisMonth(b.id, key)).length;
  const overBudget = allExpenseCategories()
    .map(c => ({ c, bs: budgetStatus(c.id, key) }))
    .filter(x => x.bs.target && x.bs.status === "over");
  const recent = state.finance.transactions.slice().reverse().slice(0, 5);

  return `
    <header class="page-head">
      <h1>Finance</h1>
      <p class="muted">${fmtMonth(key)}</p>
    </header>

    <div class="card accent fin-net-card">
      <div class="card-label">Net cash flow this month</div>
      <div class="big fin-net ${netClass}">${t.net >= 0 ? "+" : "−"}${financeCurrency()}${Math.abs(Math.round(t.net)).toLocaleString()}</div>
      <div class="fin-breakdown">
        <span>💼 ${fmtMoneyShort(t.income)} income</span>
        <span>📅 ${fmtMoneyShort(t.fixedExpected)} fixed</span>
        <span>🛒 ${fmtMoneyShort(t.variable)} variable</span>
      </div>
    </div>

    <div class="grid-2">
      <button class="card center" data-nav="fin-log">
        <div class="big">➕</div>
        <div class="card-label">Log expense / income</div>
      </button>
      <button class="card center" data-nav="fin-bills">
        <div class="big">${paidCount}/${bills.length}</div>
        <div class="card-label">Bills paid this month</div>
      </button>
    </div>

    ${overBudget.length ? `
    <div class="card">
      <div class="card-label">⚠️ Over budget</div>
      ${overBudget.map(x => `<div class="vol-row"><span class="vol-label">${x.c.icon} ${esc(x.c.name)}</span>
        <span class="vol-num" style="color:#ff8787">${fmtMoneyShort(x.bs.spent)} / ${fmtMoneyShort(x.bs.target)}</span></div>`).join("")}
    </div>` : `
    <div class="card"><div class="suggestion">✅ No categories over budget this month.</div></div>`}

    ${renderGoalsTeaser()}

    <div class="card">
      <div class="card-label">Recent transactions</div>
      ${recent.length ? recent.map(t => txnLineHTML(t, false)).join("") : '<p class="muted center">Nothing logged yet — tap "Log expense / income" above.</p>'}
    </div>
  `;
}
function wireFinHome() {
  $$("[data-nav]").forEach(b => b.addEventListener("click", () => navigate(b.dataset.nav)));
}

// Quick-glance card for the soonest active goal (by target date, else most recent).
function renderGoalsTeaser() {
  const active = (state.finance.goals || []).filter(g => !g.achieved);
  if (!active.length) return "";
  const next = active.slice().sort((a, b) => {
    if (a.targetDate && b.targetDate) return new Date(a.targetDate) - new Date(b.targetDate);
    return a.targetDate ? -1 : b.targetDate ? 1 : 0;
  })[0];
  const current = goalCurrent(next.id);
  const pct = Math.min(100, (current / next.target) * 100);
  return `<button class="card" data-nav="fin-goals">
    <div class="card-label">${next.kind === "sinking" ? "🧩 Sinking fund" : "🐷 Savings goal"} · ${esc(next.name)}</div>
    <div class="bar"><div class="bar-fill" style="width:${pct}%;background:#51cf66"></div></div>
    <div class="muted small">${fmtMoneyShort(current)} / ${fmtMoneyShort(next.target)}${active.length > 1 ? ` · +${active.length - 1} more goal${active.length > 2 ? "s" : ""}` : ""}</div>
  </button>`;
}

/* ---- Finance: Log ---- */
function renderFinLog() {
  const key = currentMonthKey();
  const txns = transactionsInMonth(key).slice().reverse();
  const expCats = allExpenseCategories();

  return `
    <header class="page-head"><h1>Log</h1><p class="muted">${fmtMonth(key)}</p></header>

    <div class="card">
      <div class="fin-type-toggle">
        <button class="fin-type-btn active" data-type="expense">➖ Expense</button>
        <button class="fin-type-btn" data-type="income">➕ Income</button>
      </div>
      <input id="fin-amount" class="input" inputmode="decimal" placeholder="Amount (${financeCurrency()})" />
      <select id="fin-category" class="select block">${expCats.map(c => `<option value="${c.id}">${c.icon} ${esc(c.name)}</option>`).join("")}</select>
      <input id="fin-note" class="input" placeholder="Note (optional)" />
      <input id="fin-date" class="input" type="date" value="${todayKey()}" />
      <button id="fin-add" class="btn primary block">Add</button>
    </div>

    <div class="card">
      <div class="card-label">This month's transactions</div>
      ${txns.length ? txns.map(t => txnLineHTML(t, true)).join("") : '<p class="muted center">No transactions this month yet.</p>'}
    </div>
  `;
}
function wireFinLog() {
  let curType = "expense";
  const typeBtns = $$(".fin-type-btn");
  const catSelect = $("#fin-category");
  typeBtns.forEach(b => b.addEventListener("click", () => {
    curType = b.dataset.type;
    typeBtns.forEach(x => x.classList.toggle("active", x === b));
    const cats = curType === "income" ? allIncomeCategories() : allExpenseCategories();
    catSelect.innerHTML = cats.map(c => `<option value="${c.id}">${c.icon} ${esc(c.name)}</option>`).join("");
  }));
  $("#fin-add")?.addEventListener("click", () => {
    const amount = parseFloat($("#fin-amount").value);
    if (isNaN(amount) || amount <= 0) { toast("Enter a valid amount"); return; }
    const category = catSelect.value;
    const note = $("#fin-note").value.trim();
    const dateVal = $("#fin-date").value || todayKey();
    addTransaction({ type: curType, amount, category, note, date: new Date(dateVal + "T12:00:00").toISOString() });
    toast(`${curType === "income" ? "Income" : "Expense"} logged ✔`);
    render();
  });
  $$("[data-del-txn]").forEach(b => b.addEventListener("click", () => {
    deleteTransaction(b.dataset.delTxn); render(); toast("Deleted");
  }));
}

/* ---- Finance: Bills ---- */
function renderFinBills() {
  const bills = state.finance.fixedExpenses;
  const key = currentMonthKey();
  const total = fixedMonthlyTotal();
  const expCats = allExpenseCategories();

  const rows = bills.length ? bills.slice().sort((a, b) => a.dueDay - b.dueDay).map(b => {
    const cat = expenseCatById(b.category);
    const paid = billPaidThisMonth(b.id, key);
    return `<div class="bill-row ${paid ? "paid" : ""}">
      <button class="bill-check" data-toggle-bill="${b.id}">${paid ? "✓" : ""}</button>
      <div class="bill-info">
        <div class="bill-name">${cat.icon} ${esc(b.name)}</div>
        <div class="muted small">${esc(cat.name)} · due day ${b.dueDay}${b.active === false ? " · inactive" : ""}</div>
      </div>
      <div class="bill-amt">${fmtMoneyShort(b.amount)}</div>
      <button class="icon-btn" data-edit-bill="${b.id}">✎</button>
    </div>`;
  }).join("") : `<p class="muted center">No fixed bills yet. Add your rent, subscriptions, insurance, etc. below — you set them up once and they auto-count every month.</p>`;

  return `
    <header class="page-head"><h1>Bills</h1><p class="muted">${fmtMonth(key)} · fixed total ${fmtMoneyShort(total)}/mo</p></header>

    <div class="card">
      <div class="card-label">This month's bills</div>
      ${rows}
    </div>

    <div class="card">
      <div class="card-label">Add a fixed bill</div>
      <input id="bill-name" class="input" placeholder="Name (e.g. Rent, Netflix)" />
      <div class="macro-inputs">
        <input id="bill-amount" class="input" inputmode="decimal" placeholder="Amount (${financeCurrency()})" />
        <input id="bill-day" class="input" inputmode="numeric" placeholder="Due day (1–31)" />
      </div>
      <select id="bill-category" class="select block">${expCats.map(c => `<option value="${c.id}">${c.icon} ${esc(c.name)}</option>`).join("")}</select>
      <button id="bill-add" class="btn primary block">Add bill</button>
    </div>
  `;
}
function wireFinBills() {
  $("#bill-add")?.addEventListener("click", () => {
    const name = $("#bill-name").value.trim();
    const amount = parseFloat($("#bill-amount").value);
    const dueDay = Math.min(31, Math.max(1, parseInt($("#bill-day").value, 10) || 1));
    const category = $("#bill-category").value;
    if (!name || isNaN(amount) || amount <= 0) { toast("Enter a name and amount"); return; }
    addFixedBill({ name, amount, category, dueDay });
    render(); toast("Bill added ✔");
  });
  $$("[data-toggle-bill]").forEach(b => b.addEventListener("click", () => {
    toggleBillPaid(b.dataset.toggleBill); render();
  }));
  $$("[data-edit-bill]").forEach(b => b.addEventListener("click", () => {
    const bill = state.finance.fixedExpenses.find(x => x.id === b.dataset.editBill);
    if (bill) showBillEditModal(bill);
  }));
}
function showBillEditModal(bill) {
  const expCats = allExpenseCategories();
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal">
      <button class="modal-close">✕</button>
      <h2>Edit bill</h2>
      <input id="eb-name" class="input" value="${esc(bill.name)}" />
      <div class="macro-inputs">
        <input id="eb-amount" class="input" inputmode="decimal" value="${bill.amount}" />
        <input id="eb-day" class="input" inputmode="numeric" value="${bill.dueDay}" />
      </div>
      <select id="eb-category" class="select block">${expCats.map(c => `<option value="${c.id}" ${c.id === bill.category ? "selected" : ""}>${c.icon} ${esc(c.name)}</option>`).join("")}</select>
      <label class="check"><input type="checkbox" id="eb-active" ${bill.active !== false ? "checked" : ""}/> Active (counts toward monthly total)</label>
      <button id="eb-save" class="btn primary block">Save changes</button>
      <button id="eb-delete" class="btn block danger">Delete bill</button>
    </div>`;
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.classList.contains("modal-close")) modal.remove();
  });
  modal.querySelector("#eb-save").addEventListener("click", () => {
    const name = modal.querySelector("#eb-name").value.trim();
    const amount = parseFloat(modal.querySelector("#eb-amount").value);
    const dueDay = Math.min(31, Math.max(1, parseInt(modal.querySelector("#eb-day").value, 10) || 1));
    const category = modal.querySelector("#eb-category").value;
    const active = modal.querySelector("#eb-active").checked;
    if (!name || isNaN(amount) || amount <= 0) { toast("Enter a name and amount"); return; }
    updateFixedBill(bill.id, { name, amount, category, dueDay, active });
    modal.remove(); render(); toast("Bill updated ✔");
  });
  modal.querySelector("#eb-delete").addEventListener("click", () => {
    if (confirm(`Delete "${bill.name}"? This won't remove past logged transactions.`)) {
      deleteFixedBill(bill.id); modal.remove(); render(); toast("Bill deleted");
    }
  });
  document.body.appendChild(modal);
}

/* ---- Finance: Budgets ---- */
function renderFinBudgets() {
  const key = currentMonthKey();
  const cats = allExpenseCategories();
  const rows = cats.map(c => {
    const bs = budgetStatus(c.id, key);
    const avg = categoryAverage(c.id, 3);
    const target = state.finance.budgets[c.id] || "";
    const pct = bs.target ? Math.min(100, bs.pct) : 0;
    const color = bs.status === "over" ? "#ff8787" : bs.status === "warn" ? "#fcc419" : "#51cf66";
    return `<div class="budget-row">
      <div class="budget-head">
        <span class="budget-name">${c.icon} ${esc(c.name)}</span>
        <input class="budget-input" data-budget-cat="${c.id}" inputmode="decimal" placeholder="no target" value="${target}" />
      </div>
      ${bs.target
        ? `<div class="bar"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
           <div class="muted small">${fmtMoneyShort(bs.spent)} / ${fmtMoneyShort(bs.target)} spent${avg ? ` · avg ${fmtMoneyShort(avg)}/mo` : ""}</div>`
        : avg ? `<div class="muted small">Spent ${fmtMoneyShort(bs.spent)} so far · avg ${fmtMoneyShort(avg)}/mo</div>` : ""}
    </div>`;
  }).join("");

  return `
    <header class="page-head"><h1>Budgets</h1><p class="muted">${fmtMonth(key)} · targets per category</p></header>

    <div class="card">
      <div class="card-label">Currency symbol</div>
      <input id="fin-currency" class="input" value="${esc(financeCurrency())}" maxlength="3" placeholder="$" />
    </div>

    <div class="card">
      <div class="card-label">Monthly budget targets</div>
      ${rows}
      <div class="muted small">Leave blank for no target. Bars compare this month's actual spend to your target; "avg" is your rolling average from logged months.</div>
    </div>

    <div class="card">
      <div class="card-label">Add a custom category</div>
      <input id="cc-name" class="input" placeholder="Category name" />
      <select id="cc-type" class="select block">
        <option value="expense">Expense category</option>
        <option value="income">Income category</option>
      </select>
      <button id="cc-add" class="btn block">+ Add category</button>
    </div>

    <div class="card">
      <div class="card-label">App</div>
      <button id="switch-mode-fin" class="btn block">🔀 Switch app (Fitness / Finance)</button>
    </div>
  `;
}
function wireFinBudgets() {
  $$("[data-budget-cat]").forEach(inp => inp.addEventListener("change", () => {
    const v = parseFloat(inp.value);
    if (isNaN(v) || v <= 0) delete state.finance.budgets[inp.dataset.budgetCat];
    else state.finance.budgets[inp.dataset.budgetCat] = v;
    save(); render();
  }));
  $("#fin-currency")?.addEventListener("change", (e) => {
    state.finance.currency = e.target.value.trim() || "$";
    save(); render();
  });
  $("#cc-add")?.addEventListener("click", () => {
    const name = $("#cc-name").value.trim();
    if (!name) { toast("Enter a category name"); return; }
    addCustomCategory(name, $("#cc-type").value);
    render(); toast("Category added ✔");
  });
  $("#switch-mode-fin")?.addEventListener("click", switchMode);
}

/* ---- Finance: Reports ---- */
let finReportMonth = null;
function renderFinReports() {
  const months = lastNMonthKeys(12).reverse();
  const key = finReportMonth || currentMonthKey();
  const t = monthTotals(key);
  const savingsRate = t.income > 0 ? Math.round((t.net / t.income) * 100) : null;

  const catBreak = allExpenseCategories()
    .map(c => ({ c, spent: categorySpend(key, c.id, "variable") }))
    .filter(x => x.spent > 0)
    .sort((a, b) => b.spent - a.spent);
  const maxSpend = Math.max(1, ...catBreak.map(x => x.spent));

  const trendKeys = lastNMonthKeys(6);
  const trendData = trendKeys.map(k => ({ key: k, ...monthTotals(k) }));
  const maxAbs = Math.max(1, ...trendData.map(d => Math.abs(d.net)));

  return `
    <header class="page-head">
      <h1>Reports</h1>
      <select id="report-month" class="select">${months.map(k => `<option value="${k}" ${k === key ? "selected" : ""}>${fmtMonth(k)}</option>`).join("")}</select>
    </header>

    <div class="card">
      <div class="card-label">Monthly summary</div>
      <div class="vol-row"><span class="vol-label">💼 Income</span><span class="vol-num">${fmtMoneyShort(t.income)}</span></div>
      <div class="vol-row"><span class="vol-label">📅 Fixed</span><span class="vol-num">${fmtMoneyShort(t.fixedExpected)}</span></div>
      <div class="vol-row"><span class="vol-label">🛒 Variable</span><span class="vol-num">${fmtMoneyShort(t.variable)}</span></div>
      <div class="vol-row"><span class="vol-label"><strong>Net</strong></span><span class="vol-num" style="color:${t.net >= 0 ? '#51cf66' : '#ff8787'}"><strong>${t.net >= 0 ? "+" : "−"}${fmtMoneyShort(Math.abs(t.net))}</strong></span></div>
      ${savingsRate !== null ? `<div class="muted small">Savings rate: ${savingsRate}%</div>` : ""}
    </div>

    <div class="card">
      <div class="card-label">Spending by category</div>
      ${catBreak.length ? catBreak.map(x => `
        <div class="vol-row">
          <span class="vol-label">${x.c.icon} ${esc(x.c.name)}</span>
          <div class="bar"><div class="bar-fill" style="width:${(x.spent / maxSpend) * 100}%;background:#ff9f43"></div></div>
          <span class="vol-num">${fmtMoneyShort(x.spent)}</span>
        </div>`).join("") : '<p class="muted center">No variable spending logged this month.</p>'}
    </div>

    <div class="card">
      <div class="card-label">Net cash flow — last 6 months</div>
      ${trendData.map(d => `
        <div class="vol-row">
          <span class="vol-label">${fmtMonth(d.key).split(" ")[0].slice(0, 3)}</span>
          <div class="bar"><div class="bar-fill" style="width:${(Math.abs(d.net) / maxAbs) * 100}%;background:${d.net >= 0 ? '#51cf66' : '#ff8787'}"></div></div>
          <span class="vol-num">${d.net >= 0 ? "+" : "−"}${fmtMoneyShort(Math.abs(d.net))}</span>
        </div>`).join("")}
    </div>
  `;
}
function wireFinReports() {
  $("#report-month")?.addEventListener("change", (e) => { finReportMonth = e.target.value; render(); });
}

/* ---- Finance: Goals (savings goals & sinking funds) ---- */
function goalCurrent(goalId) {
  return state.finance.contributions.filter(c => c.goalId === goalId).reduce((a, c) => a + c.amount, 0);
}
// Pacing toward a goal's target date: required $/month, and whether the
// contribution rate so far is on track to get there.
function goalPacing(goal) {
  if (!goal.targetDate) return null;
  const current = goalCurrent(goal.id);
  const remaining = Math.max(0, goal.target - current);
  const now = new Date(), target = new Date(goal.targetDate);
  const overdue = target < now && remaining > 0;
  const monthsRemaining = Math.max(1, Math.round((target - now) / (1000 * 60 * 60 * 24 * 30.44)));
  const neededPerMonth = remaining / monthsRemaining;
  const contribs = state.finance.contributions.filter(c => c.goalId === goal.id);
  let onTrack = null;
  if (contribs.length && remaining > 0) {
    const firstDate = new Date(Math.min(...contribs.map(c => new Date(c.date).getTime())));
    const monthsSinceStart = Math.max(1, Math.round((now - firstDate) / (1000 * 60 * 60 * 24 * 30.44)));
    const avgPerMonth = current / monthsSinceStart;
    onTrack = avgPerMonth >= neededPerMonth * 0.9;
  }
  return { remaining, monthsRemaining, neededPerMonth, onTrack, overdue };
}
function completeGoal(goalId) {
  const g = state.finance.goals.find(x => x.id === goalId);
  if (!g) return;
  if (g.kind === "sinking") {
    const current = goalCurrent(g.id);
    const amount = current > 0 ? Math.min(current, g.target) : g.target;
    addTransaction({ type: "expense", amount, category: g.category || "misc", note: g.name, date: new Date().toISOString() });
    // reset contributions so the fund starts refilling for its next cycle
    state.finance.contributions = state.finance.contributions.filter(c => c.goalId !== g.id);
    save(); render();
    toast(`${g.name} expense logged · fund reset for next cycle`);
  } else {
    g.achieved = true;
    save();
    launchConfetti();
    render();
    toast(`🏆 ${g.name} goal reached!`);
  }
}

function goalCardHTML(g) {
  const current = goalCurrent(g.id);
  const pct = Math.min(100, (current / g.target) * 100);
  const pacing = goalPacing(g);
  const kindLabel = g.kind === "sinking" ? "🧩 Sinking fund" : "🐷 Savings goal";
  const barColor = pacing && pacing.onTrack === false ? "#ff8787" : "#51cf66";
  let pacingLine = "";
  if (pacing) {
    if (pacing.overdue) pacingLine = `<div class="muted small">⚠️ Target date has passed — ${fmtMoneyShort(pacing.remaining)} still needed.</div>`;
    else pacingLine = `<div class="muted small">Need ${fmtMoneyShort(pacing.neededPerMonth)}/mo to hit ${fmtMonth(monthKey(g.targetDate))}${pacing.onTrack === true ? " · on track ✅" : pacing.onTrack === false ? " · behind pace ⚠️" : ""}</div>`;
  }
  return `<div class="goal-card">
    <div class="goal-head">
      <div>
        <div class="bill-name">${esc(g.name)}</div>
        <div class="muted small">${kindLabel}${g.targetDate ? ` · by ${fmtMonth(monthKey(g.targetDate))}` : ""}</div>
      </div>
      <button class="icon-btn" data-edit-goal="${g.id}">✎</button>
    </div>
    <div class="bar"><div class="bar-fill" style="width:${pct}%;background:${barColor}"></div></div>
    <div class="muted small">${fmtMoneyShort(current)} / ${fmtMoneyShort(g.target)}</div>
    ${pacingLine}
    <div class="macro-inputs" style="margin-top:8px">
      <input class="input goal-contrib-amt" data-goal-contrib="${g.id}" inputmode="decimal" placeholder="Add ${financeCurrency()}" />
      <button class="btn" data-goal-contrib-add="${g.id}">Add</button>
    </div>
    <button class="btn small block" data-goal-complete="${g.id}">${g.kind === "sinking" ? "✅ Spend it (log expense & reset)" : "🏆 Mark reached"}</button>
  </div>`;
}

function renderFinGoals() {
  const active = state.finance.goals.filter(g => !g.achieved);
  const achieved = state.finance.goals.filter(g => g.achieved);
  const expCats = allExpenseCategories();

  return `
    <header class="page-head"><h1>Goals</h1><p class="muted">Savings goals, sinking funds & debt payoff</p></header>

    <div class="card">
      <div class="card-label">Active goals</div>
      ${active.length ? active.map(goalCardHTML).join("") : '<p class="muted center">No goals yet. Add an emergency fund, a vacation, or a sinking fund for an annual bill below.</p>'}
    </div>

    <div class="card">
      <div class="card-label">Add a goal</div>
      <input id="goal-name" class="input" placeholder="Name (e.g. Emergency Fund, Car Insurance)" />
      <div class="fin-type-toggle">
        <button class="fin-type-btn active" data-goal-kind="savings">🐷 Savings goal</button>
        <button class="fin-type-btn" data-goal-kind="sinking">🧩 Sinking fund</button>
      </div>
      <div class="macro-inputs">
        <input id="goal-target" class="input" inputmode="decimal" placeholder="Target amount" />
        <input id="goal-date" class="input" type="date" placeholder="Target date (optional)" />
      </div>
      <select id="goal-category" class="select block" style="display:none">${expCats.map(c => `<option value="${c.id}">${c.icon} ${esc(c.name)}</option>`).join("")}</select>
      <p class="muted small">Sinking fund = money you set aside for a predictable but irregular cost (annual insurance, holiday gifts). "Spend it" logs the expense and resets the fund for its next cycle.</p>
      <button id="goal-add" class="btn primary block">+ Add goal</button>
    </div>

    ${achieved.length ? `
    <div class="card">
      <div class="card-label">🏆 Completed goals</div>
      ${achieved.map(g => `<div class="vol-row"><span class="vol-label">${esc(g.name)}</span><span class="vol-num">${fmtMoneyShort(g.target)}</span></div>`).join("")}
    </div>` : ""}

    ${renderDebtSection()}
  `;
}
function wireFinGoals() {
  let curKind = "savings";
  const kindBtns = $$("[data-goal-kind]");
  const catSelect = $("#goal-category");
  kindBtns.forEach(b => b.addEventListener("click", () => {
    curKind = b.dataset.goalKind;
    kindBtns.forEach(x => x.classList.toggle("active", x === b));
    if (catSelect) catSelect.style.display = curKind === "sinking" ? "" : "none";
  }));
  $("#goal-add")?.addEventListener("click", () => {
    const name = $("#goal-name").value.trim();
    const target = parseFloat($("#goal-target").value);
    const dateVal = $("#goal-date").value;
    if (!name || isNaN(target) || target <= 0) { toast("Enter a name and target amount"); return; }
    state.finance.goals.push({
      id: uid(), name, kind: curKind, target,
      targetDate: dateVal ? new Date(dateVal + "T12:00:00").toISOString() : null,
      category: curKind === "sinking" ? catSelect.value : null,
      achieved: false, createdAt: new Date().toISOString(),
    });
    save(); render(); toast("Goal added ✔");
  });
  $$("[data-goal-contrib-add]").forEach(b => b.addEventListener("click", () => {
    const goalId = b.dataset.goalContribAdd;
    const input = $(`[data-goal-contrib="${goalId}"]`);
    const amount = parseFloat(input.value);
    if (isNaN(amount) || amount <= 0) { toast("Enter an amount"); return; }
    state.finance.contributions.push({ id: uid(), goalId, amount, date: new Date().toISOString() });
    save(); render(); toast("Contribution logged ✔");
  }));
  $$("[data-goal-complete]").forEach(b => b.addEventListener("click", () => completeGoal(b.dataset.goalComplete)));
  $$("[data-edit-goal]").forEach(b => b.addEventListener("click", () => {
    const g = state.finance.goals.find(x => x.id === b.dataset.editGoal);
    if (g) showGoalEditModal(g);
  }));
  wireDebtSection();
}
function showGoalEditModal(g) {
  const expCats = allExpenseCategories();
  const dateVal = g.targetDate ? g.targetDate.slice(0, 10) : "";
  const contribRows = state.finance.contributions.filter(c => c.goalId === g.id).slice().reverse().map(c => `
    <div class="food-item"><div><div class="food-name">${fmtMoneyShort(c.amount)}</div><div class="muted small">${fmtDate(c.date)}</div></div>
    <button class="del-food" data-del-contrib="${c.id}">✕</button></div>`).join("") || '<p class="muted small">No contributions yet.</p>';
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal">
      <button class="modal-close">✕</button>
      <h2>Edit goal</h2>
      <input id="eg-name" class="input" value="${esc(g.name)}" />
      <div class="macro-inputs">
        <input id="eg-target" class="input" inputmode="decimal" value="${g.target}" />
        <input id="eg-date" class="input" type="date" value="${dateVal}" />
      </div>
      ${g.kind === "sinking" ? `<select id="eg-category" class="select block">${expCats.map(c => `<option value="${c.id}" ${c.id === g.category ? "selected" : ""}>${c.icon} ${esc(c.name)}</option>`).join("")}</select>` : ""}
      <div class="card-label">Contribution history</div>
      <div id="eg-contribs">${contribRows}</div>
      <button id="eg-save" class="btn primary block">Save changes</button>
      <button id="eg-delete" class="btn block danger">Delete goal</button>
    </div>`;
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.classList.contains("modal-close")) modal.remove();
  });
  modal.querySelectorAll("[data-del-contrib]").forEach(b => b.addEventListener("click", () => {
    state.finance.contributions = state.finance.contributions.filter(c => c.id !== b.dataset.delContrib);
    save(); modal.remove(); render(); toast("Contribution removed");
  }));
  modal.querySelector("#eg-save").addEventListener("click", () => {
    const name = modal.querySelector("#eg-name").value.trim();
    const target = parseFloat(modal.querySelector("#eg-target").value);
    const dv = modal.querySelector("#eg-date").value;
    if (!name || isNaN(target) || target <= 0) { toast("Enter a name and target"); return; }
    g.name = name; g.target = target;
    g.targetDate = dv ? new Date(dv + "T12:00:00").toISOString() : null;
    if (g.kind === "sinking") g.category = modal.querySelector("#eg-category").value;
    save(); modal.remove(); render(); toast("Goal updated ✔");
  });
  modal.querySelector("#eg-delete").addEventListener("click", () => {
    if (confirm(`Delete "${g.name}"? This removes its contribution history too.`)) {
      state.finance.goals = state.finance.goals.filter(x => x.id !== g.id);
      state.finance.contributions = state.finance.contributions.filter(c => c.goalId !== g.id);
      save(); modal.remove(); render(); toast("Goal deleted");
    }
  });
  document.body.appendChild(modal);
}

/* ---- Finance: Debt payoff planner ---- */
// Simulates month-by-month payoff: interest accrues on each debt, minimum
// payments are always made, and (extra + freed-up minimums from paid-off
// debts) cascade to whichever debt is first in the chosen strategy's order.
function computePayoffPlan(debts, strategy, extra) {
  if (!debts || !debts.length) return null;
  const list = debts.map(d => ({ id: d.id, name: d.name, balance: d.balance, apr: d.apr || 0, minPayment: d.minPayment, interestPaid: 0, paidOffMonth: null }));
  const order = strategy === "snowball"
    ? list.slice().sort((a, b) => a.balance - b.balance)
    : list.slice().sort((a, b) => (b.apr || 0) - (a.apr || 0));
  const maxMonths = 600;
  let month = 0, freedUp = 0;
  while (order.some(d => d.balance > 0.01) && month < maxMonths) {
    month++;
    const pool = extra + freedUp;
    freedUp = 0;
    const target = order.find(d => d.balance > 0.01);
    for (const d of order) {
      if (d.balance <= 0.01) continue;
      const interest = d.balance * (d.apr / 100 / 12);
      d.interestPaid += interest;
      d.balance += interest;
      const payment = Math.min(d.minPayment + (d === target ? pool : 0), d.balance);
      d.balance -= payment;
      if (d.balance <= 0.01 && d.paidOffMonth === null) {
        d.paidOffMonth = month;
        freedUp += d.minPayment;
      }
    }
  }
  const capped = order.some(d => d.paidOffMonth === null);
  const totalMonths = capped ? maxMonths : Math.max(...order.map(d => d.paidOffMonth));
  const totalInterest = order.reduce((a, d) => a + d.interestPaid, 0);
  const debtFreeDate = capped ? null : addMonths(currentMonthKey(), totalMonths);
  return { order, totalMonths, totalInterest, debtFreeDate, capped };
}
function renderDebtSection() {
  const debts = state.finance.debts;
  const strategy = state.finance.debtStrategy || "avalanche";
  const extra = state.finance.debtExtraPayment || 0;
  const plan = debts.length ? computePayoffPlan(debts, strategy, extra) : null;

  const debtRows = debts.map(d => {
    const p = plan?.order.find(x => x.id === d.id);
    return `<div class="bill-row">
      <div class="bill-info">
        <div class="bill-name">💳 ${esc(d.name)}</div>
        <div class="muted small">${fmtMoneyShort(d.balance)} bal · ${d.apr || 0}% APR · ${fmtMoneyShort(d.minPayment)}/mo min${p ? ` · payoff in ${p.paidOffMonth ?? "50+"} mo` : ""}</div>
      </div>
      <button class="icon-btn" data-edit-debt="${d.id}">✎</button>
    </div>`;
  }).join("");

  return `
    <div class="card">
      <div class="card-label">💳 Debt payoff planner</div>
      ${debts.length ? debtRows : '<p class="muted center">No debts added. Track loans / credit cards to see a payoff timeline.</p>'}
      ${debts.length ? `
        <div class="fin-type-toggle" style="margin-top:10px">
          <button class="fin-type-btn ${strategy === "avalanche" ? "active" : ""}" data-strategy="avalanche">🏔️ Avalanche</button>
          <button class="fin-type-btn ${strategy === "snowball" ? "active" : ""}" data-strategy="snowball">⚪ Snowball</button>
        </div>
        <input id="debt-extra" class="input" inputmode="decimal" placeholder="Extra ${financeCurrency()}/mo toward debt" value="${extra || ""}" />
        ${plan ? `
          <div class="suggestion ${plan.capped ? "suggestion-add-reps" : ""}">
            ${plan.capped
              ? `⚠️ Even with this payment, payoff is beyond 50 years — increase your monthly amount.`
              : `🎯 Debt-free in <strong>${plan.totalMonths} months</strong> (${fmtMonth(plan.debtFreeDate)}) · ~${fmtMoneyShort(plan.totalInterest)} total interest.`}
          </div>
          <div class="muted small">${strategy === "avalanche" ? "Avalanche: highest APR first — minimizes total interest paid." : "Snowball: smallest balance first — faster early wins for motivation."}</div>
        ` : ""}
      ` : ""}
      <input id="debt-name" class="input" placeholder="Debt name (e.g. Car loan, Visa card)" />
      <div class="macro-inputs">
        <input id="debt-balance" class="input" inputmode="decimal" placeholder="Balance" />
        <input id="debt-apr" class="input" inputmode="decimal" placeholder="APR % (0 if none)" />
      </div>
      <input id="debt-min" class="input" inputmode="decimal" placeholder="Minimum payment / mo" />
      <button id="debt-add" class="btn block">+ Add debt</button>
    </div>`;
}
function wireDebtSection() {
  $("#debt-add")?.addEventListener("click", () => {
    const name = $("#debt-name").value.trim();
    const balance = parseFloat($("#debt-balance").value);
    const apr = parseFloat($("#debt-apr").value) || 0;
    const minPayment = parseFloat($("#debt-min").value);
    if (!name || isNaN(balance) || balance <= 0 || isNaN(minPayment) || minPayment <= 0) { toast("Enter a name, balance, and minimum payment"); return; }
    state.finance.debts.push({ id: uid(), name, balance, apr, minPayment });
    save(); render(); toast("Debt added ✔");
  });
  $$("[data-strategy]").forEach(b => b.addEventListener("click", () => {
    state.finance.debtStrategy = b.dataset.strategy; save(); render();
  }));
  $("#debt-extra")?.addEventListener("change", (e) => {
    state.finance.debtExtraPayment = parseFloat(e.target.value) || 0;
    save(); render();
  });
  $$("[data-edit-debt]").forEach(b => b.addEventListener("click", () => {
    const debt = state.finance.debts.find(x => x.id === b.dataset.editDebt);
    if (debt) showDebtEditModal(debt);
  }));
}
function showDebtEditModal(d) {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal">
      <button class="modal-close">✕</button>
      <h2>Edit debt</h2>
      <input id="ed-name" class="input" value="${esc(d.name)}" />
      <div class="macro-inputs">
        <input id="ed-balance" class="input" inputmode="decimal" value="${d.balance}" />
        <input id="ed-apr" class="input" inputmode="decimal" value="${d.apr || 0}" />
      </div>
      <input id="ed-min" class="input" inputmode="decimal" value="${d.minPayment}" />
      <button id="ed-save" class="btn primary block">Save changes</button>
      <button id="ed-delete" class="btn block danger">Delete debt</button>
    </div>`;
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.classList.contains("modal-close")) modal.remove();
  });
  modal.querySelector("#ed-save").addEventListener("click", () => {
    const name = modal.querySelector("#ed-name").value.trim();
    const balance = parseFloat(modal.querySelector("#ed-balance").value);
    const apr = parseFloat(modal.querySelector("#ed-apr").value) || 0;
    const minPayment = parseFloat(modal.querySelector("#ed-min").value);
    if (!name || isNaN(balance) || balance < 0 || isNaN(minPayment) || minPayment <= 0) { toast("Check your inputs"); return; }
    d.name = name; d.balance = balance; d.apr = apr; d.minPayment = minPayment;
    save(); modal.remove(); render(); toast("Debt updated ✔");
  });
  modal.querySelector("#ed-delete").addEventListener("click", () => {
    if (confirm(`Delete "${d.name}"?`)) {
      state.finance.debts = state.finance.debts.filter(x => x.id !== d.id);
      save(); modal.remove(); render(); toast("Debt deleted");
    }
  });
  document.body.appendChild(modal);
}

/* ============================ CALC / UI BITS ============================== */
function bwInKg() {
  const bw = state.profile.bodyweight;
  if (!bw) return null;
  return state.profile.unit === "lb" ? bw / 2.205 : bw;
}
function estimateCalories() {
  const kg = bwInKg();
  if (!kg) return 2500;
  // simple bodyweight-based estimate × activity, adjusted by goal
  let base = kg * 33; // ~maintenance for an active lifter
  if (state.profile.goal === "gain") base += 350;
  if (state.profile.goal === "cut") base -= 450;
  return Math.round(base / 10) * 10;
}
function estimateProtein() {
  const kg = bwInKg();
  if (!kg) return 180;
  return Math.round(kg * 2); // ~2 g/kg (≈0.9 g/lb) — high end for muscle gain
}
function computeStreak() {
  // consecutive days with either a workout session or a food log entry
  const days = new Set();
  state.sessions.forEach(s => days.add(s.date.slice(0,10)));
  Object.keys(state.foodLog).forEach(k => { if (state.foodLog[k].length) days.add(k); });
  let streak = 0;
  let d = new Date();
  for (;;) {
    const key = d.toISOString().slice(0,10);
    if (days.has(key)) { streak++; d.setDate(d.getDate()-1); }
    else if (key === todayKey()) { d.setDate(d.getDate()-1); } // today not yet logged is okay
    else break;
  }
  return streak;
}
function weeklyActualCoverage() {
  // sets logged in the last 7 days per muscle
  const cutoff = Date.now() - 7*24*3600*1000;
  const vol = {};
  for (const k of Object.keys(VOLUME_TARGETS)) vol[k] = 0;
  state.sessions.forEach(s => {
    if (new Date(s.date).getTime() < cutoff) return;
    s.entries.forEach(en => {
      const ex = EXERCISE_BY_ID[en.exerciseId]; if (!ex) return;
      ex.primary.forEach(m => { const k = m==="lats"?"back":m; if (vol[k]!==undefined) vol[k]+=en.sets.length; });
      (ex.secondary||[]).forEach(m => { const k = m==="lats"?"back":m; if (vol[k]!==undefined) vol[k]+=en.sets.length*0.5; });
    });
  });
  const out = {};
  for (const [m, t] of Object.entries(targets())) {
    const sets = Math.round((vol[m]||0)*2)/2;
    out[m] = { sets, status: sets < t.min ? "low" : sets > t.max ? "high" : "good" };
  }
  return out;
}
function progressBar(val, goal, color) {
  const pct = Math.min(100, goal ? (val/goal)*100 : 0);
  return `<div class="bar"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>`;
}
function sparkline(values) {
  if (values.length < 2) return `<div class="muted small">Log a few entries to see a trend.</div>`;
  const w = 280, h = 60, min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 10) - 5;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <polyline points="${pts}" fill="none" stroke="#ff6b35" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

const PRINCIPLES = [
  "Progressive overload is the law. Beat last week — one more rep or a little more weight.",
  "Train each muscle 2–3× per week. Frequency lets you accumulate quality volume.",
  "Leave 1–3 reps in reserve on most sets. Save true failure for the last set of isolations.",
  "Chase the stretch. The lengthened position drives growth — go deep, control the negative.",
  "10–20 hard sets per muscle per week is the hypertrophy sweet spot (Nippard).",
  "TNF rule: keep it simple, stable and loadable. Standardize technique, then add weight over months.",
  "Sleep 7–9 hours and eat enough protein (~0.9 g/lb). You grow out of the gym, not in it.",
  "Don't program-hop. A plan you run for months beats a 'perfect' plan you abandon in two weeks.",
  "Tempo: ~2s down, control the eccentric. Bouncing steals the stimulus.",
  "Side delts and calves recover fast — train them often and hard for that 3D look.",
];
function dailyPrinciple() {
  const day = Math.floor(Date.now() / 86400000);
  return PRINCIPLES[day % PRINCIPLES.length];
}

/* ============================ BOOT ======================================= */
render();

// register service worker for offline / installability, and auto-update:
// force an immediate update check (bypassing the browser's ~24h throttle on
// automatic checks) and reload once when a new version takes control, so an
// installed PWA never gets stuck running stale cached code.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then((reg) => {
      reg.update().catch(() => {});
      let reloading = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloading) return;
        reloading = true;
        window.location.reload();
      });
    }).catch(() => {});
  });
}
