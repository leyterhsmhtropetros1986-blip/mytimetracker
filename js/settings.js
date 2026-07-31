"use strict";

import * as state from "./state.js";
import * as ui from "./ui.js";
import * as theme from "./theme.js";
import * as categories from "./categories.js";
import * as auth from "./auth.js";

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

let themeToggle;
let scheduleInputs = {};
let scheduleTotalElement;
let remindersToggle;
let exportDataButton;
let importDataButton;
let importDataInput;
let resetDataButton;
let accountEmailElement;
let logoutButton;
let cachedAccountEmail = "";

export function init() {
  categories.init();

  themeToggle = document.getElementById("settings-theme-toggle");

  WEEKDAY_KEYS.forEach((day) => {
    scheduleInputs[day] = document.getElementById(`schedule-${day}`);
  });

  scheduleTotalElement = document.getElementById("schedule-total-hours");
  remindersToggle = document.getElementById("settings-reminders-toggle");
  exportDataButton = document.getElementById("settings-export-data-button");
  importDataButton = document.getElementById("settings-import-data-button");
  importDataInput = document.getElementById("settings-import-data-input");
  resetDataButton = document.getElementById("settings-reset-data-button");
  accountEmailElement = document.getElementById("settings-account-email");
  logoutButton = document.getElementById("settings-logout-button");

  logoutButton.addEventListener("click", handleLogout);

  auth.getSession().then((session) => {
    cachedAccountEmail = (session && session.user && session.user.email) || "";
    accountEmailElement.textContent = cachedAccountEmail || "—";
  });

  themeToggle.checked = theme.getTheme() === "dark";

  themeToggle.addEventListener("change", () => {
    theme.toggleTheme();
  });

  WEEKDAY_KEYS.forEach((day) => {
    scheduleInputs[day].addEventListener("change", () => handleScheduleChange(day));
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

function handleScheduleChange(day) {
  const input = scheduleInputs[day];
  const hours = Number(input.value);

  if (!Number.isFinite(hours) || hours < 0) {
    ui.toast("Συμπλήρωσε έγκυρο αριθμό ωρών.", "error");
    input.value = String(state.getPreferences().weeklySchedule[day] / 60);
    return;
  }

  const weeklySchedule = { ...state.getPreferences().weeklySchedule, [day]: Math.round(hours * 60) };
  state.setPreferences({ weeklySchedule });
  ui.toast("Το ωράριο ενημερώθηκε.", "success");
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

async function handleLogout() {
  const confirmed = await ui.confirmDialog({
    title: "Αποσύνδεση",
    message: "Θα αποσυνδεθείς από τον λογαριασμό σου σε αυτή τη συσκευή. Συνέχεια;",
    confirmText: "Αποσύνδεση"
  });

  if (!confirmed) {
    return;
  }

  await auth.signOut();
  window.location.reload();
}

export function render() {
  accountEmailElement.textContent = cachedAccountEmail || "—";
  themeToggle.checked = theme.getTheme() === "dark";

  const preferences = state.getPreferences();

  WEEKDAY_KEYS.forEach((day) => {
    if (document.activeElement !== scheduleInputs[day]) {
      scheduleInputs[day].value = String(preferences.weeklySchedule[day] / 60);
    }
  });

  scheduleTotalElement.textContent = String(state.getWeeklyTargetMinutes() / 60);
  remindersToggle.checked = preferences.reminderNotificationsEnabled;

  categories.render();
}
