# 🗺️ Monster Mode — Build Roadmap

A living plan for growing the dashboard. We build in **phases**, shipping small and
often. Everything stays **100% offline / local** (no account, no server) — backups via
JSON export. Decisions locked in with the owner:

- **Default units:** imperial (lb, ft/in). kg/cm optional.
- **Default split / volume:** PPL 6-day, advanced.
- **Data model:** local `localStorage`, single versioned state object.
- **Food database:** bundled offline list + search (no barcode/online API, by design).

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

## 🚧 Phase 1 — Daily-driver quality of life
High-value, self-contained, used every session.
1. **Exercise swap button** 🚧 — sub any movement mid-workout for another that hits the
   same muscle (equipment-aware). Persists into the program.
2. **Plate + warm-up calculator** ✅ — for a target working weight, shows the exact plate
   loadout per side and an auto-generated warm-up ramp (bar → 50% → 70% → 85% → work).
   Configurable bar weight; unit-aware plate set.
3. **PR detection + celebrations** ⏳ — auto-detect personal records (top weight, rep PR,
   estimated 1RM) on save and celebrate them; store a PR history.
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
