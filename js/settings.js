"use strict";

import * as state from "./state.js";
import * as ui from "./ui.js";
import * as theme from "./theme.js";
import * as categories from "./categories.js";

let themeToggle;
let weeklyTargetInput;
let remindersToggle;
let exportDataButton;
let importDataButton;
let importDataInput;
let resetDataButton;

export function init() {
  categories.init();

  themeToggle = document.getElementById("settings-theme-toggle");
  weeklyTargetInput = document.getElementById("settings-weekly-target-input");
  remindersToggle = document.getElementById("settings-reminders-toggle");
  exportDataButton = document.getElementById("settings-export-data-button");
  importDataButton = document.getElementById("settings-import-data-button");
  importDataInput = document.getElementById("settings-import-data-input");
  resetDataButton = document.getElementById("settings-reset-data-button");

  themeToggle.checked = theme.getTheme() === "dark";

  themeToggle.addEventListener("change", () => {
    theme.toggleTheme();
  });

  weeklyTargetInput.addEventListener("change", () => {
    const hours = Number(weeklyTargetInput.value);

    if (!Number.isFinite(hours) || hours <= 0) {
      ui.toast("Συμπλήρωσε έγκυρο αριθμό ωρών.", "error");
      weeklyTargetInput.value = String(state.getPreferences().weeklyTargetMinutes / 60);
      return;
    }

    state.setPreferences({ weeklyTargetMinutes: Math.round(hours * 60) });
    ui.toast("Ο στόχος ενημερώθηκε.", "success");
  });

  remindersToggle.addEventListener("change", () => {
    state.setPreferences({ reminderNotificationsEnabled: remindersToggle.checked });
  });

  exportDataButton.addEventListener("click", exportData);
  document.getElementById("avatar-export-data-button").addEventListener("click", exportData);

  importDataButton.addEventListener("click", () => importDataInput.click());
  importDataInput.addEventListener("change", handleImportFile);

  resetDataButton.addEventListener("click", handleResetData);
}

function todayFileDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function exportData() {
  const json = state.exportStateSnapshot();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `my-time-tracker-backup-${todayFileDateKey()}.json`;
  document.body.append(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  ui.toast("Τα δεδομένα εξήχθησαν σε JSON.", "success");
}

function handleImportFile(event) {
  const file = event.target.files && event.target.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    const result = state.importStateSnapshot(String(reader.result));

    if (!result.ok) {
      ui.toast(result.error, "error");
    } else {
      ui.toast("Τα δεδομένα εισήχθησαν επιτυχώς.", "success");
    }

    importDataInput.value = "";
  };

  reader.onerror = () => {
    ui.toast("Αποτυχία ανάγνωσης αρχείου.", "error");
    importDataInput.value = "";
  };

  reader.readAsText(file);
}

async function handleResetData() {
  const confirmed = await ui.confirmDialog({
    title: "Διαγραφή όλων των δεδομένων",
    message: "Θα διαγραφούν όλες οι καταχωρήσεις, τα tasks του βοηθού και οι κατηγορίες σου. Η ενέργεια δεν αναιρείται. Συνέχεια;",
    confirmText: "Διαγραφή όλων",
    danger: true
  });

  if (!confirmed) {
    return;
  }

  state.resetAllData();
  ui.toast("Όλα τα δεδομένα διαγράφηκαν.", "success");
}

export function render() {
  themeToggle.checked = theme.getTheme() === "dark";

  const preferences = state.getPreferences();
  weeklyTargetInput.value = String(preferences.weeklyTargetMinutes / 60);
  remindersToggle.checked = preferences.reminderNotificationsEnabled;

  categories.render();
}
