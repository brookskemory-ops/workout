# 🗺️ Monster Mode — Build Roadmap

A living plan for growing the dashboard. We build in **phases**, shipping small and
often. Everything stays **100% offline / local** (no account, no server) — backups via
JSON export. Decisions locked in with the owner:

- **Default units:** imperial (lb, ft/in). kg/cm optional.
- **Default split / volume:** PPL 6-day, advanced.
- **Data model:** local `localStorage`, single versioned state object.
- **Food database:** bundled offline list + search (no barcode/online API, by design).
- **App modes:** Fitness and Finance are peers under one dashboard; the app **asks every
  time** which one to open (no remembered default) — a manual switch is always available.
- **Finance model:** fixed expenses are a one-time recurring setup list; variable expenses
  are whatever gets logged; income is tracked; budget targets are set from day one.

Legend: ✅ done · 🚧 in progress · ⏳ planned

---

## ✅ Phase 0 — Foundation (shipped)
- Installable PWA (manifest + service worker, offline, add-to-home-screen)
- 5 tabs: Dashboard · Workout · Food · Library · Progress · Setup
- 74-exercise library with descriptions, cues, attributed science notes
- Auto-generated, **volume-balanced** programs (4 splits) hitting every muscle's
  weekly set target at 2×+ frequency, scaled by experience
- Progressive-overload (double-progression) suggestions per exercise
- Workout logging, rest timer, food log + macros + quick-add
- Progress: bodyweight, measurements, est. strength, weekly volume
- Extras: water, steps, cardio
- Imperial defaults + height field

---

## ✅ Finance Module — shipped
A second app mode alongside Fitness, chosen every time you open the app (per the
owner's call — no "remembered" default, always asks). Built around one model: **fixed
expenses are defined once and recur automatically**; **everything you log day-to-day is
variable**, tracked against a budget target and your own rolling average.
- App-mode launcher (Fitness / Finance) + a "🔀 Switch app" affordance from within either
  mode, with its own 5-tab bar per mode.
- **Bills** — recurring fixed-expense list (name, amount, category, due day, active
  toggle); a current-month checklist that logs a real transaction when checked off, while
  the total always counts toward the monthly fixed obligation regardless of paid status.
- **Log** — quick-add expense or income transactions (amount, category, note, date);
  view/delete this month's entries. Tied into Budgets: a live hint under the category
  picker shows that category's budget and how much is left as you pick it, and a
  "Category budgets this month" list surfaces every budgeted category at a glance.
- **Budgets** — monthly target per category, either a fixed $ amount or a **% of expected
  income** that recomputes automatically as income changes, each with a **recommended
  percentage range** (commonly-cited financial-planning guidelines) and a one-tap "Use X%"
  button. **Pay-frequency aware**: choose Weekly / Biweekly / Semi-monthly / Monthly /
  Annually and enter one pay period's amount — the app converts to a monthly-equivalent
  and shows a "≈ $X/paycheck" figure on every category budget; logging a "Paycheck" income
  entry in the Log tab pre-fills from it. A green/yellow/red progress bar compares actual
  spend to target and to your historical average. An overview shows **exactly how much is
  left for savings** (income − fixed bills − every budget) with a savings-rate status
  message and a one-tap way to log that leftover as a goal contribution. Variable and
  fixed-bill categories are shown separately so Budgets doesn't overlap confusingly with
  Bills. Currency symbol + custom category management.
- **Reports** — monthly summary (income / fixed / variable / net / savings rate),
  spending-by-category breakdown, and a 6-month net-cash-flow trend; browse any of the
  last 12 months.
- **Home** — net cash flow this month, bills-paid tracker, over-budget alerts, a
  quick-glance goals teaser, recent transactions.
- Income tracking included (paychecks, freelance, etc.) so net cash flow and savings rate
  are visible, not just spending.
- **Goals tab** — multiple named **savings goals** (target amount + optional target date,
  manual contribution logging, $/month pacing math with an on-track/behind indicator);
  **sinking funds** for predictable-but-irregular costs (annual insurance, gifts) that log
  a real expense and reset for their next cycle when "spent"; a **debt payoff planner**
  (avalanche or snowball ordering, extra-payment cascading, month-by-month simulation,
  total interest and debt-free date).

### Ideas for a future finance phase (not yet built)
- Recurring-bill due-date reminders / "due soon" nudges
- CSV export of transactions for spreadsheets / taxes
- Multi-month budget trend per category (not just current month vs. average)
- Recurring income setup (define paycheck schedule once instead of logging each payday)

---

## 🚧 Phase 1 — Daily-driver quality of life
High-value, self-contained, used every session.
1. **Exercise swap button** ✅ — sub any movement mid-workout for **any exercise in the
   library** (same-muscle, equipment-matched options are just sorted to the top for
   convenience — nothing is off-limits). Persists into the program.
1b. **Program Builder** ✅ — build your own workout from scratch instead of only
    auto-generating: name it, add/remove days, and add any exercise from the full
    library to any day (no muscle-group restriction), editing sets and rep range
    per exercise. Reachable from Setup → "Build your own program" (or "Edit in
    Program Builder" to hand-tune an existing auto-generated one). Runs through the
    same workout logger, progression suggestions, plate calculator, and coverage
    report as generated programs.
2. **Plate + warm-up calculator** ✅ — for a target working weight, shows the exact plate
   loadout per side and an auto-generated warm-up ramp (bar → 50% → 70% → 85% → work).
   Configurable bar weight; unit-aware plate set.
3. **PR detection + celebrations** ✅ — auto-detects personal records (top weight and
   estimated 1RM via Epley) when you log sets, fires a confetti celebration (with haptic
   buzz), and stores a PR history shown on the Dashboard and Progress tabs. The first-ever
   log of a lift sets a baseline without a false celebration.
4. **Saved meals & one-tap re-log** ⏳ — save frequent meals/recipes; re-log in a tap.

## ⏳ Phase 2 — Progress & motivation
1. **Progress photos** — date-stamped front/side/back photos stored locally (IndexedDB,
   since photos are too big for localStorage) with a before/after compare slider.
2. **Workout calendar / streak heatmap** — GitHub-style consistency grid + current/longest
   streak, tap a day to see what you trained.
3. **Strength standards** — compare each main lift to bodyweight-based standards
   (untrained → beginner → intermediate → advanced → elite) so you know where you rank.

## ⏳ Phase 3 — Smart programming
1. **Deload auto-suggester** — flag a lighter week every ~4–6 weeks or when performance
   stalls / RIR creeps down; auto-cut volume & intensity for the deload.
2. **Mesocycle periodization (RP-style)** — plan blocks that ramp weekly volume from MEV
   toward MRV across weeks, then deload, instead of static weekly volume. Generator becomes
   week-aware; the dashboard shows "Week 3 of 5 — accumulation".

## ⏳ Phase 4 — Nutrition depth
1. **Bigger offline food database + search** — a few hundred common foods/brands bundled
   for instant search-and-add (still no internet needed).
2. **Bulk/cut calorie coach** — track the weekly bodyweight trend (not daily noise) and
   auto-nudge the calorie target to keep your gain/loss rate on plan.
3. **Supplement & hydration schedule** — daily check-offs for creatine, etc., plus the
   existing water tracking, with reminders.

## ⏳ Phase 5 — Polish & power-user
- Custom exercise creation (add your own movements to the library)
- Manual program builder (hand-pick days/exercises) alongside the auto-generator
- Per-workout & per-exercise notes
- Local reminders/notifications to train (best-effort within PWA limits)
- Theme/accent options, rest-day tracking, backup reminders

---

## Cross-cutting principles
- **Offline-first & private** — all data on-device; nothing leaves the phone.
- **Ship small** — each item is independently useful and testable.
- **Evidence-based** — features reflect Nippard / TNF / RP / Helms / Athlean-X consensus.
- **Backwards-compatible state** — bump the state version and migrate, never wipe user data.

*Reprioritize anytime — just say which item to pull forward.*
