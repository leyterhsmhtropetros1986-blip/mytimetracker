"use strict";

const routes = new Map();
let currentRoute = null;
let defaultRoute = "dashboard";

function parseRouteFromHash() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  return hash || defaultRoute;
}

function applyRoute(routeName) {
  const targetRoute = routes.has(routeName) ? routeName : defaultRoute;

  document.querySelectorAll(".page").forEach((page) => {
    page.hidden = page.dataset.page !== targetRoute;
  });

  document.querySelectorAll("[data-route]").forEach((link) => {
    const isActive = link.dataset.route === targetRoute;
    link.classList.toggle("active", isActive);
    link.setAttribute("aria-current", isActive ? "page" : "false");
  });

  const previousRoute = currentRoute;
  currentRoute = targetRoute;

  const routeConfig = routes.get(targetRoute);

  if (routeConfig && typeof routeConfig.onEnter === "function") {
    routeConfig.onEnter({ previousRoute });
  }

  document.body.classList.remove("sidebar-open");

  const pageTitleElement = document.getElementById("page-title");

  if (pageTitleElement && routeConfig && routeConfig.title) {
    pageTitleElement.textContent = routeConfig.title;
  }

  updateContentToolbar(targetRoute, routeConfig);
}

/**
 * Ενημερώνει το contextual toolbar κάτω από το topbar: σύντομο πλαίσιο για την
 * τρέχουσα σελίδα + εμφάνιση μόνο των actions που αφορούν αυτή τη σελίδα
 * (στοιχεία με [data-toolbar-for] που περιέχει το route name στη λίστα τους).
 */
function updateContentToolbar(targetRoute, routeConfig) {
  const contextElement = document.getElementById("content-toolbar-context");

  if (contextElement) {
    const icon = routeConfig && routeConfig.icon ? `${routeConfig.icon} ` : "";
    const subtitle = (routeConfig && routeConfig.subtitle) || "";
    contextElement.textContent = `${icon}${subtitle}`;
  }

  document.querySelectorAll("[data-toolbar-for]").forEach((element) => {
    const allowedRoutes = element.dataset.toolbarFor.split(",").map((route) => route.trim());
    element.hidden = !allowedRoutes.includes(targetRoute);
  });
}

export function registerRoute(name, config = {}) {
  routes.set(name, config);
}

export function navigate(routeName) {
  if (window.location.hash === `#/${routeName}`) {
    applyRoute(routeName);
    return;
  }

  window.location.hash = `#/${routeName}`;
}

export function getCurrentRoute() {
  return currentRoute;
}

export function init({ initialRoute } = {}) {
  defaultRoute = initialRoute || defaultRoute;

  document.querySelectorAll("[data-route]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      navigate(link.dataset.route);
    });
  });

  window.addEventListener("hashchange", () => {
    applyRoute(parseRouteFromHash());
  });

  applyRoute(parseRouteFromHash());
}
