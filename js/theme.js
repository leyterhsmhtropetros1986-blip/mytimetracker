"use strict";

const THEME_STORAGE_KEY = "mytimetracker_theme";

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch (error) {
    return null;
  }
}

function getPreferredTheme() {
  const stored = getStoredTheme();

  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

let currentTheme = getPreferredTheme();
let toggleButton = null;

function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute("data-theme", theme);

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    /* localStorage μπορεί να μην είναι διαθέσιμο (private mode) — αγνόησέ το */
  }

  if (toggleButton) {
    toggleButton.setAttribute("aria-pressed", String(theme === "dark"));
    toggleButton.textContent = theme === "dark" ? "☀️" : "🌙";
    toggleButton.setAttribute(
      "aria-label",
      theme === "dark" ? "Ενεργοποίηση φωτεινού θέματος" : "Ενεργοποίηση σκοτεινού θέματος"
    );
  }
}

export function getTheme() {
  return currentTheme;
}

export function toggleTheme() {
  applyTheme(currentTheme === "dark" ? "light" : "dark");
}

export function init() {
  toggleButton = document.getElementById("theme-toggle-button");
  applyTheme(currentTheme);

  if (toggleButton) {
    toggleButton.addEventListener("click", toggleTheme);
  }

  if (!getStoredTheme()) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
      if (!getStoredTheme()) {
        applyTheme(event.matches ? "dark" : "light");
      }
    });
  }
}

/* Εφαρμόζεται αμέσως στο import (πριν καν τρέξει DOMContentLoaded) ώστε να μην
   υπάρχει flash λάθος θέματος κατά το πρώτο render. */
document.documentElement.setAttribute("data-theme", currentTheme);
