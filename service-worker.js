"use strict";

/**
 * Ανέβασε τον αριθμό όταν αλλάζουν precached αρχεία ώστε οι χρήστες να
 * παίρνουν πάντα τη νέα έκδοση και τα παλιά caches να καθαρίζονται.
 */
const CACHE_VERSION = "v5";
const CACHE_NAME = `mytimetracker-${CACHE_VERSION}`;

const APP_SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/tokens.css",
  "./css/base.css",
  "./css/components.css",
  "./css/forms.css",
  "./css/shell.css",
  "./css/calendar.css",
  "./css/timeline.css",
  "./css/tasks.css",
  "./css/reports.css",
  "./css/statistics.css",
  "./css/assistant.css",
  "./css/settings.css",
  "./css/dashboard.css",
  "./css/auth.css",
  "./css/responsive.css",
  "./js/app.js",
  "./js/state.js",
  "./js/storage.js",
  "./js/theme.js",
  "./js/router.js",
  "./js/supabase.js",
  "./js/auth.js",
  "./js/auth-guard.js",
  "./js/cloud-storage.js",
  "./js/charts.js",
  "./js/calendar.js",
  "./js/entries.js",
  "./js/timer.js",
  "./js/assistant.js",
  "./js/dashboard.js",
  "./js/timeline.js",
  "./js/tasks.js",
  "./js/reports.js",
  "./js/statistics.js",
  "./js/categories.js",
  "./js/settings.js",
  "./js/search.js",
  "./js/notifications.js",
  "./js/ui.js",
  "./js/utils.js",
  "./assets/icons/icon.svg"
];

/* Εγκατάσταση: precache του app shell */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

/* Ενεργοποίηση: διαγραφή κάθε παλιότερου cache αυτής της εφαρμογής */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith("mytimetracker-") && cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

/*
 * Network-first για το app shell (HTML/CSS/JS/manifest/icons) ώστε ο χρήστης
 * να βλέπει πάντα τις τελευταίες αλλαγές όταν έχει σύνδεση, με αυτόματο
 * offline fallback στην cached έκδοση όταν δεν έχει.
 *
 * Requests προς άλλο origin (π.χ. τα CDN scripts για Excel/PDF export) ΔΕΝ
 * παρεμποδίζονται καθόλου εδώ — φεύγουν κανονικά στο δίκτυο χωρίς να μπαίνουν
 * σε cache, αφού χρειάζονται μόνο on-demand τη στιγμή του export.
 */
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseCopy = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseCopy);
          });
        }

        return networkResponse;
      })
      .catch(() =>
        caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          if (request.mode === "navigate") {
            return caches.match("./index.html");
          }

          return new Response("Η εφαρμογή δεν είναι διαθέσιμη offline.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
          });
        })
      )
  );
});
