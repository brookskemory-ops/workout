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
  },
  program: null,
  programOpts: { split: "ppl6", equipment: [] },
  sessions: [],          // completed workout sessions
  exerciseHistory: {},   // exerciseId -> [{date, sets:[{weight,reps}]}]
  foodLog: {},           // 'YYYY-MM-DD' -> [{name,kcal,protein,carbs,fat,time}]
  bodyweightLog: [],     // [{date, weight}]
  measurements: [],      // [{date, waist, arms, chest, thighs}]
  waterLog: {},          // 'YYYY-MM-DD' -> oz
  stepsLog: {},          // 'YYYY-MM-DD' -> steps
  cardioLog: [],         // [{date, type, minutes, kcal}]
  createdAt: new Date().toISOString(),
};

// active targets scaled by the user's experience level
function targets() { return scaledTargets(state.profile.experience || "intermediate"); }
function jumpMult() { return (EXPERIENCE[state.profile.experience] || EXPERIENCE.intermediate).jumpMult; }

let state = loadState();

/* ----------------------------- storage ------------------------------------ */
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    return Object.assign(structuredClone(DEFAULT_STATE), JSON.parse(raw));
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

/* ----------------------------- router ------------------------------------- */
const ROUTES = ["dashboard", "workout", "food", "library", "progress", "settings"];
function currentRoute() {
  const r = location.hash.replace("#", "");
  return ROUTES.includes(r) ? r : "dashboard";
}
function navigate(route) { location.hash = route; }
window.addEventListener("hashchange", render);

/* ============================ RENDER ROOT ================================== */
function render() {
  const route = currentRoute();
  $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.route === route));
  const view = $("#view");
  view.scrollTop = 0;
  const fns = {
    dashboard: renderDashboard,
    workout: renderWorkout,
    food: renderFood,
    library: renderLibrary,
    progress: renderProgress,
    settings: renderSettings,
  };
  view.innerHTML = fns[route]();
  // post-render wiring
  ({
    dashboard: wireDashboard,
    workout: wireWorkout,
    food: wireFood,
    library: wireLibrary,
    progress: wireProgress,
    settings: wireSettings,
  })[route]?.();
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
        <button class="info-btn" data-ex-info="${item.exerciseId}">ⓘ</button>
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

function saveExerciseSets(card) {
  const exId = card.dataset.ex;
  const sets = readSetsFromCard(card);
  if (!sets.length) return false;
  if (!state.exerciseHistory[exId]) state.exerciseHistory[exId] = [];
  state.exerciseHistory[exId].push({ date: new Date().toISOString(), sets });
  save();
  return true;
}

function finishWorkout(dayIdx) {
  const day = state.program.days[dayIdx];
  const entries = [];
  let any = false;
  $$(".exercise-card").forEach(card => {
    const sets = readSetsFromCard(card);
    if (sets.length) {
      any = true;
      const exId = card.dataset.ex;
      // avoid double-saving if user already hit "save" — only save if last entry isn't from this minute
      const hist = state.exerciseHistory[exId] || (state.exerciseHistory[exId] = []);
      const last = hist[hist.length - 1];
      const justSaved = last && (Date.now() - new Date(last.date).getTime() < 60000)
        && JSON.stringify(last.sets) === JSON.stringify(sets);
      if (!justSaved) hist.push({ date: new Date().toISOString(), sets });
      entries.push({ exerciseId: exId, sets });
    }
  });
  if (!any) { toast("Log at least one set first"); return; }
  state.sessions.push({ date: new Date().toISOString(), dayName: day.name, dayIdx, entries });
  save();
  toast("Workout logged! 🔥");
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
      <button id="save-profile" class="btn primary block">Save profile</button>
    </div>

    <div class="card">
      <div class="card-label">Auto-generate program</div>
      <select id="s-split" class="select block">${splitOptions}</select>
      <p class="muted small" id="split-blurb">${esc(SPLITS[o.split].blurb)}</p>
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
}

function doGenerate() {
  const split = $("#s-split").value;
  const equipment = $$(".equip:checked").map(c => c.value);
  state.programOpts = { split, equipment };
  state.program = generateProgram({ split, equipment, targets: targets() });
  save(); render();
  toast("Program generated! 💪");
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
      state = Object.assign(structuredClone(DEFAULT_STATE), JSON.parse(reader.result));
      save(); render(); toast("Data imported ✔");
    } catch { toast("Invalid file"); }
  };
  reader.readAsText(file);
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

// register service worker for offline / installability
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
