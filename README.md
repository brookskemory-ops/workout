# 🦍 Monster Mode — Personal Fitness Dashboard

A private, installable phone dashboard to **log food, track workouts, and auto-generate
balanced routines** with progressive-overload coaching. Built as an offline-first PWA
(Progressive Web App) — no account, no server, all your data stays on your phone.

Training principles draw on **Jeff Nippard's** evidence-based hypertrophy work
(10–20 hard sets per muscle per week, train each muscle 2–3×, emphasize the stretched
position, leave 1–3 reps in reserve, progressive overload) and **TNF / Joel Twinem's**
natural-lifting philosophy (keep it simple, stable and loadable; clean exercise order;
low systemic fatigue; run the plan for months with small tweaks).

---

## 📲 Add it to your phone's home screen

The app is hosted on **GitHub Pages**. Once it's live at
`https://brookskemory-ops.github.io/workout/`:

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

## 💪 What's inside

| Tab | What it does |
|-----|--------------|
| **Home** | Next workout, calories & protein vs. goal, day streak, water / steps / cardio quick-log, this-week's volume per muscle, daily training principle. |
| **Workout** | Your generated day with per-exercise **progressive-overload suggestions** (double progression), set-by-set weight × reps logging, an auto-starting **rest timer**, and tap-for-info on every movement. |
| **Food** | Macro summary, one-tap **quick-add** common foods, custom entries, today's meal list. |
| **Library** | 36 exercises across every muscle group — searchable, each with a description, step-by-step cues, target muscles, rep range / RIR, and a science note. |
| **Progress** | Bodyweight trend, body measurements (chest / arms / waist / thighs), estimated strength (e1RM) on the big lifts, cardio history, weekly volume. |
| **Setup** | Profile & goals, experience level, **auto-generate / re-roll** your program, equipment filter, export / import / reset data. |

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
index.html              app shell + bottom nav
css/styles.css          mobile-first dark theme
js/exercises.js         exercise library + muscle/volume targets
js/generator.js         split templates, balancing pass, progression engine
js/app.js               UI, routing, logging, localStorage state
manifest.webmanifest    PWA manifest (installability)
sw.js                   service worker (offline cache)
icons/                  app icons
```

## 🔒 Your data

Everything is stored in your browser's **localStorage** on your device. Nothing is sent
anywhere. Use **Setup → Export** to back up a JSON file, and **Import** to restore it
(e.g. when moving to a new phone).

## 🛠 Run locally

```bash
# from the repo root
python3 -m http.server 8099
# then open http://localhost:8099 in a browser
```

---

*This app is an informational training tool, not medical advice. Warm up, use good form,
and consult a professional if you're new to lifting or have any health concerns.*
