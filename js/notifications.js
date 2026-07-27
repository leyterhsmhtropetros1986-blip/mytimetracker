"use strict";

import * as state from "./state.js";
import * as ui from "./ui.js";
import { openEditEntryModal } from "./entries.js";
import { formatShortDate, parseDateInput } from "./utils.js";

const SCAN_INTERVAL_MS = 30000;

let notificationsButton;
let notificationsPanel;
let notificationsList;
let notificationsEmpty;
let notificationsBadge;

export function init() {
  notificationsButton = document.getElementById("notifications-button");
  notificationsPanel = document.getElementById("notifications-panel");
  notificationsList = document.getElementById("notifications-list");
  notificationsEmpty = document.getElementById("notifications-empty");
  notificationsBadge = document.getElementById("notifications-badge");

  ui.registerPopover(notificationsButton, notificationsPanel);

  window.setInterval(() => {
    scanAndFireReminders();
    render();
  }, SCAN_INTERVAL_MS);

  scanAndFireReminders();
}

function isOverdue(entry, now) {
  if (entry.status !== "scheduled" && entry.status !== "in_progress") {
    return false;
  }

  const endDateTime = new Date(`${entry.date}T${entry.endTime}:00`);
  return endDateTime < now;
}

function isDueReminder(entry, now) {
  const reminder = entry.reminder;

  if (!reminder || !reminder.enabled || reminder.firedAt) {
    return false;
  }

  if (entry.status === "done" || entry.status === "cancelled") {
    return false;
  }

  const startDateTime = new Date(`${entry.date}T${entry.startTime}:00`);
  const millisecondsUntilStart = startDateTime.getTime() - now.getTime();
  const graceMs = 5 * 60 * 1000;

  return millisecondsUntilStart <= reminder.minutesBefore * 60 * 1000 && millisecondsUntilStart > -graceMs;
}

function scanAndFireReminders() {
  const preferences = state.getPreferences();

  if (!preferences.reminderNotificationsEnabled) {
    return;
  }

  const now = new Date();
  const dueEntries = state.getEntries().filter((entry) => isDueReminder(entry, now));

  dueEntries.forEach((entry) => {
    ui.toast(`⏰ Υπενθύμιση: "${entry.taskName}" ξεκινάει στις ${entry.startTime}.`, "info", 6000);
    state.updateEntry(entry.id, { reminder: { ...entry.reminder, firedAt: now.toISOString() } });
  });
}

function getOverdueEntries(now) {
  return state
    .getEntries()
    .filter((entry) => isOverdue(entry, now))
    .sort((first, second) => `${first.date}${first.endTime}`.localeCompare(`${second.date}${second.endTime}`));
}

function getUpcomingReminders(now) {
  return state.getEntries().filter((entry) => isDueReminder(entry, now));
}

export function render() {
  const now = new Date();
  const overdue = getOverdueEntries(now);
  const upcoming = getUpcomingReminders(now);

  const total = overdue.length + upcoming.length;

  notificationsBadge.hidden = total === 0;
  notificationsBadge.textContent = total > 9 ? "9+" : String(total);

  notificationsList.innerHTML = "";
  ui.toggleEmptyState(notificationsEmpty, total === 0);

  upcoming.forEach((entry) => {
    notificationsList.append(createItem("⏰", `"${entry.taskName}" ξεκινάει στις ${entry.startTime}`, entry));
  });

  overdue.forEach((entry) => {
    notificationsList.append(
      createItem("⚠️", `"${entry.taskName}" καθυστέρησε (${formatShortDate(parseDateInput(entry.date))})`, entry)
    );
  });
}

function createItem(icon, text, entry) {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "notification-item";
  item.style.width = "100%";
  item.style.border = "0";
  item.style.cursor = "pointer";
  item.style.background = "transparent";
  item.style.textAlign = "left";

  const iconEl = document.createElement("span");
  iconEl.className = "notification-icon";
  iconEl.textContent = icon;

  const body = document.createElement("div");
  body.className = "notification-body";

  const title = document.createElement("strong");
  title.textContent = text;

  const meta = document.createElement("span");
  meta.textContent = entry.category;

  body.append(title, meta);
  item.append(iconEl, body);

  item.addEventListener("click", () => {
    state.setSelectedDate(parseDateInput(entry.date));
    openEditEntryModal(entry.id);
    ui.closePopovers();
  });

  return item;
}
