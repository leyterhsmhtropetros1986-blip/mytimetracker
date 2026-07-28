"use strict";

import * as state from "./state.js";
import * as ui from "./ui.js";
import * as theme from "./theme.js";
import * as router from "./router.js";
import * as search from "./search.js";
import * as notificationsModule from "./notifications.js";
import * as calendarModule from "./calendar.js";
import * as entriesModule from "./entries.js";
import * as timerModule from "./timer.js";
import * as assistantModule from "./assistant.js";
import * as dashboardModule from "./dashboard.js";
import * as timelineModule from "./timeline.js";
import * as tasksModule from "./tasks.js";
import * as reportsModule from "./reports.js";
import * as statisticsModule from "./statistics.js";
import * as settingsModule from "./settings.js";
import { formatLongDate, isoWeekNumber } from "./utils.js";

const ROUTE_META = {
  dashboard: { title: "Πίνακας Ελέγχου", icon: "🏠", subtitle: "Επισκόπηση της παραγωγικότητάς σου" },
  calendar: { title: "Ημερολόγιο", icon: "📅", subtitle: "Δες και προγραμμάτισε τον χρόνο σου ανά ημέρα" },
  timeline: { title: "Χρονογραμμή", icon: "🧭", subtitle: "Χρονολογική προβολή της επιλεγμένης ημέρας" },
  tasks: { title: "Εργασίες", icon: "✅", subtitle: "Όλα τα tasks με φίλτρα και αναζήτηση" },
  reports: { title: "Αναφορές", icon: "📄", subtitle: "Σύνοψη περιόδου και εξαγωγή δεδομένων" },
  statistics: { title: "Στατιστικά", icon: "📊", subtitle: "Βαθιά ανάλυση της απόδοσής σου" },
  assistant: { title: "AI Βοηθός", icon: "✨", subtitle: "Πρόγραμμα ημέρας με τη βοήθεια του βοηθού" },
  settings: { title: "Ρυθμίσεις", icon: "⚙️", subtitle: "Κατηγορίες, στόχοι και δεδομένα" },
  support: { title: "Υποστήριξη", icon: "💬", subtitle: "Συχνές ερωτήσεις και συντομεύσεις" }
};

const ROUTE_RENDERERS = {
  dashboard: () => dashboardModule.render(),
  calendar: () => {
    calendarModule.render();
    entriesModule.render();
  },
  timeline: () => timelineModule.render(),
  tasks: () => tasksModule.render(),
  reports: () => reportsModule.render(),
  statistics: () => statisticsModule.render(),
  assistant: () => assistantModule.render(),
  settings: () => settingsModule.render(),
  support: () => {}
};

/**
 * Rendering είναι scoped στη σελίδα που βλέπεις (route-based), όχι global σε
 * κάθε αλλαγή state — αποφεύγει άχρηστα re-renders (π.χ. typing σε φίλτρο του
 * Tasks δεν ξαναζωγραφίζει τα charts του Dashboard).
 */
function renderActivePage() {
  const route = router.getCurrentRoute();
  const renderer = ROUTE_RENDERERS[route];

  if (renderer) {
    renderer();
  }

  notificationsModule.render();
  timerModule.refreshCategoryOptions();
}

function initializeApplication() {
  const currentDateElement = document.getElementById("current-date");
  const now = new Date();
  currentDateElement.textContent = `${formatLongDate(now)} · Εβδομάδα ${isoWeekNumber(now)}`;

  theme.init();
  ui.initShell();

  calendarModule.init();
  entriesModule.init();
  timerModule.init();
  assistantModule.init();
  dashboardModule.init();
  timelineModule.init();
  tasksModule.init();
  reportsModule.init();
  statisticsModule.init();
  settingsModule.init();

  search.init();
  notificationsModule.init();

  Object.keys(ROUTE_META).forEach((routeName) => {
    router.registerRoute(routeName, {
      ...ROUTE_META[routeName],
      onEnter: () => renderActivePage()
    });
  });

  router.init({ initialRoute: "dashboard" });

  state.onChange(renderActivePage);

  renderActivePage();

  registerServiceWorker();
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.error("Αποτυχία εγγραφής service worker:", error);
    });
  });
}

initializeApplication();
