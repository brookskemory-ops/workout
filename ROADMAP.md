# 🗺️ Keel — Roadmap

Keel shipped as a ground-up, finance-only rebuild of the old dual-mode
"Monster Mode" app (the fitness half will become its own separate app;
its data stays untouched in `monsterMode.v1` and its code lives on in git
history — tag `fitness-final` / pre-revamp `main`).

Principles: offline-first, no account, no build step, data stays on-device,
back up via JSON. Rules of thumb, never financial advice.

## ✅ Shipped — the Keel rebuild
- New identity (name, mark, icons, dark-navy + mint design system, tabular
  numerals, real SVG charts: donut, area, sparklines)
- 5-slot navigation with center ➕ quick-log sheet (last-used category,
  live budget hint)
- Home: month stepper, cash-flow hero, bill due/overdue nudges, payday
  reminders + one-tap paycheck log, net-worth card, spending donut,
  6-month cash-flow trend, per-category trend
- Activity: day-grouped browsing of any month with search, filters, and
  full transaction editing
- Corrected budget math: a category budget = total planned spend including
  bills (no more rent double-count); single savings-capacity figure shared
  with Invest
- Bills: due-day-aware paid logging in any viewed month
- Goals & debts: pacing, sinking funds, payoff planner
- Invest: parallel price fetches with timeouts, 15-minute auto-refresh,
  daily portfolio/net-worth snapshots + value-over-time chart
- Data safety: JSON backup/restore, CSV export, rolling 7-day snapshot
  ring, backup nudges; local-time date handling throughout
- First-run onboarding (currency → income/payday → starter budgets)
- One-time migration from `monsterMode.v1` (non-destructive)

## ✅ Shipped — Keel v2
- **Bank sync** via SimpleFIN Bridge — zero-server, browser-CORS verified;
  setup-token claim or pasted access URL; 6-hour auto-sync; balances in net
  worth; pending transactions skipped; per-transaction dedupe
- **Inbox** triage for imported/synced transactions — tap or drag-to-chip,
  suggested categories, implicit rule creation
- **CSV import wizard** — column auto-detection (incl. split debit/credit),
  date-format guessing, EU/US amount parsing, duplicate skipping
- **Auto-categorization rules** (substring match), managed in Settings,
  learned from Inbox decisions
- **Undo** on every delete (transactions incl. bulk, bills, goals, debts,
  holdings, rules)
- **Bulk edit** in Activity (multi-select → recategorize / delete)
- **Autopay bills** + **paycheck auto-log** boot sweeps, queued into a
  **monthly recap** sheet (confetti on green months)
- **Envelope rollover budgets** (carry surplus & deficit, 24-month window)
- **PIN lock** (WebCrypto-hashed, background relock, cooldown after 5 fails)
- **Light theme** + system-follow, **haptics**, **PWA shortcuts**
  (long-press icon → Log expense/income), **Year in Review** report

## ✅ Shipped — Keel v3 (competitive parity pass)
Benchmarked against Rocket Money, Monarch, Copilot, and YNAB:
- **Subscription radar** — recurring-charge detection from history (cadence
  classification, amount clustering, price-increase flags, next-renewal
  dates), renewal nudges, one-tap promote-to-bill or ignore
- **Cash-flow forecast** — month trajectory curve (actuals + expected
  paydays/bills/renewals + avg daily spend), projected month end, "safe to
  spend $X/day", and a money **calendar** view
- **Deeper insights** — unusual-spending alerts (pace vs your own average),
  top merchants, income→categories flow chart (month + year), category
  month-over-month deltas
- **Power tools** — split transactions across categories (undo-able),
  all-months search, `#hashtag` note tags, automatic merchant-name cleanup
  on imports (raw descriptor preserved for search/rules)

## ✅ Shipped — Keel v3.1 (live bank sync)
- Hourly auto-sync while the app is in use: on open, on returning to the
  foreground, and on a slow foreground timer — under a visible daily rate
  budget honoring SimpleFIN's 24/day cap (auto stops at 20, manual at 24)
- Pull-to-refresh on every view (bank sync + price refresh)
- "N new transactions → Sort" toast whenever a sync lands anything
- Bank status chip on Home/Activity ("synced 12m ago", tap to sync,
  spins while in flight)
- Link-your-bank promo card on Home for unconnected users (dismissible),
  auto-sync toggle + daily-budget readout in Settings

## ⏳ Ideas for future phases
- Recurring income beyond paycheck (rental, side gigs)
- Multi-currency / currency conversion for holdings
- Custom category icons & colors
- Invest: more coins via CoinGecko search, dividend tracking, benchmarks,
  FIRE/compound-growth projector
- Split the old fitness app into its own repo/PWA reading `monsterMode.v1`
