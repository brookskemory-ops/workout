# 🦍 Monster Mode — Personal Dashboard

A private, installable phone dashboard with two modes, chosen every time you open the
app: **Fitness** (log food, track workouts, auto-generate balanced routines with
progressive-overload coaching) and **Finance** (track every expense, fixed bills,
income, and budgets). Built as an offline-first PWA (Progressive Web App) — no account,
no server, all your data stays on your phone.

Fitness training principles draw on **Jeff Nippard's** evidence-based hypertrophy work
(10–20 hard sets per muscle per week, train each muscle 2–3×, emphasize the stretched
position, leave 1–3 reps in reserve, progressive overload) and **TNF / Joel Twinem's**
natural-lifting philosophy (keep it simple, stable and loadable; clean exercise order;
low systemic fatigue; run the plan for months with small tweaks).

---

## 🚀 One-time: turn on GitHub Pages

GitHub won't let an automated token flip Pages on for you, so this is a single
manual click (then it stays on forever):

1. Go to the repo on GitHub → **Settings** → **Pages**.
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Set the branch to **`main`** and the folder to **`/ (root)`**, then **Save**.
4. Wait ~1 minute. Your app is now live at
   **`https://brookskemory-ops.github.io/workout/`** and auto-updates whenever a
   roadmap phase merges into `main`.

*(Prefer an Actions-based deploy instead? Set Source to "GitHub Actions" and run the
included `Deploy to GitHub Pages` workflow from the Actions tab.)*

## 📲 Add it to your phone's home screen

Once it's live at `https://brookskemory-ops.github.io/workout/`:

### iPhone (Safari)
1. Open the link in **Safari**.
2. Tap the **Share** button (square with an arrow).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**. The 🦍 icon now lives on your home screen and opens full-screen like an app.

### Android (Chrome)
1. Open the link in **Chrome**.
2. Tap the **⋮** menu (top right).
3. Tap **Install app** / **Add to Home screen** → **Install**.

Because it's a PWA with a service worker, it works **offline** after the first load.

---

## 🚦 Choosing a mode

Every time you open the app, you land on a picker: **Fitness** or **Finance**. Pick one
and you get that mode's dashboard and bottom tab bar for the rest of the session. A
**🔀 Switch app** button (in Fitness → Setup, or Finance → Budgets) brings the picker
back anytime without needing to reload.

## 💪 Fitness mode

| Tab | What it does |
|-----|--------------|
| **Home** | Next workout, calories & protein vs. goal, day streak, water / steps / cardio quick-log, this-week's volume per muscle, daily training principle. |
| **Workout** | Your program's day with per-exercise **progressive-overload suggestions** (double progression), set-by-set weight × reps logging, an auto-starting **rest timer**, plate + warm-up calculator, **exercise swap to anything in the library** (not restricted to the same muscle), tap-for-info on every movement, and an **"+ Add exercise from library"** button (plus a remove button on every card) so you can freely add or drop exercises for today regardless of what's in your saved program. No program at all yet? Tap **"Or just start today"** to log a fully freeform session by picking exercises straight from the library. |
| **Food** | Macro summary, one-tap **quick-add** common foods, custom entries, today's meal list. |
| **Library** | 74 exercises across every muscle group — searchable, each with a description, step-by-step cues, target muscles, rep range / RIR, and a science note. |
| **Progress** | Bodyweight trend, body measurements, estimated strength (e1RM), PR history with celebrations, cardio history, weekly volume. |
| **Setup** | Profile & goals, experience level, **auto-generate / re-roll** your program, a **Program Builder** to create your own workout by hand (any exercise, any day), equipment filter, export / import / reset data. |

### Building your own program

Setup → **Build your own program** (or **Edit in Program Builder** if you already have
one) opens a builder where you can:
- Name the program and add/remove days freely.
- Add **any exercise from the full 74-move library to any day** — there's no muscle-group
  restriction, so an arm day can include calves, a "pull" day can include quads, etc.
- Edit the sets and rep range for each exercise inline.

A hand-built program runs through the exact same workout logger, progression
suggestions, plate calculator, and weekly-volume coverage report as an auto-generated
one — it's just built by you instead of the algorithm.

## 💰 Finance mode

Built around one simple model: **fixed expenses stay the same every month** (you set
them up once), and **everything you log day-to-day is variable** — tracked against a
budget target and your own rolling average.

| Tab | What it does |
|-----|--------------|
| **Home** | This month's net cash flow (income − fixed − variable), a bills-paid tracker, any over-budget alerts, a quick-glance at your nearest goal, and recent transactions. |
| **Log** | Quick-add an expense or income entry (amount, category, note, date); see and delete this month's logged transactions. Tied into Budgets — picking a category shows its budget and how much is left live, and a "Category budgets this month" list keeps every budgeted category visible at a glance while you log. |
| **Bills** | Your recurring **fixed bills** list (rent, subscriptions, insurance, loans, etc.) — set up once with a name, amount, category, and due day. Check one off each month to log it as paid; the total always counts toward your monthly fixed obligation whether or not it's checked off. |
| **Goals** | **Savings goals** (Emergency Fund, Vacation, etc.) with an optional target date — log contributions and see a progress bar plus the $/month pace needed to hit your date, with an on-track/behind indicator. **Sinking funds** cover predictable-but-irregular costs (annual insurance, holiday gifts): set a target, contribute over time, then "spend it" to log the real expense and reset the fund for its next cycle. Also includes a **debt payoff planner** — add loans/cards with balance, APR, and minimum payment, choose avalanche (highest APR first, least total interest) or snowball (smallest balance first, faster early wins), add an extra monthly payment, and see a month-by-month payoff timeline and total interest. |
| **Budgets** | Set an **expected monthly income** and see exactly how much is left for savings after fixed bills and every category budget — with a savings-rate status message against the common ~20% guideline. Each category budget can be a fixed **$** amount or a **% of income** that recomputes automatically as income changes, with a **recommended % range** (e.g. Groceries 10–15%) and a one-tap "Use X%" button. Variable-spending categories are separated from fixed-bill categories (already tracked via Bills). Manage the currency symbol and add custom categories here too. |
| **Reports** | Monthly summary (income / fixed / variable / net / savings rate), a spending-by-category breakdown, and a 6-month net-cash-flow trend — pick any of the last 12 months. |

All figures are computed live from your logged transactions, fixed-bill list, goals, and
debts — nothing needs a bank connection or the internet.

### Percentage-based budgets

Each category budget in **Budgets** can work two ways:
- **Fixed $** — a flat monthly cap, same every month.
- **% of income** — a share of your **expected income** (auto-suggested from your logged
  income, or set it yourself). The dollar target recomputes automatically whenever your
  expected income changes.

Every category shows a **recommended percentage range** (e.g. Groceries 10–15%, Rent
25–35%) based on commonly-cited financial-planning guidelines — not personalized advice,
just a sane starting point. Tap **"Use X%"** to apply the midpoint instantly, then adjust.

**Pick your pay frequency** — Weekly, Biweekly, Semi-monthly, Monthly, or Annually — and
enter the amount for *one pay period* (e.g. one biweekly paycheck). Everything converts
to a monthly-equivalent automatically, and each category budget also shows a **"≈
$X/paycheck"** figure so you know how much to set aside from the check that just landed.
Logging an income entry for "Paycheck" in the Log tab even pre-fills the amount from this
for you.

The overview at the top of Budgets shows **exactly how much is left for savings**:
`income − fixed bills − every category budget`, with a status message against the common
~20% savings-rate guideline, and a one-tap way to log that leftover as a contribution to
any active savings goal.

## 🧠 How the auto-generator works

1. Pick a **split** (Full-Body 3d, Upper/Lower 4d, **PPL 6d**, or TNF-style 4d) and your
   available **equipment**.
2. The generator fills each training day from the library, then runs a
   **volume-balancing pass**: it tops up any muscle that's below its weekly minimum
   (scaled to your experience level) so **every group gets trained enough**, at a
   frequency of 2×+ per week.
3. The **coverage report** shows planned weekly sets vs. target for each muscle so you
   can see the balance at a glance. Hit **re-roll** any time for fresh exercise variety.

**Progressive overload (double progression):** work within the prescribed rep range at
the target RIR. When you hit the **top** of the range across your sets, the app tells you
to add weight (jump size scales with experience — advanced lifters micro-load). Otherwise
it tells you to beat your previous reps.

## 🗂 Project structure

```
index.html              app shell + mode-aware bottom nav
css/styles.css          mobile-first dark theme
js/exercises.js         exercise library + muscle/volume targets
js/generator.js         split templates, balancing pass, progression engine
js/finance.js           expense/income categories + date helpers
js/app.js               UI, routing (Fitness/Finance launcher), logging, localStorage state
manifest.webmanifest    PWA manifest (installability)
sw.js                   service worker (offline cache)
icons/                  app icons
```

## 🔒 Your data

Everything is stored in your browser's **localStorage** on your device. Nothing is sent
anywhere. Use **Setup → Export** to back up a JSON file, and **Import** to restore it
(e.g. when moving to a new phone).

## 🌿 Development workflow

- **`main`** — stable, reviewed mainline. GitHub Pages serves this; your installed
  app updates when work merges here.
- **`claude/fitness-dashboard-workout-library-467mrd`** — active development branch.
- Each [roadmap](ROADMAP.md) phase ships as its own **pull request into `main`** so you
  can review before it goes live.

## 🛠 Run locally

```bash
# from the repo root
python3 -m http.server 8099
# then open http://localhost:8099 in a browser
```

---

*This app is an informational training tool, not medical advice. Warm up, use good form,
and consult a professional if you're new to lifting or have any health concerns.*
