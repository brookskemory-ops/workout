/* ============================================================================
 * KEEL — boot. Routes registry + startup. All views are defined by the
 * files loaded before this one (see index.html script order).
 * ==========================================================================*/

// route -> {render, wire, tab (which tab-bar item to highlight)}
const ROUTES = {
  home:       { render: renderHome,       wire: wireHome,       tab: "home" },
  activity:   { render: renderActivity,   wire: wireActivity,   tab: "activity" },
  plan:       { render: renderPlan,       wire: wirePlan,       tab: "plan" },
  "plan-bills": { render: renderPlan,     wire: wirePlan,       tab: "plan" },
  "plan-goals": { render: renderPlan,     wire: wirePlan,       tab: "plan" },
  invest:     { render: renderInvest,     wire: wireInvest,     tab: "invest" },
  inbox:      { render: renderInbox,      wire: wireInbox,      tab: "activity" },
  year:       { render: renderYear,       wire: wireYear,       tab: "home" },
  settings:   { render: renderSettings,   wire: wireSettings,   tab: null },
  welcome:    { render: renderOnboarding, wire: wireOnboarding, tab: null },
};

applyTheme();
buildTabBar();
runAutomations();
render();
lockOnBootIfEnabled().then(() => {
  if (state.settings.onboarded) maybeShowMonthlyRecap();
  // PWA home-screen shortcut: ?action=log-expense / log-income
  const action = new URLSearchParams(location.search).get("action");
  if (action) {
    history.replaceState(null, "", location.pathname + location.hash);
    if (action === "log-expense") openQuickLog("expense");
    if (action === "log-income") openQuickLog("income");
  }
});

// Service worker: offline support + auto-update. A fresh deploy takes over
// on next open (skipWaiting + claim in sw.js) and reloads once.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then((reg) => {
      reg.update().catch(() => {});
      let reloading = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloading) return;
        reloading = true;
        window.location.reload();
      });
    }).catch(() => {});
  });
}
