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

## ⏳ Ideas for future phases
- Recurring income beyond paycheck (rental, side gigs) and bill
  auto-logging on due day (opt-in)
- Category rules ("notes containing 'uber' → Transport")
- Multi-currency / currency conversion for holdings
- Budget rollover ("envelope" mode: unspent carries to next month)
- Custom category icons & colors
- Import CSV (bank statement mapping)
- Reports: year view, income vs expenses stacked chart, tax-time summary
- Invest: more coins via CoinGecko search, dividend tracking, benchmarks
- Split the old fitness app into its own repo/PWA reading `monsterMode.v1`
