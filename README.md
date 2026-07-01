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
| **Workout** | Your generated day with per-exercise **progressive-overload suggestions** (double progression), set-by-set weight × reps logging, an auto-starting **rest timer**, plate + warm-up calculator, exercise swap, and tap-for-info on every movement. |
| **Food** | Macro summary, one-tap **quick-add** common foods, custom entries, today's meal list. |
| **Library** | 74 exercises across every muscle group — searchable, each with a description, step-by-step cues, target muscles, rep range / RIR, and a science note. |
| **Progress** | Bodyweight trend, body measurements, estimated strength (e1RM), PR history with celebrations, cardio history, weekly volume. |
| **Setup** | Profile & goals, experience level, **auto-generate / re-roll** your program, equipment filter, export / import / reset data. |

## 💰 Finance mode

Built around one simple model: **fixed expenses stay the same every month** (you set
them up once), and **everything you log day-to-day is variable** — tracked against a
budget target and your own rolling average.

| Tab | What it does |
|-----|--------------|
| **Home** | This month's net cash flow (income − fixed − variable), a bills-paid tracker, any over-budget alerts, and recent transactions. |
| **Log** | Quick-add an expense or income entry (amount, category, note, date); see and delete this month's logged transactions. |
| **Bills** | Your recurring **fixed bills** list (rent, subscriptions, insurance, loans, etc.) — set up once with a name, amount, category, and due day. Check one off each month to log it as paid; the total always counts toward your monthly fixed obligation whether or not it's checked off. |
| **Budgets** | Set a monthly **target per category** for your variable spending, with a progress bar (green → yellow → red) comparing actual spend to target and to your historical average. Manage the currency symbol and add custom categories here too. |
| **Reports** | Monthly summary (income / fixed / variable / net / savings rate), a spending-by-category breakdown, and a 6-month net-cash-flow trend — pick any of the last 12 months. |

All figures are computed live from your logged transactions and fixed-bill list — nothing
needs a bank connection or the internet.

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
