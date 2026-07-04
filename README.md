# ⚓ Keel — Personal Finance

**Money on an even keel.** A private, installable phone app for tracking spending,
planning budgets, hitting savings goals, and growing an investment portfolio —
built as an offline-first PWA. No account, no server, no bank connection:
everything lives on your device.

**Live app:** https://brookskemory-ops.github.io/workout/

## 📲 Install on your phone

### iPhone (Safari)
1. Open the link in **Safari** → tap **Share** → **Add to Home Screen** → **Add**.

### Android (Chrome)
1. Open the link in **Chrome** → **⋮** menu → **Install app**.

Works offline after the first load. Updates arrive automatically on the next
online open.

## What's inside

| Surface | What it does |
|---|---|
| **Home** | The month at a glance: net cash-flow hero, overdue / due-soon bill nudges with one-tap "mark paid", payday reminders with one-tap paycheck logging, net-worth card with trend, a spending donut, a 6-month cash-flow chart, per-category trends, goal & portfolio teasers, recent activity. Step back through any past month. |
| **Activity** | Every transaction, grouped by day, for any month — with search, type and category filters, and full **editing** (amount, category, note, date) by tapping any row. |
| **➕ (center button)** | Quick-log from anywhere: big amount pad, day-to-day categories first, remembers your last-used category, and shows the category's remaining budget live as you pick. |
| **Plan → Budgets** | Expected income (any pay frequency, with a payday anchor for reminders) and per-category budgets — fixed $ or % of income, with commonly-cited guideline ranges and one-tap "Use X%". **A budget is the total plan for its category, bills included**, so a rent bill and a rent budget never double-count. The overview shows exactly what's left each month and grades it against the ~20% savings guideline. |
| **Plan → Bills** | Recurring bills set up once; check them off monthly. Marking paid logs a real transaction dated the bill's **due day in the month you're viewing**. |
| **Plan → Goals** | Savings goals and sinking funds with pacing math ("need $X/mo to hit your date"), plus a debt payoff planner (avalanche/snowball, extra-payment cascade, debt-free date, total interest). |
| **Invest** | A 6-question risk quiz → Conservative / Balanced / Growth / Aggressive model portfolio across US stocks, international stocks, bonds, cash, and a small crypto slice (capped ~10%), with example low-cost index ETFs and a ~70/30 BTC/ETH split. The monthly amount auto-derives from your budget leftover. Track holdings with live prices — crypto via CoinGecko (no key), stocks via a free [finnhub.io](https://finnhub.io) key — plus gain/loss, an actual-vs-target drift view, and portfolio value over time. Safety gates: money needed within ~3 years caps the plan at Conservative; no emergency fund caps it at Balanced. |
| **Settings (⚙)** | Currency, custom categories, and the data-safety suite: **JSON backup/restore, CSV transaction export, a rolling week of automatic on-device snapshots**, and backup reminders. |

> ⚠️ Budget guidelines and investing suggestions are commonly-cited rules of
> thumb for educational use — **not personalized financial advice**.

## 🔒 Data & privacy

- Everything is stored in your browser's localStorage under the key `keel.v1`.
- The **only** network calls are optional live price lookups (CoinGecko /
  Finnhub); prices are cached on-device so the app works fully offline.
- **Back up regularly** (Settings → Download full backup) — device storage can
  be cleared by the OS. Keel also keeps a rolling 7-day snapshot ring on-device
  and nudges you when a backup is overdue.
- Migrating from the old Monster Mode dual app? Keel imports your finance data
  automatically on first load and leaves the old `monsterMode.v1` blob
  untouched, so the fitness side can become its own app later.

## 🛠 Development

Vanilla JS, no build step. `js/data.js` (pure logic) and `js/charts.js`
(SVG geometry) are unit-tested under node:

```sh
node tests/data.test.js
node tests/charts.test.js
```

Script load order in `index.html` is a real dependency chain:
`data → state → ui → charts → views → app`. When you change any cached asset,
bump `CACHE` in `sw.js` so installed clients pick it up.

## 🚀 Deploying

GitHub Pages serves the repo root. Merge to `main`, then make sure the Pages
source branch (Settings → Pages) points at `main` — done.
