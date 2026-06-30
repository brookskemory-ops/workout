/* ============================================================================
 * WORKOUT GENERATOR
 * Auto-builds balanced programs from the EXERCISES library so that every
 * muscle group hits its weekly volume target at a frequency of 2x+.
 *
 * Blends two evidence-based philosophies:
 *  • Jeff Nippard — 10–20 hard sets/muscle/week, train each muscle 2–3x,
 *    emphasize the stretched position, leave 1–3 RIR, drive progressive overload.
 *  • TNF / Joel Twinem — keep it simple, stable and loadable; clean exercise
 *    order; low systemic fatigue; standardize technique and run the plan for
 *    months with small need-based tweaks rather than constant overhauls.
 * ==========================================================================*/

// A split = ordered list of days. Each day lists "slots": a muscle focus plus a
// preferred movement type. The generator fills each slot with a real exercise.
const SPLITS = {
  fullbody3: {
    name: "Full Body — 3 Days",
    blurb: "Highest frequency for busy weeks. Every muscle 3x. Great for beginners and time-crunched lifters (TNF's 'built around real life').",
    days: [
      { name: "Full Body A", slots: [
        ["quads", "compound"], ["chest", "compound"], ["back", "compound"],
        ["sideDelts", "isolation"], ["hamstrings", "isolation"], ["triceps", "isolation"], ["calves", "isolation"]
      ]},
      { name: "Full Body B", slots: [
        ["hamstrings", "compound"], ["back", "vertical-pull"], ["chest", "incline"],
        ["sideDelts", "isolation"], ["biceps", "isolation"], ["abs", "isolation"], ["calves", "isolation"]
      ]},
      { name: "Full Body C", slots: [
        ["quads", "compound"], ["chest", "compound"], ["back", "compound"],
        ["rearDelts", "isolation"], ["biceps", "isolation"], ["triceps", "isolation"], ["abs", "isolation"]
      ]},
    ]
  },
  upperlower4: {
    name: "Upper / Lower — 4 Days",
    blurb: "The sweet spot for most intermediates. Each muscle 2x/week with room for plenty of volume per session.",
    days: [
      { name: "Upper A (Strength)", slots: [
        ["chest", "compound"], ["back", "compound"], ["frontDelts", "compound"],
        ["back", "horizontal-pull"], ["sideDelts", "isolation"], ["triceps", "isolation"], ["biceps", "isolation"]
      ]},
      { name: "Lower A (Quad)", slots: [
        ["quads", "compound"], ["hamstrings", "compound"], ["quads", "isolation"],
        ["hamstrings", "isolation"], ["calves", "isolation"], ["abs", "isolation"]
      ]},
      { name: "Upper B (Hypertrophy)", slots: [
        ["chest", "incline"], ["back", "vertical-pull"], ["chest", "isolation"],
        ["back", "horizontal-pull"], ["sideDelts", "isolation"], ["rearDelts", "isolation"], ["biceps", "isolation"], ["triceps", "isolation"]
      ]},
      { name: "Lower B (Posterior)", slots: [
        ["hamstrings", "compound"], ["quads", "compound"], ["glutes", "compound"],
        ["hamstrings", "isolation"], ["calves", "isolation"], ["abs", "isolation"]
      ]},
    ]
  },
  ppl6: {
    name: "Push / Pull / Legs — 6 Days",
    blurb: "Maximum volume for advanced lifters who can train 6x. Each muscle 2x/week with high per-session focus.",
    days: [
      { name: "Push A", slots: [
        ["chest", "compound"], ["frontDelts", "compound"], ["chest", "incline"],
        ["sideDelts", "isolation"], ["triceps", "isolation"], ["triceps", "isolation"]
      ]},
      { name: "Pull A", slots: [
        ["back", "vertical-pull"], ["back", "horizontal-pull"], ["lats", "isolation"],
        ["rearDelts", "isolation"], ["biceps", "isolation"], ["biceps", "isolation"]
      ]},
      { name: "Legs A (Quad)", slots: [
        ["quads", "compound"], ["hamstrings", "compound"], ["quads", "isolation"],
        ["glutes", "compound"], ["calves", "isolation"], ["abs", "isolation"]
      ]},
      { name: "Push B", slots: [
        ["chest", "incline"], ["frontDelts", "compound"], ["chest", "isolation"],
        ["sideDelts", "isolation"], ["sideDelts", "isolation"], ["triceps", "isolation"]
      ]},
      { name: "Pull B", slots: [
        ["back", "horizontal-pull"], ["back", "vertical-pull"], ["back", "horizontal-pull"],
        ["rearDelts", "isolation"], ["biceps", "isolation"], ["abs", "isolation"]
      ]},
      { name: "Legs B (Posterior)", slots: [
        ["hamstrings", "compound"], ["quads", "compound"], ["hamstrings", "isolation"],
        ["glutes", "compound"], ["calves", "isolation"], ["abs", "isolation"]
      ]},
    ]
  },
  tnf4: {
    name: "TNF Style — 4 Days",
    blurb: "Inspired by Joel Twinem (TNF): stable, seated, loadable movements in a clean order, low systemic fatigue, and isolations that minimize junk involvement so you can progress for months.",
    days: [
      { name: "Upper Push Focus", slots: [
        ["chest", "incline"], ["frontDelts", "compound"], ["chest", "isolation"],
        ["sideDelts", "isolation"], ["sideDelts", "isolation"], ["triceps", "isolation"], ["triceps", "isolation"]
      ]},
      { name: "Lower (Quad Focus)", slots: [
        ["quads", "compound"], ["quads", "compound"], ["hamstrings", "isolation"],
        ["quads", "isolation"], ["calves", "isolation"], ["abs", "isolation"]
      ]},
      { name: "Upper Pull Focus", slots: [
        ["back", "horizontal-pull"], ["back", "vertical-pull"], ["lats", "isolation"],
        ["rearDelts", "isolation"], ["biceps", "isolation"], ["biceps", "isolation"]
      ]},
      { name: "Lower (Posterior Focus)", slots: [
        ["hamstrings", "compound"], ["glutes", "compound"], ["hamstrings", "isolation"],
        ["quads", "isolation"], ["calves", "isolation"], ["abs", "isolation"]
      ]},
    ]
  },
};

// Does an exercise satisfy a [muscle, pref] slot?
function exerciseMatchesSlot(ex, muscle, pref, equipmentFilter) {
  // equipment availability filter
  if (equipmentFilter && equipmentFilter.length && !equipmentFilter.includes(ex.equipment)) return false;

  // 'back' slot should also accept lat-dominant pulls and vice-versa
  const muscleMatches =
    ex.primary.includes(muscle) ||
    (muscle === "back" && ex.primary.includes("lats")) ||
    (muscle === "lats" && ex.primary.includes("back"));
  if (!muscleMatches) return false;

  switch (pref) {
    case "compound":        return ex.type === "compound";
    case "isolation":       return ex.type === "isolation";
    case "incline":         return ex.pattern === "incline-push";
    case "vertical-pull":   return ex.pattern === "vertical-pull";
    case "horizontal-pull": return ex.pattern === "horizontal-pull";
    default:                return true;
  }
}

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/**
 * Generate a full weekly program.
 * @param {Object} opts { split, equipment[], seed }
 */
function generateProgram(opts = {}) {
  const splitKey = opts.split && SPLITS[opts.split] ? opts.split : "upperlower4";
  const split = SPLITS[splitKey];
  const equipmentFilter = opts.equipment || [];
  const usedThisWeek = {}; // exerciseId -> count, to spread variety

  const days = split.days.map(day => {
    const dayUsed = new Set();
    const exercises = [];
    for (const [muscle, pref] of day.slots) {
      // candidate pool
      let candidates = EXERCISES.filter(ex =>
        exerciseMatchesSlot(ex, muscle, pref, equipmentFilter) && !dayUsed.has(ex.id)
      );
      // relax the 'pref' if nothing matched (e.g. equipment-limited)
      if (!candidates.length) {
        candidates = EXERCISES.filter(ex =>
          exerciseMatchesSlot(ex, muscle, null, equipmentFilter) && !dayUsed.has(ex.id)
        );
      }
      // last resort: ignore equipment filter so the slot is never empty
      if (!candidates.length) {
        candidates = EXERCISES.filter(ex =>
          exerciseMatchesSlot(ex, muscle, null, null) && !dayUsed.has(ex.id)
        );
      }
      if (!candidates.length) continue;

      // prefer exercises used least this week (variety + balance)
      const minUse = Math.min(...candidates.map(c => usedThisWeek[c.id] || 0));
      const leastUsed = candidates.filter(c => (usedThisWeek[c.id] || 0) === minUse);
      const ex = pickRandom(leastUsed);

      dayUsed.add(ex.id);
      usedThisWeek[ex.id] = (usedThisWeek[ex.id] || 0) + 1;
      exercises.push({
        exerciseId: ex.id,
        sets: ex.sets,
        repRange: ex.repRange.slice(),
        rir: ex.rir,
      });
    }
    return { name: day.name, exercises };
  });

  const targets = opts.targets || VOLUME_TARGETS;
  // Volume-balancing pass: top up any muscle below its weekly minimum by adding
  // (mostly isolation) work to the lightest days — so every group is trained enough.
  balanceProgram(days, targets, equipmentFilter);

  const weeklyVolume = computeWeeklyVolume(days);
  return {
    splitKey,
    splitName: split.name,
    blurb: split.blurb,
    days,
    weeklyVolume,
    coverage: assessCoverage(weeklyVolume, targets),
    generatedAt: new Date().toISOString(),
  };
}

// Add work to under-target muscles until each reaches its weekly minimum
// (or we hit sensible caps). Prefers isolation movements and the lightest days
// to keep per-session fatigue manageable (the TNF way).
function balanceProgram(days, targets, equipmentFilter) {
  const MAX_PER_DAY = 9;          // don't let a session balloon
  const MAX_PASSES = 40;          // safety stop
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const vol = computeWeeklyVolume(days);
    // find the muscle furthest below its minimum
    let worst = null, worstGap = 0;
    for (const [m, t] of Object.entries(targets)) {
      const gap = t.min - (vol[m] || 0);
      if (gap > worstGap) { worstGap = gap; worst = m; }
    }
    if (!worst) break; // everyone at or above minimum

    // candidate exercises that primarily train this muscle (isolation first)
    const pool = EXERCISES
      .filter(ex => {
        const hits = ex.primary.includes(worst) ||
          (worst === "back" && ex.primary.includes("lats")) ||
          (worst === "lats" && ex.primary.includes("back"));
        if (!hits) return false;
        if (equipmentFilter && equipmentFilter.length && !equipmentFilter.includes(ex.equipment)) return false;
        return true;
      })
      .sort((a, b) => (a.type === "isolation" ? 0 : 1) - (b.type === "isolation" ? 0 : 1));
    if (!pool.length) break; // nothing available (e.g. equipment-limited) — give up on this muscle

    // pick the day with the fewest exercises that doesn't already include a candidate
    const dayOrder = days
      .map((d, i) => ({ i, n: d.exercises.length }))
      .sort((a, b) => a.n - b.n);
    let placed = false;
    for (const { i } of dayOrder) {
      const day = days[i];
      if (day.exercises.length >= MAX_PER_DAY) continue;
      const have = new Set(day.exercises.map(e => e.exerciseId));
      const choice = pool.find(ex => !have.has(ex.id));
      if (!choice) continue;
      day.exercises.push({
        exerciseId: choice.id,
        sets: choice.sets,
        repRange: choice.repRange.slice(),
        rir: choice.rir,
      });
      placed = true;
      break;
    }
    if (!placed) break; // every day full or already has all candidates
  }
}

// Sum weekly working sets per muscle. Primary muscles get full credit,
// secondary muscles get half credit (a common volume-counting convention).
function computeWeeklyVolume(days) {
  const vol = {};
  for (const k of Object.keys(VOLUME_TARGETS)) vol[k] = 0;
  for (const day of days) {
    for (const item of day.exercises) {
      const ex = EXERCISE_BY_ID[item.exerciseId];
      if (!ex) continue;
      for (const m of ex.primary) {
        const key = m === "lats" ? "back" : m;
        if (vol[key] !== undefined) vol[key] += item.sets;
      }
      for (const m of (ex.secondary || [])) {
        const key = m === "lats" ? "back" : m;
        if (vol[key] !== undefined) vol[key] += item.sets * 0.5;
      }
    }
  }
  // round halves
  for (const k of Object.keys(vol)) vol[k] = Math.round(vol[k] * 2) / 2;
  return vol;
}

// Compare weekly volume to targets and return per-muscle status.
function assessCoverage(weeklyVolume, targets = VOLUME_TARGETS) {
  const out = {};
  for (const [muscle, target] of Object.entries(targets)) {
    const sets = weeklyVolume[muscle] || 0;
    let status;
    if (sets < target.min) status = "low";
    else if (sets > target.max) status = "high";
    else status = "good";
    out[muscle] = { sets, min: target.min, max: target.max, status };
  }
  return out;
}

/* ----------------------------------------------------------------------------
 * PROGRESSIVE OVERLOAD ENGINE  (double progression)
 *
 * Rule: work within the rep range at the prescribed RIR. When you hit the TOP
 * of the rep range for ALL work sets, add weight next time and drop back to the
 * bottom of the range. Otherwise, beat your previous reps (add 1 rep). This is
 * the simplest, most measurable model — the TNF "let overload do the work".
 * --------------------------------------------------------------------------*/
function progressionSuggestion(exercise, lastSets, opts = {}) {
  // opts.jumpMult scales weight increments by experience (advanced = smaller jumps)
  const jumpMult = opts.jumpMult || 1;
  // lastSets: array of { weight, reps } from the most recent logged session
  const [lo, hi] = exercise.repRange;
  if (!lastSets || !lastSets.length) {
    return {
      action: "establish",
      text: `Find a weight you can do for ${lo}–${hi} reps leaving ~${exercise.rir} reps in reserve. Log it — that's your baseline.`
    };
  }
  const valid = lastSets.filter(s => s.weight != null && s.reps != null && s.reps > 0);
  if (!valid.length) {
    return { action: "establish", text: `Log a baseline set in the ${lo}–${hi} rep range.` };
  }
  const topWeight = Math.max(...valid.map(s => s.weight));
  const setsAtTop = valid.filter(s => s.weight >= topWeight);
  const allHitTop = setsAtTop.length >= Math.min(valid.length, 2) && setsAtTop.every(s => s.reps >= hi);
  const minReps = Math.min(...setsAtTop.map(s => s.reps));

  if (allHitTop) {
    // add weight: ~2.5% rounded, scaled by experience (advanced microloads more)
    let inc = (topWeight >= 100 ? 5 : 2.5) * jumpMult;
    inc = Math.max(1.25, Math.round(inc * 4) / 4); // round to nearest 0.25, floor 1.25
    const next = topWeight + inc;
    return {
      action: "add-weight",
      text: `You hit the top of the range (${hi} reps). Add ${inc} → try ${next} for ${lo}–${lo + 1} reps. Progressive overload! 💪`,
      suggestWeight: next, suggestReps: lo,
    };
  }
  return {
    action: "add-reps",
    text: `Stay at ${topWeight} and beat ${minReps} reps — aim for ${Math.min(minReps + 1, hi)}+ this session. Add weight once you reach ${hi} across your sets.`,
    suggestWeight: topWeight, suggestReps: Math.min(minReps + 1, hi),
  };
}

if (typeof module !== "undefined") {
  module.exports = { SPLITS, generateProgram, computeWeeklyVolume, assessCoverage, progressionSuggestion };
}
